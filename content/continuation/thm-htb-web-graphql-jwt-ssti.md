## Перед началом: Безопасность современных API — `GraphQL`, токены `JWT` и шаблонные инъекции `SSTI` (`TryHackMe` & `Hack The Box Academy`)

В курсах по безопасности современных веб-приложений и API на **`TryHackMe` (`API Security` / `SSTI`)** и **`Hack The Box Academy` (`Attacking GraphQL`, `JWT Attacks`, `Server-Side Template Injection`)** разбираются три технологии, на которых работает большинство современных микросервисов:
1. **`GraphQL Introspection` («самоописание всей схемы API») и глубина запроса**: в отличие от REST API с десятками разных URL, в `GraphQL` все запросы идут в одну точку `/graphql`. Чтобы фронтенд-разработчикам было удобно изучать поля, в `GraphQL` встроен специальный системный запрос **`__schema`** (интроспекция). Если администратор забыл отключить интроспекцию в продакшене, любой внешний клиент одним запросом `{__schema{types{name,fields{name}}}}` выгружает полную карту всех скрытых таблиц, полей и мутаций (например, `promoteUserToAdmin`)! А вложенные циклические запросы (`user { friends { user { friends ... } } }`) без ограничения глубины (`max_depth`) перегружают сервер базы данных.
2. **Ошибки проверки заголовка `JWT (JSON Web Token)` — `alg: none` и инъекция в `kid`**: токен `JWT` состоит из трёх частей, разделённых точками: `Header.Payload.Signature`. В заголовке `Header` лежат два опасных поля:
   - `alg` (алгоритм подписи): если сервер слепо доверяет полю `alg` из самого токена и не передаёт жёсткий белый список алгоритмов (`algorithms=["HS256"]`), злоумышленник меняет заголовок на `{"alg": "none"}` и отрезает подпись;
   - `kid` (`Key ID`, идентификатор ключа): если сервер подставляет строку `kid` напрямую в путь к файлу ключа на диске (`open(f"/keys/{kid}.pem")`), то `kid = "../../dev/null"` заставит сервер взять в качестве секретного ключа **пустую строку `""`** (содержимое вечно пустого файла `/dev/null`), которой злоумышленник легко подпишет любой токен!
3. **`SSTI (Server-Side Template Injection)`**: возникает, когда имя пользователя склеивают со строкой шаблона до её рендеринга (`Template("Привет, " + user_input).render()`), вместо того чтобы передать имя как переменную контекста (`Template("Привет, {{ name }}").render(name=user_input)`). В результате выражение `{{ 7 * 7 }}` исполняется на сервере как код шаблонизатора!

## Почему это работает: Три правила защиты GraphQL, JWT и шаблонизаторов

- **В `GraphQL`**: отключать интроспекцию (`__schema`, `__type`) для неавторизованных клиентов в продакшене и задавать жёсткий лимит глубины вложенности запроса (`max_depth <= 5`).
- **В `JWT`**: жёстко фиксировать алгоритм на стороне сервера (`HS256` или `RS256`) и искать ключ по `kid` только в словаре доверенных идентификаторов (`KEY_STORE.get(kid)`), никогда не подставляя `kid` в файловый путь или SQL-запрос.
- **В шаблонизаторах (`Jinja2`, `Twig`, `Pug`)**: строка самого шаблона всегда должна быть статической константой, а пользовательские данные передаются исключительно в словарь переменных `render(data=...)`.

<!-- preparation -->

В этом практикуме ты проверишь в `lab.py` все три механизма: блокировку интроспекции `__schema` и глубоких запросов в `GraphQL`, защиту `JWT` от `alg: none` и подмены пути в `kid` (`../../dev/null`), а также безопасную передачу параметров в шаблонизатор против `SSTI`.

## Сделай сейчас: Проверь защиту `GraphQL`, `JWT` (`alg`/`kid`) и шаблонов против `SSTI` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
import hmac
import hashlib

KEY_REGISTRY = {
    "key_2026_v1": b"super_secret_hmac_key_32_bytes!!",
}


def validate_graphql_query(query_str, depth, allow_introspection=False, max_depth=5):
    if not allow_introspection and ("__schema" in query_str or "__type" in query_str):
        return "blocked:graphql_introspection_disabled"
    if depth > max_depth:
        return f"blocked:graphql_depth_{depth}_exceeds_{max_depth}"
    return "allowed:graphql_query_ok"


def verify_jwt_header_and_sig(header, payload_bytes, signature_hex, strict_mode=True):
    alg = header.get("alg", "")
    kid = header.get("kid", "")
    if strict_mode:
        if alg != "HS256":
            return "rejected:alg_not_in_allowlist"
        if kid not in KEY_REGISTRY:
            return "rejected:unknown_kid_in_registry"
        secret = KEY_REGISTRY[kid]
    else:
        if alg.lower() == "none":
            return "VULNERABLE:accepted_alg_none_without_signature"
        if "dev/null" in kid:
            secret = b""
        else:
            secret = KEY_REGISTRY.get(kid, b"")

    expected = hmac.new(secret, payload_bytes, hashlib.sha256).hexdigest()
    if hmac.compare_digest(expected, signature_hex):
        return "accepted:valid_signature"
    return "rejected:invalid_signature"


def render_greeting(user_name, safe_context_binding=True):
    if not safe_context_binding and "{{" in user_name:
        return "VULNERABLE:ssti_expression_evaluated_49"
    return f"Hello, {user_name}"


print("gql_introspection=", validate_graphql_query("{__schema{types{name}}}", depth=2, allow_introspection=False))
print("gql_deep_nested=", validate_graphql_query("{user{friends{user{id}}}}", depth=9, allow_introspection=False))

empty_key_sig = hmac.new(b"", b'{"role":"admin"}', hashlib.sha256).hexdigest()
evil_hdr = {"alg": "HS256", "kid": "../../dev/null"}
print("jwt_kid_vuln=", verify_jwt_header_and_sig(evil_hdr, b'{"role":"admin"}', empty_key_sig, strict_mode=False))
print("jwt_kid_strict=", verify_jwt_header_and_sig(evil_hdr, b'{"role":"admin"}', empty_key_sig, strict_mode=True))

print("ssti_vuln=", render_greeting("{{7*7}}", safe_context_binding=False))
print("ssti_safe=", render_greeting("{{7*7}}", safe_context_binding=True))
```

### Шаг 2. Запусти программу и сравни уязвимую и защищённую логику

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
gql_introspection= blocked:graphql_introspection_disabled
gql_deep_nested= blocked:graphql_depth_9_exceeds_5
jwt_kid_vuln= accepted:valid_signature
jwt_kid_strict= rejected:unknown_kid_in_registry
ssti_vuln= VULNERABLE:ssti_expression_evaluated_49
ssti_safe= Hello, {{7*7}}
```

Посмотри на результаты:
- фильтр `validate_graphql_query` заблокировал как попытку выгрузить схему через `__schema` (`blocked:graphql_introspection_disabled`), так и рекурсивный запрос глубины `9 > 5` (`blocked:graphql_depth_9_exceeds_5`);
- в `jwt_kid_vuln` передача пути `kid: "../../dev/null"` заставила уязвимый обработчик прочитать пустой ключ `b""`, и подпись `empty_key_sig` от пустой строки прошла проверку (`accepted:valid_signature`). В строгом режиме (`strict_mode=True`) поиск `kid` выполняется только по словарю `KEY_REGISTRY`, что мгновенно отвергло подмену (`rejected:unknown_kid_in_registry`);
- при безопасной привязке контекста (`safe_context_binding=True`) строка `{{7*7}}` вывелась буквально как обычный текст `Hello, {{7*7}}`, не исполняясь внутри шаблонизатора.

### Шаг 3. Проверь легитимный `kid` и структуру заголовка `JWT` в Kali

В файле `lab.py` передай в `verify_jwt_header_and_sig` заголовок `{"alg": "none", "kid": "key_2026_v1"}` при `strict_mode=True`, сохрани и запусти `python3 lab.py` — ты увидишь отказ `rejected:alg_not_in_allowlist`. После проверки верни исходный код.

В терминале Kali можно одной командой декодировать заголовок и тело любого `JWT` (`Base64URL`):

```bash
python3 -c 'import base64; tok="eyJhbGciOiJIUzI1NiIsImtpZCI6ImtleV8yMDI2X3YxIn0.eyJyb2xlIjoidXNlciJ9"; [print(base64.urlsafe_b64decode(p + "===").decode()) for p in tok.split(".")]'
```

## Почему это работает: Зачем в `Base64URL` при декодировании в Python дописывают `"==="`

Стандарт `JWT (RFC 7519)` использует кодировку `Base64URL` без символов выравнивания `=` на конце, чтобы токен можно было безопасно передавать в строке адреса URL. Стандартная функция Python `base64.urlsafe_b64decode` требует, чтобы длина строки делилась на `4`, а лишние знаки `=` в конце аккуратно игнорирует — поэтому добавление `+ "==="` позволяет декодировать любой сегмент `JWT` без ошибок выравнивания.

## Если не получилось: Частые ошибки

- **Путаница между декодированием (`base64`) и проверкой подписи (`verify`) в `JWT`**: функция вида `jwt.decode(token, options={"verify_signature": False})` только читает открытый JSON внутри токена, но вообще не проверяет криптографическую подпись! Любой код авторизации обязан проверять подпись секретным ключом и указывать явный список `algorithms=["HS256"]`.
