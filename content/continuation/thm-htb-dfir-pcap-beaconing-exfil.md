## Перед началом: Как сетевая криминалистика (`DFIR`) обнаруживает `C2 Beaconing` и `DNS Exfiltration` (`TryHackMe` & `Hack The Box Academy`)

В завершающих модулях **`TryHackMe` (`Network Miner / Wireshark / Zeek` в `SOC Level 1`)** и **`Hack The Box Academy` (`Intro to Network Traffic Analysis` / `Incident Handling`)** расследование сетевого дампа (`PCAP` или логов `Zeek`) решает важную задачу: как заметить скрытый канал управления (`Command & Control, C2`) и утечку данных, если весь трафик зашифрован по `HTTPS` или упакован внутрь обычных `DNS`-запросов?

Даже когда содержимое пакетов зашифровано, **сетевые метаданные (тайминги, размеры пакетов и структура DNS-имён)** выдают атаку с головой:
1. **`C2 Beaconing` («периодический маяк агента управления»)**: живой человек в браузере кликает по ссылкам в случайные моменты времени — паузы между его запросами составляют то `2` секунды, то `45` секунд, то `300` секунд (высокий разброс интервалов $\Delta t$). А автоматический имплант (`C2 Beacon`) просыпается по таймеру, например, ровно каждые `60` секунд (`sleep 60`), чтобы спросить у сервера новые команды! Если посчитать разницы между соседними метками времени $\Delta t_i = t_{i} - t_{i-1}$, то у маяка почти все $\Delta t_i$ будут близки к одному числу (низкое стандартное отклонение / малый джиттер).
2. **`DNS Tunneling / Exfiltration` («туннелирование и выгрузка данных через DNS»)**: даже в самой изолированной сети часто оставляют открытым разрешение DNS-имён (порт `53`). Чтобы выгрузить секретный файл наружу, скрипт режет его на кусочки, кодирует в `hex` или `base32` и приклеивает как длинный поддомен первого уровня:
   `4b524e5f5345435245545f4348554e4b5f3031.tunnel.attacker-dns.com`
   Для локального корпоративного DNS-сервера это выглядит как обычный запрос поиска IP-адреса, который он послушно пересылает владельцу домена `attacker-dns.com`!

## Почему это работает: Два математических признака для сетевого детектора (`Zeek` / `Suricata`)

- **Детектор `C2 Beaconing`**: группирует исходящие соединения по паре `(src_ip, dst_ip, dst_port)`, вычисляет массив интервалов $\Delta t$ между пакетами и проверяет коэффициент вариации (отношение разброса к среднему интервалу). Если разброс мал, а число соединений велико — перед нами автоматический маяк.
- **Детектор `DNS Exfiltration`**: проверяет длину левой метки поддомена (`len(sub) > 30`), долю шестнадцатеричных/случайных символов и количество уникальных длинных поддоменов к одному и тому же родительскому домену за минуту.

<!-- preparation -->

В этом практикуме ты напишешь в `lab.py` сетевой анализатор потоков (`DFIR` / `Threat Hunting`), который по массиву временных меток находит скрытый периодический маяк `C2 Beaconing`, а по журналу `DNS`-запросов выделяет и собирает выгруженный по кусочкам документ.

## Сделай сейчас: Найди `C2 Beaconing` по таймингам и восстанови данные из `DNS`-туннеля в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
def detect_c2_beaconing(timestamps):
    if len(timestamps) < 4:
        return "insufficient_samples", None
    deltas = [timestamps[i] - timestamps[i - 1] for i in range(1, len(timestamps))]
    mean_dt = sum(deltas) / len(deltas)
    max_deviation = max(abs(d - mean_dt) for d in deltas)
    # Если отклонение интервалов не превышает 10% от среднего периода — это периодический маяк
    if max_deviation <= 0.10 * mean_dt:
        return "ALERT:periodic_c2_beacon_detected", round(mean_dt, 1)
    return "benign:human_browsing_variance", round(mean_dt, 1)


def analyze_dns_queries(qnames):
    suspicious_chunks = []
    for q in qnames:
        left_label = q.split(".")[0]
        is_hex_encoded = all(c in "0123456789abcdefABCDEF" for c in left_label)
        if len(left_label) >= 16 and is_hex_encoded:
            suspicious_chunks.append(bytes.fromhex(left_label).decode("ascii"))
    if suspicious_chunks:
        return "ALERT:dns_hex_exfiltration", "".join(suspicious_chunks)
    return "benign:standard_dns", ""


human_times = [0.0, 4.0, 52.0, 55.0, 290.0, 310.0]
beacon_times = [0.0, 60.0, 121.0, 180.0, 240.0, 300.0]

dns_log = [
    "portal.kairon.local",
    "updates.debian.org",
    "4b524e2d44464952.Stage1.exfil-zone.test",
    "2d5245434f564552.Stage2.exfil-zone.test",
]

print("human_flow=", detect_c2_beaconing(human_times))
print("beacon_flow=", detect_c2_beaconing(beacon_times))
print("dns_audit=", analyze_dns_queries(dns_log))
```

### Шаг 2. Запусти программу и изучи результаты расследования

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
human_flow= ('benign:human_browsing_variance', 62.0)
beacon_flow= ('ALERT:periodic_c2_beacon_detected', 60.0)
dns_audit= ('ALERT:dns_hex_exfiltration', 'KRN-DFIR-RECOVER')
```

Разберём, что нашёл анализатор:
- хотя и у живого пользователя (`human_times`), и у скрытого импланта (`beacon_times`) средний интервал между запросами был почти одинаковым (`62.0` с и `60.0` с), у человека паузы прыгали от `3` до `235` секунд (`benign:human_browsing_variance`), а у импланта держались около `60.0` секунд с отклонением не более `1` секунды (`ALERT:periodic_c2_beacon_detected`);
- в журнале `DNS`-запросов детектор пропустил обычные имена `portal.kairon.local` и `updates.debian.org`, но обнаружил два длинных шестнадцатеричных поддомена `4b524e2d44464952` и `2d5245434f564552` и восстановил переданную строку: `KRN-DFIR-RECOVER`.

### Шаг 3. Проверь влияние `Jitter` и разбор `tshark` / `tcpdump` в Kali

В файле `lab.py` измени третий элемент `beacon_times` с `121.0` на `195.0`, сохрани и запусти `python3 lab.py` — ты увидишь, как сильное искажение интервала меняет картину разброса. После проверки верни `121.0`.

В терминале Kali при анализе реальных файлов `.pcap` для извлечения всех запрашиваемых DNS-имён (`dns.qry.name`) одной командой используется консольный анализатор `tshark` (часть пакета `Wireshark`):

```bash
tshark --version | head -n 2
```

Запомни рабочую формулу `DFIR`-аналитика для любого `.pcap`-файла:
`tshark -r capture.pcap -Y "dns.flags.response == 0" -T fields -e frame.time_epoch -e ip.src -e dns.qry.name` — она выводит чистую таблицу из времени пакета, IP-адреса отправителя и запрошенного DNS-имени.

## Почему это работает: Как защитить корпоративный DNS от туннелирования (`RPZ` и `Internal-Only Resolver`)

Чтобы закрыть канал `DNS Exfiltration` на уровне архитектуры сети:
1. Рабочим станциям и серверам запрещают на межсетевом экране прямые обращения по порту `53/UDP` и `53/TCP` в интернет, разрешая запросы только к внутреннему корпоративному DNS-резолверу.
2. На внутреннем DNS-резолвере включают списки блокировки **`RPZ (Response Policy Zones)`**, запрет разрешения недавно зарегистрированных доменов (`Newly Observed Domains, NOD`) и ограничение частоты уникальных поддоменов (`DNS Rate Limiting`) к одному внешнему домену.

## Если не получилось: Частые ошибки

- **Фильтрация в Wireshark по `tcp.port == 53` вместо `dns`**: подавляющее большинство DNS-запросов (включая DNS-туннелирование) передаётся поверх **UDP** (`udp.port == 53`), поэтому фильтр протокола `dns` в Wireshark/`tshark` всегда надёжнее, чем фильтр только по TCP.
