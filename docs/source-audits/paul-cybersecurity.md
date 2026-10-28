# paulveillard/cybersecurity: разбор источника для Kairon

28 октября 2026 года. Автор каталога — [Paul Veillard и участники](https://github.com/paulveillard/cybersecurity). Проверенная версия: **4e2d6e6138dc8ec5eb67cb04619f905b52619532**.

## Что просмотрено

Главный README — 788 строк, около 87 КБ. В нём 22 заголовка второго уровня. Из них оглавление и лицензия — служебные; оставшиеся **20 содержательных областей** включены в индекс. Буквенный список поставщиков не превращён в отдельные темы, а рекламные описания не скопированы.

Дерево зафиксированной версии содержит 146 файлов: 31 Markdown, 63 PDF, 19 CSV, 11 XLSX, четыре Python-файла и другие материалы. Для дополнительных Markdown-файлов просмотрены структура, заголовки и обзорные части. Вложенные PDF, электронные таблицы стандартов, скрипты и полное содержимое внешних ссылок не исследовались и не запускались. Книги, программы и бинарные материалы не включены в Kairon.

Отдельно добавлен обзор папки How to Secure Anything: она содержит большой конспект проектирования защиты и заметки по разным авторам. Итого в JSON **21 запись**: двадцать областей README и одна дополнительная область.

## Лицензия и авторство

[LICENSE](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/LICENSE) содержит полный текст Apache License 2.0. В [конце README](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L781) одновременно указаны MIT, CC BY 4.0 и формулировка отказа от прав. Это расхождение не скрывается и не разрешается предположением о единой лицензии всех вложений.

Тексты, код, скриншоты и книги не перенесены. Написаны оригинальные русские пояснения тем с конкретными примерами и ссылками на точную версию источника. В How to Secure Anything встречаются материалы и заметки по Veeral Patel, Ross Anderson, Sami Saydjari и nickpsecurity; авторство Paul Veillard на эти работы не заявляется.

## Что не становится фактом курса

- Утверждения о рынке и поставщиках 2021–2022 годов не подаются как текущая статистика.
- Доступность, бесплатность, поддерживаемые версии и рекламные показатели инструментов не подтверждались. Примеры старых систем в описаниях — признак архивности, а не совет устанавливать их сейчас.
- Старые версии CIS, CMMC, PCI DSS и других стандартов в именах файлов не заменяют проверку действующих документов у издателя.
- Обнаружение индикатора или совпадения устройства не доказывает личность и само по себе не подтверждает взлом.
- Фразы о полной анонимности, предотвращении всех атак, почти нулевых ложных срабатываниях и точной производительности не переносятся в уроки.
- Указатель книг не подтверждает разрешение распространять их полные копии. Сторонние зеркала не включаются в Kairon.

## Индекс областей

| №   | Тема Kairon                                              | Раздел исходника                                                                                                                                                        | Статус  |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Что защищает кибербезопасность                           | [What is Cybersecurity?](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L7)                                      | article |
| 2   | Как разделяются задачи защиты                            | [Cybersecurity](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L95)                                              | catalog |
| 3   | Как читать новости и разборы инцидентов                  | [Security Publications](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L249)                                     | catalog |
| 4   | Как выбирать исходный проект на GitHub                   | [Security Repositories](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L302)                                     | catalog |
| 5   | Дополнительные темы: от API до проверки данных           | [Other useful repositories](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L349)                                 | catalog |
| 6   | Сеть: соединения, наблюдение и ограничения               | [Network](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L390)                                                   | catalog |
| 7   | Рабочий компьютер: файлы, вход и настройки               | [Endpoint](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L524)                                                  | catalog |
| 8   | Сведения об угрозах: признак требует контекста           | [Threat Intelligence](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L576)                                       | catalog |
| 9   | Обман через сообщение или просьбу                        | [Social Engineering](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L598)                                        | catalog |
| 10  | Защита сайта: запросы, права и исправления               | [Web](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L602)                                                       | catalog |
| 11  | Почему изучение ошибки не равно запуску готовой атаки    | [Exploits & Payloads](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L654)                                       | catalog |
| 12  | Среда для разрешённой проверки                           | [Red Team Infrastructure Deployment](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L658)                        | catalog |
| 13  | Защита должна быть понятной человеку                     | [Usability](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L663)                                                 | catalog |
| 14  | Большие журналы: сначала проверь маленький пример        | [Big Data](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L667)                                                  | catalog |
| 15  | Проверки в процессе выпуска изменений                    | [DevOps](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L677)                                                    | catalog |
| 16  | Системы: назначение и границы                            | [Operating Systems](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L686)                                         | catalog |
| 17  | Где хранить данные и секреты                             | [Datastores](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L701)                                                | catalog |
| 18  | Признаки мошенничества: сигнал не устанавливает личность | [Fraud prevention](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L719)                                          | catalog |
| 19  | Как выбирать книгу под задачу                            | [E-Books](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L724)                                                   | catalog |
| 20  | Другие каталоги: выбери один следующий вопрос            | [Other Cybersecurity Lists](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/README.md#L737)                                 | catalog |
| 21  | Проектирование защиты: правило, механизм и проверка      | [How to Secure Anything](https://github.com/paulveillard/cybersecurity/blob/4e2d6e6138dc8ec5eb67cb04619f905b52619532/cybersecurity-how-to-secure-anything/README.md#L1) | article |

## Файлы обзорной проверки

- LICENSE
- README.md
- code-of-conduct.md
- contributing.md
- cyber-security-scripts/README.md
- cybersecurity-domains/README.md
- cybersecurity-domains/Security Domains.md
- cybersecurity-how-to-secure-anything/README.md
- cybersecurity-how-to-secure-anything/anderson/anderson-ch1.md
- cybersecurity-how-to-secure-anything/assurance/high_assurance_lawful_intercept.md
- cybersecurity-how-to-secure-anything/attack_graphs/attack-planning-in-the-real-world.md
- cybersecurity-how-to-secure-anything/attack_surface/README.md
- cybersecurity-how-to-secure-anything/banking/coinbase.md
- cybersecurity-how-to-secure-anything/classic_papers/confinement_problem.md
- cybersecurity-how-to-secure-anything/classic_papers/nibaldi.md
- cybersecurity-how-to-secure-anything/classic_papers/saltzer_schroeder.md
- cybersecurity-how-to-secure-anything/classic_papers/thirty_years_later.md
- cybersecurity-how-to-secure-anything/mit-6858-lec-4-privilege-separation.md
- cybersecurity-how-to-secure-anything/obscurity/techniques_for_defeating_high_strength_attackers.md
- cybersecurity-how-to-secure-anything/prisons/jail-design-guide-notes.md
- cybersecurity-how-to-secure-anything/prisons/technical-guidance-on-prison-planning.md
- cybersecurity-how-to-secure-anything/saydjari/README.md
- cybersecurity-how-to-secure-anything/saydjari/saydjari-ch1.md
- cybersecurity-how-to-secure-anything/saydjari/saydjari-ch12.md
- cybersecurity-how-to-secure-anything/saydjari/saydjari-ch16.md
- cybersecurity-how-to-secure-anything/saydjari/saydjari-ch20.md
- cybersecurity-how-to-secure-anything/saydjari/saydjari-ch5.md
- cybersecurity-how-to-secure-anything/threat_modeling/agile-threat-modeling.md
- cybersecurity-how-to-secure-anything/time-based-security.md
- cybersecurity-how-to-secure-anything/ucb-tcb-notes.md
- cybersecurity.md
- information-security/information-security-ebooks/readme.md

Проверка учебных уроков, ссылок на них, интерфейса и публикации выполняется отдельно. Этот аудит источника не подтверждает выполнение внешних лабораторий или работоспособность перечисленных программ.
