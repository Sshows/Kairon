## Перед началом: Инъекции операторов в `NoSQL (MongoDB)`, каталоги `LDAP` и запросы `XPath` (`TryHackMe`, `HTB Academy` & `PayloadsAllTheThings`)

Новички часто слышат миф: *«В нашей базе данных MongoDB вообще нет языка SQL — значит, никаких инъекций у нас быть не может!»*. В курсах **`TryHackMe` (`NoSQL Injection`)**, **`Hack The Box Academy` (`Attacking Authentication & NoSQL`)** и справочнике **`PayloadsAllTheThings` (`NoSQL Injection` / `LDAP Injection` / `XPath Injection`)** наглядно доказывается, почему это опасное заблуждение.

Разберём три бессинтаксических и древовидных вида инъекций:
1. **`NoSQL Injection` — подмена строки словарём операторов (`$ne`, `$gt`, `$in`, `$regex`)**:
   В `MongoDB` запрос передаётся не строкой SQL, а JSON-объектом (словарём):
   ```text
   db.users.find_one({"username": req_body["user"], "password": req_body["pass"]})
   ```
   Пока пользователь присылает JSON `{"user": "admin", "pass": "wrong"}`, база сравнивает пароль со строкой `"wrong"`.
   Но что, если в `JSON`-теле запроса вместо строки передать **вложенный словарь с оператором сравнения `MongoDB`**?
   ```json
   {"user": "admin", "pass": {"$ne": "anything_impossible"}}
   ```
   Оператор **`$ne` (`not equal` — «не равно»)** проверяет: *«Равен ли настоящий пароль администратора строке `"anything_impossible"`? Нет, не равен — значит, условие истинно!»* — и пускает атакующего в аккаунт `admin` вообще без знания пароля!
   А если сервер возвращает ошибку или разный ответ при совпадении, оператор **`$regex`** (`{"pass": {"$regex": "^KRN_.*"}}`) позволяет точно так же по одному символу извлечь весь пароль или токен!
2. **`LDAP Injection` — обход фильтров корпоративного каталога `Active Directory / OpenLDAP`**:
   Когда корпоративный портал ищет сотрудника в `LDAP` по шаблону:
   ```text
   (&(uid={user_input})(userPassword={password_input}))
   ```
   подстановка `*)(uid=*))(|(uid=*` превращает фильтр в вечно истинное условие, или позволяет перебрать атрибуты пользователя по маске `*`.
3. **`XPath Injection` — обход авторизации при поиске по XML-документу**:
   В выражении `//users/user[login/text()='$user' and password/text()='$pass']` ввод `' or '1'='1` точно так же, как в SQL, делает предикат в квадратных скобках истинным для всех узлов `<user>`.

## Почему это работает: Причина `NoSQLi` — отсутствие строгой проверки типа входного поля (`Type Validation`)

Операторная инъекция в `MongoDB` работает только потому, что обработчик ожидал получить `str`, но без проверки пропустил в запрос `dict` (`{"$ne": ...}`). Как только перед запросом к базе проверяется `isinstance(value, str)` (или используется строгая схема `Pydantic` / `Zod`), любой словарь с оператором `$ne` или `$regex` мгновенно отвергается!

<!-- preparation -->

В этом практикуме ты смоделируешь в `lab.py` движок запросов `MongoDB`, проверишь обход входа через `{"$ne": null}` и посимвольную утечку секрета через `{"$regex": "^..."}`, а также реализуешь строгий валидатор типов и экранирование спецсимволов фильтра `LDAP` (`*`, `(`, `)`, `\`, `\x00`) по стандарту `RFC 4515`.

## Сделай сейчас: Проверь атаку `$ne` / `$regex` в `NoSQL` и экранирование `LDAP` по `RFC 4515` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
import re


def match_mongo_field(actual_val, query_val):
    if isinstance(query_val, dict):
        if "$ne" in query_val:
            return actual_val != query_val["$ne"]
        if "$regex" in query_val:
            return bool(re.match(query_val["$regex"], str(actual_val)))
    return actual_val == query_val


def vuln_nosql_find(collection, query_dict):
    return [doc for doc in collection if all(match_mongo_field(doc.get(k), v) for k, v in query_dict.items())]


def safe_nosql_login(collection, user_input, pass_input):
    # ЗАЩИТА: требуем строго строковый тип str для обоих полей
    if not isinstance(user_input, str) or not isinstance(pass_input, str):
        return "REJECTED:non_string_operator_injection_blocked"
    return vuln_nosql_find(collection, {"user": user_input, "token": pass_input})


def escape_ldap_filter_rfc4515(raw_str):
    # Экранирование спецсимволов LDAP: \ -> \5c, * -> \2a, ( -> \28, ) -> \29, NUL -> \00
    replacements = {"\\": r"\5c", "*": r"\2a", "(": r"\28", ")": r"\29", "\x00": r"\00"}
    return "".join(replacements.get(ch, ch) for ch in raw_str)


users_col = [{"user": "admin", "token": "KRN_NOSQL_77"}]

print("vuln_ne_bypass=", len(vuln_nosql_find(users_col, {"user": "admin", "token": {"$ne": "wrong"}})) == 1)
print("vuln_regex_probe=", len(vuln_nosql_find(users_col, {"user": "admin", "token": {"$regex": "^KRN_NOSQL"}})) == 1)
print("safe_strict_type=", safe_nosql_login(users_col, "admin", {"$ne": "wrong"}))
print("ldap_rfc4515_escaped=", escape_ldap_filter_rfc4515("admin*)(|(uid=*"))
```

### Шаг 2. Запусти программу и изучи результаты проверки `NoSQL` и `LDAP`

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
vuln_ne_bypass= True
vuln_regex_probe= True
safe_strict_type= REJECTED:non_string_operator_injection_blocked
ldap_rfc4515_escaped= admin\2a\29\28|\28uid=\2a
```

Разберём, что показала модель:
- в `vuln_nosql_find` передача словаря `{"$ne": "wrong"}` вместо строки пароля вернула документ администратора (`vuln_ne_bypass= True`), а оператор `{"$regex": "^KRN_NOSQL"}` подтвердил префикс секретного токена (`vuln_regex_probe= True`);
- функция `safe_nosql_login` проверила `isinstance(..., str)` и заблокировала словарь с оператором до обращения к коллекции (`REJECTED:non_string_operator_injection_blocked`);
- функция `escape_ldap_filter_rfc4515` заменила все управляющие метасимволы `LDAP` (`*`, `(`, `)`) на их шестнадцатеричные коды `\2a`, `\28`, `\29`, полностью лишив строку способности разорвать скобочную структуру фильтра.

### Шаг 3. Проверь извлечение суффикса токена через `$regex` и фильтрацию в Kali

В файле `lab.py` замени `"^KRN_NOSQL"` на `"^KRN_NOSQL_99"` и запусти `python3 lab.py` — `vuln_regex_probe` станет `False`, так как последние цифры токена — `77`. После проверки верни `"^KRN_NOSQL"`.

В терминале Kali проверь быстрый однострочник валидации строковых полей JSON-запроса:

```bash
python3 -c 'req={"user":"admin","pass":{"$ne":1}}; print("valid_types=", all(isinstance(v, str) for v in req.values()))'
```

## Почему это работает: Почему `urlencoded`-формы (`user=admin&pass[$ne]=1`) тоже подвержены `NoSQLi`

Даже если сайт не принимает `application/json`, популярные парсеры `query string` и `urlencoded`-форм (например, библиотека `qs` в Express / Node.js или `Rack` в Ruby) автоматически превращают квадратные скобки `pass[$ne]=1` во вложенный словарь `{"pass": {"$ne": "1"}}`! Поэтому проверка типа `typeof pass === "string"` на сервере обязательна независимо от формата запроса.

## Если не получилось: Частые ошибки

- **Приведение словаря к строке через `str(pass_input)` вместо отклонения запроса (`400 Bad Request`)**: приведение типа превращает `{"$ne": 1}` в бессмысленную строку `"{'$ne': 1}"`, скрывая попытку атаки в логах вместо явного срабатывания детектора безопасности.
