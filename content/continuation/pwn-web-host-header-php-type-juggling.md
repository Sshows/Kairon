## Перед началом: Подмена заголовков прокси (`Host` / `X-Forwarded-For`) и «магические хеши» при нестрогом сравнении типов (`pwn.college Advanced Web Security`)

В репозитории **`pwncollege/challenges/advanced-web-security`** отдельными модулями выделены две классические проблемы веб-архитектуры — **`hosts-and-proxies`** и **`php-security`**:
1. **Отравление заголовка `Host` и доверие `X-Forwarded-For` (`Host Header Poisoning` & `IP Spoofing`)**:
   - Представь, что пользователь нажимает «Сбросить пароль», а бэкенд формирует ссылку в письме, беря домен прямо из HTTP-заголовка запроса: `reset_url = "https://" + request.headers["Host"] + "/reset?token=" + secret_token`. Если злоумышленник отправит запрос на сброс пароля для почты жертвы, но подставит в заголовок `Host: evil-collector.test`, сервер сам пришлёт жертве письмо с настоящим секретным токеном, ведущим на сервер злоумышленника!
   - Аналогично, если приложение проверяет «админ ли это с локального адреса `127.0.0.1`», читая заголовок `X-Forwarded-For: 127.0.0.1` напрямую от клиента (когда запрос пришёл в обход доверенного обратного прокси), любой внешний клиент может приписать себе любой внутренний IP-адрес.
2. **Нестрогое сравнение типов (`Type Juggling` и «магические хеши» `0e...`)**:
   - В языках с автоматическим приведением типов (прежде всего в PHP при использовании двойного знака равенства `==` вместо тройного `===`) строка, начинающаяся с цифр и буквы `e` и состоящая дальше только из цифр (например, `"0e462097431906509019562988736854"`), при нестрогом сравнении интерпретируется как число в научной нотации: **$0 \times 10^{46209...} = 0$**!
   - Если хеш пароля в базе случайно имеет вид `0e11111...`, а злоумышленник подберёт входную строку (например, `240610708`), чей MD5-хеш тоже начинается на `0e` и состоит дальше только из цифр (`0e462097431906509019562988736854`), то нестрогая проверка `$input_hash == $db_hash` превратит обе разные строки в число `0 == 0` и вернёт **`true`**!

## Почему это работает: Как защитить обратный прокси и сравнение секретов

- **Против `Host Header Poisoning`**: формировать ссылки в письмах и редиректах только из жёстко заданной серверной константы `PUBLIC_BASE_URL` (например, `https://portal.kairon.local`), а на уровне `Nginx` отклонять любые запросы с чужим заголовком `Host` (`return 444;`).
- **Против подделки `X-Forwarded-For`**: принимать этот заголовок **только** в том случае, если реальный сетевой адрес TCP-соединения (`remote_addr`) принадлежит списку доверенных балансировщиков (`TRUSTED_PROXIES`).
- **Против `Type Juggling`**: всегда использовать строгое сравнение типов (`===`) и специализированную функцию сравнения за константное время (`hmac.compare_digest` в Python, `hash_equals` в PHP, `crypto.timingSafeEqual` в Node.js).

<!-- preparation -->

В этом практикуме ты проверишь в `lab.py` оба механизма из `pwn.college Advanced Web Security`: защиту генератора ссылок сброса пароля и `X-Forwarded-For` от подмены, а также разницу между уязвимым нестрогим сравнением «магических хешей» `0e...` и безопасным `hmac.compare_digest`.

## Сделай сейчас: Проверь защиту заголовков прокси и строгое сравнение хешей в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
import hashlib
import hmac

TRUSTED_PROXIES = {"10.0.0.1"}
CANONICAL_BASE_URL = "https://portal.kairon.local"


def resolve_client_ip(tcp_remote_addr, x_forwarded_for, trust_any_xff=False):
    if trust_any_xff or tcp_remote_addr in TRUSTED_PROXIES:
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
    return tcp_remote_addr


def build_password_reset_link(host_header, token, use_canonical_config=True):
    base = CANONICAL_BASE_URL if use_canonical_config else f"https://{host_header}"
    return f"{base}/reset?token={token}"


def is_scientific_zero(s):
    return s.startswith("0e") and s[2:].isdigit()


def compare_hashes(h1, h2, loose_php_style=False):
    if loose_php_style and is_scientific_zero(h1) and is_scientific_zero(h2):
        # В нестрогом сравнении оба выражения '0e<цифры>' равны числу 0.0!
        return True
    return hmac.compare_digest(h1, h2)


spoofed_ip_vuln = resolve_client_ip("198.51.100.77", "127.0.0.1", trust_any_xff=True)
spoofed_ip_safe = resolve_client_ip("198.51.100.77", "127.0.0.1", trust_any_xff=False)

poisoned_link = build_password_reset_link("evil.collector.test", "TKN-99", use_canonical_config=False)
safe_link = build_password_reset_link("evil.collector.test", "TKN-99", use_canonical_config=True)

md5_a = hashlib.md5(b"240610708").hexdigest()
md5_b = hashlib.md5(b"QNKCDZO").hexdigest()

print("ip_vuln_vs_safe=", spoofed_ip_vuln, spoofed_ip_safe)
print("reset_link_safe=", safe_link)
print("magic_md5_prefixes=", md5_a[:6], md5_b[:6], "all_digits_after_0e=", md5_a[2:].isdigit() and md5_b[2:].isdigit())
print("loose_vs_strict_compare=", compare_hashes(md5_a, md5_b, loose_php_style=True), compare_hashes(md5_a, md5_b, loose_php_style=False))
```

### Шаг 2. Запусти программу и изучи результаты

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
ip_vuln_vs_safe= 127.0.0.1 198.51.100.77
reset_link_safe= https://portal.kairon.local/reset?token=TKN-99
magic_md5_prefixes= 0e4620 0e8304 all_digits_after_0e= True
loose_vs_strict_compare= True False
```

Разберём, что произошло:
- когда сервер слепо доверял заголовку `X-Forwarded-For` от внешнего TCP-адреса `198.51.100.77`, он поверил, что запрос пришёл с `127.0.0.1`. Когда мы разрешили чтение `X-Forwarded-For` только от доверенного балансировщика `10.0.0.1`, сервер сохранил истинный адрес клиента `198.51.100.77`;
- функция `build_password_reset_link` при `use_canonical_config=True` проигнорировала поддельный заголовок `Host: evil.collector.test` и построила безопасную ссылку на `https://portal.kairon.local`;
- две совершенно разные строки (`"240610708"` и `"QNKCDZO"`) дали MD5-хеши `0e462097431906509019562988736854` и `0e830400451993494058024219903391`, где после `0e` стоят исключительно десятичные цифры (`all_digits_after_0e= True`). Нестрогое сравнение посчитало обе строки равными нулю (`True`), тогда как `hmac.compare_digest` вернул точный ответ `False`.

### Шаг 3. Проверь работу через доверенный прокси и вычисление «магического хеша» в Kali

В файле `lab.py` замени `"198.51.100.77"` во втором вызове `resolve_client_ip` на адрес доверенного балансировщика `"10.0.0.1"`, сохрани и запусти `python3 lab.py` — теперь сервер обоснованно примет адрес клиента из `X-Forwarded-For`. После проверки верни `"198.51.100.77"`.

В терминале Kali проверь полный MD5-хеш строки `240610708`:

```bash
python3 -c 'import hashlib; h=hashlib.md5(b"240610708").hexdigest(); print("md5=", h, "is_0e_digits=", h.startswith("0e") and h[2:].isdigit())'
```

## Почему это работает: Почему для паролей нельзя использовать быстрый MD5/SHA-256 даже со строгим сравнением

Даже если сравнение написано строго через `hmac.compare_digest` или `===`, быстрые хеш-функции (`MD5`, `SHA-1`, `SHA-256`) вычисляются на видеокартах со скоростью десятков миллиардов хешей в секунду. Поэтому пароли пользователей хранят только через медленные адаптивные функции с индивидуальной солью: **`Argon2id`**, **`scrypt`** или **`bcrypt`**.

## Если не получилось: Частые ошибки

- **Чтение последнего, а не проверенного элемента в цепочке `X-Forwarded-For` без учёта числа прокси**: если клиент прислал `X-Forwarded-For: 127.0.0.1`, а твой балансировщик дописал в конец реальный IP клиента (`127.0.0.1, 198.51.100.77`), чтение самого первого элемента слева (`split(",")[0]`) всё равно вернёт поддельное значение клиента! Правильная настройка обратного прокси (`real_ip_header` с `set_real_ip_from` в Nginx) перезаписывает заголовок `X-Real-IP` или берёт первый адрес справа, не входящий в список доверенных прокси.
