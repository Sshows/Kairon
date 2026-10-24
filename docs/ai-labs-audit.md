# Kairon: аудит источников для Пути 4

Проверено 24 октября 2026 года. Автор всех пяти исходных проектов — **Lev Averyanov (LevaAverGit)**. Проверены README, полные деревья файлов, LICENSE, Makefile, requirements.txt, ключевой код и выбранные тесты. Код не запускался: ниже статический аудит, а не подтверждение успешного pytest или работы контейнеров. Коммиты дополнительно сверены через `git ls-remote ... HEAD`.

## Зафиксированные версии и лицензии

| Модуль                 | Репозиторий / автор                                                                                                         | Проверенный commit SHA                     | LICENSE                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4.1 Prompt Injection   | [LevaAverGit/llm-prompt-injection-lab](https://github.com/LevaAverGit/llm-prompt-injection-lab) — Lev Averyanov             | `2311bfc5681c80993d3a8095c7e87709bb1b4faa` | [MIT, © 2026 Lev Averyanov](https://github.com/LevaAverGit/llm-prompt-injection-lab/blob/2311bfc5681c80993d3a8095c7e87709bb1b4faa/LICENSE)       |
| 4.2 Отравление RAG     | [LevaAverGit/llm-rag-poisoning-lab](https://github.com/LevaAverGit/llm-rag-poisoning-lab) — Lev Averyanov                   | `4a70ff29ad6cbd5fe8f78de99e4d0bfd7befa530` | [MIT, © 2026 Lev Averyanov](https://github.com/LevaAverGit/llm-rag-poisoning-lab/blob/4a70ff29ad6cbd5fe8f78de99e4d0bfd7befa530/LICENSE)          |
| 4.3 Поиск атак в логах | [LevaAverGit/llm-log-anomaly-detection](https://github.com/LevaAverGit/llm-log-anomaly-detection) — Lev Averyanov           | `b0f8f0fa86d4f6652c7a879efd86d0ead04c0777` | [MIT, © 2026 Lev Averyanov](https://github.com/LevaAverGit/llm-log-anomaly-detection/blob/b0f8f0fa86d4f6652c7a879efd86d0ead04c0777/LICENSE)      |
| 4.4 Защита от утечек   | [LevaAverGit/llm-data-leak-guard](https://github.com/LevaAverGit/llm-data-leak-guard) — Lev Averyanov                       | `f6365ffd417c0f0420a947744e8aa1a36e1e7142` | [MIT, © 2026 Lev Averyanov](https://github.com/LevaAverGit/llm-data-leak-guard/blob/f6365ffd417c0f0420a947744e8aa1a36e1e7142/LICENSE)            |
| 4.5 Изоляция клиентов  | [LevaAverGit/multi-tenant-rls-isolation-lab](https://github.com/LevaAverGit/multi-tenant-rls-isolation-lab) — Lev Averyanov | `db7ef4cc18c85a1dfcb20d4a26c6f93159e1b1ff` | [MIT, © 2026 Lev Averyanov](https://github.com/LevaAverGit/multi-tenant-rls-isolation-lab/blob/db7ef4cc18c85a1dfcb20d4a26c6f93159e1b1ff/LICENSE) |

При включении исходников или существенных фрагментов сохранять уведомление об авторском праве и полный текст MIT. В каждом уроке показывать автора, ссылку на репозиторий и проверенную версию. Лицензии Python-зависимостей и весов моделей проверяются отдельно: MIT репозитория автоматически на них не распространяется.

## Что берём как есть и что дописываем

| Модуль               | Реально есть в исходниках; можно повторно использовать с MIT                                                                                                                                                                                                                              | Что нужно написать для Kairon                                                                                                                                                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 Prompt Injection | Синтетический FAQ-бот; четыре класса проб; защиты `none`, `system_prompt`, `input_filter`, `both`, опциональный `llm_guard`; LangGraph-цикл attacker → app → judge; вычисление матрицы; локальный Ollama и детерминированный mock; pytest для корпуса, защит, графа, вердиктов и матрицы. | Dockerfile, отдельная сессия ученика, фиксированная версия модели, русский интерфейс, три учебных задания, серверный адаптер проверки, XP/подсказки/разбор. Разделить режимы «симуляция», «повтор сохранённого прогона» и «живой Ollama».                                                                            |
| 4.2 RAG              | Синтетическая wiki и отравленные документы; LlamaIndex retrieval; `context_fencing`, `provenance_filter`, опциональный HF-классификатор; Ollama/mock; кеш и матрица; тесты retrieval, defense, judge, pipeline и воспроизводимости.                                                       | Контейнер; предзагрузка embedding/classifier-моделей; UI поиска документа и выбора защиты; проверка выбранного документа и числового результата. Для недоступного classifier показывать «не оценено», не засчитывать защиту.                                                                                         |
| 4.3 Логи / Blue Team | Логи Linux, Windows, nginx и cloud audit; разметка; нормализация; Sigma-style YAML и детерминированный Python-движок; Ollama/mock; P/R/F1; сравнение правил/LLM/union hybrid; SQLAlchemy-хранилище метрик.                                                                                | Контейнер и учебная форма; проверка ID подозрительных событий; редактор **ограниченного поддерживаемого подмножества** Sigma либо полноценный Sigma backend. Отключить облачный GigaChat. Связать урок с Blue Team.                                                                                                  |
| 4.4 DLP              | Синтетический span-labeled корпус; Presidio/spaCy плюс RU recognizers; regex/энтропия для секретов; маскирование; FastAPI `/guard/complete`; тесты корпуса, детекторов, redactor и proxy; benchmark.                                                                                      | Контейнер с заранее установленной spaCy-моделью; безопасный редактор параметров/правил; дополнительные отрицательные примеры для проверки лишнего маскирования; серверный адаптер тестов. Реальный downstream сейчас отсутствует: proxy вызывает mock, интеграцию с Ollama требуется дописать, если она нужна уроку. |
| 4.5 RLS              | PostgreSQL SQL-миграции; `ENABLE` + `FORCE RLS`; отдельные `app_owner` и `app_user`; `USING`/`WITH CHECK`; transaction-local tenant context; FastAPI/psycopg и SQLAlchemy; тесты чужих строк, записи и повторного использования соединений.                                               | Полный изолированный стенд из DB и runner/app; UI «до/после»; фиксация режима задачи; отдельные тесты Kairon/Prisma. Учебный `X-Tenant-Id` нельзя копировать в продукт: идентификатор брать только из проверенной сессии.                                                                                            |

## Запуск и проверка: команды из исходников

Это команды для будущих Linux-контейнеров. На данном этапе они прочитаны, но не выполнены.

| Репозиторий                    | Подготовка                                                           | Работа без живой LLM                                                                                           | Живой локальный режим                                                         | Проверка                                                |
| ------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| llm-prompt-injection-lab       | `make install`                                                       | `python -m runner.run_matrix --from-cache`                                                                     | `python -m runner.run_matrix --refresh` (по умолчанию `gemma3:latest`)        | `pytest -q`                                             |
| llm-rag-poisoning-lab          | `make install`; опционально `make install-classifier`                | `python -m ragpoison.runner --from-cache --defense none --defense context_fencing --defense provenance_filter` | `python -m ragpoison.runner --embedding hf --llm ollama --render-readme`      | `python -m pytest -q`                                   |
| llm-log-anomaly-detection      | `make install`                                                       | `python -m runner.run --all --from-cache`                                                                      | `python -m runner.run --approach llm --prompt v1 --refresh` и аналогично `v3` | `python -m pytest -q`                                   |
| llm-data-leak-guard            | `make install` (также загружает `en_core_web_sm`)                    | `python -m uvicorn proxy.app:app --host 127.0.0.1 --port 8000` — downstream mock                               | В upstream нет реального model forwarding                                     | `python -m pytest -q`; benchmark: `python -m bench.run` |
| multi-tenant-rls-isolation-lab | Зависимости из `requirements.txt`; `make up` поднимает БД и миграции | `uvicorn app.main:app` — учебный read API, LLM не нужна                                                        | Не применимо                                                                  | `APP_DSN=... ADMIN_DSN=... SUPERUSER_DSN=... pytest -q` |

Источники команд: [4.1 Makefile](https://github.com/LevaAverGit/llm-prompt-injection-lab/blob/2311bfc5681c80993d3a8095c7e87709bb1b4faa/Makefile), [4.2 Makefile](https://github.com/LevaAverGit/llm-rag-poisoning-lab/blob/4a70ff29ad6cbd5fe8f78de99e4d0bfd7befa530/Makefile), [4.3 Makefile](https://github.com/LevaAverGit/llm-log-anomaly-detection/blob/b0f8f0fa86d4f6652c7a879efd86d0ead04c0777/Makefile), [4.4 Makefile](https://github.com/LevaAverGit/llm-data-leak-guard/blob/f6365ffd417c0f0420a947744e8aa1a36e1e7142/Makefile), [4.5 Makefile](https://github.com/LevaAverGit/multi-tenant-rls-isolation-lab/blob/db7ef4cc18c85a1dfcb20d4a26c6f93159e1b1ff/Makefile).

## Существенные ограничения, найденные в коде

1. **Готовой контейнерной изоляции пока нет.** В деревьях первых четырёх репозиториев отсутствуют Dockerfile и compose. У RLS есть только PostgreSQL compose: loopback-порт, bind mount миграций, стандартная сеть, без лимитов CPU/RAM/TTL. Это локальный developer demo, а не готовая многопользовательская песочница. [RLS compose](https://github.com/LevaAverGit/multi-tenant-rls-isolation-lab/blob/db7ef4cc18c85a1dfcb20d4a26c6f93159e1b1ff/docker-compose.yml).

2. **Mock и живые модели дают разные результаты.** В Prompt Injection mock специально всегда отклоняет пробы с hardened marker; регрессионный тест `both` проверяет именно mock. README содержит сохранённый живой прогон, где `both` всё же пропускает часть утечек. Нельзя объявлять mock-доказательство гарантией защиты реальной LLM. [Provider](https://github.com/LevaAverGit/llm-prompt-injection-lab/blob/2311bfc5681c80993d3a8095c7e87709bb1b4faa/runner/providers.py), [тест](https://github.com/LevaAverGit/llm-prompt-injection-lab/blob/2311bfc5681c80993d3a8095c7e87709bb1b4faa/tests/test_both_defense_regression.py).

3. **RAG classifier может пропускаться целиком.** Если optional-модель отсутствует, код сохраняет все документы и выставляет `skipped=True`; если уже работающий scorer ошибся на отдельном документе, документ помещается в карантин. Это две разные ситуации. Для проверки задания нужны обязательные availability-check и проверка `skipped`. Отдельно: offline-матрица на mock embeddings не обязана совпадать с живым HF/Ollama-прогоном. [Код classifier](https://github.com/LevaAverGit/llm-rag-poisoning-lab/blob/4a70ff29ad6cbd5fe8f78de99e4d0bfd7befa530/ragpoison/defenses/injection_classifier.py), [тесты](https://github.com/LevaAverGit/llm-rag-poisoning-lab/blob/4a70ff29ad6cbd5fe8f78de99e4d0bfd7befa530/tests/test_defenses.py).

4. **Sigma-style engine не является универсальным исполнителем Sigma.** Он читает отдельные поля и thresholds конкретных именованных YAML, затем выполняет заранее написанные Python-функции. Произвольное правило ученика не начнёт исполняться только от сохранения нового YAML. Для MVP ограничить редактор понятными поддерживаемыми условиями; отдельно планировать полноценный backend. [Движок](https://github.com/LevaAverGit/llm-log-anomaly-detection/blob/b0f8f0fa86d4f6652c7a879efd86d0ead04c0777/rules/engine.py), [тесты](https://github.com/LevaAverGit/llm-log-anomaly-detection/blob/b0f8f0fa86d4f6652c7a879efd86d0ead04c0777/tests/test_rules.py).

5. **В log anomaly присутствует опциональный облачный GigaChat.** Требование Kairon — только Ollama или mock. Удалить его из разрешённых провайдеров и каталога запусков; не использовать `make run-models` без адаптированного allowlist. Таблицы автора — результаты его учебного корпуса, не наши измерения и не универсальный рейтинг моделей. [README](https://github.com/LevaAverGit/llm-log-anomaly-detection/blob/b0f8f0fa86d4f6652c7a879efd86d0ead04c0777/README.md).

6. **Нулевой exit code pytest не всегда означает проверенное задание.** RLS тесты пропускаются, если БД недоступна. DLP proxy-тесты пропускаются даже при 4xx/5xx, если pipeline не готов или форма запроса не подошла. RAG использует `importorskip`. Адаптер Kairon должен читать JUnit XML и требовать все обязательные testcase: нет failures/errors/skipped, выполнено ожидаемое количество тестов. Недоступность инфраструктуры возвращать как «ошибка стенда», без XP. [RLS tests](https://github.com/LevaAverGit/multi-tenant-rls-isolation-lab/blob/db7ef4cc18c85a1dfcb20d4a26c6f93159e1b1ff/tests/test_isolation.py), [DLP tests](https://github.com/LevaAverGit/llm-data-leak-guard/blob/f6365ffd417c0f0420a947744e8aa1a36e1e7142/tests/test_proxy.py), [RAG tests](https://github.com/LevaAverGit/llm-rag-poisoning-lab/blob/4a70ff29ad6cbd5fe8f78de99e4d0bfd7befa530/tests/test_mock_reproducibility.py).

7. **RLS не заменяет авторизацию.** Учебный API берёт tenant ID из клиентского заголовка. В Kairon user/tenant context должен происходить из проверенной сервером сессии. Runtime DB-role — `NOSUPERUSER NOBYPASSRLS`, не владелец таблиц; миграционная роль отдельно. В одной Prisma-транзакции сначала `set_config(..., true)`, затем запросы. Для пользовательских таблиц — `ENABLE` + `FORCE`, `USING` + `WITH CHECK`, отсутствие контекста закрывает доступ. Проверять A→B, B→A, отсутствие контекста, запись и reuse соединения. [API](https://github.com/LevaAverGit/multi-tenant-rls-isolation-lab/blob/db7ef4cc18c85a1dfcb20d4a26c6f93159e1b1ff/app/main.py), [SQL](https://github.com/LevaAverGit/multi-tenant-rls-isolation-lab/blob/db7ef4cc18c85a1dfcb20d4a26c6f93159e1b1ff/migrations/002_rls.sql), [ORM tests](https://github.com/LevaAverGit/multi-tenant-rls-isolation-lab/blob/db7ef4cc18c85a1dfcb20d4a26c6f93159e1b1ff/tests/test_orm_isolation.py).

8. **DLP снижает риск, но не доказывает отсутствие всех утечек.** В proxy передаётся `result.redacted`, однако пропущенный детектором секрет останется в этом тексте. Upstream использует mock completion; утверждение «ничего не просочилось» допустимо только относительно конкретного проверенного тест-набора. Юридические утверждения README о GDPR/152-ФЗ не переносить в урок автоматически: объяснение юрисдикций и требований нужно отдельно сверить по официальным источникам. [Proxy](https://github.com/LevaAverGit/llm-data-leak-guard/blob/f6365ffd417c0f0420a947744e8aa1a36e1e7142/proxy/app.py), [secret detector](https://github.com/LevaAverGit/llm-data-leak-guard/blob/f6365ffd417c0f0420a947744e8aa1a36e1e7142/guard/secrets.py).

## Предлагаемый контракт адаптации

Это проектирование Kairon, а не уже имеющийся функционал upstream.

```text
Lesson
  id, moduleId, slug, order, title, locale, contentVersion, status
  explanationMarkdown, analogyMarkdown, objective, practiceKind
  sourceRepositoryId, labTemplateId

Task
  id, lessonId, order, type, promptMarkdown, xpBase
  hints[3], checkerDefinitionId

LessonSolution (только сервер)
  lessonId, debriefMarkdown, answerDefinition

SourceRepository
  id, url, author, commitSha, licenseSpdx, licenseFile, auditedAt

LabTemplate (только ADMIN, версии immutable после публикации)
  id, version, sourceRepositoryId, imageDigest, dockerfileText
  startArgv, checkArgv, requiredTestIds, expectedTestsMinimum
  mode: MOCK | REPLAY | OLLAMA, modelId, limits, ttlSeconds

LabSession
  id, userId, labTemplateId, startedAt, expiresAt, state

Attempt / Progress / XpEvent (пользовательские данные под RLS)
  userId, taskId, lessonVersion, labSessionId, submittedAt
  status: PASSED | FAILED | INFRA_ERROR
  checkerVersion, evidenceSummary, hintsUsed, xpAwarded
```

Секретные ожидаемые ответы, полный разбор и команды checker не включать в общедоступный JSON урока. Разбор отдавать отдельным серверным запросом после подтверждённого Progress. Публичные репозитории содержат открытые ответы и тесты: это полезно для обучения, но не годится для выдачи непредсказуемого флага. Для такого задания генерировать значение на сессию; проверяющие тесты хранить отдельно от изменяемого учеником рабочего каталога.

Команды сохранять массивами аргументов и запускать только из проверенной версии шаблона. Добавление Dockerfile администратором не означает разрешение выполнять его в основном веб-сервере: сборка и аудит образа должны происходить отдельно. В student runtime нет Docker socket, host mounts, privileged и host networking. Предзагружать зависимости/веса при сборке; во время урока интернет закрыт. Ollama — внутри отдельной сети сессии или отдельный строго ограниченный model gateway, без доступа ученика к административному API и хосту.

## Проверенные тестовые файлы

- Prompt Injection: `test_both_defense_regression.py`, `test_matrix_assembly.py`; дерево также содержит attack corpus, harness graph, verdict parsing.
- RAG: `test_mock_reproducibility.py`, `test_defenses.py`; дерево также содержит contracts, attacks, eval, index, judge, pipeline, rag и runner.
- Logs: `test_rules.py`, `test_metrics.py`; дерево также содержит hybrid, normalization, LLM parse, reproducibility, cross-model и store.
- DLP: `test_corpus.py`, `test_proxy.py`; дерево также содержит detector и redactor tests.
- RLS: `test_isolation.py`, `test_break_isolation.py`, `test_orm_isolation.py`.

## Что ещё необходимо подтвердить запуском

- Совместимость зависимостей при точной фиксации lock/constraints; сейчас во многих requirements широкие диапазоны.
- Полный pytest в контейнере, включая число passed/skipped; работоспособность checker при изменении учеником разрешённых файлов.
- Образы без egress и доступа к хосту; лимиты CPU/RAM/PIDs, timeout, reset, автоудаление.
- Размеры и лицензии конкретных локальных моделей; производительность выбранного VPS. Upstream `gemma3:latest` не фиксирует конкретный digest/размер и не является выбором малой модели для Kairon.
- Поведение при недоступной Ollama: автоматического fallback на mock во всех исходниках не подтверждено. Kairon должен выбирать и явно обозначать режим сам.
- RLS в реальной конфигурации Kairon, включая Prisma/pool и runtime DB-role. Наличие SQL в репозитории само по себе не доказывает защиту развёрнутой платформы.
