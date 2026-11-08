## Перед началом: Аудит загрузки файлов (`Magic Bytes`, `Polyglot`, двойные расширения) и `LFI / Path Traversal` (`OWASP WSTG` & `TryHackMe / HTB`)

В курсах **`TryHackMe` (`File Upload Vulnerabilities` / `File Inclusion`)**, **`Hack The Box Academy` (`File Upload Attacks` / `File Inclusion`)** и стандарте **`OWASP WSTG (WSTG-BUSL-08 / WSTG-ATHZ-01)`** функции загрузки аватарок и просмотра шаблонов являются одними из самых частых точек получения удалённого выполнения кода (`RCE`).

Почему обычной проверки расширения `.png` или заголовка `Content-Type: image/png` недостаточно?
1. **Заголовок `Content-Type` полностью контролируется браузером**: в HTTP-запросе `multipart/form-data` злоумышленник за одну секунду меняет `Content-Type: application/x-php` на `Content-Type: image/png`.
2. **Двойные расширения и нулевые байты (`shell.php.png`, `shell.pHp5`, `shell.php%00.png`)**:
   Если фильтр проверяет только `"." in filename` или `".png" in filename` (методом `in`, а не строгим разбором последнего расширения по белому списку), файл `avatar.png.php` проходит проверку и исполняется веб-сервером как PHP-скрипт! А в плохо настроенном Apache с `AddHandler application/x-httpd-php .php` даже файл `avatar.php.png` может быть выполнен как код, если сервер встречает `.php` в любой части имени.
3. **Файлы-полиглоты (`Magic Bytes + Webshell Polyglot`)**:
   Первые байты файла определяют его сигнатуру (**`Magic Bytes`**):
   - `PNG`: `\x89PNG\r\n\x1a\n` (`89 50 4E 47 0D 0A 1A 0A`)
   - `JPEG`: `\xff\xd8\xff` (`FF D8 FF`)
   - `GIF`: `GIF89a` или `GIF87a`
   Злоумышленник может создать файл, который начинается с законных байтов `GIF89a`, а сразу после них или в EXIF-метаданных содержит серверный код `<?php ... ?>`.
4. **Локальное включение файлов (`LFI / Path Traversal`) и `PHP Wrappers`**:
   Если параметр `?page=about.html` подставляется в чтение файла без нормализации пути, последовательности `../../../../etc/passwd` или обёртки `php://filter/convert.base64-encode/resource=config.php` позволяют выгрузить исходный код и ключи приложения.

## Почему это работает: Четырёхступенчатая защита загрузки файлов по стандарту `OWASP`

Чтобы загруженный файл никогда не смог стать исполняемым скриптом:
1. Проверять **магические байты заголовка (`Magic Bytes`)** и реальное декодирование изображения (с пересохранением пикселей без EXIF-метаданных).
2. **Генерировать полностью новое случайное имя файла (`UUID4 + .png`)** на сервере, вообще не используя имя файла, присланное пользователем!
3. **Хранить загруженные файлы вне корня веб-сервера (`outside Web Root` или в объектном хранилище `S3`)**, где ни один интерпретатор скриптов никогда не запускается.
4. Отдавать файлы со статического домена с заголовками `Content-Disposition: attachment` и `X-Content-Type-Options: nosniff`.

<!-- preparation -->

В этом практикуме ты напишешь в `lab.py` многослойный верификатор загрузки файлов и защиты от `LFI`, который проверяет сигнатуру `Magic Bytes`, обнаруживает внедрённые серверные теги в метаданных (`Polyglot`), заменяет клиентское имя файла на безопасный `UUID`-ключ и блокирует выход за пределы базового каталога (`os.path.commonpath`).

## Сделай сейчас: Проверь защиту от файлов-полиглотов, двойных расширений и `LFI` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
import posixpath

MAGIC_SIGNATURES = {
    ".png": b"\x89PNG\r\n\x1a\n",
    ".jpg": b"\xff\xd8\xff",
    ".gif": b"GIF89a",
}


def validate_and_store_upload(client_filename, file_bytes, assigned_uuid="9f8e7d6c"):
    # 1. Проверяем строго последнее расширение по белому списку
    dot_idx = client_filename.rfind(".")
    ext = client_filename[dot_idx:].lower() if dot_idx != -1 else ""
    if ext not in MAGIC_SIGNATURES:
        return "REJECTED:extension_not_allowed", None

    # 2. Проверяем соответствие Magic Bytes выбранному расширению
    expected_magic = MAGIC_SIGNATURES[ext]
    if not file_bytes.startswith(expected_magic):
        return "REJECTED:magic_bytes_mismatch", None

    # 3. Проверяем отсутствие скриптовых тегов внутри полиглота (до перекодирования изображения)
    if b"<?php" in file_bytes.lower() or b"<script" in file_bytes.lower():
        return "REJECTED:polyglot_script_payload_detected", None

    # 4. Никогда не сохраняем клиентское имя: генерируем серверное имя в хранилище вне webroot
    safe_storage_path = f"/var/kairon_uploads_isolated/{assigned_uuid}{ext}"
    return "ACCEPTED:stored_safely_outside_webroot", safe_storage_path


def safe_resolve_template(base_dir, requested_page):
    if "://" in requested_page or "\x00" in requested_page:
        return "BLOCKED_LFI:stream_wrapper_or_null_byte"
    normalized = posixpath.normpath(posixpath.join(base_dir, requested_page))
    if not normalized.startswith(base_dir.rstrip("/") + "/"):
        return "BLOCKED_LFI:path_traversal_outside_base"
    return f"ALLOWED:{normalized}"


print("double_ext_php=", validate_and_store_upload("avatar.png.php", b"\x89PNG\r\n\x1a\nDATA"))
print("gif_polyglot=", validate_and_store_upload("pic.gif", b"GIF89a<?php system('id'); ?>"))
print("valid_png=", validate_and_store_upload("../../etc/passwd.png", b"\x89PNG\r\n\x1a\nPIXEL_DATA"))
print("lfi_traversal=", safe_resolve_template("/srv/app/templates", "../../../etc/passwd"))
print("lfi_wrapper=", safe_resolve_template("/srv/app/templates", "php://filter/resource=config.php"))
print("lfi_valid=", safe_resolve_template("/srv/app/templates", "Help/faq.html"))
```

### Шаг 2. Запусти программу и проверь каждый защитный барьер

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
double_ext_php= ('REJECTED:extension_not_allowed', None)
gif_polyglot= ('REJECTED:polyglot_script_payload_detected', None)
valid_png= ('ACCEPTED:stored_safely_outside_webroot', '/var/kairon_uploads_isolated/9f8e7d6c.png')
lfi_traversal= BLOCKED_LFI:path_traversal_outside_base
lfi_wrapper= BLOCKED_LFI:stream_wrapper_or_null_byte
lfi_valid= ALLOWED:/srv/app/templates/Help/faq.html
```

Разберём, что показала модель:
- попытка загрузить `avatar.png.php` с настоящим заголовком PNG была отвергнута проверкой последнего расширения (`REJECTED:extension_not_allowed`);
- файл-полиглот `pic.gif`, начинающийся с законных байтов `GIF89a`, но содержащий `<?php ... ?>`, был заблокирован (`REJECTED:polyglot_script_payload_detected`);
- даже когда в имени валидного PNG попытались передать `../../etc/passwd.png`, сервер полностью отбросил клиентское имя и сохранил файл как `/var/kairon_uploads_isolated/9f8e7d6c.png` вне корня веб-сервера;
- в `safe_resolve_template` были заблокированы и выход через `../../../etc/passwd`, и потоковая обёртка `php://filter/...`.

### Шаг 3. Проверь чтение сигнатуры `Magic Bytes` файла в терминале Kali

В файле `lab.py` замени `b"\x89PNG\r\n\x1a\nPIXEL_DATA"` в вызове `valid_png` на `b"FAKE_HEADER_DATA"`, сохрани и запусти `python3 lab.py` — фильтр вернёт `('REJECTED:magic_bytes_mismatch', None)`. После проверки верни исходные байты.

В терминале Kali проверь первые 8 байтов любого системного бинарника (например, `/bin/ls` начинается с магических байтов ELF `7f 45 4c 46`):

```bash
head -c 4 /bin/ls | xxd -p
```

## Почему это работает: Почему полная перегенерация изображения (`Image Re-encoding`) надёжнее поиска подстрок

В реальном продакшене вместо поиска подстроки `<?php` внутри картинки библиотека обработки изображений (`Pillow` в Python или `libvips`) декодирует матрицу пикселей и **создаёт с нуля новый чистый файл изображения**. При таком перекодировании любые вредоносные комментарии, EXIF-теги и дописанные в конец файла байты гарантированно исчезают.

## Если не получилось: Частые ошибки

- **Очистка `../` однократным вызовом `.replace("../", "")`**: злоумышленник передаст строку `....//....//etc/passwd`, из середины которой удалится `../`, а оставшиеся половинки сложатся в новую рабочую последовательность `../../etc/passwd`! Всегда используй каноническое разрешение пути (`os.path.realpath` + `os.path.commonpath`).
