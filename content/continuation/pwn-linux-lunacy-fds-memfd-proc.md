## Перед началом: Нестандартные файловые дескрипторы, `memfd_create` и витрина `/proc/self` (`pwn.college Linux Lunacy`)

В репозитории **`pwncollege/linux-lunacy`** (модули `fds`, `syscalls`, `other`) собраны тонкости ядра Linux, которые помогают глубоко понять, как процессы работают с файлами и памятью без обращения к обычному жёсткому диску:
1. **Произвольные номера файловых дескрипторов (`dup2(oldfd, newfd)`)**: новички привыкли только к трём номерам — `0` (`stdin`), `1` (`stdout`) и `2` (`stderr`). Но таблица файловых дескрипторов процесса вмещает тысячи слотов! Некоторые проверочные программы или сетевые демоны ждут данные строго из дескриптора с конкретным номером (например, `fd = 42` или `fd = 1337`). Системный вызов `dup2(fd, 42)` клонирует открытый канал или файл точно в слот номер `42`, а в `bash` перенаправление `42< input.txt` открывает файл сразу в дескрипторе `42`.
2. **Анонимные файлы в оперативной памяти `memfd_create`**: что делать, если программе нужен файловый дескриптор или путь к файлу, но на диске все папки смонтированы только для чтения (`Read-Only Filesystem`), либо аналитик исследует «бестелесный» (`fileless`) запуск ELF-бинарника прямо из памяти? Системный вызов `os.memfd_create("ram_file")` создаёт анонимный объект в оперативной памяти `RAM`, который ведёт себя как обычный файл и доступен по пути **`/proc/self/fd/<N>`**, но не оставляет ни единого следа на жёстком диске!
3. **Информационная витрина `/proc/<pid>/` и защита `hidepid=2`**: виртуальная файловая система `/proc` показывает живое состояние каждого процесса:
   - `/proc/self/cmdline` хранит аргументы запуска, разделённые нулевыми байтами `\x00`;
   - `/proc/self/maps` показывает полную карту виртуальной памяти процесса (базовые адреса в обход `ASLR`!);
   - `/proc/self/fd/` содержит символические ссылки на все открытые файлы и сокеты.
   Если на многопользовательском сервере `/proc` смонтирован со стандартными настройками, один пользователь может подсматривать командные строки соседних пользователей в `/proc/<чужой_pid>/cmdline` (где часто передают пароли в флагах `--password=...`). Опция монтирования **`hidepid=2` (`hidepid=invisible`)** скрывает чужие каталоги `/proc/<pid>` от непривилегированных пользователей.

## Почему это работает: Как защитить систему от утечек через `/proc` и злоупотребления `memfd_create`

- Никогда не передавать пароли и токены в аргументах командной строки (`argv`), так как они мгновенно видны в `/proc/<pid>/cmdline` — передавай секреты через защищённый файловый дескриптор (`stdin` / `pipe`) или файл с правами `0400`.
- Монтировать `/proc` с опцией `hidepid=invisible` (`hidepid=2`), а для изоляции бестелесного запуска в жестких песочницах контролировать вызовы `memfd_create` и `execveat` в профиле `seccomp-bpf` и `SELinux / AppArmor`.

<!-- preparation -->

В этом практикуме ты проверишь в `lab.py` клонирование дескрипторов в произвольный слот (`dup2` на `fd = 42`), разбор нуль-разделённой строки `/proc/self/cmdline` и фильтрацию видимости процессов в `/proc` при `hidepid=2`.

## Сделай сейчас: Проверь работу таблицы дескрипторов `dup2`, `/proc/self/cmdline` и `hidepid=2` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
def parse_proc_cmdline(raw_bytes):
    # В /proc/<pid>/cmdline аргументы разделены нулевыми байтами \x00
    parts = raw_bytes.rstrip(b"\x00").split(b"\x00")
    return [p.decode("utf-8") for p in parts if p]


def simulate_dup2_and_memfd(target_slot=42, payload=b"ELF_IN_RAM"):
    fd_table = {0: "tty_stdin", 1: "tty_stdout", 2: "tty_stderr"}
    memfd_num = 3
    fd_table[memfd_num] = {"path": f"/proc/self/fd/{memfd_num}", "data": payload}
    # Клонируем дескриптор 3 в целевой слот target_slot (аналог dup2(3, 42))
    fd_table[target_slot] = fd_table[memfd_num]
    return fd_table[target_slot]["path"], fd_table[target_slot]["data"] == payload


def list_visible_proc_pids(all_procs, viewer_uid, hidepid_level=2):
    if viewer_uid == 0 or hidepid_level == 0:
        return [p["pid"] for p in all_procs]
    return [p["pid"] for p in all_procs if p["uid"] == viewer_uid]


raw_cmdline = b"/usr/bin/python3\x00-I\x00worker.py\x00--port=8080\x00"
procs = [
    {"pid": 1, "uid": 0},
    {"pid": 1040, "uid": 1000},
    {"pid": 2099, "uid": 1001},
]

print("parsed_cmdline=", parse_proc_cmdline(raw_cmdline))
print("dup2_slot_42=", simulate_dup2_and_memfd(target_slot=42))
print("proc_default_hidepid0=", list_visible_proc_pids(procs, viewer_uid=1000, hidepid_level=0))
print("proc_hardened_hidepid2=", list_visible_proc_pids(procs, viewer_uid=1000, hidepid_level=2))
```

### Шаг 2. Запусти программу и изучи поведение `/proc` и таблицы `fd`

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
parsed_cmdline= ['/usr/bin/python3', '-I', 'worker.py', '--port=8080']
dup2_slot_42= ('/proc/self/fd/3', True)
proc_default_hidepid0= [1, 1040, 2099]
proc_hardened_hidepid2= [1040]
```

Разберём результат:
- функция `parse_proc_cmdline` разбила поток байтов по разделителю `\x00` и восстановила точный массив `argv`: `['/usr/bin/python3', '-I', 'worker.py', '--port=8080']`;
- `simulate_dup2_and_memfd` создала бестелесный буфер в дескрипторе `3` (`/proc/self/fd/3`) и спроецировала его в слот `42`;
- при стандартном `hidepid=0` пользователь с `uid=1000` видел в `/proc` все процессы сервера (`[1, 1040, 2099]`), а при включении `hidepid=2` чужие процессы стали невидимы (`[1040]`).

### Шаг 3. Проверь настоящий `/proc/self/cmdline` и `os.memfd_create` в терминале Kali

В файле `lab.py` измени `viewer_uid=1000` в последнем вызове на `viewer_uid=0` (`root`), сохрани и запусти `python3 lab.py` — администратор `root` продолжит видеть все процессы даже при `hidepid=2`. После проверки верни `viewer_uid=1000`.

В терминале Kali прочитай собственный файл `/proc/self/cmdline`, заменив нулевые байты `\0` на пробелы через `tr`:

```bash
tr '\0' ' ' < /proc/self/cmdline && echo ""
```

Ты увидишь точную команду `tr \0   ` — потому что в момент чтения `/proc/self` ссылался именно на сам процесс `tr`!

## Почему это работает: Как `SOC` и `DFIR` обнаруживают запуск из `memfd_create` на боевом сервере

Хотя файл, созданный через `memfd_create`, не лежит в `/tmp` или `/home`, у запущенного из него процесса символическая ссылка **`/proc/<pid>/exe`** указывает на строку вида **`/memfd:...(deleted)`**! Для аналитика `DFIR` и агентов `EDR` любой живой процесс, чей `/proc/<pid>/exe` начинается с `/memfd:` или заканчивается на `(deleted)`, — это первоочередной сигнал для снятия дампа памяти процесса.

## Если не получилось: Частые ошибки

- **Попытка прочитать `/proc/self/cmdline` обычным `cat` и скопировать строку**: поскольку между аргументами в `cmdline` стоят невидимые нулевые байты `\x00`, а не пробелы, терминал выведет все слова слитно (`python3-Iworker.py`). Всегда пропускай вывод через `tr '\0' ' '` или читай через `.split(b"\x00")` в Python.
