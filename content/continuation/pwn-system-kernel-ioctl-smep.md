## Перед началом: Как пользовательская программа общается с модулем ядра и зачем нужны SMEP и SMAP

В модулях **Kernel Security** и **System Exploitation** курса **System Security** (`pwn.college`) изучают границу между пространством пользователя (**User Space / Ring 3**) и пространством ядра операционной системы (**Kernel Space / Ring 0**): как драйверы устройств принимают команды через системные вызовы `read`, `write` и `ioctl`, почему ядро не имеет права напрямую разыменовывать пользовательские указатели и как аппаратные биты процессора **SMEP**, **SMAP** и **KPTI** защищают ядро.

Представь бронированное банковское окошко между клиентским залом (`Ring 3`) и кассовым хранилищем (`Ring 0`). Клиент не может сам зайти в хранилище, но может подать письменный бланк запроса через выдвижной лоток (**вызов `ioctl` к файлу устройства `/dev/...`**). Кассир внутри хранилища обязан сначала аккуратно переложить бланк из лотка на свой внутренний стол и проверить его размер (**функции ядра `copy_from_user` и `copy_to_user`**). Если же кассир вместо этого высунется в клиентский зал и начнёт выполнять инструкции с листка, который клиент держит в руках и может в любой момент подменить, безопасность хранилища рухнет!

## Почему это работает: Вызов `ioctl`, `copy_from_user` и аппаратные барьеры SMEP/SMAP

Разберём архитектуру защиты ядра Linux на `x86-64`:

1. **Кольца защиты процессора (`Ring 3` против `Ring 0`)**. Обычные процессы работают в непривилегированном режиме `Ring 3`: им запрещены прямые операции ввода-вывода в порты и доступ к страницам памяти ядра (расположенным в верхнем полупространстве виртуальных адресов `0xffff800000000000` и выше). Переход в `Ring 0` происходит строго по системному вызову (`syscall`) или аппаратному прерыванию.
2. **Взаимодействие с драйверами через `/dev/...` и `ioctl`**. Модули ядра (файлы `.ko`) часто регистрируют символьное устройство в `/dev/` и обрабатывают управляющие команды через системный вызов `ioctl(fd, cmd, user_ptr)`. В обработчике `ioctl` ядро получает `user_ptr` — адрес буфера в памяти пользователя (`Ring 3`).
3. **Зачем обязательны `copy_from_user` и `copy_to_user`**:
   - функция `copy_from_user(kernel_buf, user_ptr, size)` сначала проверяет, что весь диапазон `[user_ptr, user_ptr + size)` действительно принадлежит пользовательскому пространству (`< TASK_SIZE`), а не указывает внутрь самого ядра;
   - кроме того, если в обработчике `ioctl` размер `size` передаётся от пользователя со знаком (`int size`) или превышает размер буфера `kernel_buf`, возникает переполнение буфера в ядре или утечка памяти ядра в `copy_to_user`.
4. **Аппаратные рубежи защиты ядра (`SMEP`, `SMAP`, `KPTI`)**:
   - **SMEP (Supervisor Mode Execution Prevention)** — бит в регистре управления процессора `CR4`: если процессор находится в режиме ядра (`Ring 0`) и пытается **выполнить код** со страницы памяти, помеченной как пользовательская (`User`), процессор мгновенно вызывает аппаратную панику (Kernel Oops / Panic);
   - **SMAP (Supervisor Mode Access Prevention)** — запрещает ядру даже **читать и писать** в пользовательские страницы памяти напрямую в обход официальных функций `copy_from_user` / `copy_to_user` (которые временно разрешают доступ на время безопасного копирования);
   - **KPTI (Kernel Page Table Isolation)** — разделяет таблицы страниц памяти между `Ring 3` и `Ring 0`, чтобы из пользовательского режима нельзя было узнать карту адресов ядра.

<!-- preparation -->

## Сделай сейчас: Практика: проверь валидацию буфера в обработчике `ioctl` и работу SMEP/SMAP

### Шаг 1. Сохрани код в файл `lab.py`

Вставь следующий код в открытый редактор Mousepad, нажми **Ctrl+S** и закрой редактор:

```python
USER_SPACE_LIMIT = 0x00007FFFFFFFFFFF
KERNEL_BUF_MAX = 64


def handle_kernel_ioctl(user_ptr, length, direct_deref=False, smap_enabled=True):
    if direct_deref and smap_enabled:
        return "kernel_oops:smap_violation_direct_user_access"
    if not (0 < length <= KERNEL_BUF_MAX):
        return "errno:EINVAL_invalid_length"
    if user_ptr < 0x1000 or user_ptr + length > USER_SPACE_LIMIT:
        return "errno:EFAULT_bad_user_address"
    return f"copy_from_user_ok:bytes={length}"


def check_kernel_exec(rip_addr, smep_enabled=True):
    is_user_page = rip_addr <= USER_SPACE_LIMIT
    if is_user_page and smep_enabled:
        return "kernel_oops:smep_violation_user_page_exec"
    return f"kernel_exec_ok:{hex(rip_addr)}"


print("valid_ioctl=", handle_kernel_ioctl(0x7FFFFFFFE000, 32))
print("kernel_addr_leak_attempt=", handle_kernel_ioctl(0xFFFFFFFF81000000, 32))
print("direct_deref_smap=", handle_kernel_ioctl(0x7FFFFFFFE000, 32, direct_deref=True, smap_enabled=True))
print("smep_check=", check_kernel_exec(0x401150, smep_enabled=True))
```

### Шаг 2. Запусти программу и изучи четыре сценария

В терминале выполни:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
valid_ioctl= copy_from_user_ok:bytes=32
kernel_addr_leak_attempt= errno:EFAULT_bad_user_address
direct_deref_smap= kernel_oops:smap_violation_direct_user_access
smep_check= kernel_oops:smep_violation_user_page_exec
```

Разберём результаты:
- в `valid_ioctl` указатель `0x7FFFFFFFE000` лежит в пользовательском адресном пространстве (`<= USER_SPACE_LIMIT`), а размер `32` укладывается в `1..64`, поэтому `copy_from_user` выполняется успешно (`copy_from_user_ok:bytes=32`);
- в `kernel_addr_leak_attempt` в качестве пользовательского буфера передан адрес из пространства ядра `0xFFFFFFFF81000000`: проверка границы `USER_SPACE_LIMIT` в `copy_from_user` отклоняет его с кодом системной ошибки `EFAULT` (`errno:EFAULT_bad_user_address`);
- в `direct_deref_smap` драйвер попытался обратиться к пользовательскому указателю напрямую без `copy_from_user`: включённый бит **SMAP** мгновенно остановил обращение (`kernel_oops:smap_violation_direct_user_access`);
- в `smep_check` при попытке передать управление в режиме `Ring 0` на пользовательскую страницу `0x401150` срабатывает аппаратная защита **SMEP** (`kernel_oops:smep_violation_user_page_exec`).

### Шаг 3. Проверь переполнение длины и флаги защиты процессора в Kali

В файле `lab.py` измени размер `32` в `valid_ioctl` на `128` (больше `KERNEL_BUF_MAX = 64`), сохрани и запусти `python3 lab.py`. Обработчик сразу вернёт `errno:EINVAL_invalid_length`, предотвратив переполнение буфера в ядре. После проверки верни `32`.

В терминале Kali ты можешь проверить поддержку аппаратных защит `smep`, `smap` и изоляции таблиц страниц `pti` на своём процессоре и в ядре:

```bash
grep -E -o "smep|smap|pti" /proc/cpuinfo | sort -u
```

## Почему это работает: Ограничение чтения адресов ядра (`kptr_restrict` и `dmesg_restrict`)

Помимо аппаратных барьеров процессора (`SMEP`, `SMAP`, `KPTI`) и рандомизации базового адреса ядра (**KASLR**), современные дистрибутивы Linux включают параметры `sysctl`:
- `kernel.kptr_restrict = 1` (или `2`) — скрывает реальные адреса символов ядра в `/proc/kallsyms`, заменяя их нулями для непривилегированных пользователей;
- `kernel.dmesg_restrict = 1` — запрещает обычным процессам читать кольцевой буфер логов ядра `dmesg`, чтобы в случае отладочного сообщения из него нельзя было подсмотреть адреса памяти ядра.

## Если не получилось: Частые ошибки

- **Почему проверка `length <= KERNEL_BUF_MAX` в C опасна, если `length` имеет тип `int`**: если пользователь передаст отрицательное число `length = -10`, условие `-10 <= 64` окажется истинным, а при последующей передаче в `copy_from_user(..., (size_t)length)` число `-10` превратится в огромное беззнаковое число и вызовет переполнение. Поэтому длину в обработчиках ядра всегда объявляют как `size_t` и проверяют `length <= KERNEL_BUF_MAX`.
