## Перед началом: Где именно в памяти ядра Linux хранится паспорт процесса (`struct cred`) и как современные ядра защищают его от подмены

В заключительном модуле **Kernel Exploitation** курса **Software Exploitation** и модуле **System Exploitation** курса **System Security** (`pwn.college`) разбирают то, к чему сводятся практически все исследования безопасности ядра Linux: где ядро хранит идентификаторы прав каждого процесса (**структура `struct cred`** внутри **`struct task_struct`**), почему глобальная переменная **`modprobe_path`** долгое время служила мишенью для примитивов произвольной записи в ядре и какие архитектурные защиты (выделенный кэш `cred_jar`, `STATIC_USERMODEHELPER`, `RANDSTRUCT` и `CFI`) закрывают эти векторы в современных ядрах Linux.

Представь главное картотечное бюро завода (ядро Linux). На каждого работающего сотрудника (каждый запущенный процесс с номером `PID`) в картотеке заведена большая папка — **`struct task_struct`**. Внутри этой папки лежит вкладыш с печатью — **удостоверение прав (`struct cred`)**, где прямо в числовых полях записано: `uid = 1000`, `euid = 1000`, `gid = 1000`, а также битовая маска специальных возможностей (**Linux Capabilities**, `cap_effective`).

Когда процесс вызывает `open("/etc/shadow", O_RDONLY)`, ядро вообще не спрашивает процесс, кто он такой — ядро просто заглядывает в его собственный вкладыш `current->cred->euid` внутри памяти `Ring 0`! Если в `euid` записан `0`, ядро считает процесс суперпользователем `root`!

## Почему это работает: Паспорт процесса `struct cred`, переменная `modprobe_path` и эшелонированная защита ядра

Разберём три ключевых механизма внутренней безопасности ядра Linux:

1. **Неизменяемость `struct cred` и функция `commit_creds(prepare_kernel_cred(...))`**:
   - в ядре Linux указатель `cred` внутри структуры процесса `task_struct` помечен как `const struct cred *cred`. Когда легитимному системному вызову (например, `setuid` или запуску `sudo`) нужно официально сменить права процесса, ядро не переписывает старую структуру на месте, а выделяет в специальном кэше кучи ядра (`cred_jar`) новую структуру через `prepare_kernel_cred()` и атомарно заменяет указатель вызовом `commit_creds()`;
   - раньше, если в драйвере ядра возникала ошибка `Use-After-Free` в общем аллокаторе `kmalloc`, злоумышленники пытались разместить на месте освобождённого буфера драйвера новую структуру `struct cred` и обнулить в ней поля `uid` / `euid`.
   - **Защита `cred_jar` и `kmalloc-cg`**: в современных ядрах Linux структуры `struct cred` выделяются в **строго отдельном изолированном слэб-кэше `cred_jar` (`SLAB_ACCOUNT`)**, который физически отделён от обычных буферов `kmalloc-192`, чтобы переполнение или `UAF` в обычном буфере драйвера не могло пересечься со структурами `struct cred`!
2. **Механизм `usermodehelper` и защита `CONFIG_STATIC_USERMODEHELPER`**:
   - когда ядро Linux встречает неизвестный формат исполняемого файла или неизвестный сетевой протокол, оно может автоматически вызвать вспомогательную программу в пространстве пользователя (`Ring 3`) с правами `root` — путь к этой программе хранится в глобальной строке ядра **`modprobe_path`** (по умолчанию `"/sbin/modprobe"`), доступной через `/proc/sys/kernel/modprobe`;
   - если в драйвере ядра была уязвимость произвольной записи (`Arbitrary Address Write` в память ядра), перезапись строки `modprobe_path` на путь к пользовательскому скрипту `"/tmp/ script.sh"` приводила к его запуску от имени `root`;
   - **Защита**: в защищённых сборках ядра включают опцию **`CONFIG_STATIC_USERMODEHELPER`**, которая переводит путь к помощнику в неизменяемую память только для чтения (`.rodata`), так что даже перезапись `modprobe_path` больше не меняет вызываемый бинарный файл!
3. **Изоляция возможностей (`Linux Capabilities`) вместо полного `root`**:
   - даже процессу с `euid = 0` в контейнерах и системных службах отрезают ненужные биты в `cred->cap_effective` (например, сбрасывают `CAP_SYS_MODULE` — право загружать модули ядра `.ko`, и `CAP_SYS_RAWIO`), чтобы ограничить полномочия сервиса минимально необходимой задачей.

<!-- preparation -->

## Сделай сейчас: Практика: проверь изоляцию кэша `cred_jar`, защиту `STATIC_USERMODEHELPER` и битовую маску `Capabilities`

### Шаг 1. Сохрани код в файл `lab.py`

Вставь следующий код в открытый редактор Mousepad, нажми **Ctrl+S** и закрой редактор:

```python
def allocate_kernel_object(obj_type, isolated_cred_jar=True):
    if obj_type == "struct_cred":
        return "slab:cred_jar_isolated" if isolated_cred_jar else "slab:kmalloc_192_shared"
    return "slab:kmalloc_192_shared"


def resolve_usermodehelper(modprobe_var, static_helper_enabled=True):
    if static_helper_enabled:
        return "/sbin/usermode-helper-rodata"
    return modprobe_var


def check_kernel_capability(cred_euid, cap_effective_set, required_cap):
    if cred_euid != 0:
        return f"EPERM:non_root_euid={cred_euid}"
    if required_cap not in cap_effective_set:
        return f"EPERM:missing_capability:{required_cap}"
    return f"ALLOWED:{required_cap}"


cred_pool = allocate_kernel_object("struct_cred", isolated_cred_jar=True)
buf_pool = allocate_kernel_object("driver_buffer", isolated_cred_jar=True)

helper_path = resolve_usermodehelper("/tmp/untrusted.sh", static_helper_enabled=True)

container_caps = {"CAP_NET_BIND_SERVICE", "CAP_CHOWN"}

print("pools_separated=", cred_pool != buf_pool, "cred_pool=", cred_pool)
print("safe_helper_path=", helper_path)
print("bind_port_check=", check_kernel_capability(0, container_caps, "CAP_NET_BIND_SERVICE"))
print("load_module_check=", check_kernel_capability(0, container_caps, "CAP_SYS_MODULE"))
```

### Шаг 2. Запусти программу и изучи три рубежа защиты ядра

В терминале выполни:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
pools_separated= True cred_pool= slab:cred_jar_isolated
safe_helper_path= /sbin/usermode-helper-rodata
bind_port_check= ALLOWED:CAP_NET_BIND_SERVICE
load_module_check= EPERM:missing_capability:CAP_SYS_MODULE
```

Разберём каждую строку:
- в `pools_separated` включена изоляция слэб-кэша (`isolated_cred_jar=True`): структура `struct_cred` выделяется в `slab:cred_jar_isolated`, а обычный буфер драйвера — в `slab:kmalloc_192_shared`. Так как пулы памяти физически разделены (`pools_separated= True`), освобождённый буфер драйвера никогда не пересечётся с паспортом процесса `struct cred`;
- в `safe_helper_path` режим `STATIC_USERMODEHELPER` (`static_helper_enabled=True`) игнорирует изменённую переменную `modprobe_var` и вызывает только неизменяемый путь из `.rodata` (`/sbin/usermode-helper-rodata`);
- в `bind_port_check` и `load_module_check` процесс даже при `euid = 0` может занять привилегированный сетевой порт (`CAP_NET_BIND_SERVICE`), но не может загрузить модуль ядра без `CAP_SYS_MODULE` (`EPERM:missing_capability:CAP_SYS_MODULE`).

### Шаг 3. Проверь текущий путь `modprobe` и маску `CapEff` своего процесса в Kali

В файле `lab.py` измени `isolated_cred_jar=True` в вызове `cred_pool` на `isolated_cred_jar=False`, сохрани и запусти `python3 lab.py`. Ты увидишь, что без изоляции кэшей оба объекта попадают в один и тот же пул `slab:kmalloc_192_shared` (`pools_separated= False`). После проверки верни `isolated_cred_jar=True`.

В терминале Kali ты можешь прямо сейчас посмотреть битовую маску эффективных возможностей (`CapEff`) собственного процесса и текущее значение `/proc/sys/kernel/modprobe`:

```bash
grep -E "^(Uid|Gid|CapEff):" /proc/self/status ; cat /proc/sys/kernel/modprobe
```

В строках `Uid:`, `Gid:` и `CapEff:` ядро Linux в реальном времени показывает поля структуры `struct cred` твоего текущего процесса!

## Почему это работает: Общая картина безопасности от первого дня Kali до ядра ОС

Оглянись назад на пройденный маршрут. Мы начали с базового устройства виртуальной машины, папок и прав файлов, затем научились читать сетевые пакеты, системные журналы, веб-запросы и криптографические подписи, а в блоке практикумов **pwn.college** спустились на самый глубокий уровень — до регистров процессора (`x86-64` и `ARM64`), кадров стека, корзин аллокатора кучи (`tcache` и `Safe-Linking`), таблиц `PLT`/`GOT` и `vtable`, фильтров `seccomp`, драйверов `ioctl` / `IOKit`, списков `DACL` в Windows, побочных каналов кэша процессора (`Flush+Reload`) и структур `struct cred` в ядре `Ring 0`.

Главный вывод инженера безопасности на всех этих уровнях един: **надёжная защита строится на строгих инвариантах (проверке границ, типов, состояния и криптографической целостности до обработки данных) и эшелонированной изоляции на каждом рубеже**.

## Если не получилось: Частые ошибки

- **Путаница между `UID = 0` и полным набором `Capabilities`**: в современном ядре Linux проверка прав суперпользователя внутри драйверов и системных вызовов выполняется не сравнением `euid == 0`, а вызовом `capable(CAP_SYS_ADMIN)` или `capable(CAP_NET_ADMIN)`. Поэтому процесс в контейнере или systemd-сервисе с `User=root`, у которого в настройках сброшены `CapabilityBoundingSet`, не сможет выполнить привилегированные операции ядра.
