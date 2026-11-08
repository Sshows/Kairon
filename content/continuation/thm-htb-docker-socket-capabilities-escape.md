## Перед началом: Безопасность контейнеров Docker — почему проброс `docker.sock` и `CAP_SYS_ADMIN` ведут к побегу на хост (`TryHackMe` & `HTB Academy`)

В модулях по безопасности контейнеров **`TryHackMe` (`Container Hardening` / `Docker Rodeo`)** и **`Hack The Box Academy` (`Docker & Container Security`)** разбираются ошибки конфигурации, которые превращают изолированный контейнер в прямой вход на родительский сервер с правами `root`:
1. **Проброс управляющего сокета `/var/run/docker.sock` внутрь контейнера (`-v /var/run/docker.sock:/var/run/docker.sock`)**: иногда разработчики монтируют `docker.sock` внутрь контейнера CI/CD или панели мониторинга, чтобы «контейнер мог сам запускать соседние контейнеры». Но демон `dockerd` на хосте работает с правами **`root`**, а сокет `/var/run/docker.sock` — это его командный пульт без пароля! Любой процесс внутри такого контейнера может отправить один HTTP-запрос в сокет `POST /containers/create`, попросив запустить новый контейнер с примонтированным корнем всего хоста (`-v /:/host_root`) — и прочитать или изменить любой файл на физическом сервере!
2. **Опасные привилегии `CAP_SYS_ADMIN` и `CAP_DAC_READ_SEARCH`**:
   - `CAP_SYS_ADMIN` разрешает системный вызов `mount`, что в сочетании с доступом к контрольным группам или блочным устройствам позволяет примонтировать файловую систему хоста;
   - `CAP_DAC_READ_SEARCH` позволяет обходить все проверки прав чтения файлов и использовать системный вызов `open_by_handle_at` (классический эксплойт `shocker` для чтения файлов хоста).

## Почему это работает: Четыре принципа защищённого контейнера (`Docker Hardening`)

Чтобы контейнер действительно оставался изолированным:
1. Никогда не монтировать `/var/run/docker.sock` в рабочие контейнеры (для сборки образов внутри контейнеров используют демонлесс-сборщики `Kaniko` или `BuildKit` в `Rootless`-режиме).
2. Сбрасывать все привилегии ядра флагом **`--cap-drop=ALL`** и запускать процесс внутри контейнера от непривилегированного пользователя (`USER 10001:10001`).
3. Включать флаг **`--security-opt=no-new-privileges:true`** и монтировать корневую файловую систему контейнера в режиме только для чтения (**`--read-only`**).

<!-- preparation -->

В этом практикуме ты создашь в `lab.py` анализатор безопасности спецификации запуска контейнера Docker, который выявляет проброс `docker.sock`, флаг `privileged` и опасные `Capabilities`, а затем проверяет эталонный профиль `Rootless / cap-drop=ALL`.

## Сделай сейчас: Проверь спецификацию контейнера Docker на векторы побега на хост в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
DANGEROUS_CAPS = {"CAP_SYS_ADMIN", "CAP_DAC_READ_SEARCH", "CAP_SYS_MODULE", "CAP_SYS_PTRACE"}


def audit_container_spec(spec):
    risks = []
    if spec.get("privileged"):
        risks.append("CRITICAL:privileged_flag_enabled")

    for mount in spec.get("binds", []):
        if "/var/run/docker.sock" in mount:
            risks.append("CRITICAL:docker_sock_mounted_host_root_equivalent")

    active_caps = set(spec.get("cap_add", []))
    if not spec.get("cap_drop_all", False):
        active_caps.add("DEFAULT_CAPS")
    bad_caps = sorted(active_caps.intersection(DANGEROUS_CAPS))
    if bad_caps:
        risks.append(f"HIGH:dangerous_capabilities:{','.join(bad_caps)}")

    if spec.get("user", "0") in ("0", "root"):
        risks.append("MEDIUM:running_as_root_uid_0")

    if not spec.get("no_new_privileges", False):
        risks.append("LOW:missing_no_new_privileges")

    return risks if risks else ["HARDENED:isolated_non_root_container"]


unsafe_ci_container = {
    "privileged": False,
    "binds": ["/var/run/docker.sock:/var/run/docker.sock"],
    "cap_drop_all": False,
    "cap_add": ["CAP_SYS_ADMIN"],
    "user": "root",
    "no_new_privileges": False,
}

hardened_app_container = {
    "privileged": False,
    "binds": ["/app/data:/data:ro"],
    "cap_drop_all": True,
    "cap_add": [],
    "user": "10001:10001",
    "no_new_privileges": True,
}

print("unsafe_container_audit=", audit_container_spec(unsafe_ci_container))
print("hardened_container_audit=", audit_container_spec(hardened_app_container))
```

### Шаг 2. Запусти программу и сравни оба профиля контейнера

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
unsafe_container_audit= ['CRITICAL:docker_sock_mounted_host_root_equivalent', 'HIGH:dangerous_capabilities:CAP_SYS_ADMIN', 'MEDIUM:running_as_root_uid_0', 'LOW:missing_no_new_privileges']
hardened_container_audit= ['HARDENED:isolated_non_root_container']
```

Разберём результаты проверки:
- в `unsafe_ci_container` анализатор обнаружил критический проброс сокета `/var/run/docker.sock` (`CRITICAL:docker_sock_mounted_host_root_equivalent`), опасную привилегию ядра `CAP_SYS_ADMIN`, работу от `root` (`UID 0`) и отсутствие запрета повышения привилегий;
- в `hardened_app_container` все привилегии сброшены (`cap_drop_all: True`), данные примонтированы только для чтения (`:ro`), указан непривилегированный пользователь `10001:10001` и включён `no_new_privileges: True` (`HARDENED:isolated_non_root_container`).

### Шаг 3. Проверь признаки работы внутри контейнера и сокет `docker.sock` в Kali

В файле `lab.py` добавь `"CAP_SYS_PTRACE"` в `cap_add` для `hardened_app_container`, сохрани и запусти `python3 lab.py` — аудитор сразу предупредит об опасной привилегии отладки процессов. После проверки верни пустой список `[]`.

В терминале Kali проверь стандартную однострочную команду, которой при аудите определяют, запущена ли текущая оболочка внутри Docker-контейнера (наличие файла `/.dockerenv` и контрольных групп):

```bash
python3 -c 'import os; print("inside_dockerenv=", os.path.exists("/.dockerenv"))'
```

## Почему это работает: Почему группа `docker` на Linux-сервере эквивалентна полному `sudo root`

Сокет `/var/run/docker.sock` на хосте по умолчанию принадлежит `root:docker` с правами `0660`. Поэтому добавление обычного пользователя в группу `docker` (`usermod -aG docker user`) даёт ему право в любой момент выполнить `docker run -v /:/host -it alpine chroot /host sh` и стать полноценным `root` на физическом сервере без ввода пароля!

## Если не получилось: Частые ошибки

- **Считать, что `USER 1000` внутри контейнера защищает при примонтированном `docker.sock` с правами `0666`**: если права на файл сокета `/var/run/docker.sock` ослаблены или `GID` группы `docker` добавлен пользователю контейнера, даже непривилегированный `UID 1000` сможет отправлять команды демону `dockerd` по HTTP через `curl --unix-socket /var/run/docker.sock`.
