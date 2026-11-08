## Перед началом: Чем отличаются поиск поддоменов в DNS и фаззинг виртуальных хостов (`TryHackMe` & `Hack The Box Academy`)

В курсах **`TryHackMe` (`Jr Penetration Tester` / `Web Fundamentals`)** и **`Hack The Box Academy` (`Attacking Web Applications with Ffuf` / `Network Enumeration`)** разведка веб-периметра всегда начинается с важного различия, в котором часто путаются новички:
1. **DNS-поддомены (`Subdomain Enumeration`)** — это записи в публичных или локальных DNS-серверах (например, `api.example.org -> 93.184.216.34`). Если запись есть в публичном DNS, её найдёт обычный DNS-запрос (`dig`).
2. **Виртуальные хосты (`Virtual Hosts / VHosts`)** — это внутренний маршрутизатор самого веб-сервера (`Nginx` или `Apache`), работающего на **одном и том же IP-адресе**. Представь большой бизнес-центр по адресу «ул. Сетевая, дом 10» (`10.10.11.200`). На уличной табличке (в публичном DNS) написано только главное имя здания `corp.htb`. Но внутри здания на ресепшене сидит администратор (`Nginx`), который смотрит на конверт — заголовок **`Host:`** в HTTP-запросе!
   - Если в запросе написано `Host: corp.htb`, сервер отдаёт публичный лендинг размером `4520` байт.
   - Если написано `Host: random-name.corp.htb`, сервер всё равно возвращает `HTTP 200 OK` с тем же самым лендингом `4520` байт (потому что `corp.htb` назначен `default_server`).
   - А если передать `Host: staging-admin.corp.htb`, тот же самый IP-адрес `10.10.11.200` внезапно открывает закрытую панель разработки размером `1890` байт, которой вообще не было в публичном DNS!

## Почему это работает: Как `ffuf -fs` отсекает тысячи одинаковых ответов-заглушек и как защитить внутренние `VHost`

Когда сканер (`ffuf` или `gobuster vhost`) проверяет словарь в `5000` имён через заголовок `-H "Host: FUZZ.corp.htb"`, веб-сервер по умолчанию отвечает кодом `200 OK` на **каждое** слово! Поэтому ориентироваться только на статус `200` нельзя: нужно сначала сделать эталонный запрос с заведомо несуществующим именем (`Host: nonexistent-99182.corp.htb`), замерить его длину в байтах (`Content-Length: 4520`) или число слов, и включить фильтр размера (`ffuf -fs 4520`).

А со стороны защитника (DevSecOps и администратора `Nginx`):
- никогда не размещать внутренние панели (`staging`, `metrics`, `admin`) на одном публичном сетевом интерфейсе с основным сайтом, полагаясь только на «секретное» имя в `server_name`;
- привязывать внутренние виртуальные хосты к внутреннему интерфейсу (`listen 127.0.0.1:8080;` или VPN-подсети) и требовать `mTLS` или единую аутентификацию (`SSO`) перед доступом.

<!-- preparation -->

В этом практикуме ты напишешь на Python анализатор ответов `VHost`-фаззинга (аналог логики фильтрации `ffuf -fs`), который автоматически вычисляет размер страницы-заглушки `default_server`, находит скрытый виртуальный хост и проверяет защищённую конфигурацию `Nginx` с привязкой к внутреннему IP.

## Сделай сейчас: Найди скрытый виртуальный хост по фильтрации размера и проверь изоляцию интерфейса в `lab.py`

### Шаг 1. Создай скрипт `lab.py`

Создай файл `lab.py`:

```python
VHOST_TABLE = {
    "corp.htb": {"body": "Welcome to Corp Public Site!" * 20, "internal_only": False},
    "dev-api.corp.htb": {"body": '{"service":"dev-api","version":"1.4-rc"}', "internal_only": True},
}


def simulate_nginx_request(host_header, client_ip="203.0.113.50", enforce_internal_bind=False):
    vhost = VHOST_TABLE.get(host_header, VHOST_TABLE["corp.htb"])
    if enforce_internal_bind and vhost["internal_only"] and not client_ip.startswith("10."):
        # Защищённый сервер не раскрывает внутренний VHost внешнему клиенту, а отдаёт default_server
        default_body = VHOST_TABLE["corp.htb"]["body"]
        return 200, len(default_body)
    return 200, len(vhost["body"])


def discover_vhosts_with_size_filter(candidates, enforce_internal_bind=False):
    # 1. Калибровочный запрос для определения размера default_server (-fs)
    _, baseline_size = simulate_nginx_request(
        "calibration-nonexistent.corp.htb", enforce_internal_bind=enforce_internal_bind
    )
    discovered = []
    for sub in candidates:
        fqdn = f"{sub}.corp.htb"
        status, resp_size = simulate_nginx_request(fqdn, enforce_internal_bind=enforce_internal_bind)
        if resp_size != baseline_size:
            discovered.append((fqdn, status, resp_size))
    return baseline_size, discovered


wordlist = ["www", "mail", "dev-api", "blog"]
base_sz, exposed_vhosts = discover_vhosts_with_size_filter(wordlist, enforce_internal_bind=False)
_, hardened_vhosts = discover_vhosts_with_size_filter(wordlist, enforce_internal_bind=True)

print("baseline_default_size=", base_sz)
print("unprotected_vhost_scan=", exposed_vhosts)
print("hardened_internal_bind_scan=", hardened_vhosts)
```

### Шаг 2. Запусти скрипт и сравни результаты до и после изоляции интерфейса

Запусти программу:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
baseline_default_size= 560
unprotected_vhost_scan= [('dev-api.corp.htb', 200, 40)]
hardened_internal_bind_scan= []
```

Разберём вывод:
- калибровочный запрос к `calibration-nonexistent.corp.htb` определил, что дефолтная страница-заглушка возвращает `200 OK` и ровно `560` байт (`baseline_default_size= 560`);
- при сканировании словаря `["www", "mail", "dev-api", "blog"]` все обычные слова вернули те же `560` байт и были отфильтрованы, кроме `dev-api.corp.htb`, который ответил `40` байтами JSON (`unprotected_vhost_scan= [('dev-api.corp.htb', 200, 40)]`);
- когда мы включили привязку внутреннего виртуального хоста к внутренней сети (`enforce_internal_bind=True`), для внешнего IP `203.0.113.50` сервер перестал выдавать отличающийся ответ (`hardened_internal_bind_scan= []`).

### Шаг 3. Проверь передачу заголовка `Host:` с помощью `curl` в Kali

В файле `lab.py` измени `client_ip="203.0.113.50"` на внутренний адрес `"10.10.14.5"`, сохрани и запусти `python3 lab.py`. Теперь даже при `enforce_internal_bind=True` запрос из внутренней подсети `10.x` увидит `dev-api.corp.htb`. После проверки верни `client_ip="203.0.113.50"`.

В терминале Kali при анализе локального или лабораторного веб-сервера заголовок `Host` задаётся в `curl` ключом `-H` (без необходимости править `/etc/hosts` до подтверждения находки):

```bash
curl -s -o /dev/null -w "status=%{http_code} size=%{size_download}\n" -H "Host: test.local" http://127.0.0.1/ || true
```

## Почему это работает: Зачем в `/etc/hosts` добавляют найденные виртуальные хосты

Когда ты нашёл виртуальный хост (например, `dev-api.corp.htb`) с помощью `curl -H "Host: ..."` или `ffuf`, браузер всё ещё не знает, на какой IP отправлять запросы при переходе по ссылкам и загрузке скриптов с `http://dev-api.corp.htb`. Добавление строки `10.10.11.200 corp.htb dev-api.corp.htb` в локальный файл `/etc/hosts` заставляет ОС направлять оба имени на целевой IP, а браузер автоматически подставляет нужный заголовок `Host:`.

## Если не получилось: Частые ошибки

- **Забыть кавычки вокруг `-H "Host: FUZZ.corp.htb"` в командной строке**: без кавычек пробел после двоеточия разорвёт аргумент на два слова, и `curl` / `ffuf` посчитает `FUZZ.corp.htb` отдельным URL, а не значением заголовка `Host`.
