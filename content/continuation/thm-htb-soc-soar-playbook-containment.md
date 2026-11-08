## Перед началом: Как работают плейбуки автоматического реагирования `SOAR` и защита от самоблокировки в `SOC` (`TryHackMe SOC Level 2` & `HTB Academy`)

В заключительных курсах оперативного центра безопасности **`TryHackMe` (`SOC Level 2` / `Incident Response & SOAR`)** и **`Hack The Box Academy` (`Security Operations & Incident Handling`)** разбирается автоматическая оркестрация реагирования — **`SOAR (Security Orchestration, Automation, and Response)`**.

Когда `SIEM` фиксирует критический инцидент (например, срабатывание `EDR` на хосте или атаку перебора паролей с внешнего IP), время идёт на секунды. Плейбук `SOAR` выполняет четыре автоматических шага:
1. **Обогащение индикаторов (`IOC Enrichment`)**: автоматически проверяет IP-адрес, домен и хеш файла по базам киберразведки (`Threat Intelligence`) и внутренней базе активов (`CMDB` — кто владелец хоста, критичный ли это сервер).
2. **Предохранитель от самоблокировки (`Blast-Radius / Critical Infrastructure Allowlist Guard`)**:
   Представь, что было бы, если бы плейбук слепо блокировал на межсетевом экране любой IP-адрес из алерта без сверки с белым списком своей критической инфраструктуры! Злоумышленник мог бы отправить один поддельный UDP-пакет с обратным адресом твоего собственного **контроллера домена (`10.0.0.5`)**, **корпоративного DNS-сервера (`8.8.8.8` / `10.0.0.2`)** или **шлюза по умолчанию (`10.0.0.1`)** — и автоматика `SOAR` сама положила бы всю сеть компании!
   Поэтому перед любым автоматическим действием (`Block IP` или `Isolate Host`) плейбук обязан проверить:
   - не входит ли IP в список защищённых узлов инфраструктуры (`CRITICAL_INFRA_IPS`);
   - не является ли целевой хост контроллером домена или кластером базы данных Tier 0 (для таких узлов автоматическая изоляция заменяется на немедленную эскалацию дежурному инженеру **`Human-in-the-Loop Approval`**!).
3. **Изоляция рабочей станции (`EDR Host Containment`) и отзыв сессий (`Revoke Tokens`)**: для обычной рабочей станции (`Workstation Tier 2`) при подтверждённом высоком уровне угрозы агент `EDR` изолирует сетевой стек (оставляя связь только с самим сервером управления `EDR` для удалённого расследования).
4. **Расчёт метрик эффективности `SOC` (`MTTD` и `MTTR`)**:
   - **`MTTD (Mean Time to Detect)`** — среднее время от начала атаки до срабатывания детекта;
   - **`MTTR (Mean Time to Respond / Contain)`** — среднее время от обнаружения до локализации угрозы.

## Почему это работает: Баланс скорости автоматики и безопасности критических узлов (`Human-in-the-Loop`)

Грамотно спроектированный плейбук `SOAR` мгновенно (за секунды) изолирует рядовые пользовательские станции и блокирует внешние вредоносные IP-адреса, но жёстко защищает ядро сети (`Tier 0`, `DNS`, `Gateway`, `Domain Controllers`) от автоматического отключения без подтверждения человека.

<!-- preparation -->

В этом практикуме ты создашь в `lab.py` движок исполнения плейбука `SOAR`, который проверяет защиту от самоблокировки критической инфраструктуры (поддельный алерт на IP контроллера домена `10.0.0.5`), автоматически изолирует заражённую рабочую станцию `Tier 2`, запрашивает подтверждение человека для сервера `Tier 0` и вычисляет метрики `MTTD` и `MTTR`.

## Сделай сейчас: Запусти плейбук `SOAR` и проверь предохранитель критической инфраструктуры в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
CRITICAL_INFRA_IPS = {"10.0.0.1", "10.0.0.2", "10.0.0.5"}


def execute_soar_containment_playbook(alert):
    src_ip = alert["src_ip"]
    host_tier = alert["host_tier"]
    actions = []

    # 1. Проверка предохранителя самоблокировки (Allowlist Guard)
    if src_ip in CRITICAL_INFRA_IPS:
        actions.append(f"GUARD_BLOCKED_SELF_DOS:refused_to_block_critical_ip_{src_ip}")
    else:
        actions.append(f"FIREWALL_BLOCKED_IP:{src_ip}")

    # 2. Политика изоляции по уровню критичности хоста (Tier 0 vs Tier 2)
    if host_tier == "Tier0_DomainController":
        actions.append("REQUIRE_HUMAN_APPROVAL:cannot_auto_isolate_Tier0")
    else:
        actions.append(f"EDR_HOST_ISOLATED:{alert['hostname']}")
        actions.append(f"REVOKED_SESSIONS:{alert['user']}")

    mttd_sec = alert["detected_at"] - alert["occurred_at"]
    mttr_sec = alert["contained_at"] - alert["detected_at"]
    return actions, {"MTTD_sec": mttd_sec, "MTTR_sec": mttr_sec}


workstation_incident = {
    "src_ip": "198.51.100.250",
    "hostname": "ws-finance-14",
    "host_tier": "Tier2_Workstation",
    "user": "m.ivanova",
    "occurred_at": 1000,
    "detected_at": 1045,
    "contained_at": 1060,
}

spoofed_dc_incident = {
    "src_ip": "10.0.0.5",  # IP нашего контроллера домена!
    "hostname": "dc01.corp.local",
    "host_tier": "Tier0_DomainController",
    "user": "SYSTEM",
    "occurred_at": 2000,
    "detected_at": 2010,
    "contained_at": 2025,
}

ws_actions, ws_metrics = execute_soar_containment_playbook(workstation_incident)
dc_actions, _ = execute_soar_containment_playbook(spoofed_dc_incident)

print("workstation_soar=", ws_actions, "metrics=", ws_metrics)
print("tier0_guard_soar=", dc_actions)
```

### Шаг 2. Запусти программу и сравни оба сценария реагирования

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
workstation_soar= ['FIREWALL_BLOCKED_IP:198.51.100.250', 'EDR_HOST_ISOLATED:ws-finance-14', 'REVOKED_SESSIONS:m.ivanova'] metrics= {'MTTD_sec': 45, 'MTTR_sec': 15}
tier0_guard_soar= ['GUARD_BLOCKED_SELF_DOS:refused_to_block_critical_ip_10.0.0.5', 'REQUIRE_HUMAN_APPROVAL:cannot_auto_isolate_Tier0']
```

Разберём, как отработал плейбук `SOAR`:
- для инцидента на рабочей станции `ws-finance-14` (`Tier2_Workstation`) с внешним атакующим адресом `198.51.100.250` автоматика заблокировала IP на межсетевом экране, изолировала хост через `EDR` и отозвала сессии пользователя `m.ivanova`. Время обнаружения `MTTD` составило `45` секунд, а время локализации `MTTR` — всего `15` секунд!
- когда в алерте фигурировал IP-адрес собственного контроллера домена `10.0.0.5` и узел `Tier0_DomainController`, предохранитель `CRITICAL_INFRA_IPS` предотвратил самоблокировку сети (`GUARD_BLOCKED_SELF_DOS`), а вместо автоматического отключения контроллера домена запросил подтверждение дежурного инженера (`REQUIRE_HUMAN_APPROVAL:cannot_auto_isolate_Tier0`).

### Шаг 3. Проверь расчёт средних метрик `MTTD / MTTR` по пакету инцидентов в Kali

В файле `lab.py` измени `contained_at` в `workstation_incident` с `1060` на `1050`, сохрани и запусти `python3 lab.py` — метрика `MTTR_sec` уменьшится до `5` секунд. После проверки верни `1060`.

В терминале Kali проверь быстрый расчёт средних показателей `MTTD` и `MTTR` по списку закрытых тикетов `SOC`:

```bash
python3 -c 'mttd=[30,45,60]; mttr=[10,15,20]; print("avg_MTTD=", sum(mttd)//len(mttd), "avg_MTTR=", sum(mttr)//len(mttr))'
```

## Почему это работает: Почему при изоляции хоста через `EDR` компьютер не выключают по питанию

Новички иногда думают: «Если на компьютере обнаружен имплант, нужно немедленно выдернуть шнур питания из розетки!». Но выключение питания мгновенно уничтожает содержимое оперативной памяти (`RAM`), где хранятся ключи шифрования, сетевые соединения и бестелесные процессы! Сетевая изоляция через агент `EDR` (`Host Containment`) отрезает злоумышленнику связь с компьютером по сети, но сохраняет систему включённой, позволяя криминалисту `DFIR` спокойно снять дамп оперативной памяти для `Volatility 3`.

## Если не получилось: Частые ошибки

- **Путаница между `MTTD` и `MTTR`**: `MTTD` (`Detection`) измеряет интервал от момента реального начала атаки (`occurred_at`) до появления алерта (`detected_at`), а `MTTR` (`Response`) — интервал от появления алерта (`detected_at`) до успешной изоляции угрозы (`contained_at`).
