## Перед началом: Безопасность центра сертификации `Active Directory Certificate Services (AD CS, ESC1 и ESC8)` (`TryHackMe` & `HTB Academy`)

В современных корпоративных сетях `Active Directory`, которые подробно разбираются в модулях **`TryHackMe` (`AD Certificate Services`)** и **`Hack The Box Academy` (`Active Directory Certificate Services — AD CS`)**, вход в домен возможен не только по паролю, но и по **цифровому сертификату `X.509`** (через расширение протокола Kerberos **`PKINIT`** — как по смарт-карте).

Сертификаты внутри компании выдаёт корпоративный центр сертификации **`AD CS` (`Enterprise CA`)** по заранее настроенным **шаблонам сертификатов (`Certificate Templates`)**. Что произойдёт, если в одном шаблоне сертификата одновременно совпадут четыре настройки (классическая уязвимость **`ESC1`** из исследования *Certified Pre-Owned*):
1. Шаблон разрешает выпуск сертификата обычным пользователям домена (`Enroll` для `Domain Users` / `Authenticated Users`).
2. Выпускаемый сертификат разрешено использовать для входа в систему (`Extended Key Usage / EKU` содержит **`Client Authentication` — `1.3.6.1.5.5.7.3.2`** или `Smart Card Logon`).
3. Выпуск не требует ручного одобрения офицера безопасности (`Manager Approval = False`).
4. Самое опасное: включён флаг **`CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT` (`Supply in the request`)**!

Что означает четвёртый пункт? Представь паспортный стол, где любой гражданин может заполнить бланк на получение удостоверения личности, а в графе «На чьё имя выписать документ» (`Subject Alternative Name / SAN`) сам вписать от руки: **«Генеральный директор (`Administrator@corp.local`)»** — и автомат без проверки печатает настоящий заверенный паспорт! С этим сертификатом пользователь обращается к контроллеру домена по `PKINIT` и мгновенно получает билет `TGT` администратора домена!

А вторая распространённая проблема — **`ESC8`**: когда на сервере `AD CS` включена старая веб-служба выдачи сертификатов по незашифрованному протоколу `HTTP` (`/certsrv/`) с аутентификацией `NTLM` без защиты `EPA (Extended Protection for Authentication)`, что позволяет перенаправить туда аутентификацию любого сервера или контроллера домена через `NTLM Relay`.

## Почему это работает: Как защитить шаблоны `AD CS` от `ESC1` и `ESC8`

- Никогда не сочетать флаг `CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT` с правом `Client Authentication` и доступом на `Enroll` для широких групп (`Domain Users`). Если шаблон действительно требует ручного указания `SAN` (например, для веб-серверов), обязательно включать **`CA Certificate Manager Approval`** и убирать из `EKU` клиентскую аутентификацию.
- Отключать устаревший веб-интерфейс `/certsrv/` по `HTTP` или переводить его исключительно на `HTTPS` с обязательным **`EPA (Channel Binding)`**.

<!-- preparation -->

В этом практикуме ты создашь в `lab.py` аудитор шаблонов сертификатов `AD CS` (аналог логики проверок `Certify` / `Certipy`), который по битовым флагам и `EKU` автоматически выявляет уязвимый шаблон `ESC1`, проверяет защищённый шаблон и оценивает статус веб-службы `ESC8`.

## Сделай сейчас: Проверь шаблоны сертификатов `AD CS` на уязвимости `ESC1` и `ESC8` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT = 0x00000001
EKU_CLIENT_AUTH = "1.3.6.1.5.5.7.3.2"
EKU_SERVER_AUTH = "1.3.6.1.5.5.7.3.1"


def audit_certificate_template(tpl):
    enrollee_supplies_san = bool(tpl["name_flag"] & CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT)
    has_client_auth = EKU_CLIENT_AUTH in tpl["ekus"]
    low_priv_enroll = any(g in tpl["enroll_principals"] for g in ("Domain Users", "Authenticated Users"))
    no_approval_needed = not tpl["manager_approval"]

    if enrollee_supplies_san and has_client_auth and low_priv_enroll and no_approval_needed:
        return f"CRITICAL_ESC1:arbitrary_SAN_impersonation_in_{tpl['name']}"
    return f"SAFE_TEMPLATE:{tpl['name']}"


def audit_web_enrollment_esc8(http_enabled, https_epa_enforced):
    if http_enabled or not https_epa_enforced:
        return "HIGH_ESC8:ntlm_relay_to_adcs_http_enrollment"
    return "HARDENED_ADCS_WEB:https_with_epa_channel_binding"


vuln_template = {
    "name": "CorpLegacyWorkstation",
    "name_flag": 0x00000001,
    "ekus": [EKU_CLIENT_AUTH, EKU_SERVER_AUTH],
    "enroll_principals": ["Domain Users"],
    "manager_approval": False,
}

hardened_template = {
    "name": "CorpWebServerTLS",
    "name_flag": 0x00000001,
    "ekus": [EKU_SERVER_AUTH],  # Нет Client Authentication!
    "enroll_principals": ["WebAdmins"],
    "manager_approval": True,
}

print("tpl_vuln_check=", audit_certificate_template(vuln_template))
print("tpl_safe_check=", audit_certificate_template(hardened_template))
print("esc8_unprotected=", audit_web_enrollment_esc8(http_enabled=True, https_epa_enforced=False))
print("esc8_hardened=", audit_web_enrollment_esc8(http_enabled=False, https_epa_enforced=True))
```

### Шаг 2. Запусти программу и разбери условия срабатывания `ESC1` и `ESC8`

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
tpl_vuln_check= CRITICAL_ESC1:arbitrary_SAN_impersonation_in_CorpLegacyWorkstation
tpl_safe_check= SAFE_TEMPLATE:CorpWebServerTLS
esc8_unprotected= HIGH_ESC8:ntlm_relay_to_adcs_http_enrollment
esc8_hardened= HARDENED_ADCS_WEB:https_with_epa_channel_binding
```

Разберём, что выявил аудитор:
- в шаблоне `CorpLegacyWorkstation` одновременно включён бит `0x00000001` (`CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT`), присутствует идентификатор `1.3.6.1.5.5.7.3.2` (`Client Authentication`), разрешён выпуск для `Domain Users` и отключено подтверждение менеджера — это классическая уязвимость `CRITICAL_ESC1`;
- в шаблоне `CorpWebServerTLS` оставлен только серверный `EKU` (`Server Authentication` для TLS), права ограничены группой `WebAdmins` и включён `manager_approval: True`, поэтому шаблон полностью безопасен (`SAFE_TEMPLATE:CorpWebServerTLS`);
- отключение `HTTP` и принудительное включение `EPA (Channel Binding)` закрыло вектор `ESC8`.

### Шаг 3. Проверь просмотр расширений `X.509` через `openssl x509` в Kali

В файле `lab.py` измени `manager_approval: False` в `vuln_template` на `True`, сохрани и запусти `python3 lab.py` — даже одно включённое требование ручного одобрения офицером безопасности блокирует автоматическую эксплуатацию `ESC1`. После проверки верни `False`.

В терминале Kali проверь наличие `openssl` для осмотра полей `Subject Alternative Name` и `Extended Key Usage` в сертификатах:

```bash
openssl version
```

## Почему это работает: Как контроллер домена обнаруживает атаку `ESC1` в журналах (`Event ID 4886 / 4887` и `4768`)

При выпуске сертификата на сервере `AD CS` в событиях **`Event ID 4886` / `4887`** фиксируется, кто именно подал заявку (`Requester: CORP\low_priv_user`) и какое имя указано внутри `Subject Alternative Name` (`SAN: Administrator@corp.local`). Если имя заявителя не совпадает с `UPN` внутри `SAN`, а следом на контроллере домена появляется событие **`Event ID 4768`** (запрос `TGT` по сертификату), SIEM-система мгновенно фиксирует компрометацию шаблона!

## Если не получилось: Частые ошибки

- **Путаница между `Server Authentication (1.3.6.1.5.5.7.3.1)` и `Client Authentication (1.3.6.1.5.5.7.3.2)`**: сертификат только с `Server Authentication` годится для HTTPS веб-сервера, но контроллер домена откажется принимать его для входа пользователя по протоколу `Kerberos PKINIT`.
