## Перед началом: Как устроен исполняемый файл PE в Windows и как ядро проверяет токены и списки доступа ACL

В практикуме **Windows Warzone (`windows-dojo`)** на платформе `pwn.college` (модули `Windows Crash Course`, `Alloc For What?`, `How to open a File`, `Cookie Monster`, `Injection and Hijacking`) разбирают внутреннее устройство операционной системы Windows со стороны системного программиста и инженера безопасности: формат исполняемых файлов **PE (Portable Executable)**, работу с памятью и файлами через функции **Win32 API** (`VirtualAlloc`, `CreateFileW`), а также модель безопасности Windows на основе **дескрипторов (Handles)**, **токенов доступа (Access Tokens)** и **списков контроля доступа (DACL)**.

Представь крупный бизнес-центр, где вместо обычных связок ключей используется электронная пропускная система. При входе в здание сотрудник проходит турникет и получает пластиковый бейдж (**Access Token процесса**), в памяти которого записаны его личный идентификатор (**User SID**), список отделов, в которых он состоит (**Group SIDs**), и особые должностные полномочия (**Privileges**, например `SeDebugPrivilege` или `SeBackupPrivilege`). Когда сотрудник хочет открыть сейф с документами (вызывает `CreateFileW`), на двери сейфа висит собственный список правил (**DACL — Discretionary Access Control List**), который сверху вниз проверяет записи **ACE (Access Control Entry)**: сначала правила явного запрета (`ACCESS_DENIED_ACE`), а затем правила разрешения (`ACCESS_ALLOWED_ACE`). Если доступ разрешён, система выдаёт сотруднику временный номерной жетон — **дескриптор (`HANDLE`)**, по которому он может читать или писать в файл.

## Почему это работает: Заголовок PE (`MZ` -> `PE\0\0`), таблица импорта IAT и проверка DACL в Windows

Разберём три фундаментальных компонента архитектуры Windows:

1. **Структура исполняемого файла PE (`.exe`, `.dll`, `.sys`)**:
   - любой PE-файл начинается со старого 64-байтового заголовка MS-DOS (`IMAGE_DOS_HEADER`), первые два байта которого всегда равны `MZ` (`0x4D`, `0x5A`);
   - по смещению `0x3C` (`60` байт от начала файла) записано 4-байтовое число `e_lfanew` — смещение к настоящему заголовку Windows `IMAGE_NT_HEADERS`, который начинается с 4-байтовой сигнатуры `PE\0\0` (`0x50 0x45 0x00 0x00`);
   - внутри `OptionalHeader` хранятся базовый адрес загрузки `ImageBase` (обычно `0x140000000` для 64-битных `.exe` до применения ASLR), точка входа `AddressOfEntryPoint` и каталог таблиц, включая **таблицу импорта (`IAT — Import Address Table`)** — точный аналог таблицы `GOT` из Linux ELF, куда загрузчик Windows записывает адреса функций из `kernel32.dll` и `ntdll.dll`.
2. **Выделение памяти (`VirtualAlloc` / `VirtualProtect`) и защита стека (`Security Cookie /GS`)**:
   - в отличие от битов `rwx` в Linux, в Windows права страниц виртуальной памяти задаются константами `PAGE_READONLY`, `PAGE_READWRITE`, `PAGE_EXECUTE_READ` (для кода `.text`), а одновременное разрешение записи и выполнения (`PAGE_EXECUTE_READWRITE`) контролируется защитой **DEP (Data Execution Prevention)** и **ACG (Arbitrary Code Guard)**;
   - аналогом канарейки стека в компиляторе MSVC (флаг `/GS`) служит **Security Cookie** (в модуле `Cookie Monster`): перед возвратом из функции вызывается `__security_check_cookie`, который сверяет значение на стеке с глобальной переменной `__security_cookie` (проксоренной с адресом кадра `RSP`).
3. **Токен процесса (Access Token), привилегии и проверка списка `DACL`**:
   - у каждого защищаемого объекта Windows (файла, ключа реестра, процесса, именованного канала) есть дескриптор безопасности (**Security Descriptor**), содержащий владельца (`Owner SID`) и список правил **DACL**;
   - когда процесс запрашивает доступ с маской `desired_access` (например, `GENERIC_READ | GENERIC_WRITE`), ядро Windows (`SeAccessCheck`) просматривает записи `ACE` в `DACL` **строго по порядку**:
     - если встретилась запись `DENY` для `SID` пользователя или его группы, накладывающаяся на запрашиваемые права, доступ **немедленно отклоняется** (`ERROR_ACCESS_DENIED`), даже если ниже по списку стоит `ALLOW`;
     - доступ разрешается только тогда, когда все запрошенные биты прав были явно покрыты записями `ALLOW` (и не попали ни под один `DENY`).

<!-- preparation -->

## Сделай сейчас: Практика: разбери заголовок PE (`MZ` / `PE\0\0`) и алгоритм проверки прав `DACL`

### Шаг 1. Сохрани код в файл `lab.py`

Вставь следующий код в открытый редактор Mousepad, нажми **Ctrl+S** и закрой редактор:

```python
def parse_pe_headers(raw_bytes):
    if raw_bytes[:2] != b"MZ":
        return {"valid_pe": False}
    e_lfanew = int.from_bytes(raw_bytes[0x3C:0x40], "little")
    if raw_bytes[e_lfanew : e_lfanew + 4] != b"PE\x00\x00":
        return {"valid_pe": False}
    machine = int.from_bytes(raw_bytes[e_lfanew + 4 : e_lfanew + 6], "little")
    arch = "x86_64" if machine == 0x8664 else hex(machine)
    return {"valid_pe": True, "pe_offset": hex(e_lfanew), "arch": arch}


def evaluate_dacl(token_sids, dacl_aces, desired_rights):
    granted = set()
    for ace_type, sid, rights in dacl_aces:
        if sid not in token_sids:
            continue
        if ace_type == "DENY" and (rights & desired_rights):
            return "ERROR_ACCESS_DENIED:explicit_deny", sorted(granted)
        if ace_type == "ALLOW":
            granted |= (rights & desired_rights)
            if granted == set(desired_rights):
                return "STATUS_SUCCESS:handle_issued", sorted(granted)
    return "ERROR_ACCESS_DENIED:insufficient_allow", sorted(granted)


pe_buf = bytearray(128)
pe_buf[0:2] = b"MZ"
pe_buf[0x3C:0x40] = (0x80).to_bytes(4, "little")
pe_buf[0x80:0x84] = b"PE\x00\x00"
pe_buf[0x84:0x86] = (0x8664).to_bytes(2, "little")

dacl = [
    ("DENY", "SID_GUESTS", {"WRITE"}),
    ("ALLOW", "SID_USERS", {"READ", "WRITE"}),
]

print("pe_info=", parse_pe_headers(bytes(pe_buf)))
print("user_read_write=", evaluate_dacl({"SID_ALICE", "SID_USERS"}, dacl, {"READ", "WRITE"}))
print("guest_write_blocked=", evaluate_dacl({"SID_BOB", "SID_USERS", "SID_GUESTS"}, dacl, {"WRITE"}))
```

### Шаг 2. Запусти программу и изучи разбор PE и работу `DACL`

В терминале выполни:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
pe_info= {'valid_pe': True, 'pe_offset': '0x80', 'arch': 'x86_64'}
user_read_write= ('STATUS_SUCCESS:handle_issued', ['READ', 'WRITE'])
guest_write_blocked= ('ERROR_ACCESS_DENIED:explicit_deny', [])
```

Разберём все три результата:
- `parse_pe_headers` проверил сигнатуру `MZ` в начале файла, прочитал 4-байтовое смещение `e_lfanew` по адресу `0x3C` (`0x80`), убедился, что по смещению `0x80` стоит сигнатура `PE\x00\x00`, и прочитал код архитектуры `0x8664` (`AMD64 / x86_64`);
- в `user_read_write` токен пользователя содержит `{"SID_ALICE", "SID_USERS"}`. Первое правило `("DENY", "SID_GUESTS", {"WRITE"})` к нему не относится, а второе правило `("ALLOW", "SID_USERS", {"READ", "WRITE"})` выдаёт оба запрошенных права (`STATUS_SUCCESS:handle_issued`);
- в `guest_write_blocked` пользователь входит одновременно и в `SID_USERS`, и в `SID_GUESTS`. Так как канонический порядок правил в `DACL` ставит записи `DENY` перед `ALLOW`, проверка останавливается на первом же правиле с `ERROR_ACCESS_DENIED:explicit_deny`.

### Шаг 3. Проверь запрос только чтения (`READ`) для гостя и просмотр PE-файлов в Kali

В файле `lab.py` измени последнее множество `{"WRITE"}` в вызове `guest_write_blocked` на `{"READ"}`, сохрани и запусти `python3 lab.py`. Поскольку правило `DENY` для `SID_GUESTS` запрещает только `WRITE`, запрос на `READ` пройдёт мимо него ко второму правилу и завершится успехом: `('STATUS_SUCCESS:handle_issued', ['READ'])`. После проверки верни `{"WRITE"}`.

В Kali Linux для анализа исполняемых файлов Windows (`.exe` / `.dll`) предустановлены утилиты `file` и `objdump` (который понимает не только `ELF`, но и формат `PE32+`):

```bash
python3 -c 'b=b"MZ"+b"\x00"*58+(64).to_bytes(4,"little")+b"PE\x00\x00\x64\x86"; print("dos_magic=", b[:2], "nt_sig=", b[64:68])'
```

## Почему это работает: Сравнение защитных механизмов Linux (ELF) и Windows (PE)

Теперь ты видишь, что при разных названиях API обе операционные системы решают одни и те же задачи защиты памяти и доступа:
- `ELF` (`.text`, `.got.plt`) в Linux соответствует `PE` (`.text`, `IAT`) в Windows;
- `Stack Canary` (`-fstack-protector`) соответствует `Security Cookie` (`/GS`);
- `NX` + `ASLR`/`PIE` соответствуют `DEP` + `ASLR` (`/DYNAMICBASE`);
- проверка `UID`/`GID` и списков `POSIX ACL` соответствует проверке `Access Token (SIDs + Privileges)` и списков `DACL`.

## Если не получилось: Частые ошибки

- **Нарушение канонического порядка записей `ACE` в `DACL`**: если администратор или программа вручную добавляет запись `ALLOW` в начало списка `DACL` **перед** записью `DENY`, то проверка `SeAccessCheck`, идущая сверху вниз, может выдать разрешение до того, как дойдёт до запрета. Поэтому стандартные инструменты Windows (`icacls`) всегда автоматически сортируют `DACL` так, чтобы все явные `DENY` стояли строго выше всех `ALLOW`.
