# The Book of Secret Knowledge: аудит для Kairon

Проверено 28 октября 2026 года. Источник — [trimstray / the-book-of-secret-knowledge](https://github.com/trimstray/the-book-of-secret-knowledge), commit **7d37069a361d3fd9f214480755f7969744e866fa**.

Это большой справочник ссылок и команд для администрирования, сети и безопасности. Он помогает найти инструмент или объяснение. Готового последовательного курса с проверенными заданиями для новичка здесь нет. В Kairon добавлены собственные русские обзоры и связь с подходящими уроками. Партнёрство с автором не заявляется.

## Что проверено

Проверены дерево репозитория и четыре текстовых файла: `README.md`, `LICENSE.md`, `.github/CONTRIBUTING.md`, `.github/CODE_OF_CONDUCT.md`. В дереве также есть служебный `.github/FUNDING.yml` и PNG-изображение; они не использовались как учебный материал. Двоичные файлы не извлекались, команды источника не запускались.

В README **4442 строки и 15 основных глав**. Проверены вводный текст, все заголовки глав и их категорий. Прочитаны выбранные описания инструментов и контексты диагностики, DNS, HTTP/TLS, стирания данных, работы терминала и обеих shell-функций. Огромный список внешних книг, сайтов и проектов не проверялся целиком. Фраза «вся информация изучена» к этой работе неприменима.

В карте источника 12 разделов помечены как каталоги или смешанные справочники, три — как текст с командами. Это редакционная классификация Kairon. Наличие категории не означает, что все программы из неё рекомендуются к установке.

## Все основные главы

Каждая ссылка ведёт к точной строке проверенного commit. Полный список категорий внутри глав находится в [secret-knowledge.json](../../content/source-audits/secret-knowledge.json).

| Глава источника                                                                                                                                                       | Что объясняем в Kairon                                                     | Вид                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ |
| [CLI Tools, строка 111](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L111)                       | Выбирать командную программу под один вопрос: файл, сеть, журнал, нагрузка | Каталог, 18 категорий                |
| [GUI Tools, строка 382](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L382)                       | Читать результаты в окне программы и понимать их ограничения               | Каталог, 7 категорий                 |
| [Web Tools, строка 443](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L443)                       | Проверять DNS, сертификаты и заголовки без передачи рабочих секретов       | Каталог, 19 категорий                |
| [Systems/Services, строка 711](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L711)                | Различать систему, веб-сервер, DNS и средства защиты                       | Каталог, 5 категорий                 |
| [Networks, строка 766](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L766)                        | Записывать схему своего стенда и границы разрешённой проверки              | Каталог, 3 категории                 |
| [Containers/Orchestration, строка 787](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L787)        | Понимать запуск приложения, образы и проверку обновлений                   | Каталог, 4 категории                 |
| [Manuals/Howtos/Tutorials, строка 835](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L835)        | Находить ответ на один вопрос и проверять смысл команды                    | Каталог, 13 категорий                |
| [Inspiring Lists, строка 1017](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L1017)               | Выбирать одну понятную практику из большой подборки                        | Каталог, 4 категории                 |
| [Blogs/Podcasts/Videos, строка 1096](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L1096)         | Перенимать порядок проверки и отделять факт от предположения               | Каталог, 11 категорий                |
| [Hacking/Penetration Testing, строка 1231](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L1231)   | Работать с учебной целью и сохранять доказательство ошибки доступа         | Каталог, 9 категорий                 |
| [Your daily knowledge and news, строка 1481](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L1481) | Сопоставлять новость с продуктом, версией и своей системой                 | Каталог, 4 категории                 |
| [Other Cheat Sheets, строка 1519](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L1519)            | Различать DNS, сертификаты, хеширование, шифрование и кодирование          | Смешанный справочник, 10 тем         |
| [Shell One-liners, строка 1661](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L1661)              | Читать короткую команду до запуска и ожидать конкретный результат          | Рецепты, 58 заголовков Tool          |
| [Shell Tricks, строка 4346](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L4346)                  | Учитывать текущий сеанс и режим терминала                                  | Короткая последовательность действий |
| [Shell functions, строка 4357](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L4357)               | Видеть вход, внешний запрос, ответ и ошибку функции                        | Две функции                          |

В разделе Shell One-liners считались реальные заголовки `Tool`, а не только его оглавление. В тексте есть `tar`, `dump`, `taskset`, `python`, которых в этом оглавлении нет. Все 58 названий учтены в JSON; это индекс, а не заявление о проверке каждой строки кода.

## Что требует исправления или контекста

- В [vmstat, строки 2169–2205](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L2169) комментарии к интервалу и числу повторений переставлены местами. Подобные пояснения нужно сверять со справкой установленной программы.
- В [curl, строка 3074](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L3074) встречается `-k`, отключающий проверку сертификата. Успешный запрос с этим флагом не доказывает исправность TLS. В учебные рекомендации флаг как «исправление» не переносится.
- [secure-delete, строка 2950](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L2950) содержит команды, способные уничтожить данные диска. Также встречаются очистка истории, изменение прав, завершение процессов и активные сетевые проверки. Они не включены в обычные задания новичка.
- [Other Cheat Sheets, строка 1619](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L1619) включает обход фильтра через разные формы IP-адреса. В карте отражено наличие темы; инструкции по обходу чужой защиты не адаптированы.
- [Shell Tricks](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L4346) предполагает уже существующий интерактивный сеанс. Такая последовательность не заменяет установку Kali и не подходит для любой ошибки терминала.
- [DomainResolve и GetASN](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/README.md#L4357) обращаются к внешним API, используют `-k`, а GetASN — HTTP. Сохраняем идею разбора входа и ответа, но не предлагаем исходные реализации как безопасный образец.
- Актуальность каждого инструмента, тарифа, адреса DNS, внешней ссылки и страницы браузера не проверялась. Вводный текст автора сам отмечает временно недоступные ссылки звёздочкой.

## Как материал связан с обучением

Самостоятельные примеры Kairon описывают рабочие ситуации: сайт не открывается, журнал переполнил диск, сертификат не подходит имени, после обновления выросло время ответа. Для каждой ситуации нужны наблюдение, ограниченная проверка и результат, который можно передать коллеге.

Связи ведут к базовым урокам, практикам Kali, анализу журналов, проверке доступа и новому пути диагностики. В каталоге нет обещания, что весь внешний сборник переведён или что все программы установлены на сайте. Практика выполняется в своей Kali или по подготовленным учебным данным; терминал в браузере не требуется.

## Лицензия и атрибуция

[LICENSE.md проверенного commit](https://github.com/trimstray/the-book-of-secret-knowledge/blob/7d37069a361d3fd9f214480755f7969744e866fa/LICENSE.md) содержит MIT. Это лицензия репозитория trimstray; она не заменяет лицензии перечисленных программ, книг и сайтов. Русские обзоры и примеры написаны заново. Сохранено уведомление исходного проекта:

```text
MIT License

Copyright (c) 2017 trimstray

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
