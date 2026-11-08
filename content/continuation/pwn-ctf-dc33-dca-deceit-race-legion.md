## Перед началом: Модули `DEF CON 33 DCA Dojo` (`github.com/pwncollege/dc33-dca-dojo`): `Byte-Sized Basics`, `Deceit by Design`, `Race Against the Machine` и `Linux Legion`

В официальном репозитории **`pwn.college` для `DEF CON 33` (`github.com/pwncollege/dc33-dca-dojo`)** соревновательная программа разделена на четыре тематических кластера:
1. **`dc33-byte-sized-basics` — Побайтовая упаковка и порядок байтов в сетевых заголовках**:
   Бинарные протоколы передают поля длины, версии и контрольной суммы в упакованном виде (`uint16_t` / `uint32_t`). Если парсер читает 16-битное поле длины `length` как знаковое число (`int16_t` вместо `uint16_t`), то значение `0xFFFF` (`65535`) проходит проверку `if (len < 64)` как `-1`, а затем в `memcpy` превращается обратно в беззнаковое `65535`!
2. **`dc33-deceit-by-design` — Рассинхронизация парсеров и проверка подлинности сообщений (`Parser Differential`)**:
   Когда внешний шлюз проверяет подпись или правило фильтрации по **первому** вхождению параметра в пакете, а внутренний обработчик исполняет **последнее** вхождение (или по-разному интерпретирует пробелы и регистр символов), атакующий проносит запрещённую команду через шлюз без нарушения внешней проверки.
3. **`dc33-race-against-the-machine` — Состояния гонки (`Race Condition / TOCTOU`) в многопоточных сервисах**:
   Классический сценарий CTF: сервис проверяет баланс или одноразовый токен (`if token_unused:`) в одном шаге, а помечает его использованным (`token_unused = False`) лишь после выдачи награды. Если отправить два параллельных запроса в одно и то же окно времени без мьютекса (`Lock`) или атомарного условного обновления (`UPDATE ... WHERE used = 0`), оба потока видят `token_unused == True` и выдают награду дважды!
4. **`linux-legion` — Автоматизация конвейеров и перенаправлений в Linux**:
   Сборка точных неинтерактивных цепочек процессов с передачей данных через пайпы, дескрипторы и переменные окружения.

## Почему это работает: Атомарная операция «Проверить и изменить за один шаг» (`Compare-And-Swap / Atomic Conditional Update`)

Чтобы закрыть гонку `Race Against the Machine`, нельзя разделять чтение (`SELECT used FROM coupons`) и запись (`UPDATE coupons SET used=1`) на два отдельных запроса! Вместо этого выполняется единая атомарная команда:
```sql
UPDATE coupons SET used = 1 WHERE code = ? AND used = 0
```
и проверяется `cursor.rowcount == 1`. Только один поток в мире получит `rowcount == 1`, а все остальные параллельные потоки получат `rowcount == 0`!

<!-- preparation -->

В этом практикуме ты проверишь в `lab.py` три ключевых сценария из `pwncollege/dc33-dca-dojo`: ошибку знакового сравнения 16-битной длины (`Byte-Sized Basics`), рассинхронизацию шлюза и бэкенда (`Deceit by Design`) и закрытие гонки параллельного погашения токена через атомарный `UPDATE ... WHERE used = 0` в `SQLite` (`Race Against the Machine`).

## Сделай сейчас: Проверь все 3 механизма из `DEF CON 33 DCA Dojo` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
import sqlite3
import struct


def parse_packet_length(raw_2bytes, safe_unsigned=True):
    if not safe_unsigned:
        # ОПАСНО: знаковая распаковка '>h' (int16) пропускает 0xfff0 как -16 < 64
        signed_len = struct.unpack(">h", raw_2bytes)[0]
        if signed_len <= 64:
            actual_copy_size = struct.unpack(">H", raw_2bytes)[0]
            return "VULNERABLE_SIGNED_BYPASS", actual_copy_size
        return "REJECTED", 0
    unsigned_len = struct.unpack(">H", raw_2bytes)[0]
    if unsigned_len <= 64:
        return "SAFE_ACCEPTED", unsigned_len
    return "SAFE_REJECTED:exceeds_64", 0


def gateway_vs_backend_parser(param_pairs, strict_canonical=True):
    # param_pairs = [("action", "status"), ("action", "export_flag")]
    if strict_canonical:
        keys = [k for k, _ in param_pairs]
        if len(keys) != len(set(keys)):
            return "BLOCKED_DECEIT:ambiguous_duplicate_parameter"
    gateway_sees = param_pairs[0][1]
    backend_executes = param_pairs[-1][1]
    return f"GATEWAY={gateway_sees}->BACKEND={backend_executes}"


def atomic_redeem_coupon(conn, code):
    cur = conn.execute("UPDATE coupons SET used = 1 WHERE code = ? AND used = 0", (code,))
    conn.commit()
    return "REDEEM_OK:flag_granted" if cur.rowcount == 1 else "REJECTED_RACE:already_used"


print("signed_bug=", parse_packet_length(b"\xff\xf0", safe_unsigned=False))
print("unsigned_fix=", parse_packet_length(b"\xff\xf0", safe_unsigned=True))

dup_params = [("action", "ping"), ("action", "dump_secrets")]
print("deceit_vuln=", gateway_vs_backend_parser(dup_params, strict_canonical=False))
print("deceit_fixed=", gateway_vs_backend_parser(dup_params, strict_canonical=True))

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE coupons (code TEXT PRIMARY KEY, used INTEGER)")
db.execute("INSERT INTO coupons VALUES ('DC33_GOLD', 0)")
print("race_attempt_1=", atomic_redeem_coupon(db, "DC33_GOLD"))
print("race_attempt_2=", atomic_redeem_coupon(db, "DC33_GOLD"))
```

### Шаг 2. Запусти программу и изучи результаты каждого испытания

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
signed_bug= ('VULNERABLE_SIGNED_BYPASS', 65520)
unsigned_fix= ('SAFE_REJECTED:exceeds_64', 0)
deceit_vuln= GATEWAY=ping->BACKEND=dump_secrets
deceit_fixed= BLOCKED_DECEIT:ambiguous_duplicate_parameter
race_attempt_1= REDEEM_OK:flag_granted
race_attempt_2= REJECTED_RACE:already_used
```

Разберём, что показала проверка:
- в `parse_packet_length` байты `\xff\xf0` при знаковой распаковке `>h` превратились в `-16`, обошли проверку `<= 64` и вызвали копирование `65520` байт, а беззнаковая распаковка `>H` сразу отклонила пакет (`SAFE_REJECTED:exceeds_64`);
- в `gateway_vs_backend_parser` дублирующийся параметр `action` обманул несогласованную пару «шлюз + бэкенд» (`GATEWAY=ping->BACKEND=dump_secrets`), но был заблокирован каноническим запретом дубликатов;
- в `atomic_redeem_coupon` первый вызов получил `cur.rowcount == 1` (`REDEEM_OK:flag_granted`), а повторный параллельный вызов на том же купоне `DC33_GOLD` получил `cur.rowcount == 0` (`REJECTED_RACE:already_used`).

### Шаг 3. Проверь разницу между `>h` и `>H` в модуле `struct` в терминале Kali

В файле `lab.py` замени `b"\xff\xf0"` во втором вызове `parse_packet_length` на `b"\x00\x20"` (`32` байта), сохрани и запусти `python3 lab.py` — пакет штатно пройдёт проверку (`('SAFE_ACCEPTED', 32)`). После проверки верни `b"\xff\xf0"`.

В терминале Kali проверь распаковку двух байт `0xff 0xff` как знакового `int16` и беззнакового `uint16`:

```bash
python3 -c 'import struct; print("int16=", struct.unpack(">h", b"\xff\xff")[0], "uint16=", struct.unpack(">H", b"\xff\xff")[0])'
```

## Почему это работает: Почему `cur.rowcount` в атомарном `UPDATE` защищает без внешних блокировок приложения

Когда СУБД выполняет один оператор `UPDATE coupons SET used = 1 WHERE code = ? AND used = 0`, сам движок базы данных берёт внутреннюю блокировку строки на время проверки условия `used = 0` и изменения значения на `1`. Поэтому ни один второй поток не может вклиниться между проверкой и записью.

## Если не получилось: Частые ошибки

- **Использование нижней границы `if signed_len <= 64` без проверки `signed_len >= 0`**: в языках C/C++ размеры буферов всегда должны храниться в беззнаковых типах `size_t` / `uint16_t` / `uint32_t`, чтобы отрицательные значения вообще не существовали в типе данных.
