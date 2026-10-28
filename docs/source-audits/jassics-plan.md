# security-study-plan: проверка источника для Kairon

Проверено 28 октября 2026 года. Автор: jassics и участники. Источник: [jassics/security-study-plan](https://github.com/jassics/security-study-plan).

Зафиксирован commit **85bfb85c2b3f25c9a4fa1247ef4f510450edd493**.

## Охват

README перечисляет **25 планов**: 20 в основном списке и 5 дополнительных. Проверены все 25 файлов на уровне структуры, обзорных пояснений, тематических пунктов, недельных вех и групп ресурсов. Вместе с README и коротким useful-security-scripts.md это **27 Markdown-файлов**.

Это планы по ролям и навыкам, а не 25 готовых программ. В отдельных файлах есть авторские диапазоны недель; они не доказывают, сколько займёт обучение у конкретного человека. README также обсуждает выбор вакансии, резюме и подготовку к собеседованию. Советы о гарантированном доходе или сроке получения работы не переносились.

В аудите не заявляется построчная техническая проверка каждого внешнего утверждения. Полные книги, видео, внешние сайты, приложения и лаборатории не исследованы и не запускались. Исходный репозиторий состоит преимущественно из Markdown; полезные скрипты представлены коротким перечнем будущих категорий, а не готовым пакетом.

## Лицензия и адаптация

В зафиксированном дереве отсутствуют LICENSE и COPYING. Поэтому тексты планов и изображения не копируются в Kairon. Новые русские объяснения, примеры, небольшие задания и критерии результата написаны отдельно; рядом остаётся ссылка на автора и точный файл.

Файл content/source-audits/jassics-plan.json содержит 25 оригинальных карточек. Для каждой указаны тема, необходимые области знаний, практический пример, безопасное задание без облачных затрат и проверяемый результат. Поле authorSchedule хранит названия недельных вех как сведения о структуре источника, а не как учебное обещание Kairon.

## Ограничения и редакционные решения

- В зафиксированном дереве не найден файл LICENSE или COPYING. Публичная доступность не рассматривается как разрешение скопировать материалы; опубликованы оригинальные пояснения Kairon и ссылки.
- Недельные диапазоны — ориентиры автора, не измеренное время обучения и не обещание трудоустройства или дохода.
- Внешние курсы, книги, экзамены и облачные сервисы включают платные варианты. Цены, бесплатные квоты и текущие программы сертификаций в этом аудите не проверялись.
- Планы ссылаются на новости, исследования поставщиков, новые стандарты и версии продуктов. Их проценты и категоричные выводы не переносятся в Kairon как подтверждённые факты.
- В Blue Team перечислены пять функций NIST CSF без Govern; это не используется как точный перечень функций актуальной версии CSF.
- Ссылки и названия тем не означают разрешение проверять чужие системы. Практика Kairon использует свои данные и цели.
- Полные внешние книги, видео, исследования, интервью, linked repositories и изображения не исследованы; шаблон useful-security-scripts содержит список будущих категорий, не готовый набор скриптов.

Среди тем встречаются криптографические алгоритмы исторического назначения, активные сетевые проверки, анализ вредоносных программ и социальная инженерия. Они не превращаются в задания с настоящими вредоносными файлами, сбором персональных данных или воздействием на чужую инфраструктуру. Задания карточек используют собственные синтетические данные, схемы или код Kairon.

## Полный указатель 25 планов

Две технические детали дополнительно сверены с первичными источниками. [NIST прямо помечает пять функций как CSF 1.1](https://www.nist.gov/cyberframework/csf-11-five-functions); перечисление из Blue Team не подаётся как полная структура актуальной версии. В API-плане общая роль gateway не заменяет проверку доступа к конкретному объекту: [OWASP API1:2023](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/) требует проверять разрешение текущего пользователя на запрошенное действие и объект. Карточка Kairon использует именно этот смысл.

| № | Направление Kairon | Файл источника | Недельных вех |
|---|---|---|---|
| 1 | Общая база: Linux, сети, Python и Git | [common-skills-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/common-skills-study-plan.md) | 8 |
| 2 | Защита сервисов AWS | [aws-security-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/aws-security-study-plan.md) | 6 |
| 3 | Защита Google Cloud | [gcp-security-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/gcp-security-study-plan.md) | 6 |
| 4 | Проверка безопасности своего сайта | [web-pentest-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/web-pentest-study-plan.md) | 5 |
| 5 | Безопасность приложения во время разработки | [application-security-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/application-security-study-plan.md) | 3 |
| 6 | Безопасность API: кто и что может запросить | [api-security-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/api-security-study-plan.md) | 4 |
| 7 | Модель угроз: что может пойти не так | [threat-modeling-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/threat-modeling-study-plan.md) | 4 |
| 8 | Правила, риски и подтверждение выполнения | [grc-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/grc-study-plan.md) | 4 |
| 9 | Защита Microsoft Azure | [azure-security-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/azure-security-study-plan.md) | 4 |
| 10 | Проверки безопасности в процессе выпуска | [devsecops-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/devsecops-study-plan.md) | 10 |
| 11 | Защита контейнеров Docker | [docker-security-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/docker-security-study-plan.md) | 4 |
| 12 | Защита кластера Kubernetes | [kubernetes-security-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/kubernetes-security-study-plan.md) | 4 |
| 13 | Сети: как соединяются устройства и что защищать | [network-security-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/network-security-study-plan.md) | 4 |
| 14 | Хеши, шифрование и цифровые подписи | [cryptography-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/cryptography-study-plan.md) | 6 |
| 15 | Откуда взялась программа и что в неё вошло | [software-supply-chain-security-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/software-supply-chain-security-study-plan.md) | 6 |
| 16 | Читаем код и проверяем решения | [secure-code-review-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/secure-code-review-study-plan.md) | 5 |
| 17 | Безопасность от идеи до поддержки | [secure-software-development-lifecycle-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/secure-software-development-lifecycle-study-plan.md) | 6 |
| 18 | Проектируем защиту всей системы | [security-architecture-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/security-architecture-study-plan.md) | 6 |
| 19 | Защита приложений с ИИ | [genai-security-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/genai-security-study-plan.md) | 8 |
| 20 | Помогаем команде выпускать защищённый продукт | [product-security-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/product-security-study-plan.md) | 6 |
| 21 | Управляем доступом людей и программ | [iam-security-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/iam-security-study-plan.md) | 11 |
| 22 | Замечаем подозрительное и разбираем происшествие | [blue-team-detection-response-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/blue-team-detection-response-study-plan.md) | 6 |
| 23 | Защита мобильного приложения | [mobile-application-security-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/mobile-application-security-study-plan.md) | 5 |
| 24 | Разбираем устройство программы | [reverse-engineering-malware-security-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/reverse-engineering-malware-security-study-plan.md) | 5 |
| 25 | Проверяем открытые сведения и подозрительные просьбы | [osint-social-engineering-study-plan.md](https://github.com/jassics/security-study-plan/blob/85bfb85c2b3f25c9a4fa1247ef4f510450edd493/osint-social-engineering-study-plan.md) | 6 |

## Проверка результата

Механически проверены: 25 уникальных ID, точное совпадение множества файлов с 25 ссылками README, существование каждого локального sourcePath и наличие объяснения, примера, задания и критерия результата. Внешние URL ведут к зафиксированному commit. Код и команды из источника не исполнялись.
