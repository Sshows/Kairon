## Перед началом: Как работает протокол `Kerberos` в `Active Directory` (`TryHackMe` & `Hack The Box Academy`)

В корпоративных сетях `Active Directory`, которым посвящены основные модули **`TryHackMe` (`Attacking Kerberos` / `Breaching AD`)** и **`Hack The Box Academy` (`Active Directory Enumeration & Attacks`)**, пароли пользователей никогда не пересылаются по сети в открытом виде. Вместо этого используется билетная система **`Kerberos` (порт 88)**.

Представь огромный парк аттракционов:
1. **Касса на входе (`AS — Authentication Service` на контроллере домена `KDC`)**: чтобы доказать кассиру, что ты — это ты, ты шифруешь текущую метку времени своим личным ключом (производным от твоего пароля) и отправляешь запрос **`AS-REQ`**. Это называется **предварительной аутентификацией (`Kerberos Pre-Authentication`)**. Если кассир успешно расшифровал метку времени, он выдаёт тебе в ответе **`AS-REP`** именной «браслет посетителя на день» — билет **`TGT (Ticket Granting Ticket)`**, зашифрованный главным секретным ключом парка (`krbtgt`).
2. **Окно выдачи билетов на конкретный аттракцион (`TGS — Ticket Granting Service`)**: когда ты хочешь зайти на файловый или SQL-сервер (у которого зарегистрирован адрес службы **`SPN — Service Principal Name`**, например `MSSQLSvc/sql01.corp.local:1433`), ты предъявляешь свой браслет `TGT` в запросе **`TGS-REQ`**. Контроллер домена не проверяет, есть ли у тебя права внутри самого SQL-сервера — он просто выписывает сервисный билет **`TGS`** (в ответе **`TGS-REP`**), зашифрованный секретным ключом учётной записи самой службы `MSSQLSvc`!

Из этой архитектуры вытекают две классические ошибки конфигурации `Active Directory`:
- **`AS-REP Roasting` (отключённая `Pre-Authentication`, флаг `UF_DONT_REQ_PREAUTH`)**: если для какого-то аккаунта администратор галочкой отключил проверку метки времени на входе, касса выдаёт зашифрованный фрагмент `AS-REP` **любому**, кто просто назовёт имя этого пользователя без пароля!
- **`Kerberoasting` (слабый пароль сервисного аккаунта с `SPN`)**: любой вошедший в домен пользователь имеет право запросить сервисный билет `TGS` для любого `SPN`. Поскольку билет `TGS` зашифрован хэшем пароля сервисного аккаунта, при коротком пароле и устаревшем шифре `RC4-HMAC (etype 23)` этот билет можно перебрать офлайн без единого лишнего пакета к контроллеру домена!

## Почему это работает: Как `Pre-Auth`, `gMSA` и `AES-256` полностью закрывают `AS-REP` и `Kerberoasting`

- Никогда не включать флаг `DONT_REQ_PREAUTH` (`Do not require Kerberos preauthentication`).
- Перевести сервисные учётные записи на **`gMSA` (`Group Managed Service Accounts`)** со случайным 120-символьным паролем, автоматически меняющимся каждые 30 дней, и принудительно включить только шифрование **`AES-256-CTS-HMAC-SHA1-96` (`etype 18`)**, отключив устаревший `RC4 (etype 23)`.

<!-- preparation -->

В этом практикуме ты создашь в `lab.py` аудитор учётных записей `Kerberos`, который проверяет запрос `AS-REQ` с включённой и отключённой `Pre-Authentication`, оценивает стойкость сервисных аккаунтов с `SPN` (`RC4` против `gMSA + AES-256`) и выдаёт точный вердикт защищённости домена.

## Сделай сейчас: Проверь защиту `Kerberos Pre-Authentication` и сервисных билетов `TGS` в `lab.py`

### Шаг 1. Создай скрипт `lab.py`

Создай файл `lab.py`:

```python
def handle_as_req(account, timestamp_valid=False):
    if not account["preauth_required"] and not timestamp_valid:
        return "VULNERABLE:AS_REP_issued_without_preauth", account["user"]
    if not timestamp_valid:
        return "KRB5KDC_ERR_PREAUTH_REQUIRED:blocked", account["user"]
    return "AS_REP_ok:TGT_issued", account["user"]


def audit_spn_service_account(account):
    if not account.get("spn"):
        return "no_spn:not_kerberoastable"
    if account["is_gmsa"] and account["etype"] == "AES256" and account["pwd_len"] >= 120:
        return "HARDENED:gMSA_AES256_resistant_to_offline_cracking"
    if account["etype"] == "RC4_ETYPE_23" or account["pwd_len"] < 25:
        return "HIGH_RISK:TGS_weak_spn_offline_crackable"
    return "MODERATE:review_rotation_policy"


legacy_user = {"user": "svc_legacy", "preauth_required": False}
secure_user = {"user": "alex.admin", "preauth_required": True}

weak_spn_acct = {
    "user": "svc_sql",
    "spn": "MSSQLSvc/sql01.corp.local:1433",
    "is_gmsa": False,
    "etype": "RC4_ETYPE_23",
    "pwd_len": 10,
}
gmsa_spn_acct = {
    "user": "gmsa_sql$",
    "spn": "MSSQLSvc/sql01.corp.local:1433",
    "is_gmsa": True,
    "etype": "AES256",
    "pwd_len": 120,
}

print("as_req_no_preauth=", handle_as_req(legacy_user, timestamp_valid=False))
print("as_req_enforced=", handle_as_req(secure_user, timestamp_valid=False))
print("spn_audit_weak=", audit_spn_service_account(weak_spn_acct))
print("spn_audit_gmsa=", audit_spn_service_account(gmsa_spn_acct))
```

### Шаг 2. Запусти программу и сравни оба сценария

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
as_req_no_preauth= ('VULNERABLE:AS_REP_issued_without_preauth', 'svc_legacy')
as_req_enforced= ('KRB5KDC_ERR_PREAUTH_REQUIRED:blocked', 'alex.admin')
spn_audit_weak= HIGH_RISK:TGS_weak_spn_offline_crackable
spn_audit_gmsa= HARDENED:gMSA_AES256_resistant_to_offline_cracking
```

Посмотри на выводы:
- для аккаунта `svc_legacy` с отключённой предварительной проверкой (`preauth_required: False`) контроллер домена выдал зашифрованный ответ `AS-REP` даже без подтверждённой метки времени (`VULNERABLE:AS_REP_issued_without_preauth`), а для защищённого аккаунта `alex.admin` вернул стандартное требование `KRB5KDC_ERR_PREAUTH_REQUIRED:blocked`;
- сервисный аккаунт `svc_sql` с коротким паролем (`10` символов) и шифром `RC4_ETYPE_23` помечен как уязвимый к офлайн-перебору билета `TGS` (`HIGH_RISK:TGS_weak_spn_offline_crackable`);
- перевод службы на групповой управляемый аккаунт `gmsa_sql$` со 120-символьным паролем и шифром `AES256` сделал офлайн-перебор математически невыполнимым (`HARDENED:gMSA_AES256_resistant_to_offline_cracking`).

### Шаг 3. Проверь битовую маску `userAccountControl` для `DONT_REQ_PREAUTH` в Kali

В файле `lab.py` измени `preauth_required: False` у `legacy_user` на `True`, сохрани и запусти `python3 lab.py` — теперь оба аккаунта защищены `KRB5KDC_ERR_PREAUTH_REQUIRED`. После проверки верни `False`.

В `Active Directory` флаг `UF_DONT_REQ_PREAUTH` хранится в числовом атрибуте `userAccountControl` как бит `0x400000` (`4194304`). Проверь в терминале Kali побитовую формулу обнаружения этого флага:

```bash
python3 -c "uac = 0x400200; print('DONT_REQ_PREAUTH_enabled=', bool(uac & 0x400000))"
```

## Почему это работает: Как SOC обнаруживает `Kerberoasting` в журналах Windows (`Event ID 4769`)

Каждая выдача сервисного билета `TGS` на контроллере домена записывает в журнал безопасности событие **`Event ID 4769` (`A Kerberos service ticket was requested`)**. Если в нормальной современной сети все компьютеры используют `AES-256` (`Ticket Encryption Type: 0x12`), то внезапная серия событий `4769` с запросом устаревшего шифра **`0x17` (`RC4-HMAC`)** для десятков сервисных аккаунтов подряд — это мгновенный и высокоточный сигнал для SIEM-системы!

## Если не получилось: Частые ошибки

- **Путаница между билетами `TGT` и `TGS`**: `TGT` выдаётся один раз при входе в систему (зашифрован ключом `krbtgt` и подтверждает твою личность контроллеру домена), а `TGS` запрашивается для конкретной службы по её `SPN` (и зашифрован ключом учётной записи самой этой службы).
