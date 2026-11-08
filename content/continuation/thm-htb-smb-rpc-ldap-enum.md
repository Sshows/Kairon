## Перед началом: Как работают нулевые сессии в `SMB`, `RPC` и `LDAP` (`TryHackMe` & `Hack The Box Academy`)

В корпоративных сетях Windows и Linux, которые подробно разбираются в модулях **`TryHackMe` (`Network Services` / `Active Directory Basics`)** и **`Hack The Box Academy` (`Using SMB, RPC & LDAP for Enumeration`)**, три ключевых протокола отвечают за совместный доступ к файлам и справочнику пользователей:
1. **`SMB (Server Message Block, порт 445)`**: сетевые папки («шары», `Shares`). У каждого сервера кроме пользовательских папок (`Finance`, `Backups`) есть служебные:
   - `IPC$` (`Inter-Process Communication`) — канал для удалённого вызова процедур (`RPC`);
   - `SYSVOL` и `NETLOGON` (на контроллерах домена) — общие папки с групповыми политиками (`GPO`) и скриптами входа.
2. **`Null Session` («нулевая сессия», анонимный вход с пустым логином `""` и паролем `""`)**: представь проходную бизнес-центра, где охранник пропускает в холл любого посетителя без пропуска («Гость без имени»), но на стене в холле висит полный телефонный справочник всех сотрудников, их должностей и правил сложности паролей! Если на сервере не отключены анонимные подключения к `IPC$` или `SMB`-шарам, команда `smbclient -N -L //server` или `rpcclient -U "" -N` позволяет без единого пароля выгрузить список папок и учётных записей.
3. **`LDAP Anonymous Bind (порт 389 / 636)`**: служба каталогов хранит объекты в виде дерева с корневым суффиксом `Base DN` (например, `DC=corp,DC=local`). Запрос к корневой карточке сервера `RootDSE` (`-s base -b "" namingContexts`) сообщает имя домена, а если разрешён анонимный поиск по всему дереву `DC=corp,DC=local`, внешний клиент может прочитать описания пользователей (где администраторы нередко забывают временные пароли в поле `description`!).

## Почему это работает: Как закрыть утечку метаданных через `SMB` и `LDAP`

- На файловых серверах (`Samba` / Windows Server) запретить гостевой доступ (`restrict anonymous = 2` в `smb.conf`, политика `Network access: Do not allow anonymous enumeration of SAM accounts and shares` в GPO) и включить обязательную криптографическую подпись пакетов **`SMB SigningRequired = True`** (чтобы исключить перехват и пересылку `NTLM Relay`).
- На контроллерах домена и серверах `OpenLDAP` запретить анонимный поиск за пределами `RootDSE` и требовать `LDAP Signing` + `LDAPS Channel Binding`.

<!-- preparation -->

В этом практикуме ты проверишь на модели `lab.py` разницу между уязвимым и защищённым сервером `SMB/LDAP`: как формируется `Base DN` из доменного имени, что раскрывает нулевая сессия (`Null Session`) и как политики `restrict_anonymous` и `smb_signing_required` блокируют анонимную выгрузку и ретрансляцию сессий.

## Сделай сейчас: Проверь аудит `SMB Null Session`, `SMB Signing` и `LDAP Base DN` в `lab.py`

### Шаг 1. Создай скрипт `lab.py`

Создай файл `lab.py`:

```python
def domain_to_base_dn(fqdn):
    parts = [p.strip() for p in fqdn.split(".") if p.strip()]
    return ",".join(f"DC={p}" for p in parts)


SHARES_DB = {
    "IPC$": {"allow_null": True, "files": []},
    "PublicDocs": {"allow_null": True, "files": ["onboarding.pdf", "org_chart.txt"]},
    "Backups": {"allow_null": False, "files": ["db_prod.bak"]},
}


def audit_smb_server(username, password, restrict_anonymous=True, smb_signing_required=True):
    is_null_session = username == "" and password == ""
    if is_null_session and restrict_anonymous:
        return {
            "status": "STATUS_ACCESS_DENIED:null_session_blocked",
            "visible_shares": [],
            "relay_protected": smb_signing_required,
        }
    visible = [
        name for name, meta in SHARES_DB.items() if (not is_null_session) or meta["allow_null"]
    ]
    return {
        "status": "STATUS_SUCCESS:session_established",
        "visible_shares": visible,
        "relay_protected": smb_signing_required,
    }


def query_ldap_directory(base_dn, authenticated=False, allow_anon_search=False):
    if not authenticated and not allow_anon_search:
        return "000004DC: LdapErr: anonymous_bind_rejected_for_search", []
    return "LDAP_SUCCESS", [f"CN=svc_backup,OU=ServiceAccounts,{base_dn}"]


base_dn = domain_to_base_dn("corp.kairon.local")
print("derived_base_dn=", base_dn)
print("smb_legacy_null=", audit_smb_server("", "", restrict_anonymous=False, smb_signing_required=False))
print("smb_hardened_null=", audit_smb_server("", "", restrict_anonymous=True, smb_signing_required=True))
print("ldap_anon_blocked=", query_ldap_directory(base_dn, authenticated=False, allow_anon_search=False))
```

### Шаг 2. Запусти программу и сравни ответы серверов

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
derived_base_dn= DC=corp,DC=kairon,DC=local
smb_legacy_null= {'status': 'STATUS_SUCCESS:session_established', 'visible_shares': ['IPC$', 'PublicDocs'], 'relay_protected': False}
smb_hardened_null= {'status': 'STATUS_ACCESS_DENIED:null_session_blocked', 'visible_shares': [], 'relay_protected': True}
ldap_anon_blocked= ('000004DC: LdapErr: anonymous_bind_rejected_for_search', [])
```

Разберём каждую строку:
- функция `domain_to_base_dn("corp.kairon.local")` преобразовала доменное имя в стандартный корень каталога `LDAP`: `DC=corp,DC=kairon,DC=local`;
- на незащищённом сервере (`smb_legacy_null`) пустой логин и пароль (`""`, `""`) открыли сессию и перечислили шары `['IPC$', 'PublicDocs']`, а отключённая подпись пакетов (`relay_protected: False`) оставила сервер уязвимым к атаке `NTLM Relay`;
- после включения `restrict_anonymous=True` и `smb_signing_required=True` нулевая сессия получила `STATUS_ACCESS_DENIED:null_session_blocked`, а анонимный поиск в `LDAP` вернул стандартный отказ контроллера домена (`000004DC: LdapErr`).

### Шаг 3. Проверь синтаксис утилит `smbclient` и `ldapsearch` в Kali

В файле `lab.py` измени `authenticated=False` в вызове `query_ldap_directory` на `authenticated=True`, сохрани и запусти `python3 lab.py` — теперь авторизованный запрос вернёт найденную запись `CN=svc_backup,OU=ServiceAccounts,DC=corp,DC=kairon,DC=local`. После проверки верни `authenticated=False`.

В терминале Kali проверь наличие стандартных клиентских утилит для аудита `SMB` и `LDAP`:

```bash
smbclient --version && ldapsearch -VV 2>&1 | head -n 2
```

Запомни ключи для легального аудита своих стендов:
- `smbclient -N -L //10.10.10.10` — проверка списка общих папок с флагом `-N` (без пароля, `Null Session`);
- `ldapsearch -x -H ldap://10.10.10.10 -s base -b "" namingContexts` — чтение корневых метаданных `RootDSE` для определения `Base DN`.

## Почему это работает: Почему `SMB Signing` защищает от `NTLM Relay`

Когда клиент подключается к SMB-серверу по протоколу `NTLM`, происходит трёхшаговое рукопожатие `Challenge / Response`. Если `SMB Signing` выключен, посредник в сети может переслать ответы клиента на другой сервер и затем отправлять от имени клиента собственные команды записи или чтения файлов. Но когда `SMB Signing = Required`, **каждый** последующий пакет SMB подписывается сессионным ключом, который никогда не передаётся по сети в открытом виде — и посредник не может подделать ни одной команды после рукопожатия.

## Если не получилось: Частые ошибки

- **Путаница между `DC=` (Domain Component), `OU=` (Organizational Unit) и `CN=` (Common Name) в `LDAP`**: точки в DNS-имени домена (`corp.kairon.local`) всегда превращаются в цепочку `DC=corp,DC=kairon,DC=local`, папки подразделений внутри домена обозначаются `OU=`, а конечные объекты пользователей и групп — `CN=`.
