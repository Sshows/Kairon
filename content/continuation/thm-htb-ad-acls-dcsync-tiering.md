## Перед началом: Как граф прав `ACL` в `Active Directory` приводит к `DCSync` и как работает уровневая защита (`Tier 0 / 1 / 2`)

В продвинутых курсах **`TryHackMe` (`Red Teaming` / `Holo`)** и **`Hack The Box Academy` (`Active Directory BloodHound` / `ACL Abuse`)** безопасность домена рассматривается не как плоский список администраторов, а как **ориентированный граф прав доступа (`DACL`)**.

Представь цепочку доверенностей в крупной компании:
- Сотрудник техподдержки `Helpdesk` не входит в группу `Domain Admins`. Но ему дали право сбрасывать пароли (`ForceChangePassword`) для группы `ServerOperators`.
- У участника `ServerOperators` случайно осталось право полного управления (`GenericAll` или `WriteDACL`) над группой `Exchange_Tier1`.
- А у группы `Exchange_Tier1` на корневом объекте домена `DC=corp,DC=local` оказались выданы два опаснейших расширенных права репликации: **`DS-Replication-Get-Changes`** и **`DS-Replication-Get-Changes-All`**.

В `Active Directory` эти два права репликации предназначены **только** для контроллеров домена, чтобы один контроллер домена мог синхронизировать базу паролей `NTDS.dit` с другим по протоколу `MS-DRSR`. Если эти два права получает пользователь или рабочая группа, возникает атака **`DCSync`**: обычный компьютер притворяется контроллером домена и просит выслать ему хэши всех учётных записей домена, включая `krbtgt`!

## Почему это работает: Как поиск в ширину (`BFS`, принцип `BloodHound`) находит скрытые пути и как модель `Tier 0 / 1 / 2` их разрывает

Инструмент аудита графа (`BloodHound`) строит вершины (пользователи, группы, компьютеры, домен) и рёбра (`MemberOf`, `ForceChangePassword`, `GenericAll`, `WriteDACL`, `GetChangesAll`) и запускает поиск кратчайшего пути от обычного пользователя до `Domain Admins` или корня домена.

Чтобы разорвать такие цепочки в корпоративной инфраструктуре, применяется **модель эшелонированного администрирования (`Tiered Administration`)**:
1. **`Tier 0` (контроллеры домена, `PKI`, `Domain Admins`)**: учётные записи `Tier 0` могут входить **только** на серверы `Tier 0` (политика `Deny log on through Remote Desktop / Network` на рабочих станциях) и включаются в группу **`Protected Users`** (которая запрещает кэширование `NTLM`, требует `AES` и ограничивает срок жизни `TGT`).
2. **Аудит `ACL` на корне домена (`AdminSDHolder` и `Domain Root`)**: регулярная автоматическая проверка того, что права `DS-Replication-Get-Changes-All` принадлежат исключительно группе `Domain Controllers`.

<!-- preparation -->

В этом практикуме ты напишешь в `lab.py` собственный анализатор графа прав `Active Directory` (по алгоритму поиска кратчайшего пути `BFS`, как в `BloodHound`), который обнаруживает цепочку транзитивных прав до `DCSync`, а затем проверяет эффект удаления избыточного `ACL`-ребра.

## Сделай сейчас: Найди транзитивный путь в графе `AD ACL` и устрани избыточное право в `lab.py`

### Шаг 1. Создай скрипт `lab.py`

Создай файл `lab.py`:

```python
from collections import deque

DANGEROUS_EDGES = {
    "MemberOf",
    "ForceChangePassword",
    "GenericAll",
    "WriteDACL",
    "GetChangesAll_DCSync",
}


def find_shortest_privilege_path(edges, start_node, target_node):
    adj = {}
    for src, rel, dst in edges:
        if rel in DANGEROUS_EDGES:
            adj.setdefault(src, []).append((rel, dst))

    queue = deque([(start_node, [start_node])])
    visited = {start_node}
    while queue:
        curr, path = queue.popleft()
        if curr == target_node:
            return path
        for rel, nxt in adj.get(curr, []):
            if nxt not in visited:
                visited.add(nxt)
                queue.append((nxt, path + [f"--[{rel}]--> {nxt}"]))
    return None


ad_graph_unhardened = [
    ("user_intern", "MemberOf", "grp_helpdesk"),
    ("grp_helpdesk", "ForceChangePassword", "svc_deploy"),
    ("svc_deploy", "WriteDACL", "grp_replication_ops"),
    ("grp_replication_ops", "GetChangesAll_DCSync", "DOMAIN_ROOT_CORP"),
]

# Убираем избыточное право WriteDACL у сервисной учётной записи svc_deploy
ad_graph_hardened = [
    edge for edge in ad_graph_unhardened if not (edge[0] == "svc_deploy" and edge[1] == "WriteDACL")
]

path_before = find_shortest_privilege_path(ad_graph_unhardened, "user_intern", "DOMAIN_ROOT_CORP")
path_after = find_shortest_privilege_path(ad_graph_hardened, "user_intern", "DOMAIN_ROOT_CORP")

print("dcsync_path_before=", " ".join(path_before) if path_before else None)
print("dcsync_path_after_remediation=", path_after)
```

### Шаг 2. Запусти программу и изучи найденный маршрут

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
dcsync_path_before= user_intern --[MemberOf]--> grp_helpdesk --[ForceChangePassword]--> svc_deploy --[WriteDACL]--> grp_replication_ops --[GetChangesAll_DCSync]--> DOMAIN_ROOT_CORP
dcsync_path_after_remediation= None
```

Разберём результат:
- хотя пользователь `user_intern` не входил ни в одну группу администраторов домена, алгоритм `BFS` нашёл цепочку из четырёх шагов: членство в `grp_helpdesk` $\to$ сброс пароля `svc_deploy` $\to$ право редактирования `DACL` на `grp_replication_ops` $\to$ право репликации `GetChangesAll_DCSync` на `DOMAIN_ROOT_CORP`;
- стоило удалить всего одно избыточное делегирование (`WriteDACL` у `svc_deploy`), как транзитивный маршрут до корня домена полностью исчез (`dcsync_path_after_remediation= None`).

### Шаг 3. Проверь защиту привилегированных групп через `AdminSDHolder` в модели и Kali

В файле `lab.py` добавь прямое тестовое ребро `("grp_helpdesk", "GenericAll", "DOMAIN_ROOT_CORP")` в `ad_graph_hardened`, сохрани и запусти `python3 lab.py` — анализатор мгновенно подсветит новый двухшаговый маршрут. После проверки удали тестовое ребро.

В терминале Kali проверь однострочником, как быстро отфильтровать любые субъекты с правом `GetChangesAll`, не являющиеся контроллерами домена (`Domain Controllers`):

```bash
python3 -c 'acls=[("Domain Controllers","GetChangesAll"),("svc_backup","GetChangesAll")]; print("rogue_dcsync_principals=", [p for p,r in acls if r=="GetChangesAll" and p!="Domain Controllers"])'
```

## Почему это работает: Зачем в Active Directory существует механизм `AdminSDHolder` и `SDProp`

Раз в 60 минут фоновый процесс контроллера домена `SDProp` сравнивает списки контроля доступа (`ACL`) всех защищённых административных групп и их участников с эталонным шаблоном **`CN=AdminSDHolder,CN=System,DC=...`** (и ставит таким объектам атрибут `adminCount=1`). Если кто-то изменил `ACL` самого шаблона `AdminSDHolder`, контроллер домена сам размножит это правило на всех администраторов — поэтому шаблон `AdminSDHolder` обязательно включают в мониторинг `Tier 0`.

## Если не получилось: Частые ошибки

- **Проверка только прямого членства в группе `Domain Admins`**: в `Active Directory` вложенные группы (`Nested Groups`) и права `WriteDACL` / `GenericWrite` дают те же возможности, что и прямое членство. Всегда проверяй транзитивное замыкание графа прав.
