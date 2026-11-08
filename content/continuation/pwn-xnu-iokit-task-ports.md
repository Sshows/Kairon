## Перед началом: Как программы в macOS/iOS общаются с драйверами IOKit и почему Task Port даёт полный контроль над процессом

В модулях **Mach Ports** (`Task Port: Read`, `Task Port: Write`, `Exception Port`) и **IOKit** (`Connect to me`, `Talk to my client`, `externalMethod`) практикума **XNU Dojo (`xnu-dojo`)** на платформе `pwn.college` разбирают два центральных механизма безопасности ядра **XNU** (на котором работают macOS, iOS, iPadOS):
1. что такое **порт задачи (`mach_task_self()` / Task Port)** и почему передача права `Send Right` на свой `Task Port` другому процессу равносильна передаче ключей от всей виртуальной памяти процесса;
2. как пользовательская программа подключается к объектно-ориентированным драйверам ядра **IOKit** через `IOServiceOpen` и вызывает внешние методы драйвера (`IOConnectCallMethod` -> таблица **`IOExternalMethodDispatch`**).

Представь два уровня доступа в лабораторию. На первом уровне у каждого процесса есть его главный мастер-ключ — **Task Port**. Тот, у кого в руках есть право отправлять команды в `Task Port` процесса, может вызывать функции ядра `mach_vm_read` и `mach_vm_write`, то есть напрямую читать и переписывать любые страницы памяти этого процесса и менять регистры его потоков!

На втором уровне процесс хочет обратиться к драйверу оборудования (например, видеокарты или контроллера USB) в подсистеме **IOKit**. Для этого он просит драйвер открыть клиентский шлюз — объект **`IOUserClient`**, и передаёт туда номер вызываемой операции (`selector`) и массив входных чисел (`scalarInput`) или структуру (`structInput`). Драйвер внутри ядра обязан сверить `selector` и точное количество аргументов по таблице **`IOExternalMethodDispatch`**, прежде чем вызывать функцию ядра!

## Почему это работает: Права `Task Port` / `Exception Port` и диспетчер `IOExternalMethodDispatch` в IOKit

Разберём устройство обоих механизмов ядра XNU:

1. **Пространство имён Mach-портов и опасность утечки `Task Port`**:
   - внутри каждого процесса имена Mach-портов — это обычные 32-битные числа (аналоги файловых дескрипторов `fd` в Linux), но сами очереди и таблица прав (`IPC Space`) хранятся строго внутри ядра XNU;
   - если процесс по ошибке отправляет в чужой порт сообщение с дескриптором своего `mach_task_self()` (передаёт право `MACH_MSG_TYPE_COPY_SEND`), получатель получает законное право вызывать `mach_vm_read` / `mach_vm_write` над памятью отправителя;
   - аналогично работает **Exception Port (порт исключений)**: когда в процессе происходит сбой (например, деление на ноль или `SIGSEGV` / `EXC_BAD_ACCESS`), ядро XNU отправляет Mach-сообщение с текущими регистрами потока (`Thread State`) в назначенный `Exception Port` и ждёт ответа с обновлёнными регистрами. Если сторонний процесс смог зарегистрировать свой порт как `Exception Port` задачи, при любом исключении он может изменить регистр счётчика команд `PC`!
2. **Как устроен вызов драйвера `IOKit` через `IOUserClient`**:
   - пользовательское приложение находит сервис в реестре `IORegistry` (`IOServiceGetMatchingService`), открывает соединение `IOServiceOpen(..., &connect)` (внутри ядра создаётся экземпляр класса-наследника `IOUserClient`) и вызывает `IOConnectCallMethod(connect, selector, scalarIn, scalarInCount, structIn, structInSize, ...)`;
   - внутри ядра метод `externalMethod()` ищет запись `dispatch = &table[selector]` в массиве структур **`IOExternalMethodDispatch`**, где для каждого селектора жёстко прописаны четыре числа:
     - `checkScalarInputCount` — точное ожидаемое число 64-битных скалярных аргументов;
     - `checkStructureInputSize` — ожидаемый размер входной структуры в байтах;
     - `checkScalarOutputCount` и `checkStructureOutputSize`.
   - если драйвер в старом переопределённом методе вызывал функции по `selector` без проверки границ `selector < method_count` или без сверки размеров `checkScalarInputCount` / `checkStructureInputSize`, возникал выход за границы таблицы методов или переполнение буфера в ядре!

<!-- preparation -->

## Сделай сейчас: Практика: проверь диспетчер `IOExternalMethodDispatch` в IOKit и контроль прав `Task Port`

### Шаг 1. Сохрани код в файл `lab.py`

Вставь следующий код в открытый редактор Mousepad, нажми **Ctrl+S** и закрой редактор:

```python
IOKIT_DISPATCH_TABLE = {
    0: {"name": "s_say_hi", "scalar_in": 0, "struct_in": 0},
    1: {"name": "s_read_num", "scalar_in": 1, "struct_in": 0},
    2: {"name": "s_write_config", "scalar_in": 2, "struct_in": 16},
}


def iokit_external_method(selector, scalar_args, struct_bytes):
    if selector not in IOKIT_DISPATCH_TABLE:
        return "kIOReturnBadArgument:invalid_selector"
    spec = IOKIT_DISPATCH_TABLE[selector]
    if len(scalar_args) != spec["scalar_in"]:
        return "kIOReturnBadArgument:scalar_count_mismatch"
    if len(struct_bytes) != spec["struct_in"]:
        return "kIOReturnBadArgument:struct_size_mismatch"
    return f"kIOReturnSuccess:{spec['name']}"


def mach_vm_operation(caller_send_rights, target_task_port, op, has_entitlement=True):
    if not has_entitlement:
        return "KERN_NO_ACCESS:missing_task_for_pid_entitlement"
    if target_task_port not in caller_send_rights:
        return "KERN_INVALID_RIGHT:no_send_right_to_task_port"
    return f"KERN_SUCCESS:{op}:port={target_task_port}"


print("iokit_valid=", iokit_external_method(2, [10, 20], b"A" * 16))
print("iokit_bad_selector=", iokit_external_method(99, [], b""))
print("iokit_bad_struct_size=", iokit_external_method(2, [10, 20], b"A" * 64))
print("task_port_authorized=", mach_vm_operation({"port_self", "port_child"}, "port_child", "mach_vm_read"))
print("task_port_blocked=", mach_vm_operation({"port_self"}, "port_other", "mach_vm_write"))
```

### Шаг 2. Запусти программу и изучи коды возврата IOKit и Mach

В терминале выполни:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
iokit_valid= kIOReturnSuccess:s_write_config
iokit_bad_selector= kIOReturnBadArgument:invalid_selector
iokit_bad_struct_size= kIOReturnBadArgument:struct_size_mismatch
task_port_authorized= KERN_SUCCESS:mach_vm_read:port=port_child
task_port_blocked= KERN_INVALID_RIGHT:no_send_right_to_task_port
```

Разберём каждую строку:
- в `iokit_valid` селектор `2` (`s_write_config`) получил ровно 2 скалярных аргумента `[10, 20]` и структуру ровно из 16 байт — все поля таблицы `IOExternalMethodDispatch` сошлись (`kIOReturnSuccess:s_write_config`);
- в `iokit_bad_selector` селектор `99` выходит за пределы таблицы методов и немедленно отклоняется с кодом `kIOReturnBadArgument:invalid_selector`;
- в `iokit_bad_struct_size` вместо 16-байтовой структуры передали 64 байта: таблица `IOExternalMethodDispatch` остановила вызов до входа в целевую функцию драйвера (`kIOReturnBadArgument:struct_size_mismatch`);
- в `task_port_authorized` и `task_port_blocked` операция `mach_vm_read` проходит только при наличии явного права `Send Right` на целевой `Task Port` в таблице портов вызывающего процесса и разрешённого `Entitlement`.

### Шаг 3. Проверь несовпадение числа скалярных аргументов в IOKit

В файле `lab.py` измени список `[10, 20]` в вызове `iokit_valid` на `[10]` (один скаляр вместо двух), сохрани и запусти `python3 lab.py`. Диспетчер `iokit_external_method` сразу вернёт `kIOReturnBadArgument:scalar_count_mismatch`. После проверки верни `[10, 20]`.

В терминале Kali проверь упаковку 64-битных скалярных аргументов и структуры в единый бинарный буфер сообщения с помощью `struct`:

```bash
python3 -c 'import struct; msg = struct.pack("<IIQQ", 2, 16, 10, 20); print("packed_len=", len(msg), "unpacked=", struct.unpack("<IIQQ", msg))'
```

## Почему это работает: Защита `Task Port` и `DriverKit` в современных версиях XNU

Чтобы свести к минимуму риск ошибок в драйверах ядра, в современных версиях macOS и iOS придерживаются двух архитектурных принципов:
1. доступ к чужим `Task Port` (`task_for_pid`) закрыт защитой **SIP (System Integrity Protection)** и требует криптографически подписанного разрешения в бинарнике (`com.apple.security.cs.debugger`) вместе с проверкой вектора `cs_flags`;
2. большинство новых драйверов (USB, сетевых карт, аудио) вынесены из пространства ядра `Ring 0` в непривилегированные пользовательские процессы с помощью фреймворка **DriverKit**.

## Если не получилось: Частые ошибки

- **Использование константы `kIOUCVariableStructureSize` без ручной проверки верхней границы**: если в таблице `IOExternalMethodDispatch` разработчик драйвера указывает `kIOUCVariableStructureSize` (`0xFFFFFFFF`, переменный размер структуры), то базовый класс `IOUserClient` пропускает любую длину, и функция драйвера обязана сама явно проверить `arguments->structureInputSize >= sizeof(MyHeader) && arguments->structureInputSize <= MAX_ALLOWED`.
