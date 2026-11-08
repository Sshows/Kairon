## Перед началом: Как уязвимость `SSRF` добирается до облачных ключей `169.254.169.254` и как это блокирует `IMDSv2` (`TryHackMe` & `Hack The Box Academy`)

В облачных и веб-модулях **`TryHackMe` (`SSRF` / `Attacking Cloud`)** и **`Hack The Box Academy` (`Server-Side Attacks: SSRF`)** рассматривается одна из самых критичных уязвимостей современной облачной инфраструктуры — **`Server-Side Request Forgery (SSRF, подделка запросов на стороне сервера)`**.

Представь функцию «Загрузить аватарку по ссылке URL» или «Проверить доступность веб-хука». Сервер берёт присланный пользователем `url` и сам делает HTTP-запрос `requests.get(url)`. В чём опасность?
1. **Доступ к локальным портам (`127.0.0.1`) и внутренним сетям (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)**: внешний пользователь не может подключиться из интернета к внутренней базе `Redis` (`127.0.0.1:6379`) или панели администратора (`http://127.0.0.1:8000/admin`). Но сам веб-сервер — может!
2. **Сервис метаданных облачного инстанса (`Cloud Instance Metadata Service — IMDS` по адресу `169.254.169.254`)**: в облаках AWS, GCP и Azure по специальному немаршрутизируемому адресу `http://169.254.169.254/latest/meta-data/iam/security-credentials/...` виртуальная машина узнаёт свои временные ключи доступа (`AccessKeyId`, `SecretAccessKey`, `Token`). В первой версии протокола (**`IMDSv1`**) достаточно было сделать один обычный `GET`-запрос — и любая уязвимость `SSRF` мгновенно отдавала злоумышленнику облачные ключи сервера!
3. **Почему наивные текстовые фильтры (`if "127.0.0.1" in url`) легко обходятся**: сетевой стек понимает IP-адрес и как единое 32-битное целое число (`http://2130706433` — это `127.0.0.1`), и в шестнадцатеричной записи (`0x7f000001`), и через `IPv6` (`[::1]`), и через HTTP-редирект `302 Found` с внешнего сайта на `169.254.169.254`!

## Почему это работает: Два непробиваемых щита — протокол `IMDSv2` и проверка разрешённого IP (`ipaddress`)

Как защищают современные облачные сервисы от `SSRF`:
1. **Протокол `IMDSv2` (сессионные токены метаданных)**: чтобы прочитать метаданные в `IMDSv2`, нельзя просто отправить `GET`. Сначала клиент обязан отправить запрос методом **`PUT`** со специальным заголовком `X-aws-ec2-metadata-token-ttl-seconds: 21600`, получить одноразовый токен и передать его во втором запросе в заголовке `X-aws-ec2-metadata-token`. Поскольку классический `SSRF` умеет делать только простые `GET`-запросы и не позволяет внедрять кастомные HTTP-заголовки в двухшаговом диалоге, `IMDSv2` полностью блокирует кражу облачных ключей!
2. **Проверка канонического IP через стандартный модуль `ipaddress`**: перед отправкой запроса сервер преобразует хост в объект `ipaddress.ip_address(...)` и проверяет `if not ip.is_global:` (отсекая разом все loopback, приватные и link-local диапазоны `169.254.0.0/16` в любом формате записи) и отключает автоматическое следование редиректам (`allow_redirects=False`).

<!-- preparation -->

В этом практикуме ты проверишь в `lab.py` обход наивного строкового фильтра через целочисленный IP `2130706433`, каноническую блокировку через модуль `ipaddress.ip_address` и защиту облачных метаданных протоколом `IMDSv2`.

## Сделай сейчас: Проверь канонический фильтр `ipaddress` и защиту `IMDSv2` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
import ipaddress


def naive_string_ssrf_filter(host_str):
    if host_str in ("127.0.0.1", "localhost", "169.254.169.254"):
        return "blocked_by_string_filter"
    return "passed_string_filter"


def strict_canonical_ip_filter(raw_host):
    # Если передано целое число в виде строки (например '2130706433'), конвертируем в int
    target = int(raw_host) if raw_host.isdigit() else raw_host
    ip_obj = ipaddress.ip_address(target)
    if ip_obj.is_loopback or ip_obj.is_private or ip_obj.is_link_local or not ip_obj.is_global:
        return f"blocked:non_global_ip:{ip_obj}"
    return f"allowed:global_ip:{ip_obj}"


def cloud_metadata_service(method, headers, enforce_imdsv2=True):
    if not enforce_imdsv2 and method == "GET":
        return "LEAKED_IMDSv1:IAM_Temp_Credentials"
    if method == "PUT" and "X-aws-ec2-metadata-token-ttl-seconds" in headers:
        return "ISSUED_TOKEN:IMDSv2_SESSION_TOKEN"
    if method == "GET" and headers.get("X-aws-ec2-metadata-token") == "IMDSv2_SESSION_TOKEN":
        return "AUTHORIZED_IMDSv2:IAM_Temp_Credentials"
    return "401_UNAUTHORIZED:IMDSv2_token_required"


decimal_loopback = str(int(ipaddress.ip_address("127.0.0.1")))
print("decimal_127_0_0_1=", decimal_loopback)
print("naive_vs_strict_loopback=", naive_string_ssrf_filter(decimal_loopback), strict_canonical_ip_filter(decimal_loopback))
print("strict_imds_ip=", strict_canonical_ip_filter("169.254.169.254"))
print("ssrf_get_on_imdsv1=", cloud_metadata_service("GET", {}, enforce_imdsv2=False))
print("ssrf_get_on_imdsv2=", cloud_metadata_service("GET", {}, enforce_imdsv2=True))
```

### Шаг 2. Запусти программу и сравни оба уровня защиты

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
decimal_127_0_0_1= 2130706433
naive_vs_strict_loopback= passed_string_filter blocked:non_global_ip:127.0.0.1
strict_imds_ip= blocked:non_global_ip:169.254.169.254
ssrf_get_on_imdsv1= LEAKED_IMDSv1:IAM_Temp_Credentials
ssrf_get_on_imdsv2= 401_UNAUTHORIZED:IMDSv2_token_required
```

Посмотри на результат:
- адрес `127.0.0.1` в виде 32-битного числа равен `2130706433`. Строковый фильтр `naive_string_ssrf_filter` пропустил его (`passed_string_filter`), а канонический парсер `ipaddress.ip_address(2130706433)` мгновенно распознал в нём `127.0.0.1` и заблокировал как неглобальный адрес (`blocked:non_global_ip:127.0.0.1`);
- адрес метаданных `169.254.169.254` входит в диапазон `Link-Local` (`169.254.0.0/16`) и также блокируется проверкой `not ip_obj.is_global`;
- при простом `GET`-запросе без заголовков устаревший `IMDSv1` выдал ключи (`LEAKED_IMDSv1`), тогда как `IMDSv2` вернул `401_UNAUTHORIZED:IMDSv2_token_required`.

### Шаг 3. Проверь свойства `ipaddress` для приватных подсетей в Kali

В файле `lab.py` замени `"169.254.169.254"` в вызове `strict_canonical_ip_filter` на публичный адрес `"93.184.216.34"`, сохрани и запусти `python3 lab.py` — глобальный адрес получит статус `allowed:global_ip:93.184.216.34`. После проверки верни `"169.254.169.254"`.

В терминале Kali проверь, как стандартный модуль `ipaddress` классифицирует различные специальные адреса:

```bash
python3 -c 'import ipaddress; [print(ip, "global=", ipaddress.ip_address(ip).is_global) for ip in ("127.0.0.1", "10.0.0.5", "169.254.169.254", "8.8.8.8")]'
```

## Почему это работает: Зачем в `IMDSv2` ставят `HttpPutResponseHopLimit = 1` (`TTL = 1`)

Когда ответ с токеном `IMDSv2` отправляется виртуальной машине с параметром `Hop Limit = 1` (`TTL = 1`), пакет не может пройти ни через один дополнительный сетевой маршрутизатор (включая NAT-мост контейнера, если контейнер работает в своей изолированной сети). Поэтому рекомендуется оставлять `HttpPutResponseHopLimit = 1`, чтобы процессы внутри непривилегированных контейнеров не могли запрашивать метаданные хостовой виртуальной машины.

## Если не получилось: Частые ошибки

- **Проверка IP до HTTP-редиректа без проверки IP после редиректа**: если проверить, что `https://external.site/go` имеет публичный IP, но разрешить HTTP-клиенту автоматически следовать за ответом `302 Location: http://169.254.169.254/`, второй запрос уйдёт во внутреннюю сеть без проверки. Всегда отключай автоматические редиректы (`allow_redirects=False`) или проверяй каждый новый IP перед установкой TCP-соединения.
