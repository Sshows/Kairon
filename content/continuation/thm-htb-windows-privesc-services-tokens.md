## Перед началом: Как устроены векторы повышения привилегий в Windows (`TryHackMe` & `Hack The Box Academy`)

В модулях **`TryHackMe` (`Windows PrivEsc`)** и **`Hack The Box Academy` (`Windows Privilege Escalation`)** разбор безопасности хоста Windows опирается на три ключевых механизма операционной системы:
1. **Неэкранированные пути к службам с пробелами (`Unquoted Service Paths`)**: когда служба Windows запускается с правами `NT AUTHORITY\SYSTEM`, а путь к её исполняемому файлу содержит пробелы и **не взят в двойные кавычки**, например:
   `C:\Program Files\Corp Utils\Agent Service\agent.exe`
   диспетчер управления службами (`SCM`) и функция `CreateProcess` не знают, где заканчивается имя программы и где начинаются её аргументы! Поэтому Windows последовательно проверяет:
   - `C:\Program.exe`
   - `C:\Program Files\Corp.exe`
   - `C:\Program Files\Corp Utils\Agent.exe`
   - `C:\Program Files\Corp Utils\Agent Service\agent.exe`
   Если у обычного пользователя есть право записи (`Write` / `Modify`) в каталог `C:\Program Files\Corp Utils\`, он может положить туда свой файл `Agent.exe`, и при старте службы Windows запустит его с правами `SYSTEM`!
2. **Слабые `ACL` на самой службе или её бинарнике (`Service Binary / Config Permissions`)**: если утилита `icacls` или `sc.exe sdshow` показывает, что группа `Authenticated Users` или `Users` имеет право `FILE_ALL_ACCESS (F)` / `Modify (M)` на исполняемый файл службы или право `SERVICE_CHANGE_CONFIG` на саму службу, пользователь может заменить путь `binPath=` на любую команду.
3. **Привилегии маркера доступа (`SeImpersonatePrivilege` и `SeBackupPrivilege`)**:
   - `SeImpersonatePrivilege` (выдаётся по умолчанию сервисным аккаунтам `IIS AppPool`, `MSSQL`, `LOCAL SERVICE` / `NETWORK SERVICE`) позволяет процессу «примерить» токен любого подключившегося к нему клиента (`ImpersonateNamedPipeClient`). В сочетании с принудительным подключением системной службы к локальному именованному каналу (`Named Pipe`, семейство техник `PrintSpoofer` / `GodPotato`) это даёт токен `SYSTEM`.
   - `SeBackupPrivilege` позволяет читать любой файл на диске в обход `DACL` (включая резервные копии веток реестра `HKLM\SAM` и `HKLM\SYSTEM`) при открытии файла с флагом `FILE_FLAG_BACKUP_SEMANTICS`.

## Почему это работает: Как защитить службы и сервисные аккаунты Windows

- Всегда заключать путь `ImagePath` (`binPath`) любой службы в двойные кавычки: `"C:\Program Files\Corp Utils\Agent Service\agent.exe"`.
- Запрещать запись (`Modify` / `Write`) для `Users` и `Authenticated Users` во все каталоги установки программ и на исполняемые файлы служб.
- Запускать прикладные веб-пулы и сервисы под изолированными виртуальными учётными записями с минимальным набором привилегий токена.

<!-- preparation -->

В этом практикуме ты напишешь в `lab.py` анализатор путей служб Windows, который точно воспроизводит алгоритм поиска `CreateProcess` для неэкранированных путей с пробелами (`Unquoted Service Paths`), сравнивает его с путём в кавычках и проверяет риск привилегий токена.

## Сделай сейчас: Проверь алгоритм `Unquoted Service Path` и аудит привилегий токена в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
def candidate_paths_for_service(image_path):
    stripped = image_path.strip()
    if stripped.startswith('"') and stripped.endswith('"'):
        # Путь в кавычках: Windows проверяет только один точный путь!
        return [stripped.strip('"')]

    # Неэкранированный путь с пробелами: Windows подставляет .exe на каждом пробеле
    parts = stripped.split(" ")
    candidates = []
    for i in range(1, len(parts)):
        prefix = " ".join(parts[:i])
        if not prefix.lower().endswith(".exe"):
            candidates.append(prefix + ".exe")
    candidates.append(stripped)
    return candidates


def audit_windows_service_and_token(image_path, writable_prefixes, token_privs):
    candidates = candidate_paths_for_service(image_path)
    hijackable = [c for c in candidates[:-1] if any(c.startswith(w) for w in writable_prefixes)]
    high_risk_privs = [
        p for p in token_privs if p in {"SeImpersonatePrivilege", "SeBackupPrivilege", "SeDebugPrivilege"}
    ]
    return {
        "candidates_checked": len(candidates),
        "hijackable_paths": hijackable,
        "token_escalation_privs": high_risk_privs,
    }


unquoted = r"C:\Program Files\Corp Utils\Agent Service\agent.exe"
quoted = r'"C:\Program Files\Corp Utils\Agent Service\agent.exe"'
writable_dirs = ["C:\\Program Files\\Corp Utils\\"]

print("unquoted_candidates=", candidate_paths_for_service(unquoted))
print("unquoted_audit=", audit_windows_service_and_token(unquoted, writable_dirs, ["SeChangeNotifyPrivilege", "SeImpersonatePrivilege"]))
print("quoted_audit=", audit_windows_service_and_token(quoted, writable_dirs, ["SeChangeNotifyPrivilege"]))
```

### Шаг 2. Запусти скрипт и сравни неэкранированный и экранированный путь

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
unquoted_candidates= ['C:\\Program.exe', 'C:\\Program Files\\Corp.exe', 'C:\\Program Files\\Corp Utils\\Agent.exe', 'C:\\Program Files\\Corp Utils\\Agent Service\\agent.exe']
unquoted_audit= {'candidates_checked': 4, 'hijackable_paths': ['C:\\Program Files\\Corp Utils\\Agent.exe'], 'token_escalation_privs': ['SeImpersonatePrivilege']}
quoted_audit= {'candidates_checked': 1, 'hijackable_paths': [], 'token_escalation_privs': []}
```

Разберём, что показала проверка:
- для неэкранированной строки `C:\Program Files\Corp Utils\Agent Service\agent.exe` Windows последовательно проверяет **4 пути**: сначала `C:\Program.exe`, затем `C:\Program Files\Corp.exe`, затем `C:\Program Files\Corp Utils\Agent.exe` и только в конце — настоящий `agent.exe`;
- поскольку папка `C:\Program Files\Corp Utils\` оказалась доступна на запись (`writable_dirs`), путь `C:\Program Files\Corp Utils\Agent.exe` попал в список перехватываемых (`hijackable_paths`), а в токене обнаружена привилегия имперсонации `SeImpersonatePrivilege`;
- стоило обернуть путь службы в двойные кавычки (`quoted`), как число проверяемых путей сократилось до `1`, и вектор `Unquoted Service Path` полностью исчез (`hijackable_paths: []`).

### Шаг 3. Проверь регулярное выражение для поиска `Unquoted Service Paths` в Kali

В файле `lab.py` добавь `"SeBackupPrivilege"` в список привилегий для `quoted_audit`, сохрани и запусти `python3 lab.py` — ты увидишь, что путь службы безопасен, но аудитор предупредит о праве обхода `DACL` через `SeBackupPrivilege`. После проверки верни исходный список.

В терминале Kali проверь однострочный фильтр на Python, который ищет неэкранированные пути с пробелами вне системной папки `C:\Windows\`:

```bash
python3 -c 'paths=["\"C:\\Program Files\\App\\a.exe\"", "C:\\Program Files\\App\\b.exe", "C:\\Windows\\System32\\svchost.exe -k netsvcs"]; print([p for p in paths if not p.startswith("\"") and " " in p.split(".exe")[0] and not p.lower().startswith("c:\\windows\\")])'
```

## Почему это работает: Почему пути внутри `C:\Windows\System32\...` обычно исключают при поиске `Unquoted Service Paths`

Многие встроенные службы Windows записывают путь как `C:\Windows\System32\svchost.exe -k netsvcs` без кавычек. В части до `.exe` (`C:\Windows\System32\svchost.exe`) вообще нет пробелов, а пробелы идут только после `.exe` (перед аргументами `-k netsvcs`). Кроме того, в `C:\` и `C:\Windows\` обычным пользователям запись запрещена по умолчанию. Поэтому при аудите всегда смотрят, есть ли пробел **до** подстроки `.exe`!

## Если не получилось: Частые ошибки

- **Помещение аргументов запуска внутрь кавычек вместе с путём (`"C:\App Dir\service.exe --port 8080"`)**: кавычки должны закрываться сразу после `.exe` (`"C:\App Dir\service.exe" --port 8080`), иначе Windows попытается найти файл с именем `service.exe --port 8080`.
