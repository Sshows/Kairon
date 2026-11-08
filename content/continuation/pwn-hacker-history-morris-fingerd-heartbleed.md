## Перед началом: История взломов из `pwncollege/hacker-history-dojo` и `oldschool`: червь Морриса (`fingerd gets`, 1988) и `OpenSSL Heartbleed` (`CVE-2014-0160`)

В репозиториях **`pwn.college` (`github.com/pwncollege/hacker-history-dojo` и `github.com/pwncollege/oldschool`)** собраны реконструкции исторических уязвимостей, которые навсегда изменили архитектуру операционных систем и сетевых протоколов.

Разберём два самых знаменитых бага в истории компьютерной безопасности:
1. **Червь Морриса (ноябрь 1988 года) — неограниченное чтение `gets(buf)` в демоне `fingerd` (`4.3BSD VAX`)**:
   В 1988 году демон `fingerd`, показывавший информацию о пользователях по сети (порт `79/TCP`), состоял буквально из нескольких десятков строк на языке C и считывал имя пользователя в стек глубиной `512` байт функцией:
   ```c
   char line[512];
   gets(line);
   ```
   В чём фундаментальный порок функции `gets()`? Она **вообще не принимает размер буфера** и читает байты из сокета до символа перевода строки `\n`! Червь Роберта Морриса отправлял 536 байт со встроенным шеллкодом для процессора `VAX` (вызывающим `execve("/bin/sh", 0, 0)`), перезаписывал адрес возврата на стеке и получал удалённую оболочку. Тогда ещё не существовало ни `ASLR`, ни неисполняемого стека `NX`, а в стандарте `C11` функцию `gets()` окончательно **удалили из языка C**, заменив на `fgets(buf, sizeof(buf), stdin)`.
2. **`OpenSSL Heartbleed (CVE-2014-0160, апрель 2014 года)` — чтение до 64 КБ чужой памяти кучи (`Buffer Over-Read`)**:
   Расширение `TLS Heartbeat (RFC 6520)` было придумано для проверки того, что защищённое соединение ещё живо: клиент отправляет серверу пакет:
   - `type = 1` (`HeartbeatRequest`);
   - `payload_length` (2-байтовое число `uint16_t` — «сколько байт текста я прислал»);
   - `payload` (сам текст, например, слово `"PING"` из 4 байт).
   Сервер должен выделить в куче буфер размера `payload_length`, скопировать туда присланный `payload` через `memcpy(bp, pl, payload_length)` и отправить обратно клиенту.
   Но что, если клиент пришлёт слово `"PING"` длины **4 байта**, а в поле заголовка `payload_length` напишет **`65535` (`0xFFFF`)**?!
   Уязвимый код `OpenSSL` **не проверял**, что заявленная в заголовке длина `payload_length` не превышает реальную длину пришедшего сетевого пакета! В результате `memcpy(bp, pl, 65535)` копировал 4 байта слова `"PING"` и ещё **65 531 байт соседней памяти кучи OpenSSL** — вместе с приватными RSA-ключами TLS-сертификатов, паролями пользователей и сессионными куками — и отправлял их обратно по сети атакующему!

## Почему это работает: Закон проверки внешних границ (`Never Trust Header Length Without Bounds Check against Actual Packet Size`)

Любое поле длины внутри заголовка пакета (`payload_length` в TLS, `Content-Length` в HTTP, `sh_size` в ELF) — это всего лишь **утверждение отправителя**, а не реальный размер пришедших данных. Перед вызовом `memcpy` сервер обязан проверить:
$$\text{header\_length} \le \text{actual\_received\_bytes}$$

<!-- preparation -->

В этом практикуме ты воссоздашь в `lab.py` точные модели обоих исторических багов из `pwncollege/hacker-history-dojo` (`fingerd gets()` 1988 года и `OpenSSL Heartbleed CVE-2014-0160` 2014 года) и проверишь работу исправленных функций `fgets_bounded` и `tls_heartbeat_patched`.

## Сделай сейчас: Проверь модели `fingerd (1988)` и `Heartbleed (CVE-2014-0160)` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
import struct


def fingerd_1988_sim(network_line_bytes, use_safe_fgets=True):
    buf_cap = 512
    if use_safe_fgets:
        # Аналог fgets(line, 512, stdin): читает не более 511 байт + '\0'
        stored = network_line_bytes[: buf_cap - 1]
        return "SAFE_FGETS:stack_intact", len(stored)
    # Аналог gets(line): пишет за границу 512-байтового буфера прямо в сохранённый адрес возврата
    if len(network_line_bytes) > buf_cap:
        return "MORRIS_OVERFLOW:saved_pc_overwritten", len(network_line_bytes) - buf_cap
    return "OK", len(network_line_bytes)


def openssl_heartbeat_sim(packet_bytes, adj_heap_memory, patched=True):
    # Формат пакета: [1 байт type][2 байта payload_len (>H)][payload...]
    hb_type = packet_bytes[0]
    claimed_len = struct.unpack(">H", packet_bytes[1:3])[0]
    actual_payload = packet_bytes[3:]

    if patched:
        # Патч CVE-2014-0160: отбрасываем пакет, если заявленная длина больше реальной!
        if 1 + 2 + claimed_len > len(packet_bytes):
            return "HEARTBLEED_BLOCKED:claimed_length_exceeds_packet", b""
        return "HEARTBEAT_OK", actual_payload[:claimed_len]

    # Уязвимое поведение OpenSSL 1.0.1f: читаем claimed_len байт из буфера + соседней кучи
    contiguous_heap = actual_payload + adj_heap_memory
    leaked_response = contiguous_heap[:claimed_len]
    return "HEARTBLEED_LEAKED_HEAP", leaked_response


morris_payload = b"A" * 536
print("morris_vuln=", fingerd_1988_sim(morris_payload, use_safe_fgets=False))
print("morris_fixed=", fingerd_1988_sim(morris_payload, use_safe_fgets=True))

heap_secrets = b"|PRIVATE_KEY:KRN{HEARTBLEED_2014_FIXED}|SESSION_COOKIE=adm_99"
malicious_hb_pkt = b"\x01" + struct.pack(">H", 45) + b"PING"

status_vuln, leaked_bytes = openssl_heartbeat_sim(malicious_hb_pkt, heap_secrets, patched=False)
status_fix, safe_bytes = openssl_heartbeat_sim(malicious_hb_pkt, heap_secrets, patched=True)

print("heartbleed_vuln=", status_vuln, leaked_bytes.decode("ascii"))
print("heartbleed_patched=", status_fix, len(safe_bytes))
```

### Шаг 2. Запусти программу и сравни поведение до и после патчей

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
morris_vuln= ('MORRIS_OVERFLOW:saved_pc_overwritten', 24)
morris_fixed= ('SAFE_FGETS:stack_intact', 511)
heartbleed_vuln= HEARTBLEED_LEAKED_HEAP PING|PRIVATE_KEY:KRN{HEARTBLEED_2014_FIXED}|S
heartbleed_patched= HEARTBLEED_BLOCKED:claimed_length_exceeds_packet 0
```

Разберём, что показала историческая реконструкция:
- в модели `fingerd_1988_sim` отправка 536 байт в уязвимый `gets()` вышла за пределы 512-байтового буфера на `24` байта и перезаписала счётчик команд (`MORRIS_OVERFLOW:saved_pc_overwritten`), а `fgets` с явным ограничением `buf_cap - 1` обрезал ввод на `511` байтах (`SAFE_FGETS:stack_intact`);
- в модели `openssl_heartbeat_sim` пакет содержал всего 4 байта текста `"PING"`, но в 2-байтовом поле длины `claimed_len` запрашивал `45` байт: без проверки границ сервер скопировал и отправил по сети 41 байт из соседней кучи (`PING|PRIVATE_KEY:KRN{HEARTBLEED_2014_FIXED}|S`);
- патч `if 1 + 2 + claimed_len > len(packet_bytes)` мгновенно отбросил поддельный `HeartbeatRequest` (`HEARTBLEED_BLOCKED:claimed_length_exceeds_packet`).

### Шаг 3. Проверь легитимный пакет `Heartbeat` в терминале Kali

В файле `lab.py` замени заявленную длину `45` в `malicious_hb_pkt` на `4` (равную реальной длине слова `b"PING"`), сохрани и запусти `python3 lab.py` — пропатченный обработчик вернёт `HEARTBEAT_OK` и ровно `4` байта без утечки кучи. После проверки верни `45`.

В терминале Kali проверь версию установленной библиотеки `OpenSSL` (все современные ветки `OpenSSL 3.x` давно содержат проверку границ):

```bash
openssl version
```

## Почему это работает: Почему `Heartbleed` не оставлял следов в логах веб-сервера

В отличие от переполнения буфера при записи (`Buffer Overflow`), которое часто вызывает аварийное падение рабочего процесса (`Segmentation Fault`) и запись в системный журнал, `Heartbleed` был чистым **чтением за границами буфера (`Buffer Over-Read`) внутри уже выделенной кучи процесса**. Процесс не падал, HTTP-запрос вообще не создавался (обмен шёл на уровне TLS-рукопожатия), поэтому обычные логи `access.log` и `error.log` оставались совершенно пустыми.

## Если не получилось: Частые ошибки

- **Путать переполнение при записи (`Buffer Overflow / Out-of-Bounds Write`) и чтение за границей (`Buffer Over-Read`)**: первое позволяет перезаписать управляющие данные или указатели в памяти, а второе — выгрузить секреты из соседних ячеек памяти в ответ сервера.
