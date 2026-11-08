## Перед началом: Безопасность кластеров Kubernetes — токены `ServiceAccount`, права `RBAC` и стандарты `Pod Security` (`TryHackMe` & `HTB Academy`)

В облачных курсах **`TryHackMe` (`Kubernetes for Everyone` / `Attacking Kubernetes`)** и **`Hack The Box Academy` (`Kubernetes Security`)** разбирается устройство безопасности современного оркестратора контейнеров.

Когда внутри кластера Kubernetes запускается под (`Pod`), оркестратор по умолчанию автоматически кладёт внутрь каждого контейнера секретный токен сервисного аккаунта по пути:
**`/var/run/secrets/kubernetes.io/serviceaccount/token`**
Зачем? Чтобы служебные программы внутри пода могли обращаться к главному мозгу кластера — **`kube-apiserver`**. Обычному веб-приложению (например, фронтенду или API магазина) вообще не нужно управлять кластером Kubernetes! Но если в этом веб-приложении случилась уязвимость чтения файлов (`LFI`/`SSRF`) или выполнения команд (`RCE`), злоумышленник первым делом читает этот токен и проверяет его права через ролевую модель **`RBAC (Role-Based Access Control)`**:
1. **Чтение секретов (`verbs: ["get", "list"]` на ресурс `secrets`)**: позволяет выгрузить все пароли баз данных, TLS-ключи и токены других сервисных аккаунтов в пространстве имён или во всём кластере (`ClusterRole`).
2. **Создание подов (`verbs: ["create"]` на ресурс `pods`) или вход в поды (`pods/exec`)**: если сервисному аккаунту разрешено создавать поды, он может создать новый под с примонтированной файловой системой рабочего узла (`hostPath: /`) или с токеном привилегированного контроллера!
3. **Подстановочные звёздочки `verbs: ["*"]` или `resources: ["*"]` (эквивалент `cluster-admin`)**: полное управление всем кластером.

## Почему это работает: Три правила защиты Kubernetes (`RBAC` + `Pod Security Standards`)

- В каждом обычном поде приложения, которому не требуется обращаться к `kube-apiserver`, явно отключать автоматическое монтирование токена:
  **`automountServiceAccountToken: false`**
- В правилах `Role` и `ClusterRole` никогда не использовать звёздочки `"*"` и не выдавать права `get/list` на `secrets` или `create` на `pods`/`pods/exec` прикладным сервисам.
- Включать встроенный профиль **`Pod Security Admission: restricted`** на уровне пространства имён (`Namespace`), который автоматически запрещает `hostNetwork: true`, `hostPID: true`, `hostPath` и запуск от `root`.

<!-- preparation -->

В этом практикуме ты создашь в `lab.py` аудитор манифестов `Pod` и ролей `RBAC` в Kubernetes, который проверяет автоматическое монтирование токена `ServiceAccount`, выявляет опасные связки `verbs + resources` в `RBAC` и проверяет соответствие профилю `Pod Security Standards (Restricted)`.

## Сделай сейчас: Проведи аудит манифеста `Pod` и правил `Kubernetes RBAC` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
HIGH_RISK_RBAC = {
    ("secrets", "get"),
    ("secrets", "list"),
    ("pods", "create"),
    ("pods/exec", "create"),
}


def audit_k8s_pod_and_rbac(pod_spec, rbac_rules):
    findings = []

    if pod_spec.get("automountServiceAccountToken", True):
        findings.append("WARN:serviceaccount_token_automounted")

    if pod_spec.get("hostNetwork") or pod_spec.get("hostPID") or pod_spec.get("hostPath"):
        findings.append("CRITICAL:host_namespace_or_hostpath_exposed")

    for rule in rbac_rules:
        for res in rule["resources"]:
            for verb in rule["verbs"]:
                if res == "*" or verb == "*":
                    findings.append("CRITICAL:wildcard_rbac_cluster_admin_risk")
                elif (res, verb) in HIGH_RISK_RBAC:
                    findings.append(f"HIGH:dangerous_rbac_{res}_{verb}")

    return findings if findings else ["HARDENED:restricted_pod_and_least_privilege_rbac"]


overprivileged_pod = {
    "automountServiceAccountToken": True,
    "hostNetwork": False,
    "hostPID": False,
    "hostPath": True,
}
overprivileged_rbac = [
    {"resources": ["pods", "secrets"], "verbs": ["get", "list", "create"]},
]

restricted_pod = {
    "automountServiceAccountToken": False,
    "hostNetwork": False,
    "hostPID": False,
    "hostPath": False,
}
minimal_rbac = [
    {"resources": ["configmaps"], "verbs": ["get"]},
]

print("vuln_k8s_audit=", audit_k8s_pod_and_rbac(overprivileged_pod, overprivileged_rbac))
print("hardened_k8s_audit=", audit_k8s_pod_and_rbac(restricted_pod, minimal_rbac))
```

### Шаг 2. Запусти программу и изучи результаты аудита Kubernetes

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
vuln_k8s_audit= ['WARN:serviceaccount_token_automounted', 'CRITICAL:host_namespace_or_hostpath_exposed', 'HIGH:dangerous_rbac_pods_create', 'HIGH:dangerous_rbac_secrets_get', 'HIGH:dangerous_rbac_secrets_list']
hardened_k8s_audit= ['HARDENED:restricted_pod_and_least_privilege_rbac']
```

Разберём каждую находку:
- в `overprivileged_pod` оставлено включённым автоматическое монтирование токена (`WARN:serviceaccount_token_automounted`), открыт доступ к диску узла через `hostPath: True` (`CRITICAL:host_namespace_or_hostpath_exposed`), а роль `RBAC` разрешала как создание новых подов (`pods_create`), так и выгрузку всех секретов (`secrets_get`, `secrets_list`);
- в `restricted_pod` монтирование токена отключено (`automountServiceAccountToken: False`), доступ к ресурсам узла закрыт, а `RBAC` ограничен чтением только несекретных `configmaps` (`HARDENED:restricted_pod_and_least_privilege_rbac`).

### Шаг 3. Проверь команду `kubectl auth can-i --list` и структуру пути токена в Kali

В файле `lab.py` замени `["get"]` в `minimal_rbac` на `["*"]`, сохрани и запусти `python3 lab.py` — аудитор мгновенно заблокирует звёздочку (`CRITICAL:wildcard_rbac_cluster_admin_risk`). После проверки верни `["get"]`.

В терминале Kali запомни и проверь стандартный путь к токену сервисного аккаунта и команду самопроверки прав `kubectl auth can-i --list`:

```bash
python3 -c 'token_path="/var/run/secrets/kubernetes.io/serviceaccount/token"; print("k8s_sa_path=", token_path)'
```

## Почему это работает: Почему `secrets/list` в Kubernetes опаснее, чем кажется

В API Kubernetes операция `list` на ресурс `secrets` возвращает не просто список названий секретов, а **полные объекты `Secret` со всеми их значениями `data` в Base64**! Поэтому право `list` на `secrets` даже без права `get` позволяет одним запросом `GET /api/v1/secrets` прочитать содержимое абсолютно всех секретов в доступном пространстве имён.

## Если не получилось: Частые ошибки

- **Хранение секретов в `ConfigMap` вместо `Secret` с шифрованием `EncryptionConfiguration` (`etcd`)**: объекты `ConfigMap` предназначены только для открытых настроек, а объекты `Secret` должны дополнительно шифроваться в базе `etcd` ключом `KMS` (`EncryptionConfiguration at rest`).
