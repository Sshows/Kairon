# Источники курса Kali — аудит 25 октября 2026 года

Тексты, вымышленные дела и программы Kairon написаны отдельно. Главы книг, чужие скрипты и опасные архивы не копировались и не выполнялись. Проверены README, доступная структура и LICENSE выбранных репозиториев. Ни одному чужому проекту не приписывается прохождение runtime-тестов.

## GitHub: популярность и пригодность

Показаны звёзды на дату проверки, не глобальный рейтинг всех книг.

| Репозиторий | Звёзды | HEAD | Лицензия и наблюдение |
|---|---:|---|---|
| [Hack-with-Github/Awesome-Hacking](https://github.com/Hack-with-Github/Awesome-Hacking) | 123599 | b2bb13aa69b4f568a1bab0cbb17b7a00a350dc36 | LICENSE: CC0-1.0. README — карта списков. Корень: README, LICENSE, contributing, .github и изображение; это не учебник с проверяемыми лабораториями. |
| [The-Art-of-Hacking/h4cker](https://github.com/The-Art-of-Hacking/h4cker) | 29909 | 3d3b25374899aff0046a1ebed60a7675a6b1dd9d | MIT, Omar Santos. Прочитаны README и build-your-own-lab/README. Структура: cybersecurity-domains, build-your-own-lab, ai, training-reference. Упражнения и автоматизация из него не запускались. |
| [sundowndev/hacker-roadmap](https://github.com/sundowndev/hacker-roadmap) | 15670 | 22de5f91d83d990828c38fa0d9117f71055cd9b4 | MIT. README и ссылки дают маршрут обучения; это не готовая система проверки действий ученика. |
| [meirwah/awesome-incident-response](https://github.com/meirwah/awesome-incident-response) | 9500 | 94c6f534a16da29cc2f11517cca82cffe72cd4b3 | Apache-2.0. Разделы Evidence Collection, Log Analysis, Books, Playbooks. В .github есть проверка ссылок; это не runtime-проверка всех перечисленных инструментов. |
| [PacktPublishing/Digital-Forensics-with-Kali-Linux](https://github.com/PacktPublishing/Digital-Forensics-with-Kali-Linux) | 104 | b62d07c85c13ffcb1fd02bf16ee6771cedc523df | MIT (c) 2017 Packt, для материалов репозитория. Прочитаны README, Chapter07/7.txt и Chapter10/10.txt. Корень содержит Chapter07–10, LICENSE, README; в главах ссылки и архивы образцов. Это материалы к книге, не полная бесплатная книга. Бинарные дампы/архивы не скачивались. |

Дополнительно проверен ckjbug/kali-Linux-learning (741 звезда): README и корень с PDF/старыми ссылками, лицензия репозитория не определена. Не выбран для копирования или рекомендации скачать книги. То же касается неофициальных зеркал Kali Linux Revealed без ясных прав.

Два TXT Packt оказались ссылками на внешние учебные образы, не текстом глав книги. Поэтому нельзя утверждать, что полная книга прочитана. Для собственного сценария использованы общие темы: целостность улик, хронология, восстановление и понятный отчёт. Все конкретные файлы и вопросы разработаны для Kairon.

Внешние программы не устанавливались из этих репозиториев. Для каждой упомянутой утилиты первичным источником служит официальная документация, а не случайный рецепт в подборке.

## Первичные инструкции

- [Готовый VirtualBox-образ Kali](https://www.kali.org/docs/virtualization/import-premade-virtualbox/): распаковка, Add → .vbox, kali/kali.
- [Скачать Kali](https://www.kali.org/get-kali/), [проверка образов](https://www.kali.org/docs/introduction/download-official-kali-linux-images/), [актуальные стартовые данные](https://www.kali.org/docs/introduction/default-credentials/). Архивная страница kali-linux-default-passwords с root/toor отвергнута как устаревшая.
- [Tor: установка в Linux](https://support.torproject.org/tor-browser/getting-started/installing/): распаковка .tar.xz, start-tor-browser.desktop, запуск обычным пользователем.
- [Mozilla: Firefox в Linux](https://support.mozilla.org/en-US/kb/install-firefox-linux).
- [Kali: Nmap](https://www.kali.org/tools/nmap/), [выбор портов](https://nmap.org/book/man-port-specification.html).
- [Kali: Wireshark](https://www.kali.org/tools/wireshark/).
- [Python HTTP server](https://docs.python.org/3/library/http.server.html): учебная локальная основа, не публичный production server.
- [EICAR](https://www.eicar.org/download-anti-malware-testfile/), [ClamAV: сканирование](https://docs.clamav.net/manual/Usage/Scanning.html).
- [Kali Linux Revealed / OffSec](https://kali.training/): официальная страница на дату проверки называет KLR бесплатным курсом, доступ может требовать аккаунт. Платные подписки не требуются для Kairon.

Загрузка страницы VirtualBox Downloads и отдельных разделов справки через поисковый инструмент вернула ошибку; ссылка сохранена как официальный адрес, подтверждённый документацией Kali. Не заявляется, что мастер установки VirtualBox проверен вручную на машине пользователя.
