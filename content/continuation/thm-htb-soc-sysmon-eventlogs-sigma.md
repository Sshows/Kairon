## Перед началом: Как аналитики `SOC` расследуют инциденты по журналам `Sysmon` и пишут правила `Sigma` (`TryHackMe SOC Level 1` & `HTB Academy`)

В направлениях синей команды **`TryHackMe` (`SOC Level 1` / `Cyber Defense`)** и **`Hack The Box Academy` (`Windows Event Logs & Finding Evil` / `Intro to Threat Hunting`)** главный навык инженера мониторинга — умение находить следы атаки в потоке системных событий.

Стандартный журнал безопасности Windows (`Security.evtx`) фиксирует входы в систему (**`Event ID 4624`** — успешный вход, **`4625`** — неудачный вход) и создание процессов (**`Event ID 4688`**). Но для глубокого расследования на серверы и рабочие станции устанавливают системный монитор **`Sysmon` (`System Monitor`)**, который пишет детальную телеметрию с криптографическими хэшами файлов и цепочками родительских процессов:
- **`Sysmon Event ID 1` (`Process Creation`)**: какой процесс (`ParentImage`) запустил какую программу (`Image`) и с какой полной командной строкой (`CommandLine`).
- **`Sysmon Event ID 3` (`Network Connection`)**: какой именно процесс открыл исходящее TCP-соединение и на какой IP/порт.
- **`Sysmon Event ID 11` (`FileCreate`)**: какой процесс создал новый файл на диске.

Как аналитик `SOC` отличает обычную работу от взлома? По **аномальной паре «Родитель $\to$ Потомок» (`Parent-Child Relationship`)**!
- Если `explorer.exe` или `services.exe` запускает штатную программу — это норма.
- Но если текстовый процессор `WINWORD.EXE` или веб-воркер `w3wp.exe` (`IIS`) внезапно порождает `powershell.exe -nop -w hidden -enc ...` или `cmd.exe /c whoami` — это стопроцентный индикатор срабатывания макроса или веб-шелла!

Чтобы описывать такие детекты на универсальном языке, не привязанном к конкретной SIEM (`Splunk`, `Elastic`, `Sentinel`), используется открытый формат правил **`Sigma`** (YAML-описание с блоками `logsource`, `detection`, `selection`, `filter` и `condition`).

## Почему это работает: Почему связка `selection and not filter` в правилах `Sigma` спасает `SOC` от выгорания

Если написать правило «алертить на любой запуск `powershell.exe`», аналитики утонут в тысячах ложных срабатываний (`False Positives`) от скриптов системных администраторов и `SCCM`. Грамотное правило `Sigma` всегда комбинирует:
1. точный контекст (`ParentImage` оканчивается на `\w3wp.exe`, `\WINWORD.EXE`, `\EXCEL.EXE` или `CommandLine` содержит `-enc` / `FromBase64String`);
2. исключение проверенных системных путей (`and not filter`), чтобы аналитик видел только настоящие инциденты (`True Positives`).

<!-- preparation -->

В этом практикуме ты создашь в `lab.py` движок сопоставления событий `Sysmon Event ID 1` по логике правил `Sigma` (`selection and not filter`), который декодирует подозрительную команду `PowerShell -EncodedCommand` (`UTF-16LE Base64`) и отделяет вредоносную цепочку `w3wp.exe -> powershell.exe` от легитимного запуска администратора.

## Сделай сейчас: Проверь детектор событий `Sysmon Event ID 1` и декодирование `-EncodedCommand` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
import base64

SUSPICIOUS_PARENTS = ("\\w3wp.exe", "\\winword.exe", "\\excel.exe", "\\mshta.exe")
SUSPICIOUS_FLAGS = ("-enc", "-encodedcommand", "-w hidden", "downloadstring")


def decode_ps_base64(b64_str):
    # В PowerShell флаг -EncodedCommand всегда использует кодировку UTF-16LE!
    return base64.b64decode(b64_str).decode("utf-16le")


def evaluate_sigma_sysmon_eid1(event):
    if event.get("EventID") != 1:
        return "ignored:not_process_create"

    parent = event["ParentImage"].lower()
    image = event["Image"].lower()
    cmdline = event["CommandLine"].lower()

    # Условие filter: штатный скрипт мониторинга из подписанного системного каталога
    if parent.endswith("\\monitoringhost.exe") and "--healthcheck" in cmdline:
        return "benign:filtered_known_admin_task"

    is_shell = image.endswith(("\\powershell.exe", "\\pwsh.exe", "\\cmd.exe"))
    if is_shell and (parent.endswith(SUSPICIOUS_PARENTS) or any(f in cmdline for f in SUSPICIOUS_FLAGS)):
        return "ALERT:sigma_webshell_or_macro_child_process"

    return "normal:activity"


# Закодируем учебную команду "whoami /priv" в формате PowerShell UTF-16LE Base64
encoded_payload = base64.b64encode("whoami /priv".encode("utf-16le")).decode("ascii")

events = [
    {
        "EventID": 1,
        "ParentImage": r"C:\Windows\System32\inetsrv\w3wp.exe",
        "Image": r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
        "CommandLine": f"powershell.exe -nop -w hidden -enc {encoded_payload}",
    },
    {
        "EventID": 1,
        "ParentImage": r"C:\Program Files\SystemCenter\MonitoringHost.exe",
        "Image": r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
        "CommandLine": "powershell.exe --healthcheck",
    },
]

print("event1_verdict=", evaluate_sigma_sysmon_eid1(events[0]))
print("event2_verdict=", evaluate_sigma_sysmon_eid1(events[1]))
print("decoded_ps_cmd=", decode_ps_base64(encoded_payload))
```

### Шаг 2. Запусти программу и разбери вердикты `Sigma`-правила

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
event1_verdict= ALERT:sigma_webshell_or_macro_child_process
event2_verdict= benign:filtered_known_admin_task
decoded_ps_cmd= whoami /priv
```

Разберём, как сработал детектор:
- в первом событии веб-сервер `IIS` (`w3wp.exe`) породил `powershell.exe` со скрытым окном `-w hidden` и закодированной командой `-enc`. Правило `Sigma` мгновенно подняло тревогу (`ALERT:sigma_webshell_or_macro_child_process`);
- во втором событии агент мониторинга `MonitoringHost.exe` запустил плановую проверку `--healthcheck` — блок `filter` отсеял его как штатную операцию (`benign:filtered_known_admin_task`);
- функция `decode_ps_base64` расшифровала `Base64` в кодировке `UTF-16LE` и показала точное содержимое команды: `whoami /priv`.

### Шаг 3. Проверь отличие `UTF-16LE` от `UTF-8` в `PowerShell -EncodedCommand` в терминале Kali

В файле `lab.py` замени `w3wp.exe` в `events[0]` на `WINWORD.EXE`, сохрани и запусти `python3 lab.py` — правило также сработает на запуск оболочки из документа Word. После проверки верни `w3wp.exe`.

В терминале Kali проверь, почему при декодировании `PowerShell -EncodedCommand` обычным `base64 -d` между буквами видны нулевые байты (`UTF-16LE`), и как `iconv` или Python убирает их:

```bash
python3 -c 'import base64; b64=base64.b64encode("Get-Date".encode("utf-16le")).decode(); print("b64=", b64, "decoded=", base64.b64decode(b64).decode("utf-16le"))'
```

## Почему это работает: Зачем включать `PowerShell Script Block Logging (Event ID 4104)`

Злоумышленники часто обфусцируют командную строку запуска (`Event ID 1`), собирая команду по кусочкам в памяти. Но если в групповых политиках Windows включён **`PowerShell Script Block Logging` (журнал `Microsoft-Windows-PowerShell/Operational`, `Event ID 4104`)**, сам движок PowerShell записывает в журнал **уже полностью декодированный текст скрипта** непосредственно перед его выполнением в памяти!

## Если не получилось: Частые ошибки

- **Попытка декодировать `PowerShell -enc` как `UTF-8` вместо `UTF-16LE`**: в `UTF-16LE` каждый латинский символ кодируется двумя байтами (сам символ + `\x00`), поэтому в Base64-строке `PowerShell` очень часто встречаются повторяющиеся буквы `A` (`000000`). Всегда декодируй её через `.decode("utf-16le")`.
