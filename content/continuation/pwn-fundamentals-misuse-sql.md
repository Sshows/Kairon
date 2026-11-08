## Перед началом: Когда штатная программа делает больше, чем задумывал администратор

Во второй половине курса **Playing With Programs** (`fundamentals`) на `pwn.college` (модули `Program Misuse` и `SQL Playground`) разбирают очень жизненный вопрос: почему уязвимость может возникнуть даже в программе, где нет ошибок памяти, если у неё есть слишком широкие штатные возможности или если запрос к базе данных собирается без ограничений.

Представь офисный принтер-сканер, которому дали пропуск в архив только для того, чтобы печатать титульные листы. Но у этого же аппарата в меню есть штатная кнопка «отправить скан любого документа из папки на почту». Аппарат исправен и работает строго по своей инструкции — ошибка в том, что ему выдали полный доступ к архиву и не отключили лишние режимы работы.

В Linux точно так же у многих привычных утилит (архиваторов `tar` и `zip`, программ поиска `find`, текстовых просмотрщиков `less` и редакторов `vim`) есть документированные флаги для чтения произвольных файлов или запуска вспомогательных команд. А в реляционных базах данных (например, SQLite) есть служебные системные таблицы со схемой всех остальных таблиц. Сегодня мы разберём оба этих механизма и проверим способы их защиты.

## Почему это работает: Опасные режимы утилит и системный каталог базы данных

Разберём оба направления подробно:

1. **Почему штатные флаги утилит опасны при повышенных правах (`Program Misuse`)**. Если администратор разрешил вызывать утилиту через `sudo` или поставил на неё бит `setuid`, но не ограничил допустимые аргументы, пользователь может задействовать встроенные функции этой программы:
   - программа чтения логов или архиватор с флагом выбора входного файла (`-f`, `-i`, `@файл`) прочитает любой файл, доступный владельцу процесса, и выведет его содержимое на экран или в сообщение об ошибке;
   - утилиты с флагами запуска внешней проверки или действия (например, `find ... -exec` или проверочный хук в архиваторе) выполнят дочернюю команду с теми же привилегиями.
   Защита строится не на «секретности» флагов (они описаны в `man`), а на двух правилах: не давать полные привилегии универсальным программам и в обёртках проверять аргументы по строгому **белому списку (allowlist)** с разделителем `--`.
2. **Как устроена схема таблиц в SQL (`SQL Playground`)**. В уроках 59 и 64 мы уже видели, чем параметризованный запрос `?` отличается от склейки строки. В модуле `SQL Playground` на `pwn.college` дополнительно разбирают, как сама база данных хранит описание своей структуры: например, в SQLite существует встроенная таблица `sqlite_master` (или `sqlite_schema`), где в столбцах `type`, `name` и `sql` записаны имена всех таблиц и столбцов базы. Поэтому защита данных в БД никогда не должна полагаться на «секретное имя таблицы или столбца» — защищает только параметризация запросов и разграничение прав доступа.

<!-- preparation -->

## Сделай сейчас: Практика: проверь белый список аргументов и запросы к схеме SQLite

### Шаг 1. Сохрани код в файл `lab.py`

Вставь следующий код в открытый редактор Mousepad, нажми **Ctrl+S** и закрой редактор:

```python
import posixpath
import sqlite3

ALLOWED_FLAGS = {"-n", "--lines"}


def validate_log_reader_call(raw_args, base_dir="/var/log/app"):
    if len(raw_args) != 2:
        return "rejected:arity"
    flag, target = raw_args
    if flag not in ALLOWED_FLAGS:
        return "rejected:flag"
    normalized = posixpath.normpath(posixpath.join(base_dir, target))
    if not normalized.startswith(base_dir + "/"):
        return "rejected:path"
    return f"allowed:{normalized}"


print("safe_call=", validate_log_reader_call(["-n", "access.log"]))
print("blocked_exec=", validate_log_reader_call(["--exec=/bin/sh", "access.log"]))
print("blocked_escape=", validate_log_reader_call(["-n", "../../etc/shadow"]))

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE public_items (id INTEGER PRIMARY KEY, title TEXT, category TEXT)")
conn.execute("CREATE TABLE internal_notes (id INTEGER PRIMARY KEY, note TEXT)")
conn.executemany(
    "INSERT INTO public_items (title, category) VALUES (?, ?)",
    [("Kali Guide", "linux"), ("HTTP Basics", "web"), ("ELF Intro", "binary")],
)
tables = [row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
matched = [row[0] for row in conn.execute("SELECT title FROM public_items WHERE category = ? ORDER BY id", ("linux",))]
literal_attempt = [row[0] for row in conn.execute("SELECT title FROM public_items WHERE category = ? ORDER BY id", ("linux' OR '1'='1",))]
print("schema_tables=", ",".join(tables))
print("param_match=", matched, "literal_attempt=", literal_attempt)
```

*(Если при вставке перед `ALLOWED_FLAGS` оказался лишний пробел, убери его, чтобы строка начиналась с самого левого края).*

### Шаг 2. Запусти программу и изучи результат

Поправь при необходимости отступ первой строки `ALLOWED_FLAGS` и выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
safe_call= allowed:/var/log/app/access.log
blocked_exec= rejected:flag
blocked_escape= rejected:path
schema_tables= internal_notes,public_items
param_match= ['Kali Guide'] literal_attempt= []
```

Разберём каждую проверку:
- функция `validate_log_reader_call` разрешает только флаги из `ALLOWED_FLAGS` (`-n` или `--lines`) и проверяет, что нормализованный путь файла остаётся строго внутри `/var/log/app/`. Поэтому попытка передать флаг `--exec=/bin/sh` отклоняется с причиной `rejected:flag`, а выход из папки `../../etc/shadow` — с причиной `rejected:path`;
- во второй части запрос к `sqlite_master` показывает, что имена обеих таблиц (`internal_notes` и `public_items`) хранятся в стандартном каталоге схемы базы;
- при этом параметризованный запрос `WHERE category = ?` возвращает `['Kali Guide']` для `"linux"` и пустой список `[]` для строки `"linux' OR '1'='1"`, потому что драйвер SQLite ищет категорию, буквально равную всей этой строке с кавычками.

### Шаг 3. Проверь фильтрацию списка таблиц и дополнительную категорию

В файле `lab.py` замени `("linux",)` в переменной `matched` на `("web",)`, сохрани и запусти `python3 lab.py`. Теперь `param_match=` выведет `['HTTP Basics']`, а `literal_attempt=` по-прежнему останется `[]`. Верни `("linux",)` обратно и проверь исходный вывод.

## Почему это работает: Как безопасно изучать возможности стандартных утилит

В модуле `Program Misuse` на `pwn.college` (и в открытом справочнике GTFOBins, на который часто ссылаются при аудите прав Linux) каждая стандартная программа описана через её штатную документацию `man`:
- чтобы узнать, какие флаги программы позволяют читать файлы или вызывать внешние команды, в терминале Kali достаточно открыть `man имя_программы` и нажать `/` для поиска по словам `file`, `exec`, `command` или `shell`;
- при проектировании безопасного сервиса вместо вызова универсальной консольной утилиты с правами `root` пишут узкую функцию на языке программирования (как наша `validate_log_reader_call`), которая открывает файл напрямую через системный вызов и только внутри разрешённой папки.

## Если не получилось: Частые ошибки

- **Ошибка `IndentationError: unexpected indent`**: проверь, чтобы строка `ALLOWED_FLAGS = {"-n", "--lines"}` начиналась без пробела в самом начале строки.
- **Ошибка `sqlite3.ProgrammingError: Incorrect number of bindings supplied`**: в Python кортеж из одного элемента для параметра `?` обязательно записывается с запятой внутри скобок: `("linux",)`, а не `("linux")`.
