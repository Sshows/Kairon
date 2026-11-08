## Перед началом: Как работают сенсоры `AMSI`, `ETW` и защита `PPL` в современных `EDR` (`TryHackMe` & `Hack The Box Academy`)

В курсах по внутреннему устройству защиты Windows на **`TryHackMe` (`Runtime Detection Evasion` / `EDR Internals`)** и **`Hack The Box Academy` (`Windows Event Tracing & AMSI`)** разбирается важный вопрос: почему антивирус и агент `EDR` видят вредоносный скрипт `PowerShell`, `C#` или `VBScript`, даже если этот скрипт был скачан напрямую в оперативную память и зашифрован двадцатью слоями `Base64`?

За это отвечают три встроенных механизма Windows:
1. **`AMSI (Antimalware Scan Interface)` и библиотека `amsi.dll`**:
   Когда любой интерпретатор (`powershell.exe`, `wscript.exe`, `.NET CLR` при вызове `Assembly.Load`) расшифровывает в памяти очередной кусок кода и собирается его выполнить, сам интерпретатор **перед исполнением** автоматически вызывает функцию **`AmsiScanBuffer(buffer, length, ...)`** из загруженной в его память библиотеки `amsi.dll`! То есть обфускатор сам снял все слои маскировки и принёс чистый, распакованный текст скрипта прямо на проверку в `AmsiScanBuffer`.
2. **`ETW (Event Tracing for Windows)` — пользовательский (`ntdll!EtwEventWrite`) и ядерный (`ETW-Ti`)**:
   Среда `.NET` и системные библиотеки отправляют подробную телеметрию (какие сборки загружены в память, какие методы вызваны) через вызов функции `EtwEventWrite` в `ntdll.dll`.
   Почему злоумышленники иногда пытаются пропатчить первые байты `AmsiScanBuffer` или `EtwEventWrite` в памяти своего собственного процесса (записав туда инструкцию возврата `ret` — `0xC3`)? Потому что `amsi.dll` и `ntdll.dll` лежат в пространстве самого пользовательского процесса (`Ring 3`).
3. **Почему современная `EDR` мгновенно ловит такой патч памяти (ядерный сенсор `ETW-Ti` и защита `PPL`)**:
   - сам агент `EDR` работает как защищённый процесс **`PPL (Protected Process Light)`**, подписанный специальным сертификатом Microsoft `Antimalware`: даже локальный администратор не может открыть дескриптор процесса `PPL` или отключить его;
   - ядро Windows через защищённый провайдер **`Microsoft-Windows-Threat-Intelligence (ETW-Ti)`** и периодическое сканирование кодовых секций `.text` системных библиотек (`amsi.dll`, `ntdll.dll`) сравнивает байты в памяти процесса с эталонным образом на диске. Как только в начале `AmsiScanBuffer` или `EtwEventWrite` вместо штатного пролога функции обнаруживается байт `0xC3` (`ret`) или изменение защиты страницы памяти (`VirtualProtect` на секцию `.text`), `EDR` немедленно блокирует процесс по сигналу **`Tampering: User-Mode Hook / Patch Detected`**!

## Почему это работает: Принцип неизменяемости кодовых секций `.text` (`Copy-on-Write` / `Private Dirty Page`)

По умолчанию системные библиотеки `ntdll.dll` и `amsi.dll` отображаются в память всех процессов как общие разделяемые страницы только для чтения и исполнения (`Shared RX`). Если процесс вызывает `VirtualProtect` и перезаписывает хотя бы один байт в секции `.text` `amsi.dll`, ядро создаёт для этой страницы **частную изменённую копию (`Private Modified Page`)**! Детектор `EDR` за доли миллисекунды находит все процессы, у которых страница кода `amsi.dll` или `ntdll.dll` перестала быть общей (`Shared -> Private`), и фиксирует попытку отключения телеметрии.

<!-- preparation -->

В этом практикуме ты создашь в `lab.py` верификатор целостности пользовательской телеметрии (`AMSI` + `ETW`) и ядерного сенсора `ETW-Ti`: проверишь перехват вредоносного буфера в `AmsiScanBuffer`, обнаружишь попытку патча пролога функции байтом `0xC3` по признаку `Copy-on-Write (Private Page)` и проверишь защиту процесса `PPL`.

## Сделай сейчас: Проверь работу `AmsiScanBuffer`, контроль целостности `.text` и защиту `PPL` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
EXPECTED_PROLOGUE = b"\x4c\x8b\xdc\x49\x89\x5b\x08"  # Штатный пролог функции x86-64


def verify_dll_text_integrity(current_bytes, is_shared_page=True):
    if not is_shared_page or current_bytes != EXPECTED_PROLOGUE:
        return "ALERT_EDR_TAMPERING:private_patched_text_page_detected"
    return "INTEGRITY_OK:clean_shared_rx_section"


def amsi_scan_buffer(unpacked_script_str, prologue_bytes=EXPECTED_PROLOGUE):
    integrity = verify_dll_text_integrity(prologue_bytes, is_shared_page=(prologue_bytes == EXPECTED_PROLOGUE))
    if integrity != "INTEGRITY_OK:clean_shared_rx_section":
        return integrity
    lowered = unpacked_script_str.lower()
    if "invoke-kairontestpayload" in lowered or "cred_harvest::synthetic_demo" in lowered:
        return "AMSI_RESULT_DETECTED:blocked_malicious_payload"
    return "AMSI_RESULT_CLEAN:allowed"


def try_open_edr_process(caller_is_admin, target_is_ppl=True):
    if target_is_ppl:
        return "ACCESS_DENIED:protected_process_light_PPL_blocks_admin"
    return "PROCESS_ALL_ACCESS" if caller_is_admin else "ACCESS_DENIED"


print("clean_script_scan=", amsi_scan_buffer("Get-Process | Select-Object Name"))
print("malicious_unpacked_scan=", amsi_scan_buffer("Invoke-KaironTestPayload -SyntheticDemo"))

patched_ret_prologue = b"\xc3" + EXPECTED_PROLOGUE[1:]
print("patched_amsi_check=", amsi_scan_buffer("Invoke-KaironTestPayload", prologue_bytes=patched_ret_prologue))
print("admin_vs_ppl_edr=", try_open_edr_process(caller_is_admin=True, target_is_ppl=True))
```

### Шаг 2. Запусти программу и изучи срабатывание всех трёх уровней защиты

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
clean_script_scan= AMSI_RESULT_CLEAN:allowed
malicious_unpacked_scan= AMSI_RESULT_DETECTED:blocked_malicious_payload
patched_amsi_check= ALERT_EDR_TAMPERING:private_patched_text_page_detected
admin_vs_ppl_edr= ACCESS_DENIED:protected_process_light_PPL_blocks_admin
```

Разберём, что показала модель:
- штатная команда `Get-Process` прошла через `amsi_scan_buffer` со статусом `AMSI_RESULT_CLEAN:allowed`, а распакованная в памяти тестовая строка с `Invoke-KaironTestPayload` была заблокирована до выполнения (`AMSI_RESULT_DETECTED:blocked_malicious_payload`);
- когда в первый байт пролога функции подставили инструкцию возврата `0xC3` (`ret`), проверка целостности кодовой секции `.text` обнаружила расхождение с эталонным образом и модификацию страницы (`ALERT_EDR_TAMPERING:private_patched_text_page_detected`);
- попытка процесса с правами локального администратора открыть дескриптор защищённого сервиса `EDR` со статусом `PPL` была отклонена ядром (`ACCESS_DENIED:protected_process_light_PPL_blocks_admin`).

### Шаг 3. Проверь сравнение хешей кодовых секций `.text` в терминале Kali

В файле `lab.py` замени `"Invoke-KaironTestPayload -SyntheticDemo"` на `"cred_harvest::synthetic_demo"`, сохрани и запусти `python3 lab.py` — сигнатура также сработает на уровне распакованного буфера. После проверки верни исходную строку.

В терминале Kali проверь на примере `/bin/ls`, как быстро вычислить контрольную сумму SHA-256 только исполняемой секции `.text` бинарного файла:

```bash
objcopy --dump-section .text=/dev/stdout /bin/ls 2>/dev/null | sha256sum
```

## Почему это работает: Зачем нужны аппаратные снимки стека (`Intel CET` и `Kernel Stack Walk` в `ETW-Ti`)

Даже если программа не патчит `ntdll.dll`, а пытается вызвать системный вызов напрямую, ядерный провайдер `ETW-Ti` при важных операциях (например, при выделении исполняемой памяти в чужом процессе) просматривает стек вызовов (`Call Stack Walk`). В легитимной программе вызов всегда проходит через официальные функции `kernelbase.dll -> ntdll.dll`. Если же адрес возврата на стеке указывает в анонимную память кучи или приватный буфер — это прямой признак шеллкода!

## Если не получилось: Частые ошибки

- **Считать, что обфускация имён переменных спасает от поведенческого `ETW-Ti`**: обфускация меняет только внешний вид текста скрипта, но как только скрипт пытается прочитать память `lsass.exe` или создать удалённый поток в другом процессе, событие генерируется самим ядром Windows (`Ring 0`), которому безразличны имена переменных в скрипте.
