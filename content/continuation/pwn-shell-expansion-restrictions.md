## Перед началом: Как оболочка разбирает строку команды до запуска программы и почему «чёрные списки» символов легко обходятся

В практикуме **The Art of the Shell (`shell-lin-do`)** на платформе `pwn.college` (модули `Abusing Expansion`, `Bypassing Input Restrictions`, `Inputting a Surprise`) подробно разбирают внутренний конвейер оболочки `bash`: что именно происходит со строкой между нажатием клавиши **Enter** и системным вызовом `execve`, и почему попытка защитить скрипт «фильтром запрещённых слов» (например, запретом пробелов или слова `cat`) почти всегда оказывается дырявой.

Представь секретаря, который принимает телеграммы и перед отправкой курьеру выполняет несколько автоматических замен по инструкции:
1. Сначала он разворачивает сокращения со списками в фигурных скобках (`{a,b}` превращается в два отдельных слова `a` и `b` — **Brace Expansion**);
2. Затем подставляет значения переменных из справочника (`$HOME`, `$IFS` — **Parameter Expansion**) и декодирует ANSI-экранирования вида `$'\x63\x61\x74'`;
3. После этого режет полученный текст на отдельные слова-аргументы не только по пробелу, но по любому символу из переменной **`IFS` (Internal Field Separator)** — куда по умолчанию входят **пробел, табуляция `\t` и перевод строки `\n`**;
4. И в самом конце заменяет шаблоны `*`, `?`, `[a-z]` реальными именами файлов из папки (**Pathname Expansion / Globbing**).

Если охранник проверяет телеграмму **до** секретаря и просто ищет в ней слово `cat` или обычный пробел ` `, то запись `{grep,-n,KRN,/var/log/auth.log}` или `c''at${IFS}/etc/hostname` пройдёт мимо охранника без единого пробела и без слитного слова `cat`, а секретарь (`bash`) сам соберёт из неё полноценную команду!

## Почему это работает: Пять шагов раскрытия строки в `bash` и почему фильтр «чёрного списка» не работает

Разберём точный порядок, в котором `bash` обрабатывает введённую строку:

1. **Раскрытие фигурных скобок (`Brace Expansion`: `{cmd,arg1,arg2}`)**. Выполняется самым первым шагом, ещё до подстановки переменных. Запись `{uname,-a}` внутри `bash` превращается в два отдельных токена `uname` и `-a` вообще без единого символа пробела в исходной строке!
2. **Кавычки и склейка соседних фрагментов (`Quote Removal` и `$'...'`)**. Для оболочки строки `cat`, `c"a"t`, `c'a't` и `$'\x63\x61\x74'` (где `0x63='c'`, `0x61='a'`, `0x74='t'`) после снятия кавычек превращаются в одно и то же 3-буквенное слово `cat`. Поэтому любой фильтр, который ищет подстроку `"cat"` в сыром вводе, обходится вставкой пустых кавычек `c''at`.
3. **Разделитель полей `$IFS` (Internal Field Separator)**. После подстановки переменных оболочка делит не закавыченные результаты на отдельные аргументы по символам из `$IFS` (по умолчанию ` \t\n`). Поэтому вместо пробела между командой и аргументом в `bash` часто подставляют `${IFS}`.
4. **Подстановка пути по шаблону (`?[a-z]*`)**. Даже если запрещены буквы имени файла или утилиты, шаблон `/usr/bin/wh?ami` или `/etc/hostn*` на этапе Globbing автоматически заменяется оболочкой на единственное подходящее имя файла в каталоге.
5. **Как защищать выполнение команд по-настоящему**:
   - **Никогда не вызывать оболочку (`shell=False`)**: передавать команду и аргументы напрямую в `execve` (в Python — `subprocess.run(["grep", "-F", "--", user_term, "report.txt"], shell=False)`), где никаких раскрытий `{...}`, `$IFS` и `*` вообще не существует;
   - **Использовать только строгий белый список (`Allowlist`)**: если пользователю нужно выбрать режим работы, сверять ввод со словарём разрешённых констант (`if mode in {"status", "version"}`), а не вырезать «опасные символы» регулярным выражением.

<!-- preparation -->

## Сделай сейчас: Практика: проследи раскрытие строки оболочкой и сравни чёрный список с белым списком

### Шаг 1. Сохрани код в файл `lab.py`

Вставь следующий код в открытый редактор Mousepad, нажми **Ctrl+S** и закрой редактор:

```python
import re


def simulate_shell_expansion(raw_expr):
    if raw_expr.startswith("{") and raw_expr.endswith("}") and "," in raw_expr:
        tokens = raw_expr[1:-1].split(",")
    else:
        expanded_ifs = raw_expr.replace("${IFS}", " ").replace("$IFS", " ")
        tokens = expanded_ifs.split()

    cleaned = []
    for tok in tokens:
        hex_decoded = re.sub(
            r"\$'((?:\\x[0-9a-fA-F]{2})+)'",
            lambda m: bytes.fromhex(m.group(1).replace("\\x", "")).decode("ascii"),
            tok,
        )
        unquoted = hex_decoded.replace("''", "").replace('""', "")
        cleaned.append(unquoted)
    return cleaned


def naive_denylist_filter(raw_expr):
    if " " in raw_expr or "cat" in raw_expr:
        return "blocked_by_denylist"
    return "passed_denylist"


ALLOWED_ACTIONS = {
    "status": ["systemctl", "status", "app.service"],
    "logs": ["journalctl", "-u", "app.service", "-n", "20"],
}


def safe_allowlist_dispatch(action_key):
    if action_key not in ALLOWED_ACTIONS:
        return "rejected:not_in_allowlist", []
    return "execve_direct_no_shell", ALLOWED_ACTIONS[action_key]


tricky_input = "c''at${IFS}/etc/hostname"
brace_input = r"{$'\x69\x64',-u}"

print("denylist_check=", naive_denylist_filter(tricky_input), "expanded_argv=", simulate_shell_expansion(tricky_input))
print("brace_expanded=", simulate_shell_expansion(brace_input))
print("allowlist_tricky=", safe_allowlist_dispatch(tricky_input))
print("allowlist_valid=", safe_allowlist_dispatch("status"))
```

### Шаг 2. Запусти программу и сравни оба подхода

В терминале выполни:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
denylist_check= passed_denylist expanded_argv= ['cat', '/etc/hostname']
brace_expanded= ['id', '-u']
allowlist_tricky= ('rejected:not_in_allowlist', [])
allowlist_valid= ('execve_direct_no_shell', ['systemctl', 'status', 'app.service'])
```

Посмотри на результат:
- в строке `tricky_input` (`c''at${IFS}/etc/hostname`) нет ни одного пробела и нет непрерывной подстроки `cat`, поэтому фильтр чёрного списка `naive_denylist_filter` пропустил её (`passed_denylist`). Но как только строка попала в раскрытие оболочки `simulate_shell_expansion`, `${IFS}` разделил слова, пустые кавычки `''` исчезли, и получился массив аргументов `['cat', '/etc/hostname']`;
- в `brace_expanded` выражение `{$'\x69\x64',-u}` (где `\x69\x64` — коды букв `id`) без пробелов раскрылось в `['id', '-u']`;
- зато функция `safe_allowlist_dispatch`, использующая строгий белый список `ALLOWED_ACTIONS` и прямой запуск без оболочки (`execve_direct_no_shell`), мгновенно отвергла `tricky_input` (`rejected:not_in_allowlist`) и разрешила только штатный ключ `"status"`.

### Шаг 3. Проверь раскрытие фигурных скобок и кавычек в терминале Kali

В файле `lab.py` замени `"status"` в последней строке на `"logs"`, сохрани и запусти `python3 lab.py` — ты увидишь фиксированный массив аргументов `['journalctl', '-u', 'app.service', '-n', '20']`. После проверки верни `"status"`.

В терминале Kali (в оболочке `bash` или `zsh`) проверь, как сама оболочка склеивает кавычки и раскрывает фигурные скобки ещё до запуска команды `printf`:

```bash
bash -c 'printf "arg=%s\n" {ech"o",hel""lo_kali}'
```

Оболочка выведет две строки: `arg=echo` и `arg=hello_kali`, наглядно показывая, что фигурные скобки и кавычки обрабатываются самим `bash` до передачи аргументов программе.

## Почему это работает: Главное правило защиты от Command Injection

Любая попытка фильтровать входную строку перед передачей её в `sh -c ...`, `os.system(...)` или `popen(...)` обречена соревноваться с десятками правил синтаксиса `bash`. Как только вызов оболочки заменяется на прямую передачу массива аргументов (`subprocess.run([...], shell=False)` или `execFile` в Node.js), весь парсер `bash` полностью исключается из цепочки!

## Если не получилось: Частые ошибки

- **Использование `shell=True` в Python только ради подстановки `*` или `~`**: чтобы раскрыть `~` или найти файлы по маске `*.log` в Python без вызова оболочки, используют стандартный модуль `pathlib`: `Path.home()` и `list(Path("/var/log").glob("*.log"))`. Это и безопаснее, и предсказуемее.
