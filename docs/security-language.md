# Инструменты и атаки простыми словами — 0.17

По дополнительному запросу пользователя добавлено направление
`/reading/security-language`: John the Ripper, MITM, Metasploit и инъекции.
Это учебные объяснения, не экзамен на 50 вопросов. В конце можно раскрыть
самостоятельный разбор вопроса; экзаменационная оценка не выставляется.
Вместе с книжным продолжением теперь шесть направлений и 14 занятий.

В четырёх новых материалах раскрыты:

- John: офлайн-кандидаты/формат/словари/pot, отличие от онлайн-попыток входа,
  соль и функции хранения паролей. Для самостоятельного опыта создаются свой
  SHA-256 и три известные строки, а не используются данные реальных аккаунтов.
- MITM: положение посредника, ARP/DNS/proxy как разные способы влияния на путь,
  открытый HTTP, ограничения точки захвата, доверие сертификатам и границы TLS.
  Практика — собственный loopback HTTP и чтение потока в Wireshark.
- Metasploit: auxiliary/exploit/payload/post/session/CVE, консоль, метаданные
  модуля, RHOSTS/RPORT/SSL и пределы определения версии. Используется только
  HTTP Version Detection на своём 127.0.0.1:8767.
- Инъекции: исполняемые локальные примеры SQLite, безопасного HTML-вывода и
  передачи отдельного аргумента процессу. Объяснены SSTI/LDAP/NoSQL и отличия
  SSRF/CSRF. Контекст исправления связан с конкретным интерпретатором.

Официальные источники проверены 1 ноября 2026:
[Kali John](https://www.kali.org/tools/john/),
[Openwall Options](https://www.openwall.com/john/doc/OPTIONS.shtml),
[Metasploit modules](https://docs.metasploit.com/docs/using-metasploit/basics/using-metasploit.html),
[правила выбора модуля](https://docs.metasploit.com/docs/using-metasploit/basics/how-to-use-a-metasploit-module-appropriately.html),
[исходник HTTP-модуля](https://github.com/rapid7/metasploit-framework/blob/master/modules/auxiliary/scanner/http/http_version.rb),
[OWASP MITM](https://community.owasp.org/attacks/Manipulator-in-the-middle_attack),
[Python sqlite3](https://docs.python.org/3/library/sqlite3.html),
[Python subprocess](https://docs.python.org/3/library/subprocess.html).

В словарь добавлены четыре полных определения с жизненными примерами.
Раздел инструментов и словарь ведут к подробным занятиям. Связанные базовые
уроки также показывают продолжение. Защита регистрации остаётся серверной.

Python-тесты исполняют SQL/HTML/аргументные примеры на временных данных;
предыдущие шесть проверок продолжают выполняться. Консоли John и Metasploit
в этой локальной Windows-сессии не запускались: команды сверены со справками,
а сетевое поведение выбранного HTTP-модуля дополнительно с исходником.
Полного обещания совместимости со всеми сборками John не делается; в уроке
показана проверка доступных форматов и типовые сообщения разных сборок.

Результаты сборки, браузера, CI и публикации фиксируются после завершения.
