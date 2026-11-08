## Перед началом: Почему сервер отклоняет «почти правильный» запрос или строку данных

В курсе **Playing With Programs** (`fundamentals`) на платформе `pwn.college` (модули `Data Dealings` и `Talking Web`) разбирают ситуацию, с которой сталкивается каждый практик: ты точно знаешь, какое значение ждёт программа или веб-сервис, но она раз за разом отвечает отказом. Причина почти всегда кроется в **представлении данных** (кодировке) или в том, **в каком именно поле HTTP-запроса** передано значение.

Представь отправку посылки через три службы доставки подряд: сначала предмет упаковали в вакуумный пакет (байты UTF-8), потом положили в картонную коробку с шестнадцатеричной маркировкой (hex), а сверху наклеили транспортный ярлык для почтового автомата (Base64 или URL-кодирование `%XX`). Если получатель снимает упаковки строго в обратном порядке, а отправитель перепутал шаги местами или забыл убрать символ перевода строки `\n` в конце, внутри окажется совсем другой набор байтов.

Сегодня мы соберём в Kali Linux проверяемый конвейер многошагового кодирования данных и точный конструктор HTTP-запросов, чтобы видеть каждый слой глазами.

## Почему это работает: Слои представления данных и анатомия HTTP-обмена

Разберём два ключевых правила из `Data Dealings` и `Talking Web`:

1. **Текст (`str`) против сырых байтов (`bytes`) и обратимых кодировок**. Внутри компьютера существуют только байты (числа от `0` до `255`). Когда мы переводим строку `"Привет"` в байты через `.encode("utf-8")`, каждая русская буква превращается в два байта. Далее эти байты можно записать разными безопасными для передачи способами:
   - **Hex (шестнадцатеричная запись)**: каждый байт записывается двумя символами `0–9a–f` (размер увеличивается ровно в 2 раза);
   - **Base64**: каждые 3 байта превращаются в 4 печатных символа из алфавита `A–Z`, `a–z`, `0–9`, `+`, `/` (или `-`, `_` в варианте `urlsafe_b64encode`);
   - **URL-кодирование (percent-encoding)**: специальные символы вроде пробела, `&`, `=`, `/` заменяются на `%` и шестнадцатеричный код байта (например, пробел `0x20` становится `%20`).
   Важная деталь в Linux: команда `echo "abc" | base64` кодирует 4 байта (`a`, `b`, `c` и перевод строки `\n`!), а `printf "abc" | base64` — ровно 3 байта без лишнего `\n`.
2. **Где именно программа ищет данные в HTTP-запросе**. В модуле `Talking Web` проверяющая программа может требовать одно значение в параметре адресной строки (`?token=...`), второе — в заголовке (`X-Client-Mode` или `User-Agent`), третье — в `Cookie`, а четвёртое — в теле запроса в формате `application/x-www-form-urlencoded` или `application/json`. Если отправить JSON-тело, но оставить заголовок `Content-Type: application/x-www-form-urlencoded`, серверный парсер просто не прочитает поля.

<!-- preparation -->

## Сделай сейчас: Практика: проверь цепочку преобразований и конструктор HTTP-запроса

### Шаг 1. Сохрани код в файл `lab.py`

Вставь следующий код в открытый редактор Mousepad, нажми **Ctrl+S** и закрой окно редактора:

```python
import base64
import urllib.parse

raw_text = "kairon:pwn-step=1"
raw_bytes = raw_text.encode("utf-8")
hex_layer = raw_bytes.hex()
b64_layer = base64.b64encode(bytes.fromhex(hex_layer)).decode("ascii")
url_layer = urllib.parse.quote(b64_layer, safe="")

unquoted = urllib.parse.unquote(url_layer)
decoded_bytes = base64.b64decode(unquoted.encode("ascii"))
print("hex_layer=", hex_layer)
print("url_layer=", url_layer)
print("exact_restore=", decoded_bytes.decode("utf-8") == raw_text)
print("newline_differs=", base64.b64encode(raw_bytes) != base64.b64encode(raw_bytes + b"\n"))


def verify_http_exchange(method, query_string, headers, body_text):
    query = urllib.parse.parse_qs(query_string, keep_blank_values=True)
    ctype = headers.get("Content-Type", "")
    form = urllib.parse.parse_qs(body_text, keep_blank_values=True) if ctype == "application/x-www-form-urlencoded" else {}
    checks = {
        "method_ok": method == "POST",
        "query_ok": query.get("stage") == ["talking-web"],
        "header_ok": headers.get("X-Dojo-Client") == "kairon-lab",
        "form_ok": form.get("token") == [b64_layer],
    }
    return all(checks.values()), checks


ok, details = verify_http_exchange(
    method="POST",
    query_string="stage=talking-web",
    headers={"Content-Type": "application/x-www-form-urlencoded", "X-Dojo-Client": "kairon-lab"},
    body_text=urllib.parse.urlencode({"token": b64_layer}),
)
print("exchange_ok=", ok, "form_ok=", details["form_ok"])
```

### Шаг 2. Запусти программу и сверь каждый слой

В терминале выполни:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
hex_layer= 6b6169726f6e3a70776e2d737465703d31
url_layer= a2Fpcm9uOnB3bi1zdGVwPTE%3D
exact_restore= True
newline_differs= True
exchange_ok= True form_ok= True
```

Посмотри, как работают оба блока:
- в строке `url_layer=` символ `=` из конца Base64-строки `a2Fpcm9uOnB3bi1zdGVwPTE=` превратился в `%3D`, чтобы он не конфликтовал со знаком равенства в параметрах `key=value`;
- строка `newline_differs= True` наглядно показывает, почему один лишний байт `\n` в конце данных даёт совершенно другой Base64-результат;
- функция `verify_http_exchange` проверяет четыре независимых места HTTP-запроса: метод `POST`, параметр строки запроса `stage=talking-web`, пользовательский заголовок `X-Dojo-Client` и URL-кодированное тело формы с полем `token`.

### Шаг 3. Проверь, что будет при неверном заголовке `Content-Type`

В файле `lab.py` замени `"Content-Type": "application/x-www-form-urlencoded"` на `"Content-Type": "text/plain"`, сохрани файл и запусти `python3 lab.py`. Теперь программа выведет `exchange_ok= False form_ok= False`: хотя тело запроса осталось прежним, сервер перестал разбирать его как форму `key=value`. Верни заголовок `"application/x-www-form-urlencoded"` обратно и убедись, что снова выводится `True`.

## Почему это работает: Как соединять curl, python и nc без угадывания

В модуле `Talking Web` на `pwn.college` одни и те же HTTP-задачи просят решить тремя способами: через консольную утилиту `curl`, через Python (`urllib` / `requests`) и через прямое соединение `nc` (Netcat). Когда ты понимаешь структуру запроса, переключение между инструментами занимает секунды:
- флаг `-X POST` в `curl` задаёт метод в стартовой строке;
- флаг `-H "X-Dojo-Client: kairon-lab"` добавляет строку в блок заголовков до разделителя `\r\n\r\n`;
- флаг `-d "token=..."` автоматически ставит метод `POST`, заголовок `Content-Type: application/x-www-form-urlencoded`, считает `Content-Length` и помещает строку после `\r\n\r\n`.

## Если не получилось: Частые ошибки

- **Ошибка `binascii.Error: Incorrect padding` при декодировании Base64**: длина строки Base64 должна быть кратна 4 символам (недостающие позиции добиваются знаками `=`). Проверь, не потерялся ли знак `=` при передаче через URL без `urllib.parse.quote`.
- **Команда `echo` в терминале добавляет лишний перевод строки**: при подготовке байтов в bash или zsh всегда используй `printf '%s' "текст"` или `echo -n "текст"`.
