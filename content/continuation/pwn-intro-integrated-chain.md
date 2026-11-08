## Перед началом: Как ошибки возникают на стыке между защищёнными частями системы

В завершающем модуле `Integrated Security` курса **Intro to Cybersecurity** на `pwn.college` (который объединяет темы `Intercepting Communication`, `Cryptography`, `Web Security`, `Reverse Engineering` и `Binary Exploitation`) рассматривают ключевую инженерную проблему: каждый отдельный модуль программы может выглядеть разумно, но на **стыке между модулями** возникает уязвимость.

Представь доставку ценного груза: броневик надёжный (криптография), охрана на воротах проверяет пропуск по списку (веб-авторизация), а кладовщик на складе аккуратно раскладывает коробки по полкам (обработка в памяти). Но если охрана на воротах проверяет подпись только на первой странице накладной, а кладовщик берёт номер полки со второй, никем не подписанной страницы, то вся цепочка защиты рассыпается на границе между воротами и складом.

Сегодня мы разберём, как строить и проверять **сквозную цепочку безопасности (end-to-end security chain)**: от сетевого конверта и криптографического тега подлинности до разбора полей запроса и проверки границ перед записью в буфер фиксированного размера.

## Почему это работает: Четыре границы в интегрированной системе

Проследим путь одного сообщения через четыре слоя, которые изучаются в `Intro to Cybersecurity`:

1. **Граница 1: Канал связи и повтор сообщения (Network / Intercepting Communication)**. Если сообщение передаётся по сети, посредник может увидеть открытые метаданные или попытаться отправить старый перехваченный пакет повторно (replay). Поэтому в сообщение включают идентификатор получателя, номер операции или метку последовательности (`seq`).
2. **Граница 2: Область покрытия криптографической подписи или MAC (Cryptography)**. Самая опасная архитектурная ошибка — когда `HMAC` или электронная подпись вычисляется только от одного поля (например, только от `user`), а остальные поля (`action`, `seq`, `payload`) передаются рядом без проверки подлинности. Подпись или AEAD/HMAC обязаны покрывать **все поля, от которых зависит решение сервера**, в однозначном каноническом виде.
3. **Граница 3: Доверие после проверки подписи (Web / Parser Boundary)**. Корректный криптографический тег доказывает только одно: сообщение пришло от обладателя ключа и не изменилось в пути. Он **не доказывает**, что внутри `payload` лежат безопасные символы для SQL, шаблона или командной строки! Авторизованный пользователь тоже может отправить специальные символы или слишком длинную строку.
4. **Граница 4: Размер в байтах против длины строки (Program / Memory Boundary)**. Веб-слой часто считает длину текста в символах Unicode (`len("Я") == 1`), а низкоуровневый обработчик копирует в буфер сырые байты UTF-8 (`len("Я".encode("utf-8")) == 2`) или декодированные из Base64/hex байты. Поэтому проверку максимального размера буфера всегда выполняют **после декодирования и именно в байтах**.

<!-- preparation -->

## Сделай сейчас: Практика: проверь сквозной конвейер сообщения от HMAC до буфера

### Шаг 1. Сохрани код в файл `lab.py`

Вставь следующий код в открытый редактор Mousepad, нажми **Ctrl+S** и закрой редактор:

```python
import hashlib
import hmac
import json

SECRET_KEY = b"kairon-integrated-dojo-key"
MAX_BUFFER_BYTES = 16


def canonical_bytes(envelope):
    payload = {"seq": envelope["seq"], "role": envelope["role"], "data_hex": envelope["data_hex"]}
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sign_envelope(seq, role, data_bytes):
    env = {"seq": seq, "role": role, "data_hex": data_bytes.hex()}
    env["tag"] = hmac.new(SECRET_KEY, canonical_bytes(env), hashlib.sha256).hexdigest()
    return env


def process_envelope(env, last_seq):
    expected_tag = hmac.new(SECRET_KEY, canonical_bytes(env), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_tag, env.get("tag", "")):
        return "rejected:bad_mac"
    if env["seq"] <= last_seq:
        return "rejected:replay"
    raw = bytes.fromhex(env["data_hex"])
    if len(raw) > MAX_BUFFER_BYTES:
        return "rejected:buffer_bounds"
    return f"accepted:seq={env['seq']}:bytes={len(raw)}"


valid_packet = sign_envelope(seq=10, role="reader", data_bytes=b"status-check")
tampered_role = dict(valid_packet, role="admin")
oversized_packet = sign_envelope(seq=11, role="reader", data_bytes=b"A" * 24)

print("valid_result=", process_envelope(valid_packet, last_seq=9))
print("replay_result=", process_envelope(valid_packet, last_seq=10))
print("tampered_result=", process_envelope(tampered_role, last_seq=9))
print("oversized_result=", process_envelope(oversized_packet, last_seq=10))
```

### Шаг 2. Запусти программу и проверь четыре сценария

В терминале выполни:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
valid_result= accepted:seq=10:bytes=12
replay_result= rejected:replay
tampered_result= rejected:bad_mac
oversized_result= rejected:buffer_bounds
```

Разберём, какую ошибку ловит каждый шаг конвейера:
- `valid_result=` проходит все проверки: HMAC совпадает по всем трём полям (`seq`, `role`, `data_hex`), номер `seq=10` строго больше предыдущего `9`, а длина декодированных байтов (`12`) не превышает размер буфера `16`;
- `replay_result=` показывает, что даже при абсолютно верном HMAC-теге повторная отправка уже обработанного пакета (`seq=10` при `last_seq=10`) блокируется проверкой последовательности;
- `tampered_result=` ловит попытку заменить `role` с `"reader"` на `"admin"` без пересчёта тега (`rejected:bad_mac`), потому что функция `canonical_bytes` включает поле `role` в расчёт HMAC;
- `oversized_result=` показывает, почему одного валидного HMAC недостаточно: пакет подписан настоящим ключом и имеет новый `seq=11`, но после декодирования из hex его размер равен 24 байтам, что превышает границу целевого буфера `MAX_BUFFER_BYTES = 16` (`rejected:buffer_bounds`).

### Шаг 3. Проверь, что произойдёт, если забыть включить поле `role` в расчёт HMAC

В файле `lab.py` временно убери `"role": envelope["role"],` из словаря `payload` внутри функции `canonical_bytes`, сохрани файл и запусти `python3 lab.py`. Ты увидишь, что `tampered_result=` изменится с `rejected:bad_mac` на `accepted:seq=10:bytes=12` — подмена роли прошла незамеченной, потому что криптографический тег перестал покрывать это поле! Обязательно верни `"role": envelope["role"],` обратно в `canonical_bytes` и убедись, что снова выводится `rejected:bad_mac`.

## Почему это работает: Как подходить к многослойным задачам на pwn.college

В модуле `Integrated Security` на `pwn.college` (и при реальном анализе защищённости сервисов) не пытайся атаковать или чинить всю систему целиком вслепую. Выпиши на листе бумаги **контракт каждого перехода**:
1. Какие байты выходят из сетевого или криптографического блока?
2. Какие именно поля входят в расчёт подписи/MAC или шифротекста?
3. В какой кодировке эти данные передаются дальше в SQL-запрос, HTTP-обработчик или нативную функцию на C?
4. В каких единицах (символах, байтах или элементах массива) проверяется длина перед копированием в память?

Нарушение согласованности хотя бы между двумя соседними ответами и есть точное место ошибки.

## Если не получилось: Частые ошибки

- **Ошибка `ValueError: non-hexadecimal number found in fromhex()`**: возникает, если в поле `data_hex` попали символы вне диапазона `0–9a–f` или нечётное количество символов. В боевом коде `bytes.fromhex` оборачивают в `try ... except ValueError`.
- **Нестабильный HMAC при обычной сериализации JSON**: без параметров `sort_keys=True, separators=(",", ":")` порядок ключей или пробелы в JSON могут измениться между языками программирования, и проверка HMAC вернёт ложный отказ.
