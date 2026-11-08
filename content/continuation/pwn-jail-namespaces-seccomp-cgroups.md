## Перед началом: Как устроена песочница `pwn.college` изнутри (`dojjail`, `namespaces`, `seccomp` и `cgroups`)

Задумывался ли ты, как платформа `pwn.college` позволяет тысячам студентов одновременно запускать эксплойты, `SUID`-бинарники и сетевые серверы в браузере так, чтобы ни один участник не смог прочитать чужие файлы, перехватить чужой трафик или положить сервер бесконечным циклом `fork()`? За это в открытых репозиториях платформы отвечают **`pwncollege/dojjail`** и **`pwncollege/dojo`**, построенные на трёх фундаментальных механизмах ядра Linux:
1. **Пространства имён (`Linux Namespaces` — `unshare` / `clone`)**: это «персональные витрины» ресурсов ядра.
   - `PID namespace` делает так, что процесс внутри песочницы видит себя как `PID 1` и вообще не видит процессы хоста или соседних студентов.
   - `Mount (mnt) namespace` + `pivot_root` подменяют корневую файловую систему `/`, скрывая диски хоста.
   - `Network (net) namespace` выдаёт изолированный сетевой стек (только свой `lo` или виртуальную пару `veth`), чтобы нельзя было прослушать чужой порт.
2. **Фильтр системных вызовов `seccomp-bpf` (`Secure Computing Mode`)**: даже внутри контейнера процесс обращается к тому же самому ядру Linux. Чтобы запретить опасные системные вызовы (например, загрузку модулей ядра `init_module`, отладку хоста, монтирование файловых систем `mount` или смену системного времени), фильтр `seccomp-bpf` проверяет номер каждого `syscall` на входе в ядро и мгновенно блокирует запрещённые вызовы (`SECCOMP_RET_ERRNO` или `SECCOMP_RET_KILL_PROCESS`).
3. **Контрольные группы `cgroups v2`**: ограничивают физический аппетит песочницы — например, `pids.max = 64` (защита от `fork bomb`), `memory.max = 512M` и квоту процессора `cpu.max`.

## Почему это работает: Почему `chroot` в одиночку — не песочница, а `pivot_root` + `namespaces` + `seccomp` — да

Старый вызов `chroot` меняет только видимый корень каталогов, но оставляет процессу общий список `PID`, общие сетевые сокеты, доступ к `/proc` хоста и все системные вызовы. Только комбинация **пространств имён (`namespaces`)**, **фильтра `seccomp-bpf`**, **сброса `Linux Capabilities`** и **лимитов `cgroups v2`** создаёт полноценную многослойную изоляцию контейнера.

<!-- preparation -->

В этом практикуме ты соберёшь в `lab.py` верификатор профиля песочницы по образцу `dojjail`: проверишь видимость процессов в `PID namespace`, фильтрацию системных вызовов через `seccomp-bpf` и защиту от `fork bomb` лимитом `pids.max` в `cgroups v2`.

## Сделай сейчас: Проверь изоляцию `PID namespace`, фильтр `seccomp` и лимит `pids.max` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
BLOCKED_SYSCALLS = {"mount", "init_module", "kexec_load", "reboot", "ptrace_host"}


def visible_pids_in_namespace(all_processes, target_ns_id):
    if target_ns_id == "host_ns":
        return [p["host_pid"] for p in all_processes]
    return [p["ns_pid"] for p in all_processes if p["ns"] == target_ns_id]


def evaluate_seccomp_bpf(syscall_name):
    if syscall_name in BLOCKED_SYSCALLS:
        return f"SECCOMP_RET_ERRNO:EPERM_blocked_{syscall_name}"
    return f"SECCOMP_RET_ALLOW:{syscall_name}"


def try_spawn_process(current_pids_count, cgroup_pids_max):
    if current_pids_count >= cgroup_pids_max:
        return "EAGAIN:cgroup_pids_max_exceeded", current_pids_count
    return "fork_ok", current_pids_count + 1


procs = [
    {"host_pid": 1, "ns_pid": 1, "ns": "host_ns"},
    {"host_pid": 4120, "ns_pid": 1, "ns": "jail_student_a"},
    {"host_pid": 4121, "ns_pid": 2, "ns": "jail_student_a"},
    {"host_pid": 5890, "ns_pid": 1, "ns": "jail_student_b"},
]

print("student_a_visible_pids=", visible_pids_in_namespace(procs, "jail_student_a"))
print("seccomp_read=", evaluate_seccomp_bpf("read"))
print("seccomp_mount=", evaluate_seccomp_bpf("mount"))
print("cgroup_within_limit=", try_spawn_process(current_pids_count=10, cgroup_pids_max=64))
print("cgroup_fork_bomb_stopped=", try_spawn_process(current_pids_count=64, cgroup_pids_max=64))
```

### Шаг 2. Запусти скрипт и проверь три уровня защиты песочницы

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
student_a_visible_pids= [1, 2]
seccomp_read= SECCOMP_RET_ALLOW:read
seccomp_mount= SECCOMP_RET_ERRNO:EPERM_blocked_mount
cgroup_within_limit= ('fork_ok', 11)
cgroup_fork_bomb_stopped= ('EAGAIN:cgroup_pids_max_exceeded', 64)
```

Разберём, что показала модель:
- внутри своего пространства имён `jail_student_a` процесс видит только собственные локальные идентификаторы `[1, 2]` и вообще не подозревает о существовании процесса `5890` соседнего студента `jail_student_b` или `PID 1` хоста;
- фильтр `evaluate_seccomp_bpf` беспрепятственно пропускает штатный системный вызов `read` (`SECCOMP_RET_ALLOW:read`), но мгновенно блокирует попытку монтирования файловой системы `mount` (`SECCOMP_RET_ERRNO:EPERM_blocked_mount`);
- контрольная группа `cgroups v2` разрешает создание процесса при счётчике `10 < 64` (`fork_ok`), но как только количество процессов в песочнице достигает потолка `pids.max = 64`, ядро отказывает в новом `fork` с ошибкой `EAGAIN:cgroup_pids_max_exceeded`, сохраняя стабильность сервера для остальных пользователей.

### Шаг 3. Проверь статус `Seccomp` и `Namespaces` текущего процесса в Kali

В файле `lab.py` замени `"jail_student_a"` в первом `print` на `"jail_student_b"`, сохрани и запусти `python3 lab.py` — ты увидишь только `[1]`. После проверки верни `"jail_student_a"`.

В терминале Kali ты можешь в любой момент проверить, включён ли у твоего текущего процесса фильтр `Seccomp` (`0` — выключен, `2` — активен режим `SECCOMP_MODE_FILTER`) и в каких пространствах имён он работает:

```bash
grep -E "^(Name|Seccomp|NoNewPrivs):" /proc/self/status && ls -l /proc/self/ns
```

## Почему это работает: Зачем нужен бит `PR_SET_NO_NEW_PRIVS` (`NoNewPrivs: 1`)

Чтобы непривилегированный процесс мог установить себе фильтр `seccomp-bpf` и не использовать его против `SUID`-программ (например, запретив `setuid` возвращать ошибку, чтобы запутать `SUID`-бинарник), ядро Linux требует предварительно включить флаг `NoNewPrivs: 1` (`prctl(PR_SET_NO_NEW_PRIVS, 1)`). Этот флаг гарантирует, что ни сам процесс, ни его потомки больше не смогут повысить привилегии при вызове `execve`.

## Если не получилось: Частые ошибки

- **Запуск контейнера с флагом `--privileged` в Docker**: флаг `--privileged` отключает фильтр `seccomp`, выдаёт все `Linux Capabilities` (`CAP_SYS_ADMIN`) и открывает доступ к устройствам хоста `/dev/*`, фактически превращая побег из контейнера на хост в одну команду `mount`. Никогда не используй `--privileged` для запуска недоверенного кода.
