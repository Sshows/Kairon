# Настройка Neon agent tooling

По запросу пользователя прочитан официальный [Neon skill](https://neon.com/.well-known/agent-skills/neon/SKILL.md). Для этого проекта применены его разделы установки, сохранения конфигурации и branch-first migrations. Установлена CLI-линия 8.11.1 через npx; глобальные npm-пакеты не менялись.

## Проверено до установки

- В проекте отсутствовали `.agents/skills/neon`, `neon-postgres`, `neon-postgres-branches` и `.codex/config.toml`.
- В глобальной конфигурации Codex не было Neon MCP. Присутствующий node_repl сохранён.
- Локальный `.env.local` уже создан Vercel CLI и содержал его служебное окружение. `neon init`/автоматический env pull не использовались, чтобы не заменить файл.

## Изменения

1. Командой `neon skills -s neon -s neon-postgres -s neon-postgres-branches --agent codex -y` установлены три нужных skill в `.agents/skills`. Там же их справочные файлы; `skills-lock.json` содержит источник и контрольные хеши. Остальные продукты Neon не включались в приложение.
2. Командой `neon mcp --oauth --project --agent codex --project-id <Kairon project> -y` создана проектная `.codex/config.toml`. В ней только HTTPS URL Neon MCP, ограниченный проектом Kairon. API-ключа и bearer token в Git нет. Это установка конфигурации; OAuth первого вызова MCP выполняется отдельно клиентом. Прямой вызов MCP в текущем сеансе не проверялся, работа БД проверена через авторизованный CLI и PostgreSQL.
3. Авторизация CLI сохранена отдельным профилем за пределами репозитория. Секреты миграций/runtime записаны в отдельные приватные env-файлы, а не поверх `.env.local`.
4. В бесплатной организации создан отдельный проект Kairon: PostgreSQL 17, Frankfurt, compute 0.25 CU. Другие проекты не изменялись. Созданы `main` и `development`; тестовая миграция выполнена сначала на development.
5. `.neon` связывает локальный проект с development и исключён из Git. Link выполнен с `--no-env-pull`. В `.gitignore` убраны дубли, добавленные Vercel CLI; исходное исключение для `.env.example` сохранено.
6. `.vercelignore` исключает окружение и агентские настройки из загрузки приложения. MCP/skills остаются в Git как настройки разработки.
7. Добавлена [лицензия Apache-2.0](licenses/neon-agent-skills-LICENSE.txt) исходного `neondatabase/agent-skills`; проверенная ревизия репозитория — `ccca3334a7542d3133134cc6926f2fafc6edeb1f`. Установленные skill не редактировались.
8. `db:provision` дополнен выбором отдельного env-файла через `KAIRON_ENV_FILE` и автоматическим pooled hostname для runtime Neon. Уже существующий DATABASE_URL не перезаписывается.

Skills будут доступны при следующей загрузке инструкций проекта. MCP может потребовать перезагрузить подключение проекта и подтвердить OAuth; сохранённая CLI-авторизация не означает автоматически авторизованный MCP.

Auth.js, Prisma и существующие API сохранены. Managed Better Auth, Neon Data API, Functions, AI Gateway и платные ресурсы не включались: для них нет задачи на текущем этапе. Внешние платные LLM API не используются.
