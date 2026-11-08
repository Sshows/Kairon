## Перед началом: Как проводится аудит повышения привилегий в Linux (`TryHackMe` & `Hack The Box Academy`)

Когда специалист по тестированию на проникновение или системный инженер проверяет защищённость Linux-сервера по методике **`TryHackMe` (`Linux PrivEsc`)** и **`Hack The Box Academy` (`Linux Privilege Escalation`)**, он ищет места, где **код с высокими привилегиями (`root`) доверяет файлам, путям или переменным, которыми управляет обычный пользователь**.

Разберём четыре самых частых просчёта конфигурации на реальных серверах:
1. **Относительный путь в `crontab` и перезаписываемый каталог в `PATH`**: представь, что каждую минуту в `/etc/crontab` от имени `root` запускается строка `PATH=/home/dev/bin:/usr/bin` и команда `backup.sh` (без ведущего слэша `/usr/local/bin/backup.sh`). Планировщик `cron` ищет `backup.sh` слева направо по каталогам из `PATH`. Если папка `/home/dev/bin` доступна на запись пользователю `dev`, любой созданный там исполняемый файл `/home/dev/bin/backup.sh` будет автоматически запущен с правами `root`!
2. **Опасная переменная `env_keep += LD_PRELOAD` в `/etc/sudoers`**: динамический загрузчик Linux проверяет переменную `LD_PRELOAD` и подгружает указанную разделяемую библиотеку `.so` **раньше** всех системных библиотек (включая `libc`). По умолчанию `sudo` сбрасывает `LD_PRELOAD`, но если в `sudo -l` включено сохранение `env_keep += LD_PRELOAD`, запуск любой разрешённой команды через `sudo LD_PRELOAD=/tmp/hook.so /usr/bin/ping` выполнит код функции `_init()` из `/tmp/hook.so` с правами `root`.
3. **Подстановка wildcard `*` в командах `tar` или `chown` из `cron`**: если скрипт администратора делает `cd /var/backups/uploads && tar czf /tmp/archive.tgz *`, то `bash` раскрывает звёздочку `*` в список имён файлов. Если в каталоге создать файлы с именами `--checkpoint=1` и `--checkpoint-action=exec=sh script.sh`, программа `tar` воспримет имена файлов как собственные флаги командной строки!
4. **Права на запись (`0664` / `0777`) на юнит-файлы `systemd` (`/etc/systemd/system/*.service`)**: если непривилегированный пользователь может изменить параметр `ExecStart=` в сервисном файле, то при следующем перезапуске службы `systemd` выполнит указанную команду от `root`.

## Почему это работает: Четыре золотых правила защиты фоновых задач и `sudo`

- В `/etc/crontab` и юнитах `systemd` всегда указывать **полные абсолютные пути** (`/usr/local/sbin/backup.sh`) и выставлять `PATH=/usr/sbin:/usr/bin:/sbin:/bin`.
- В скриптах с архиваторами ставить `./*` или разделитель опций `--` (`tar czf /tmp/archive.tgz -- *`), чтобы имена файлов, начинающиеся с `-`, никогда не читались как флаги.
- Все файлы `/etc/systemd/system/*.service` и вызываемые ими скрипты должны принадлежать `root:root` с правами `0644` / `0755` (без записи для группы и остальных).

<!-- preparation -->

В этом практикуме ты создашь в `lab.py` автоматический аудитор конфигурации Linux-сервера, который находит уязвимые места в `cron`, `sudoers`, `systemd` и вызовах `tar *`, а затем проверяет исправленную конфигурацию.

## Сделай сейчас: Проведи аудит `cron`, `sudoers`, `systemd` и `wildcard` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
def audit_linux_privesc_surface(config):
    findings = []

    # 1. Проверка PATH и команды в cron
    cron_path_dirs = config["cron_path"].split(":")
    if any(d.startswith(("/home/", "/tmp", ".")) for d in cron_path_dirs):
        findings.append("CRON_WRITABLE_PATH_DIR")
    if not config["cron_cmd"].startswith("/"):
        findings.append("CRON_RELATIVE_COMMAND_PATH")

    # 2. Проверка LD_PRELOAD в sudoers
    if "LD_PRELOAD" in config["sudo_env_keep"]:
        findings.append("SUDO_LD_PRELOAD_ENABLED")

    # 3. Проверка wildcard в tar без '--' или './*'
    if "tar " in config["backup_line"] and " *" in config["backup_line"] and "-- *" not in config["backup_line"]:
        findings.append("TAR_WILDCARD_ARGUMENT_INJECTION")

    # 4. Проверка прав на systemd unit
    if config["systemd_unit_mode"] & 0o022:
        findings.append("SYSTEMD_UNIT_GROUP_OR_WORLD_WRITABLE")

    return findings if findings else ["HARDENED:no_privesc_vectors_found"]


vulnerable_server = {
    "cron_path": "/home/dev/bin:/usr/local/bin:/usr/bin",
    "cron_cmd": "cleanup.sh",
    "sudo_env_keep": ["LANG", "LD_PRELOAD"],
    "backup_line": "tar czf /var/backups/html.tgz *",
    "systemd_unit_mode": 0o664,
}

hardened_server = {
    "cron_path": "/usr/sbin:/usr/bin:/sbin:/bin",
    "cron_cmd": "/usr/local/sbin/cleanup.sh",
    "sudo_env_keep": ["LANG"],
    "backup_line": "tar czf /var/backups/html.tgz -- *",
    "systemd_unit_mode": 0o644,
}

print("vuln_audit=", audit_linux_privesc_surface(vulnerable_server))
print("hardened_audit=", audit_linux_privesc_surface(hardened_server))
```

### Шаг 2. Запусти программу и изучи найденные векторы

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
vuln_audit= ['CRON_WRITABLE_PATH_DIR', 'CRON_RELATIVE_COMMAND_PATH', 'SUDO_LD_PRELOAD_ENABLED', 'TAR_WILDCARD_ARGUMENT_INJECTION', 'SYSTEMD_UNIT_GROUP_OR_WORLD_WRITABLE']
hardened_audit= ['HARDENED:no_privesc_vectors_found']
```

Посмотри, как чётко сработал чек-лист:
- в `vulnerable_server` аудитор выявил сразу все пять классических ошибок из лабораторий `TryHackMe` и `HTB`: пользовательский каталог `/home/dev/bin` в `PATH` планировщика `cron`, относительное имя `cleanup.sh`, сохранение `LD_PRELOAD` в `sudoers`, незащищённую звёздочку `tar ... *` и бит записи для группы (`0o664 & 0o022 != 0`) на юните `systemd`;
- после перевода путей на абсолютные, очистки `sudo_env_keep`, добавления разделителя `-- *` в `tar` и установки прав `0644` на юнит `systemd` проверка подтвердила отсутствие векторов (`HARDENED:no_privesc_vectors_found`).

### Шаг 3. Проверь поиск изменяемых сервисных файлов `systemd` в терминале Kali

В файле `lab.py` измени `0o644` в `hardened_server` на `0o666`, сохрани и запусти `python3 lab.py` — побитовая маска `mode & 0o022` мгновенно поймает права записи для группы и остальных пользователей (`SYSTEMD_UNIT_GROUP_OR_WORLD_WRITABLE`). После проверки верни `0o644`.

В терминале Kali проверь безопасную однострочную команду `find`, с помощью которой администраторы проверяют, нет ли в `/etc/systemd/system` файлов, доступных на запись непривилегированным пользователям:

```bash
find /etc/systemd/system -maxdepth 2 -type f -perm /022 2>/dev/null | head -n 5
```

Пустой вывод означает, что ни один сервисный файл в `/etc/systemd/system` не имеет опасных битов записи для группы или всех пользователей (`022`).

## Почему это работает: Как работает побитовая проверка прав `mode & 0o022`

В восьмеричной записи прав Linux (`0644`) первая цифра после нуля (`6 = 4+2`) — это права владельца (`u`), вторая (`4`) — права группы (`g`), третья (`4`) — права остальных (`o`). Бит записи всегда имеет вес `2`. Поэтому побитовое «И» с маской `0o022` проверяет одновременно бит записи группы и бит записи остальных пользователей: если результат равен `0`, писать в файл может только владелец (`root`).

## Если не получилось: Частые ошибки

- **Использование `chmod +x` без проверки `chmod go-w` на скриптах в `/usr/local/bin`**: если скрипт принадлежит группе разработчиков с правом записи (`rwxrwxr-x`), любой участник группы может дописать команду в конец скрипта, запускаемого от `root`.
