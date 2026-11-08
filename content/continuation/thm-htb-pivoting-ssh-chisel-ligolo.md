## Перед началом: Сетевое туннелирование и `Pivoting` (`ssh -L / -R / -D`, `SOCKS5` и `TUN` в `TryHackMe Wreath` & `HTB Academy`)

В реальных корпоративных сетях (и в знаменитой лаборатории **`TryHackMe Wreath`** и курсе **`Hack The Box Academy: Pivoting, Tunneling & Port Forwarding`**) внутренние серверы баз данных и контроллеры домена никогда не смотрят напрямую в интернет. Между внешней сетью и закрытым сегментом `172.16.50.0/24` стоит пограничный узел (`Jump Host` / `Pivot Host`) с двумя сетевыми картами.

Как администраторы (и специалисты по тестированию на проникновение) прокладывают маршруты через промежуточный узел и чем отличаются четыре основных режима туннелирования?
1. **Прямой локальный проброс порта (`Local Port Forwarding`, `ssh -L 127.0.0.1:8443:172.16.50.10:443 user@pivot`)**: открывает порт `8443` на твоей собственной машине Kali. Всё, что ты отправляешь на `127.0.0.1:8443`, упаковывается в зашифрованный SSH-туннель до `pivot`, а `pivot` пересылает это на один конкретный порт `172.16.50.10:443`.
2. **Обратный проброс порта (`Remote / Reverse Port Forwarding`, `ssh -R`)**: используется, когда брандмауэр запрещает входящие подключения к `pivot`, но разрешает исходящие с `pivot` к тебе. Узел `pivot` сам инициирует SSH-сессию наружу и пробрасывает порт в обратную сторону.
3. **Динамический `SOCKS5`-прокси (`Dynamic Port Forwarding`, `ssh -D 1080 user@pivot` + `proxychains`)**: вместо того чтобы пробрасывать каждый порт по отдельности, `ssh -D 1080` поднимает на твоей Kali универсальный прокси-сервер `SOCKS5`. Любая программа, запущенная через `proxychains4 -q nmap -sT ...`, может обращаться к **любому** IP и TCP-порту внутри сети `172.16.50.0/24`!
4. **Туннельный сетевой интерфейс уровня L3 (`TUN-интерфейс`, `Ligolo-ng` или `ssh -w`)**: у `SOCKS5`-прокси есть ограничение — он работает только поверх TCP/UDP на прикладном уровне (поэтому через `proxychains` не проходят `ICMP ping` и полуоткрытое сканирование `nmap -sS`). Виртуальный интерфейс `tun0` (`ip tuntap add user kali mode tun ligolo`) работает на сетевом уровне `L3`, позволяя маршрутизировать IP-пакеты прозрачно для всех утилит без `proxychains`!

## Почему это работает: Как защитить сеть от несанкционированного `Pivoting`

- На бастионных хостах (`Jump Hosts`) в `/etc/ssh/sshd_config` отключать произвольный проброс портов и туннелей: **`AllowTcpForwarding no`**, **`PermitTunnel no`**, **`GatewayPorts no`**, разрешая переход только через контролируемый `ProxyJump` с записью сессий.
- На внутренних межсетевых экранах ограничивать исходящие соединения из DMZ (чтобы скомпрометированный веб-сервер в DMZ не мог инициировать обратный туннель `-R` наружу).

<!-- preparation -->

В этом практикуме ты создашь в `lab.py` маршрутизатор туннелей (`Local -L`, `Dynamic SOCKS5 -D` и `TUN L3`), проверишь прохождение TCP и ICMP-трафика через каждый тип туннеля и протестируешь блокировку проброса политикой `AllowTcpForwarding no` в `sshd_config`.

## Сделай сейчас: Сравни маршрутизацию `ssh -L`, `SOCKS5 -D` и `TUN` и проверь защиту `sshd_config` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
def evaluate_tunnel_packet(tunnel_type, protocol, dst_ip, dst_port, sshd_allow_forwarding=True):
    if tunnel_type in ("ssh_local_L", "ssh_dynamic_D") and not sshd_allow_forwarding:
        return "blocked:sshd_AllowTcpForwarding_no"

    if tunnel_type == "ssh_local_L":
        # Локальный проброс привязан к одной фиксированной паре (dst_ip, dst_port) и только TCP
        if protocol == "TCP" and (dst_ip, dst_port) == ("172.16.50.10", 443):
            return "forwarded:single_target_tcp"
        return "rejected:not_matching_fixed_L_rule"

    if tunnel_type == "ssh_dynamic_D":
        # SOCKS5 пропускает любой TCP-порт в подсети, но не пропускает сырой ICMP
        if protocol == "ICMP":
            return "unsupported:socks5_cannot_route_raw_icmp"
        return f"forwarded:socks5_tcp_to_{dst_ip}:{dst_port}"

    if tunnel_type == "tun_l3_interface":
        # Виртуальный интерфейс TUN маршрутизирует любые IP-пакеты (и TCP, и ICMP)
        return f"routed:tun0_l3_{protocol}_to_{dst_ip}"

    return "unknown_tunnel"


print("local_L_match=", evaluate_tunnel_packet("ssh_local_L", "TCP", "172.16.50.10", 443))
print("local_L_other_port=", evaluate_tunnel_packet("ssh_local_L", "TCP", "172.16.50.10", 8080))
print("dynamic_D_tcp=", evaluate_tunnel_packet("ssh_dynamic_D", "TCP", "172.16.50.25", 3389))
print("dynamic_D_icmp=", evaluate_tunnel_packet("ssh_dynamic_D", "ICMP", "172.16.50.25", 0))
print("tun_l3_icmp=", evaluate_tunnel_packet("tun_l3_interface", "ICMP", "172.16.50.25", 0))
print("hardened_sshd=", evaluate_tunnel_packet("ssh_dynamic_D", "TCP", "172.16.50.10", 443, sshd_allow_forwarding=False))
```

### Шаг 2. Запусти программу и сравни возможности туннелей

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
local_L_match= forwarded:single_target_tcp
local_L_other_port= rejected:not_matching_fixed_L_rule
dynamic_D_tcp= forwarded:socks5_tcp_to_172.16.50.25:3389
dynamic_D_icmp= unsupported:socks5_cannot_route_raw_icmp
tun_l3_icmp= routed:tun0_l3_ICMP_to_172.16.50.25
hardened_sshd= blocked:sshd_AllowTcpForwarding_no
```

Разберём каждую строку:
- локальный проброс `ssh_local_L` пропустил соединение строго к `172.16.50.10:443`, но отклонил обращение к порту `8080`;
- динамический прокси `ssh_dynamic_D` (`SOCKS5`) доставил TCP-пакет на произвольный внутренний адрес `172.16.50.25:3389`, но не смог переслать `ICMP`-пакет (`unsupported:socks5_cannot_route_raw_icmp`);
- виртуальный интерфейс `tun_l3_interface` успешно маршрутизировал `ICMP` на уровне сетевых пакетов `L3` (`routed:tun0_l3_ICMP_to_172.16.50.25`);
- при отключении проброса на SSH-сервере (`sshd_allow_forwarding=False`) попытка открыть туннель была заблокирована (`blocked:sshd_AllowTcpForwarding_no`).

### Шаг 3. Проверь привязку локального проброса к `127.0.0.1` и настройки `proxychains4` в Kali

В файле `lab.py` измени `443` в первом вызове на `22`, сохрани и запусти `python3 lab.py` — ты увидишь `rejected:not_matching_fixed_L_rule`. После проверки верни `443`.

В терминале Kali посмотри последние строки конфигурационного файла `/etc/proxychains4.conf` (или `/etc/proxychains.conf`), где задаётся локальный порт `socks5` или `socks4`:

```bash
tail -n 8 /etc/proxychains4.conf 2>/dev/null || tail -n 8 /etc/proxychains.conf 2>/dev/null || echo "proxychains_config_checked"
```

## Почему это работает: Почему при `ssh -L` всегда нужно явно указывать `127.0.0.1:8443:...`

Если написать `ssh -L 8443:172.16.50.10:443` с включённой опцией `GatewayPorts` (или флагом `-g`), порт `8443` откроется на всех сетевых интерфейсах твоей машины (`0.0.0.0:8443`), и любой сосед по локальной сети сможет зайти в твой туннель! Явная запись `ssh -L 127.0.0.1:8443:172.16.50.10:443` привязывает вход туннеля исключительно к твоему локальному интерфейсу `loopback`.

## Если не получилось: Частые ошибки

- **Запуск `nmap` без флага `-sT` и `-Pn` через `proxychains`**: по умолчанию `nmap` отправляет `ICMP ping` и `SYN`-пакеты, которые не проходят через `SOCKS5`. При работе через `proxychains` всегда указывают полный TCP-коннект и отключение пинга: `proxychains4 -q nmap -sT -Pn 172.16.50.10`.
