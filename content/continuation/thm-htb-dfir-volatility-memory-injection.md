## Перед началом: Криминалистика оперативной памяти в `Volatility 3` — `pslist` против `psscan` и поиск инъекций `malfind` (`TryHackMe` & `HTB Academy`)

В модулях цифровой криминалистики **`TryHackMe` (`Volatility` / `Memory Forensics`)** и **`Hack The Box Academy` (`Memory Analysis with Volatility 3`)** аналитик исследует снимок оперативной памяти (`RAM Dump`, файл `.raw` или `.vmem`), снятый с заражённого компьютера. Зачем нужен снимок оперативной памяти, если есть образ жёсткого диска? Потому что бестелесные импланты, расшифрованные в памяти пейлоады и сетевые сокеты в момент атаки живут **только в оперативной памяти**!

Разберём два самых важных плагина `Volatility 3` (`windows.pslist / windows.psscan` и `windows.malfind`):
1. **Чем `windows.pslist` отличается от `windows.psscan` (поиск скрытых процессов `DKOM`)**:
   - В ядре Windows каждый процесс описан структурой **`_EPROCESS`**. Чтобы диспетчер задач мог быстро перечислить активные процессы, все структуры `_EPROCESS` сцеплены между собой в **двусвязный список (`ActiveProcessLinks`)** — как вагоны поезда, где каждый вагон держит за руку предыдущий (`Blink`) и следующий (`Flink`). Плагин **`pslist`** просто идёт по этой цепочке от первого вагона к последнему.
   - Но если руткит в ядре применит технику **`DKOM (Direct Kernel Object Manipulation)`**, он отцепит свой вагон от соседних (перекинет указатели `Flink/Blink` мимо себя)! Для `pslist` и диспетчера задач процесс исчезнет, хотя его потоки продолжают выполняться на процессоре!
   - Как его ловит плагин **`psscan`**? Он не верит связному списку `ActiveProcessLinks`, а сканирует **всю физическую память подряд** по сигнатуре заголовка пула (`Pool Tag`) в поисках всех структур `_EPROCESS`. Любой процесс, который есть в `psscan`, но отсутствует в `pslist` (`psscan - pslist`), — это скрытый или недавно завершившийся процесс!
2. **Как плагин `windows.malfind` находит инъекцию кода в чужой процесс (`Process Injection`)**:
   Когда вредоносная программа внедряет шеллкод или DLL в легитимный процесс (например, в `svchost.exe` или `explorer.exe`) через `VirtualAllocEx` + `WriteProcessMemory`, в дереве дескрипторов виртуальной памяти процесса (**`VAD — Virtual Address Descriptors`**) появляется подозрительный регион:
   - у него выставлены права одновременно на запись и исполнение (**`PAGE_EXECUTE_READWRITE / RWX`**);
   - он является **приватным (`Private Memory`, не привязанным ни к какому подписанному файлу `.dll` или `.exe` на диске — `BackedByFile = False`)**;
   - внутри него начинаются машинные инструкции или магические байты заголовка PE (`MZ`, `0x4D 0x5A`)!

## Почему это работает: Сочетание структурного обхода и сигнатурного сканирования RAM

Сопоставление двух независимых источников правды в дампе памяти (высокоуровневого списка `ActiveProcessLinks` и низкоуровневого пула памяти `psscan`, а также таблицы загруженных модулей `dlllist` и дерева страниц `VAD` в `malfind`) не оставляет скрытому в памяти коду ни одного места, где можно спрятаться.

<!-- preparation -->

В этом практикуме ты напишешь в `lab.py` собственный мини-анализатор дампа памяти по алгоритмам `Volatility 3`: найдёшь отцепленный от списка `ActiveProcessLinks` скрытый процесс (`psscan` против `pslist`) и выявишь инжектированный в `svchost.exe` регион `VAD` по алгоритму `malfind`.

## Сделай сейчас: Выяви скрытый процесс `DKOM` и регион `RWX` с `MZ`-заголовком в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
def diff_pslist_and_psscan(active_links_pids, pool_scanned_eprocess):
    linked_set = set(active_links_pids)
    unlinked_hidden = [
        (p["pid"], p["name"]) for p in pool_scanned_eprocess if p["pid"] not in linked_set
    ]
    return unlinked_hidden


def run_malfind_vad_scan(vad_regions):
    suspicious = []
    for reg in vad_regions:
        is_rwx = reg["protection"] == "PAGE_EXECUTE_READWRITE"
        not_file_backed = not reg["file_backed"]
        has_mz_or_code = reg["head_bytes"].startswith((b"MZ", b"\xfc\x48"))
        if is_rwx and not_file_backed and has_mz_or_code:
            suspicious.append((reg["process"], hex(reg["base_addr"]), reg["protection"]))
    return suspicious


pslist_pids = [4, 612, 1044]
psscan_pool = [
    {"pid": 4, "name": "System"},
    {"pid": 612, "name": "lsass.exe"},
    {"pid": 1044, "name": "svchost.exe"},
    {"pid": 3892, "name": "updater_sync.exe"},  # Отцеплен от ActiveProcessLinks!
]

vads = [
    {
        "process": "svchost.exe",
        "base_addr": 0x7FF800100000,
        "protection": "PAGE_EXECUTE_READ",
        "file_backed": True,
        "head_bytes": b"MZ\x90\x00",
    },
    {
        "process": "svchost.exe",
        "base_addr": 0x1A40000,
        "protection": "PAGE_EXECUTE_READWRITE",
        "file_backed": False,
        "head_bytes": b"MZ\x90\x00_REFLECTIVE_DLL",
    },
]

print("dkom_unlinked_procs=", diff_pslist_and_psscan(pslist_pids, psscan_pool))
print("malfind_hits=", run_malfind_vad_scan(vads))
```

### Шаг 2. Запусти программу и изучи находки `psscan` и `malfind`

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
dkom_unlinked_procs= [(3892, 'updater_sync.exe')]
malfind_hits= [('svchost.exe', '0x1a40000', 'PAGE_EXECUTE_READWRITE')]
```

Посмотри на два вывода:
- сверка `pslist` и `psscan` сразу обнаружила процесс `(3892, 'updater_sync.exe')`, который присутствует в пуле структур `_EPROCESS`, но исключён из связного списка `ActiveProcessLinks`;
- сканер `run_malfind_vad_scan` пропустил обычную системную библиотеку по адресу `0x7FF800100000` (у неё права `PAGE_EXECUTE_READ` и `file_backed: True`), но мгновенно поймал анонимный приватный регион `0x1a40000` внутри `svchost.exe` с правами `PAGE_EXECUTE_READWRITE` и заголовком `MZ` (`Reflective DLL Injection`)!

### Шаг 3. Проверь защиту от уклонения через смену прав `RW -> RX` в модели и Kali

В файле `lab.py` измени `protection` у второго региона `VAD` с `"PAGE_EXECUTE_READWRITE"` на `"PAGE_READONLY"`, сохрани и запусти `python3 lab.py` — `malfind_hits` станет пустым `[]`. После проверки верни `"PAGE_EXECUTE_READWRITE"`.

В терминале Kali можно проверить поиск `MZ`-сигнатуры (`4d 5a 90 00`) в любом бинарном дампе на Python:

```bash
python3 -c 'dump=b"\x00"*16 + b"MZ\x90\x00" + b"\x00"*16; print("mz_offset=", hex(dump.find(b"MZ\x90\x00")))'
```

## Почему это работает: Как `malfind` и аналитики ловят импланты, меняющие права с `RW` на `RX`

Продвинутые загрузчики сначала выделяют память с правами `PAGE_READWRITE (RW)`, записывают туда `MZ`-файл, а затем вызывают `VirtualProtect(..., PAGE_EXECUTE_READ)` (`RX`), чтобы избегать флага `RWX`. Но даже с правами `PAGE_EXECUTE_READ` этот регион в дереве `VAD` остаётся **приватным (`PrivateCommit`, не привязанным к файлу на диске)** и его начальное состояние памяти (`CommitCharge`) или присутствие заголовка `MZ`/`PE` в не-образе (`VadS` вместо `VadImageMap`) всё равно выдаёт инъекцию!

## Если не получилось: Частые ошибки

- **Считать любую находку `malfind` стопроцентным вирусом без проверки JIT-компиляторов**: браузеры (`Chrome`, `Firefox`), `.NET CLR` и `Java` легитимно выделяют приватные исполняемые страницы для `JIT`-компиляции. Но в страницах `JIT` никогда не бывает полноценного `MZ/PE`-заголовка исполняемого файла Windows!
