# Статус проверки

Проверено 24 октября 2026 года. [Опубликованный сайт](https://kairon-phi.vercel.app) доступен без входа в Vercel. Этап 0: фундамент опубликован; автодеплой ещё ожидает настройки секрета GitHub.

| Проверка                                 | Результат                                                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Установка зависимостей                   | Успешно; npm сообщил 0 vulnerabilities                                                                                                                                   |
| Prisma generate, lint, TypeScript, build | Успешно локально и в GitHub Actions                                                                                                                                      |
| Unit                                     | 2 теста паролей: salted hash, неверный пароль, UTF-8/bcrypt byte limit                                                                                                   |
| PostgreSQL CI                            | Миграция, ограниченная роль, FORCE RLS, запрет чужого чтения/записи, очистка контекста, запрет повышения роли и лимит входа — PASS                                       |
| Auth e2e CI                              | 3 браузерных теста: каталог, USER/ADMIN, согласие, запрет админки USER, отзыв заблокированной сессии — PASS                                                              |
| GitHub Actions                           | [Успешный run 40121398206](https://github.com/Sshows/Kairon/actions/runs/40121398206) для ec94eaf                                                                        |
| Neon Free                                | Отдельный проект Kairon, PostgreSQL 17, Frankfurt, compute 0.25 CU; main и development                                                                                   |
| Миграции Neon                            | Сначала успешно на development, затем на пустой main                                                                                                                     |
| RLS Neon                                 | Полный db:check успешно на development через pooled runtime; production использует ту же миграцию и отдельный пароль                                                     |
| Vercel                                   | Production READY, [kairon-phi.vercel.app](https://kairon-phi.vercel.app), commit ec94eaf, Hobby, fra1                                                                    |
| Production HTTP                          | /, /login, /glossary, /ethics, программа пути и /api/health — 200; анонимный /api/me — 401                                                                               |
| Production auth                          | Реальный HTTPS CSRF → Credentials login → /api/me ADMIN → /admin 200. Пароль, cookie и ответы с личными данными не печатались                                            |
| Первый администратор                     | Создан; данные входа в локальном outputs/Kairon-admin-access.txt, не в Git                                                                                               |
| Визуальная QA                            | Локальный браузер заблокирован Work settings. В CI проверены интерактивные потоки, но визуальная приёмка адаптивности отдельно не подтверждена                           |
| Git-autodeploy                           | Прямая связь Vercel–GitHub отклонена Login Connection. Подготовлен Actions deploy после verify. DEPLOY_ENABLED пока false: ожидается VERCEL_TOKEN в секретах репозитория |
| VPS / Docker labs                        | VPS отсутствует. Контейнеры не запускались; учебные лабы ещё не реализованы                                                                                              |
| Neon agent tools                         | Три skills и проектная OAuth MCP-конфигурация установлены. MCP-вызов в текущем сеансе не выполнялся                                                                      |

/api/health проверяет живость web, не готовность БД/лабораторий. XP, сохранение прогресса, контент CRUD, Kali и AI-наставник ещё не реализованы. К следующему этапу до завершения согласованных проверок и развёртывания не переходим.
