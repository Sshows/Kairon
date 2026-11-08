## Перед началом: Как Windows ищет динамические библиотеки `.dll` при запуске программы и как предотвратить подмену

В модулях **Injection and Hijacking** и **How to open a File** практикума **Windows Warzone (`windows-dojo`)** на платформе `pwn.college` разбирают две классические темы безопасности приложений и системных служб Windows:
1. как функция `LoadLibraryW("helper.dll")`, вызванная с коротким относительным именем без полного пути, проходит по списку каталогов (**Dynamic-Link Library Search Order**) и почему это приводит к уязвимости **перехвата библиотеки (DLL Search Order Hijacking / DLL Sideloading)**;
2. как работают флаги совместного доступа к файлам (`dwShareMode`) в `CreateFileW` и наследование дескрипторов (`bInheritHandles`) при создании дочерних процессов.

Вспомни, как в **Linux Luminarium** мы разбирали переменную `PATH`: если программа ищет утилиту по короткому имени, а в начале списка стоит общедоступная папка, злоумышленник может положить туда одноимённый файл. В Windows для библиотек `.dll` действует очень похожий механизм! Когда программа вызывает `LoadLibraryW("version_helper.dll")`, не указав полный путь `C:\Windows\System32\...`, загрузчик Windows начинает по очереди проверять каталоги:
1. Сначала **папку самого запущенного приложения** (`Application Directory`);
2. Затем системные папки `C:\Windows\System32`, `C:\Windows\System` и `C:\Windows`;
3. Затем текущую рабочую папку (`Current Directory`) и все каталоги из переменной окружения `PATH`!

Если привилегированная служба или установщик запускается из папки, куда обычный пользователь имеет право записи, или пытается загрузить отсутствующую библиотеку и доходит в поиске до перезаписываемого каталога из `PATH`, то подложенная туда `.dll` загрузится прямо в память процесса со всеми его правами! Именно этот приём (**DLL Sideloading**) мы встречали и в реальных отчётах об атаках (например, в разборе группировок из кейса BlueMoon).

## Почему это работает: Порядок поиска DLL, флаги `LOAD_LIBRARY_SEARCH_SYSTEM32` и наследование `HANDLE`

Разберём оба механизма безопасности Windows и способы их защиты:

1. **Стандартный порядок поиска `LoadLibrary` и почему относительное имя опасно**:
   - если в `LoadLibrary("plugin.dll")` передано только имя файла без диска и слэшей, Windows проверяет цепочку каталогов: `[AppDir, System32, WindowsDir, CurrentDir, ...PATH]`;
   - если библиотека является необязательным плагином и в `AppDir` и `System32` её нет, поиск продолжается дальше по списку вплоть до `CurrentDir` и каталогов `PATH`. Если хотя бы один из этих каталогов доступен на запись непривилегированному пользователю, возникает **DLL Hijacking**.
2. **Как правильно загружать библиотеки в защищённом коде Windows**:
   - **Способ 1 (Абсолютный путь)**: всегда передавать полный канонический путь к библиотеке, полученный через `GetSystemDirectoryW`, например `C:\Windows\System32\dbghelp.dll`;
   - **Способ 2 (Флаг `LOAD_LIBRARY_SEARCH_SYSTEM32` в `LoadLibraryExW`)**: вызов `LoadLibraryExW(L"dbghelp.dll", NULL, LOAD_LIBRARY_SEARCH_SYSTEM32)` приказывает загрузчику искать библиотеку **исключительно** в `C:\Windows\System32`, полностью игнорируя папку приложения, текущую папку и `PATH`!
   - **Способ 3 (Известные системные библиотеки `KnownDLLs`)**: для базовых библиотек (`kernel32.dll`, `ntdll.dll`, `user32.dll`), перечисленных в ключе реестра `HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\KnownDlls`, ядро Windows всегда использует уже проверенные системные образы из памяти.
3. **Наследование дескрипторов (`bInheritHandles`) при запуске дочернего процесса (`CreateProcessW`)**:
   - когда привилегированный процесс открывает секретный файл или токен (`HANDLE`), в структуре `SECURITY_ATTRIBUTES` есть поле `bInheritHandle`. Если оно выставлено в `TRUE`, а при запуске внешнего дочернего процесса в `CreateProcessW` также передан флаг `bInheritHandles = TRUE`, то числовой номер дескриптора `HANDLE` автоматически переходит в таблицу дочернего процесса!
   - **Защита**: открывать чувствительные объекты с `bInheritHandle = FALSE` и вызывать `CreateProcessW` с `bInheritHandles = FALSE` (или передавать явный белый список разрешённых дескрипторов через `PROC_THREAD_ATTRIBUTE_HANDLE_LIST`).

<!-- preparation -->

## Сделай сейчас: Практика: промоделируй порядок поиска `LoadLibrary` против `LOAD_LIBRARY_SEARCH_SYSTEM32` и фильтр наследования `HANDLE`

### Шаг 1. Сохрани код в файл `lab.py`

Вставь следующий код в открытый редактор Mousepad, нажми **Ctrl+S** и закрой редактор:

```python
def resolve_dll_load(dll_name, fs_present, writable_dirs, search_system32_only=False):
    system32 = r"C:\Windows\System32"
    if "\\" in dll_name or ":" in dll_name:
        search_order = [dll_name.rsplit("\\", 1)[0]]
        fname = dll_name.rsplit("\\", 1)[1]
    elif search_system32_only:
        search_order = [system32]
        fname = dll_name
    else:
        search_order = [r"C:\App", system32, r"C:\TempWork", r"C:\ToolsInPath"]
        fname = dll_name

    for directory in search_order:
        full_path = f"{directory}\\{fname}"
        if full_path in fs_present:
            risk = "hijack_risk_writable_dir" if directory in writable_dirs else "trusted_location"
            return risk, full_path
    return "not_found", None


def spawn_child_handles(parent_handles, inherit_all=False, explicit_allowlist=None):
    if not inherit_all:
        return []
    allowed = set(explicit_allowlist) if explicit_allowlist is not None else None
    inherited = []
    for h_id, meta in parent_handles.items():
        if meta["bInheritHandle"] and (allowed is None or h_id in allowed):
            inherited.append(h_id)
    return sorted(inherited)


fs_files = {
    r"C:\TempWork\telemetry_ext.dll",
    r"C:\Windows\System32\dbghelp.dll",
}
writable = {r"C:\TempWork", r"C:\ToolsInPath"}

handles = {
    "h_stdout_pipe": {"bInheritHandle": True},
    "h_secret_config": {"bInheritHandle": True},
    "h_private_key": {"bInheritHandle": False},
}

print("unsafe_relative_dll=", resolve_dll_load("telemetry_ext.dll", fs_files, writable, search_system32_only=False))
print("safe_system32_flag=", resolve_dll_load("telemetry_ext.dll", fs_files, writable, search_system32_only=True))
print("safe_dbghelp_sys32=", resolve_dll_load("dbghelp.dll", fs_files, writable, search_system32_only=True))
print("leaked_handles=", spawn_child_handles(handles, inherit_all=True))
print("scoped_handles=", spawn_child_handles(handles, inherit_all=True, explicit_allowlist=["h_stdout_pipe"]))
```

### Шаг 2. Запусти программу и сравни результаты

В терминале выполни:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
unsafe_relative_dll= ('hijack_risk_writable_dir', 'C:\\TempWork\\telemetry_ext.dll')
safe_system32_flag= ('not_found', None)
safe_dbghelp_sys32= ('trusted_location', 'C:\\Windows\\System32\\dbghelp.dll')
leaked_handles= ['h_secret_config', 'h_stdout_pipe']
scoped_handles= ['h_stdout_pipe']
```

Разберём каждый вывод:
- в `unsafe_relative_dll` программа вызвала обычный `LoadLibrary("telemetry_ext.dll")` без флага ограничения поиска: не найдя библиотеку в `C:\App` и `C:\Windows\System32`, загрузчик дошёл до рабочей папки `C:\TempWork` (которая входит в `writable_dirs`) и загрузил подложенный файл (`hijack_risk_writable_dir`);
- в `safe_system32_flag` включён флаг `LOAD_LIBRARY_SEARCH_SYSTEM32` (`search_system32_only=True`): загрузчик проверил только доверенный каталог `C:\Windows\System32`, проигнорировал `C:\TempWork` и безопасно вернул `('not_found', None)`;
- в `safe_dbghelp_sys32` системная библиотека `dbghelp.dll` штатно загрузилась из `C:\Windows\System32` (`trusted_location`);
- в `leaked_handles` при `inherit_all=True` без фильтрации дочернему процессу перешёл лишний открытый дескриптор `h_secret_config`, тогда как в `scoped_handles` явный список `explicit_allowlist=["h_stdout_pipe"]` передал ребёнку только нужный канал вывода `stdout`.

### Шаг 3. Проверь явный абсолютный путь и флаг `close_fds=True` в Python

В файле `lab.py` измени `"telemetry_ext.dll"` в первом вызове на `r"C:\Windows\System32\dbghelp.dll"`, сохрани и запусти `python3 lab.py` — ты увидишь, что явный абсолютный путь обращается только к указанному каталогу и возвращает `('trusted_location', 'C:\\Windows\\System32\\dbghelp.dll')`. После проверки верни `"telemetry_ext.dll"`.

В языке Python (и на Linux, и на Windows) стандартная функция `subprocess.run` по умолчанию использует параметр **`close_fds=True`**, который автоматически закрывает все неназванные файловые дескрипторы и `HANDLE` перед запуском дочерней программы. Проверь это значение по умолчанию в терминале Kali:

```bash
python3 -c "import inspect, subprocess; print('default_close_fds=', inspect.signature(subprocess.Popen).parameters['close_fds'].default)"
```

## Почему это работает: Как обнаружить уязвимость DLL Hijacking при аудите приложения

При проверке настольного приложения или службы Windows инженеры запускают монитор обращений к файловой системе (Process Monitor / `procmon`) с фильтром `Result IS NAME NOT FOUND` и `Path ENDS WITH .dll`. Если процесс ищет `.dll` по путям, на которые у обычного пользователя есть право записи (`Modify` / `Write`), разработчик заменяет вызов `LoadLibrary` на `LoadLibraryExW` с флагом `LOAD_LIBRARY_SEARCH_SYSTEM32` (или `LOAD_LIBRARY_SEARCH_APPLICATION_DIR`) и проверяет цифровую подпись загружаемого модуля.

## Если не получилось: Частые ошибки

- **Одинарный обратный слэш в обычных строках Python (`"C:\temp\new.dll"`)**: в обычной строке Python последовательности `\t` и `\n` внутри пути Windows превращаются в символ табуляции и перевод строки! Для путей Windows в Python всегда используй сырые строки с префиксом `r` (`r"C:\TempWork\file.dll"`) или двойные слэши `"C:\\TempWork\\file.dll"`.
