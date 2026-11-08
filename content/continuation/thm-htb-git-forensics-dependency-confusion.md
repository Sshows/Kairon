## Перед началом: Криминалистика истории `.git` и атака подмены пакетов `Dependency Confusion` (`TryHackMe` & `HTB Academy`)

В модулях по безопасности цепочки поставок (`Supply Chain Security`) на **`TryHackMe` (`Git Happens` / `Supply Chain`)** и **`Hack The Box Academy` (`Source Code & Dependency Security`)** разбираются две классические ситуации, с которыми сталкивается каждая команда разработки:
1. **Почему «удалённый в новом коммите пароль» никуда не исчезает из `.git/objects`**:
   Представь, что разработчик случайно закоммитил файл `.env` с ключом `AWS_SECRET_KEY=AKIA...` в коммите `A`, а через минуту спохватился, удалил файл `.env`, сделал новый коммит `B` («Removed secret») и отправил репозиторий на сервер. На витрине текущей ветки `HEAD` файла `.env` действительно нет! Но система `Git` — это неизменяемый журнал снимков: полный объект (`blob`) старого файла по-прежнему лежит внутри папки **`.git/objects/`**, и команда `git log -p -S "AWS_SECRET"` или `git show <old_commit>` достаёт его за одну секунду!
2. **Атака подмены зависимостей (`Dependency Confusion`, исследование Алекса Бирсана)**:
   Представь, что внутри компании используется закрытая библиотека `corp-auth-utils` версии `1.2.0`, которая лежит во внутреннем приватном репозитории пакетов. Но в настройках менеджера пакетов (`pip install --extra-index-url https://pypi.org/simple` или `npm`) указаны **оба** источника — и внутренний сервер, и публичный `PyPI / npm`!
   Как поступает `pip` при флаге `--extra-index-url`? Он опрашивает **оба** сервера и выбирает пакет с **максимальным номером версии**! Если злоумышленник зарегистрирует в публичном `PyPI` пакет с тем же именем `corp-auth-utils` и версией **`99.0.0`**, сборочный сервер компании сам скачает и выполнит публичный пакет `99.0.0` вместо внутреннего `1.2.0`!

## Почему это работает: Как защитить историю Git и установку зависимостей

- Если секрет попал в коммит, недостаточно удалить строку новым коммитом — этот секрет считается **скомпрометированным и подлежит немедленному отзыву и перевыпуску (`Revoke & Rotate`)**, а до публикации используют пре-коммит сканеры (`gitleaks` / `trufflehog`).
- Против `Dependency Confusion`:
  1. в `npm` привязывать внутренние пакеты к корпоративному пространству имён (**`@corp/auth-utils`**) в `.npmrc`;
  2. в `pip` не смешивать `--index-url` и `--extra-index-url` без корпоративного прокси-репозитория (`Nexus` / `Artifactory`) с правилами маршрутизации префиксов и обязательной проверкой криптографических хешей в lock-файле (**`pip install --require-hashes`**).

<!-- preparation -->

В этом практикуме ты проверишь в `lab.py` поиск удалённого в `HEAD` секрета по объектной истории коммитов Git, воспроизведёшь выбор пакета при `Dependency Confusion` (`--extra-index-url`) и проверишь защиту через привязку префикса и хеша (`--require-hashes`).

## Сделай сейчас: Найди удалённый секрет в истории коммитов и закрой `Dependency Confusion` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
def scan_git_history_for_secrets(commits):
    # Даже если в последнем коммите (HEAD) секрет удалён, проверяем все исторические снимки
    head_files = commits[-1]["files"]
    visible_in_head = any("SECRET_TOKEN=" in content for content in head_files.values())

    leaked_in_history = []
    for c in commits:
        for fname, content in c["files"].items():
            if "SECRET_TOKEN=" in content:
                leaked_in_history.append((c["sha"], fname))
    return visible_in_head, leaked_in_history


def resolve_package_install(pkg_name, private_index, public_index, pinned_sha256=None, internal_only_prefix="corp-"):
    if pinned_sha256 is not None:
        cand = private_index.get(pkg_name)
        if cand and cand["sha256"] == pinned_sha256:
            return "SAFE_LOCKFILE_VERIFIED", cand["source"], cand["version"]
        return "BLOCKED:hash_mismatch", None, None

    if pkg_name.startswith(internal_only_prefix):
        # Защищённая маршрутизация по префиксу: пакеты corp-* никогда не ищутся в публичном индексе
        cand = private_index[pkg_name]
        return "SAFE_SCOPED_PRIVATE", cand["source"], cand["version"]

    # Уязвимое поведение --extra-index-url без скоупа: берётся максимальная версия из обоих индексов
    candidates = [private_index.get(pkg_name), public_index.get(pkg_name)]
    best = max((c for c in candidates if c), key=lambda x: x["version"])
    return "VULNERABLE_MAX_VERSION_PICKED", best["source"], best["version"]


git_commits = [
    {"sha": "a1b2c3d", "files": {"config.ini": "PORT=8080\nSECRET_TOKEN=KRN-LIVE-KEY-99\n"}},
    {"sha": "f4e5d6c", "files": {"config.ini": "PORT=8080\n"}},  # Секрет удалён в HEAD
]

priv_idx = {"corp-auth": {"version": (1, 2, 0), "source": "private_registry", "sha256": "aaa111"}}
pub_idx = {"corp-auth": {"version": (99, 0, 0), "source": "public_pypi_attacker", "sha256": "evil999"}}

in_head, history_hits = scan_git_history_for_secrets(git_commits)
print("secret_in_head=", in_head, "found_in_git_history=", history_hits)
print("unscoped_extra_index=", resolve_package_install("corp-auth", priv_idx, pub_idx, internal_only_prefix="none-"))
print("scoped_prefix_guard=", resolve_package_install("corp-auth", priv_idx, pub_idx, internal_only_prefix="corp-"))
print("pinned_hash_guard=", resolve_package_install("corp-auth", priv_idx, pub_idx, pinned_sha256="aaa111"))
```

### Шаг 2. Запусти программу и разбери оба сценария

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
secret_in_head= False found_in_git_history= [('a1b2c3d', 'config.ini')]
unscoped_extra_index= ('VULNERABLE_MAX_VERSION_PICKED', 'public_pypi_attacker', (99, 0, 0))
scoped_prefix_guard= ('SAFE_SCOPED_PRIVATE', 'private_registry', (1, 2, 0))
pinned_hash_guard= ('SAFE_LOCKFILE_VERIFIED', 'private_registry', (1, 2, 0))
```

Посмотри на выводы:
- хотя в текущем состоянии ветки (`secret_in_head= False`) секрета уже нет, сканер истории коммитов мгновенно нашёл его в коммите `a1b2c3d` в файле `config.ini`;
- при неразделённом опросе двух индексов (`unscoped_extra_index`) установщик выбрал версию `(99, 0, 0)` из публичного индекса `public_pypi_attacker` вместо внутренней `(1, 2, 0)`;
- привязка корпоративного префикса `corp-` только к внутреннему реестру (`scoped_prefix_guard`) и проверка хеша `pinned_sha256="aaa111"` (`pinned_hash_guard`) гарантированно выбрали подлинный внутренний пакет `(1, 2, 0)`.

### Шаг 3. Проверь поиск по всей истории Git через `git log -S` в терминале Kali

В файле `lab.py` замени `pinned_sha256="aaa111"` на `"wrong_hash"`, сохрани и запусти `python3 lab.py` — установщик остановится с `BLOCKED:hash_mismatch`. После проверки верни `"aaa111"`.

В терминале Kali запомни ключ «пикакс» (`-S`) команды `git log`, который ищет коммиты, где указанная подстрока была добавлена или удалена:

```bash
git --version && echo "Usage: git log -p -S 'SECRET_KEY' --all"
```

## Почему это работает: Почему флаг `--all` в `git log --all` так важен при криминалистике репозитория

Обычный `git log` показывает историю только текущей ветки `HEAD`. Но разработчики часто создают временные ветки или теги и удаляют их, оставляя «висячие коммиты» (`dangling commits`). Флаг `--all` проверяет все ветки и теги, а команда `git fsck --full` находит даже отвязанные объекты в `.git/objects`.

## Если не получилось: Частые ошибки

- **Путаница между `--index-url` и `--extra-index-url` в `pip`**: флаг `--index-url` **заменяет** публичный PyPI на твой корпоративный сервер, а флаг `--extra-index-url` **добавляет** второй сервер параллельно первому, открывая дверь для `Dependency Confusion`.
