## Перед началом: Справочник проверки веб-приложений `OWASP WSTG` и `PayloadsAllTheThings`: `XXE`, `CORS` и `CSRF`

В эталонном руководстве **`OWASP Web Security Testing Guide (WSTG)`** и репозитории **`PayloadsAllTheThings` (`>82 000 ★` на GitHub)** проверка любого веб-приложения строится вокруг строгих проверяемых тест-кейсов. Разберём три критических теста из разделов `WSTG-INPV` и `WSTG-CLNT`:

1. **`XXE (XML External Entity Injection — WSTG-INPV-07)`**:
   Стандарт XML разрешает объявлять в заголовке документа `<!DOCTYPE ...>` собственные «макросы» — **сущности (`ENTITY`)**. Если ключевое слово `SYSTEM` указывает на локальный файл (`file:///etc/passwd`) или внутренний адрес (`http://169.254.169.254/...`):
   ```xml
   <?xml version="1.0"?>
   <!DOCTYPE report [
     <!ENTITY xxe SYSTEM "file:///etc/hostname">
   ]>
   <report><author>&xxe;</author></report>
   ```
   и парсер XML на сервере настроен с разрешением внешних сущностей (`resolve_entities=True`), то при чтении тега `<author>&xxe;</author>` парсер сам прочитает `/etc/hostname` с диска сервера и вставит его содержимое в ответ!
   **Защита**: полностью запретить `DOCTYPE / DTD` (`disallow-doctype-decl = true`) и внешние сущности (`external-general-entities = false`, а в Python использовать библиотеку `defusedxml` или стандартный `xml.etree.ElementTree`, который по умолчанию игнорирует внешние `SYSTEM`-сущности).
2. **Опасная конфигурация `CORS (Cross-Origin Resource Sharing — WSTG-CLNT-07)`**:
   По умолчанию браузер запрещает чужому сайту `https://evil.example` читать ответы `fetch()` с твоего банка `https://bank.local`, даже если запрос отправлен с куками пользователя.
   Но если разработчик, чтобы «не мучиться с настройкой доменов», зеркально копирует любой заголовок `Origin` из запроса обратно в ответ:
   ```http
   Access-Control-Allow-Origin: https://evil.example
   Access-Control-Allow-Credentials: true
   ```
   он фактически отключает `Same-Origin Policy` для всего интернета! Также опасно разрешать `Access-Control-Allow-Origin: null` (поскольку `Origin: null` легко подделывается из песочницы `<iframe sandbox="...">`).
3. **`CSRF (Cross-Site Request Forgery — WSTG-SESS-05)`**:
   Если перевод денег или смена почты полагается только на автоматическую отправку сессионной cookie браузером без проверки непредсказуемого **`CSRF-токена`** и атрибута **`SameSite=Lax / Strict`**, чужой сайт может незаметно отправить форму от лица авторизованного пользователя.

## Почему это работает: Разница между отправкой запроса (`CSRF`) и чтением ответа (`CORS`)

Новички часто путают `CORS` и `CSRF`:
- **`CSRF`** — это когда чужой сайт вслепую **отправляет запрос на изменение данных** (`POST /change-email`), даже не читая ответ. От `CSRF` защищают `SameSite`-куки и проверка криптографического `CSRF-токена` в заголовке.
- **`CORS`** — это когда чужой сайт пытается **прочитать приватный JSON-ответ** (`GET /api/profile`). От утечки через `CORS` защищает строгий белый список доверенных доменов в `Access-Control-Allow-Origin`.

<!-- preparation -->

В этом практикуме ты напишешь в `lab.py` автоматический аудитор по методике `OWASP WSTG`, который проверяет XML-документы на наличие `<!DOCTYPE` / `<!ENTITY ... SYSTEM`, тестирует политику `CORS` на отражение произвольного `Origin` и `null`, и проверяет защиту состояния через `CSRF-токен`.

## Сделай сейчас: Проведи аудит `XXE`, `CORS` и `CSRF` по чек-листу `OWASP WSTG` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
import hmac

TRUSTED_ORIGINS = {"https://app.kairon.local", "https://admin.kairon.local"}


def audit_xml_for_xxe(xml_payload):
    upper = xml_payload.upper()
    if "<!DOCTYPE" in upper or "<!ENTITY" in upper:
        if "SYSTEM" in upper or "PUBLIC" in upper:
            return "BLOCKED_XXE:external_entity_declaration_forbidden"
        return "BLOCKED_DTD:doctype_disallowed_by_policy"
    return "SAFE_XML:no_dtd_or_entities"


def evaluate_cors_policy(request_origin, reflect_any_origin=False):
    if reflect_any_origin:
        # УЯЗВИМО: слепое отражение любого Origin или 'null' вместе с Credentials
        return {
            "ACAO": request_origin,
            "ACAC": "true",
            "verdict": "VULNERABLE_CORS:arbitrary_origin_with_credentials",
        }
    if request_origin in TRUSTED_ORIGINS:
        return {"ACAO": request_origin, "ACAC": "true", "verdict": "SAFE_CORS:allowlisted_origin"}
    return {"ACAO": None, "ACAC": None, "verdict": "SAFE_CORS:untrusted_origin_rejected"}


def verify_csrf_request(session_csrf, header_csrf, samesite_attr="Lax"):
    if not session_csrf or not header_csrf:
        return "BLOCKED_CSRF:missing_token"
    if not hmac.compare_digest(session_csrf, header_csrf):
        return "BLOCKED_CSRF:token_mismatch"
    if samesite_attr not in ("Lax", "Strict"):
        return "WARN_CSRF:cookie_missing_samesite_protection"
    return "SAFE_STATE_CHANGE:csrf_verified"


xxe_attack = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><r>&xxe;</r>'
print("xxe_check=", audit_xml_for_xxe(xxe_attack))
print("cors_vuln=", evaluate_cors_policy("https://evil.htb", reflect_any_origin=True)["verdict"])
print("cors_safe=", evaluate_cors_policy("https://evil.htb", reflect_any_origin=False)["verdict"])
print("csrf_valid=", verify_csrf_request("tok_99a1", "tok_99a1", samesite_attr="Strict"))
print("csrf_forged=", verify_csrf_request("tok_99a1", "wrong_tok", samesite_attr="Strict"))
```

### Шаг 2. Запусти программу и проверь вердикты аудитора `WSTG`

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
xxe_check= BLOCKED_XXE:external_entity_declaration_forbidden
cors_vuln= VULNERABLE_CORS:arbitrary_origin_with_credentials
cors_safe= SAFE_CORS:untrusted_origin_rejected
csrf_valid= SAFE_STATE_CHANGE:csrf_verified
csrf_forged= BLOCKED_CSRF:token_mismatch
```

Разберём результаты проверки:
- фильтр `audit_xml_for_xxe` перехватил конструкцию `<!DOCTYPE ... <!ENTITY xxe SYSTEM "file:///etc/passwd">` до передачи в парсер (`BLOCKED_XXE:external_entity_declaration_forbidden`);
- в `evaluate_cors_policy` слепое отражение `Origin: https://evil.htb` при `Access-Control-Allow-Credentials: true` получило статус критической уязвимости, а проверка по строгому множеству `TRUSTED_ORIGINS` отклонила внешний источник (`SAFE_CORS:untrusted_origin_rejected`);
- проверка `verify_csrf_request` заблокировала запрос с поддельным токеном через константное по времени сравнение `hmac.compare_digest`.

### Шаг 3. Проверь поведение при `Origin: null` и безопасный парсинг XML в Kali

В файле `lab.py` замени `"https://evil.htb"` в вызове `cors_safe` на `"https://app.kairon.local"`, сохрани и запусти `python3 lab.py` — вердикт сменится на `SAFE_CORS:allowlisted_origin`. После проверки верни `"https://evil.htb"`.

В терминале Kali проверь, как стандартный `xml.etree.ElementTree` в Python 3 реагирует на неизвестную внешнюю сущность `&xxe;`:

```bash
python3 -c 'import xml.etree.ElementTree as ET
try:
    ET.fromstring("<!DOCTYPE r [<!ENTITY xxe SYSTEM \"file:///etc/hostname\">]><r>&xxe;</r>")
except Exception as e:
    print("et_safe_default=", type(e).__name__)'
```

## Почему это работает: Почему браузер запрещает сочетание `Access-Control-Allow-Origin: *` и `Credentials: true`

Разработчики браузеров специально заложили в стандарт `Fetch` защитное правило: если сервер возвращает подстановочную звёздочку `Access-Control-Allow-Origin: *` и одновременно `Access-Control-Allow-Credentials: true`, браузер отказывается отдавать ответ JavaScript-коду. К сожалению, некоторые разработчики серверов вместо создания белого списка доменов «обходят» это ограничение браузера тем, что копируют присланный заголовок `Origin` в `Access-Control-Allow-Origin`, открывая тем самым настоящую уязвимость.

## Если не получилось: Частые ошибки

- **Проверка `Origin` через `request_origin.startswith("https://kairon.local")`**: такой фильтр легко обходится регистрацией домена `https://kairon.local.evil.htb`! Сравнение `Origin` всегда должно выполняться по точному совпадению со списком `TRUSTED_ORIGINS`.
