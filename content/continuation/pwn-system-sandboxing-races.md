## Перед началом: Как изолируют недоверенный процесс и почему опасен зазор между проверкой и открытием файла

В курсе **System Security** на платформе `pwn.college` (модули `Sandboxing`, `Race Conditions` и `Kernel Security`) от безопасности одной программы переходят к безопасности всей операционной системы, где несколько процессов работают одновременно, а недоверенный код помещают в **песочницу (sandbox)**.

Представь два важных сюжета из жизни:
1. **Песочница (`chroot` и `seccomp`)**. Допустим, гостю в здании разрешили ходить только по второму этажу (`chroot` — смена видимой корневой папки `/`), но оставили у него в руках рацию, по которой он может отдавать любые команды техническим службам всего здания (системные вызовы ядра, не связанные с файлами, или уже открытый ранее доступ к папке первого этажа). Чтобы изоляция была настоящей, кроме ограничения папок нужно ещё ограничить **список разрешённых системных вызовов** через фильтр ядра **`seccomp`** (Secure Computing Mode) и пространства имён (**Linux namespaces**).
2. **Файловая гонка между проверкой и использованием (`TOCTOU` — Time-of-Check to Time-of-Use)**. В уроке 70 мы видели гонку на примере одноразового купона в базе данных. В файловой системе Linux точно такая же гонка возникает, когда привилегированная программа в два отдельных шага работает с файлом по его **текстовому пути**:
   - **Шаг 1 (Check)**: проверяет `access("/tmp/work/item.txt", ...)` или `stat` — «это обычный публичный файл, не секретный»;
   - **Окно гонки**: в микросекунду между двумя системными вызовами другой процесс заменяет `/tmp/work/item.txt` на **символическую ссылку (`symlink`)**, ведущую на закрытый файл `/etc/secret`;
   - **Шаг 2 (Use)**: привилегированная программа вызывает `open("/tmp/work/item.txt")` по тому же имени и открывает уже подменённую цель!

## Почему это работает: Ограничения chroot, фильтр seccomp и безопасное открытие дескриптора

Разберём, почему возникают эти уязвимости и как их закрывают на уровне системных вызовов:

1. **Почему одного `chroot` недостаточно для песочницы**. Системный вызов `chroot("/var/sandbox")` меняет только то, какую папку процесс считает корнем `/` при разборе путей, начинающихся с `/`. Он **не закрывает** уже открытые до `chroot` файловые дескрипторы папок, **не меняет** текущую рабочую папку сам по себе (если не вызвать следом `chdir("/")`) и **не запрещает** сетевые, межпроцессные или отладочные системные вызовы. Поэтому в современных контейнерах и песочницах `chroot` (или `pivot_root` внутри `mount namespace`) обязательно дополняют фильтром **`seccomp-bpf`**, который по белому списку разрешает процессу только минимальный набор вызовов (например, `read`, `write`, `exit`, `sigreturn`) и блокирует все остальные (`execve`, `socket`, `ptrace`, `openat`).
2. **Как устранить файловую гонку `TOCTOU` на символических ссылках**. Ошибка в том, что два системных вызова (`stat` и `open`) заново проходят по текстовому пути в общей папке, где файлы могут переименовываться. Надёжное решение в Linux опирается на **файловый дескриптор, а не на повторный разбор имени**:
   - не работать в общих папках вроде `/tmp` без флагов `O_CREAT | O_EXCL` и `O_NOFOLLOW` (флаг `O_NOFOLLOW` приказывает ядру отказать в открытии, если последний компонент пути оказался символической ссылкой);
   - сначала открыть файл один раз с `O_NOFOLLOW`, получить его дескриптор `fd`, а затем проверять свойства уже открытого объекта через **`fstat(fd)`** — тогда подмена имени в папке никак не повлияет на уже открытый `fd`.

<!-- preparation -->

## Сделай сейчас: Практика: проверь политику seccomp и защиту от подмены символической ссылки

### Шаг 1. Сохрани код в файл `lab.py`

Вставь следующий код в открытый редактор Mousepad, нажми **Ctrl+S** и закрой редактор:

```python
ALLOWED_SYSCALLS = {"read", "write", "fstat", "exit", "exit_group"}


def evaluate_seccomp(syscall_trace):
    for call in syscall_trace:
        if call not in ALLOWED_SYSCALLS:
            return f"killed:seccomp_violation:{call}"
    return "completed:allowed"


print("safe_sandbox=", evaluate_seccomp(["read", "fstat", "write", "exit"]))
print("blocked_execve=", evaluate_seccomp(["read", "execve", "exit"]))


def split_check_then_open(path_state_at_check, path_state_at_open):
    if path_state_at_check["kind"] != "regular" or not path_state_at_check["public"]:
        return "rejected:check"
    # Между проверкой и открытием путь переключили на symlink к защищённому файлу
    return f"opened:{path_state_at_open['target']}"


def atomic_open_nofollow(path_state_at_open):
    if path_state_at_open["kind"] == "symlink":
        return "rejected:ELOOP_nofollow"
    if not path_state_at_open["public"]:
        return "rejected:EACCES"
    return f"opened:{path_state_at_open['target']}"


initial_file = {"kind": "regular", "public": True, "target": "/tmp/work/public.txt"}
swapped_symlink = {"kind": "symlink", "public": False, "target": "/etc/protected_config"}

print("toctou_split=", split_check_then_open(initial_file, swapped_symlink))
print("atomic_nofollow=", atomic_open_nofollow(swapped_symlink))
print("atomic_regular=", atomic_open_nofollow(initial_file))
```

### Шаг 2. Запусти программу и сравни результаты

В терминале выполни:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
safe_sandbox= completed:allowed
blocked_execve= killed:seccomp_violation:execve
toctou_split= opened:/etc/protected_config
atomic_nofollow= rejected:ELOOP_nofollow
atomic_regular= opened:/tmp/work/public.txt
```

Разберём, что показывает каждый блок:
- фильтр `evaluate_seccomp` пропускает трассу из разрешённых вызовов `["read", "fstat", "write", "exit"]`, но мгновенно останавливает процесс при первой же попытке вызвать `execve` (`killed:seccomp_violation:execve`);
- в `toctou_split` раздельная проверка `split_check_then_open` увидела на первом шаге безопасный файл `initial_file`, но к моменту открытия на втором шаге имя уже указывало на `swapped_symlink`, и функция ошибочно открыла `/etc/protected_config`;
- в `atomic_nofollow` проверка типа (`symlink`) выполняется атомарно в момент самого открытия (аналог флага `O_NOFOLLOW` в системном вызове `openat`), поэтому подменённая ссылка сразу получает отказ `rejected:ELOOP_nofollow`.

### Шаг 3. Проверь добавление запрещённого системного вызова `socket`

В файле `lab.py` в строке `print("safe_sandbox=", evaluate_seccomp(["read", "fstat", "write", "exit"]))` замени `"fstat"` внутри списка на `"socket"` (набор `ALLOWED_SYSCALLS` в начале файла не меняй), сохрани и запусти `python3 lab.py`. Строка `safe_sandbox=` сразу изменится на `killed:seccomp_violation:socket`, потому что сетевой вызов не входит в `ALLOWED_SYSCALLS`. Верни `"fstat"` обратно и убедись, что снова выводится `completed:allowed`.

В терминале Kali ты можешь посмотреть, включён ли режим `Seccomp` у текущего процесса или у браузера, прочитав поле `Seccomp` в `/proc/self/status`:

```bash
grep Seccomp /proc/self/status
```

Значение `0` означает, что фильтр выключен, `1` — строгий режим (`strict`), а `2` — режим фильтра `seccomp-bpf`.

## Почему это работает: Связь с заданиями System Security на pwn.college

В модулях `Sandboxing` и `Race Conditions` на `pwn.college` задачи учат оценивать изоляцию не по названию технологии («мы добавили chroot» или «мы проверили файл через access()»), а по реальным системным вызовам:
- если в песочнице используется `chroot`, всегда проверяют, вызван ли `chdir("/")`, закрыты ли старые файловые дескрипторы и какие системные вызовы остались разрешены в `seccomp`;
- если программа работает с файлами в каталоге, куда может писать менее привилегированный пользователь, любые пары вызовов по имени (`access` + `open`, `stat` + `open`, `lstat` + `chmod`) заменяют на открытие дескриптора с `O_NOFOLLOW` и операции над дескриптором (`fstat`, `fchmod`, `openat`).

## Если не получилось: Частые ошибки

- **Код ошибки `ELOOP` (`Too many levels of symbolic links`) при открытии файла с `O_NOFOLLOW`**: именно этот код возвращает ядро Linux, когда программа открывает символическую ссылку с флагом `O_NOFOLLOW`. Это штатный защитный отказ, а не поломка диска.
