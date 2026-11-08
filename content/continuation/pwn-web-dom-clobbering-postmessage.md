## Перед началом: Почему современные браузерные уязвимости живут в `postMessage`, прототипах объектов и `DOM Clobbering`

Когда классическая вставка тега `<script>` закрыта фильтрами и политикой `Content-Security-Policy (CSP)`, исследователи безопасности переходят к продвинутым клиентским механизмам, которым посвящён модуль **`Advanced Web Security` (`pwncollege/challenges/web-security`)** на `pwn.college`:
1. **`postMessage` без проверки `event.origin`**: окна и `iframe` с разных доменов общаются через `window.postMessage(data, targetOrigin)`. Это похоже на приём курьерских писем в офисе: если секретарь (`window.addEventListener("message", ...)`) выполняет поручение из письма, не взглянув на печать отправителя (`event.origin`), любая открытая в соседней вкладке страница может прислать команду от имени администратора.
2. **`DOM Clobbering` («замусоривание глобальных имён DOM»)**: по историческому стандарту HTML браузер автоматически создаёт свойства в `window` или `document` для элементов с атрибутами `id` или `name`. Если скрипт проверяет `if (window.APP_CONFIG)` и берёт `window.APP_CONFIG.apiUrl`, а пользователь смог вставить безопасный безскриптовый HTML вроде `<a id="APP_CONFIG" href="https://...">`, глобальная переменная `window.APP_CONFIG` окажется подменена DOM-элементом!
3. **`Prototype Pollution` («загрязнение прототипа в JavaScript»)**: в JavaScript почти каждый обычный объект `{}` наследует свойства от базового шаблона `Object.prototype`. Если функция рекурсивного слияния JSON копирует ключи без проверки спец-имени `"__proto__"` или `"constructor"`, злоумышленник передаёт `{"__proto__": {"isAdmin": true}}` — и внезапно у **всех** новых объектов `{}` в приложении проверка `user.isAdmin` начинает возвращать `true`.

## Почему это работает: Три архитектурных барьера на стороне клиента и Node.js

- **В обработчике `postMessage`**: первой строкой проверять точное совпадение `if (event.origin !== "https://trusted.example.org") return;` и никогда не передавать `event.data` в `innerHTML` или `eval`.
- **Против `DOM Clobbering`**: объявлять конфигурацию явно через `const`/`let` в модульной области видимости (`ES Modules`), а не читать необъявленные поля `window.*`, и очищать пользовательский HTML с флагом `SANITIZE_DOM: true` (например, в `DOMPurify`).
- **Против `Prototype Pollution`**: создавать словари-карты через `Object.create(null)` или `new Map()`, либо явно блокировать ключи `"__proto__"`, `"constructor"` и `"prototype"` при слиянии объектов.

<!-- preparation -->

В этом практикуме ты проверишь на модели `lab.py` все три продвинутых веб-вектора из `pwn.college Advanced Web Security` (`postMessage`, `DOM Clobbering` и `Prototype Pollution`) и убедишься, как строгая проверка `origin`, модульная область видимости и фильтр ключей `__proto__` закрывают уязвимости.

## Сделай сейчас: Защити обработчик `postMessage` и слияние JSON от `Prototype Pollution`

### Шаг 1. Создай проверочный скрипт `lab.py`

Создай файл `lab.py`:

```python
ALLOWED_ORIGINS = {"https://portal.kairon.local"}


def handle_postmessage(event_origin, payload, verify_origin=True):
    if verify_origin and event_origin not in ALLOWED_ORIGINS:
        return "rejected:untrusted_origin", None
    return "accepted:action_executed", payload.get("action")


def resolve_config_url(explicit_module_const, dom_ids_map, use_strict_const=True):
    if use_strict_const and explicit_module_const is not None:
        return "from_module_const", explicit_module_const
    if "APP_CONFIG" in dom_ids_map:
        return "clobbered_by_dom_element", dom_ids_map["APP_CONFIG"]
    return "default_fallback", "https://api.kairon.local/v1"


def merge_user_settings(base_proto, target_obj, incoming_json, safe_mode=True):
    FORBIDDEN_KEYS = {"__proto__", "constructor", "prototype"}
    for key, val in incoming_json.items():
        if safe_mode and key in FORBIDDEN_KEYS:
            return "blocked:prototype_pollution_attempt"
        if key == "__proto__" and isinstance(val, dict):
            base_proto.update(val)
        else:
            target_obj[key] = val
    return "merged:ok"


print("postmsg_unverified=", handle_postmessage("https://evil.example", {"action": "export_tokens"}, verify_origin=False))
print("postmsg_verified=", handle_postmessage("https://evil.example", {"action": "export_tokens"}, verify_origin=True))

dom_injected = {"APP_CONFIG": "https://attacker.example/ fake-api"}
print("dom_Fallback_clobbered=", resolve_config_url(None, dom_injected, use_strict_const=False))
print("dom_strict_module_const=", resolve_config_url("https://api.kairon.local/v1", dom_injected, use_strict_const=True))

proto_vuln = {}
user_profile = {}
merge_user_settings(proto_vuln, user_profile, {"__proto__": {"isAdmin": True}}, safe_mode=False)
fresh_object_sees_admin = user_profile.get("isAdmin", proto_vuln.get("isAdmin", False))

proto_safe = {}
safe_status = merge_user_settings(proto_safe, {}, {"__proto__": {"isAdmin": True}}, safe_mode=True)
print("pollution_vuln_isAdmin=", fresh_object_sees_admin, "safe_merge=", safe_status)
```

### Шаг 2. Запусти скрипт и разбери три пары проверок

Запусти программу:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
postmsg_unverified= ('accepted:action_executed', 'export_tokens')
postmsg_verified= ('rejected:untrusted_origin', None)
dom_Fallback_clobbered= ('clobbered_by_dom_element', 'https://attacker.example/ fake-api')
dom_strict_module_const= ('from_module_const', 'https://api.kairon.local/v1')
pollution_vuln_isAdmin= True safe_merge= blocked:prototype_pollution_attempt
```

Разберём каждую проверку:
- когда обработчик `handle_postmessage` не проверяет `event_origin` (`verify_origin=False`), сообщение с чужого сайта `https://evil.example` выполняет действие `export_tokens`. При включённой проверке (`verify_origin=True`) запрос с чужого источника мгновенно отбрасывается (`rejected:untrusted_origin`);
- в `resolve_config_url` чтение необъявленной глобальной переменной через `window.APP_CONFIG` (`use_strict_const=False`) возвратило `href` подставного HTML-элемента `<a id="APP_CONFIG">`, тогда как явная константа модуля `use_strict_const=True` осталась неприкосновенной;
- в `merge_user_settings` при `safe_mode=False` ключ `"__proto__"` записал `isAdmin: True` в базовый прототип `proto_vuln`, из-за чего даже пустой объект унаследовал права администратора (`pollution_vuln_isAdmin= True`), а фильтр `FORBIDDEN_KEYS` при `safe_mode=True` заблокировал атаку (`blocked:prototype_pollution_attempt`).

### Шаг 3. Проверь легитимный `origin` и поведение `Object.create(null)` в Kali

В файле `lab.py` замени во втором вызове `handle_postmessage` источник `"https://evil.example"` на `"https://portal.kairon.local"`, сохрани и запусти `python3 lab.py` — теперь легитимный запрос пройдёт проверку (`accepted:action_executed`). После проверки верни `"https://evil.example"`.

В терминале Kali (если установлен `node` или `python3`) ты можешь быстро проверить поиск небезопасных обработчиков `addEventListener("message")` без проверки `.origin` в исходниках любого веб-проекта:

```bash
python3 -c 'import re; code="window.addEventListener(\"message\", e => run(e.data))"; print("has_origin_check=", "origin" in code)'
```

## Почему это работает: Почему `event.origin.includes(...)` тоже опасно

Новички иногда пишут `if (event.origin.includes("trusted.example.org"))`. Такую подстрочную проверку легко обойти с домена `https://trusted.example.org.attacker.com`! В `postMessage` допустимо только **строгое равенство** (`===`) со списком полных источников (`https://scheme + host + port`).

## Если не получилось: Частые ошибки

- **Отправка секретов через `targetOrigin = "*"` в `otherWindow.postMessage(secret, "*")`**: звёздочка `"*"` разрешает браузеру доставить сообщение любому домену, который сейчас загружен в целевом фрейме (даже если фрейм перенаправили на внешний сайт). Всегда указывай точный целевой источник `targetOrigin`.
