import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import audit from "../../../../content/source-audits/pocket-hacker.json";
import { getCourseLessons } from "@/lib/lessons";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Как проверили канал «Карманный хакер»" };

const corrections = [
  {
    topic: "Платный профиль не подтверждает личность",
    text: "Возраст аккаунта, страна номера, фотографии и подписка не доказывают, что человек заслуживает доверия. Проверяй сам запрос и связывайся по уже известному контакту.",
    post: 242,
    source:
      "https://www.cisa.gov/secure-our-world/recognize-and-report-phishing",
    label: "CISA: распознавание фишинга",
  },
  {
    topic: "Tor не обещает полной невидимости",
    text: "Tor Browser защищает маршрут своего трафика. Вход в личный аккаунт и переданные данные всё равно могут раскрывать личность; остальные программы не становятся анонимными автоматически.",
    post: 252,
    source:
      "https://support.torproject.org/tor-browser/getting-started/about-tor-browser/",
    label: "Tor Project: возможности браузера",
  },
  {
    topic: "SMS и приложение с кодами имеют ограничения",
    text: "SMS может участвовать в многофакторном входе, но этот способ слабее устойчивых к фишингу методов. Наличие одноразового кода само по себе не защищает от поддельного сайта.",
    post: 9,
    source: "https://pages.nist.gov/800-63-4/sp800-63b.html",
    label: "NIST: аутентификаторы и фишинг",
  },
  {
    topic: "Запись в конфигурации ещё не доказывает настройку",
    text: "У OpenSSH часто используется первое полученное значение параметра. Поэтому файл с названием 99-… не гарантирует отключение паролей. Проверять нужно эффективную конфигурацию и способы входа, не теряя запасной доступ.",
    post: 255,
    source: "https://man.openbsd.org/sshd_config",
    label: "OpenSSH: порядок чтения настроек",
  },
  {
    topic: "CVSS и EPSS отвечают на разные вопросы",
    text: "CVSS описывает техническую тяжесть. EPSS оценивает вероятность наблюдаемой эксплуатации в ближайшие 30 дней, а не вероятность взлома именно твоей компании. Приоритет зависит и от доступности системы, данных, эксплуатации и защитных мер.",
    post: 249,
    source: "https://www.first.org/epss/",
    label: "FIRST: что оценивает EPSS",
  },
  {
    topic: "200 OK не равнозначен найденной уязвимости",
    text: "Нужны права тестового пользователя, владелец объекта и фактически полученные данные. Код ответа или читаемая часть токена без такой проверки не доказывают обход доступа.",
    post: 269,
    source: "https://portswigger.net/web-security/access-control/idor",
    label: "PortSwigger: проверка доступа к объектам",
  },
  {
    topic: "Удалить ключ из текста недостаточно",
    text: "Опубликованный рабочий секрет сначала отзывают или меняют. Затем убирают источник утечки и разбирают копии по правилам хранения. В публичный анализатор нельзя отправлять рабочие токены и документы без оценки данных и разрешения.",
    post: 264,
    source:
      "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository",
    label: "GitHub: действия при утечке",
  },
];

export default function PocketHackerSourcePage() {
  const course = getCourseLessons("blue-team");
  return (
    <div className="page-container document-page source-review-page">
      <Link href="/paths/blue-team" className="back-link">
        <ArrowLeft size={16} />
        Безопасность в компании
      </Link>
      <span className="eyebrow">РАЗБОР ИСТОЧНИКА И СВЕЖИЕ КЕЙСЫ · ОКТЯБРЬ–НОЯБРЬ 2026</span>
      <h1>Что взяли из «Карманный хакер» и свежие разборы канала</h1>
      <p className="lead">
        Канал{" "}
        <a href={audit.channel} target="_blank" rel="noreferrer">
          @PocketHackerOne
          <ExternalLink size={15} />
        </a>{" "}
        (приглашение в канал:{" "}
        <a
          href="https://t.me/+WkwxUkuswtY2ZTQ6"
          target="_blank"
          rel="noreferrer"
        >
          t.me/+WkwxUkuswtY2ZTQ6
          <ExternalLink size={15} />
        </a>
        ) подсказал темы для курса по работе аналитика безопасности в компании и
        дал живые кейсы для уроков с 1 по 60 день. Учебные объяснения простыми
        словами, пошаговые проверки и файлы мы подготовили специально для
        Kairon, а технические правила сверили с первичной документацией.
      </p>
      <div className="learning-stats source-review-stats">
        <article>
          <strong>{audit.public_post_count}</strong>
          <span>записей базового аудита</span>
        </article>
        <article>
          <strong>{audit.readable_text_posts}</strong>
          <span>текстовых записей просмотрено</span>
        </article>
        <article>
          <strong>{course.length}</strong>
          <span>дел в курсе компании</span>
        </article>
      </div>
      <section className="notice">
        <ShieldCheck size={22} />
        <div>
          <h2>Границы просмотра и новые материалы октября 2026</h2>
          <p>
            Базовый индекс охватывает 13 страниц веб-истории (с 24 августа 2025
            по 24 октября 2026), а в октябре–ноябре 2026 года мы дополнительно
            интегрировали в уроки Kairon новые разборы из канала и архива автора:
            технический разбор цепочки эксплойтов <strong>BlueMoon</strong> (по
            отчёту Proofpoint), детальный разбор квиза про{" "}
            <strong>IDOR и статус 200 OK</strong>, дискуссию про{" "}
            <strong>бытовую приватность против полной анонимности</strong>,
            видеоурок по <strong>базовой разведке сайта в PortSwigger</strong> и
            обзор <strong>50 вакансий на рынке ИБ</strong>.
          </p>
          <p>
            Все практические упражнения выполняются локально и безопасно внутри
            твоей учебной Kali Linux.
          </p>
        </div>
      </section>
      <h2 className="resources-heading">
        Свежие разборы и кейсы канала (октябрь 2026)
      </h2>
      <div className="resource-list">
        <article>
          <h3>
            1. BlueMoon: связка уязвимостей Chrome (V8) и Windows (LPE), которую
            за несколько дней подхватили 4 APT-группировки
          </h3>
          <p>
            В разборе из архива канала (на основе исследования Proofpoint от 9
            сентября 2026 года) по шагам показано, как работает современный
            эксплойт-кит <strong>BlueMoon</strong>. Жертве достаточно открыть
            ссылку из письма в не обновлённом вовремя браузере на базе Chromium,
            после чего срабатывает цепочка из четырёх шагов:{" "}
            <strong>(1)</strong> письмо со ссылкой → <strong>(2)</strong> две
            уязвимости движка V8 (<code>CVE-2026-85046</code> — путаница типов /
            type confusion и <code>CVE-2026-87491</code> — побег из песочницы V8
            через WebAssembly) → <strong>(3)</strong> повышение привилегий (LPE)
            в ядре Windows (<code>CVE-2026-85880</code>, работает на сборках
            Windows 10 1809 и 2004–22H2, Windows Server 2019/2022 и первом
            выпуске Windows 11 21H2) → <strong>(4)</strong> тихая загрузка
            полезной нагрузки штатной утилитой{" "}
            <code>curl -sS -o &quot;%TEMP%\msgbox.exe&quot;</code>.
          </p>
          <p>
            <strong>Почему это сработало («patch gap»):</strong> исправление
            ошибки V8 появилось в открытом коде Chromium за 4 недели до того, как
            оно дошло до стабильных релизов браузеров Chrome и Edge. Кроме того,
            в коде эксплойта исследователи нашли яркие признаки разработки с
            помощью ИИ: подробные отладочные логи на английском (
            <code>please send the full log back</code>), упоминание файла
            передачи дел <code>docs/v8-ctf-chrome-stage4-handover.md</code> и
            ключ <code>v8ctf_exp_attempt</code> в <code>sessionStorage</code>.
          </p>
          <p>
            <strong>Кто использовал набор и какие следы искать в SOC:</strong>{" "}
            группировка <strong>TA412 (APT31)</strong> устанавливала поддельное
            расширение Chrome под видом «Google Gemini» (<code>GemStone</code>) в
            папку <code>C:\Users\Public\stomp_ext</code>, подделывая HMAC-подпись{" "}
            <code>super_mac</code> в файле <code>Secure Preferences</code>;{" "}
            <strong>UNK_LateNight</strong> загружала бэкдор{" "}
            <code>ShadowPad</code> через <code>DLL sideloading</code> и создавала
            задачу планировщика <code>EdgeCore_AutoUpdate</code>;{" "}
            <strong>UNK_DoubleCheck</strong> разворачивала загрузчик на{" "}
            <code>Rust</code> с задачами{" "}
            <code>MicrosoftEdgeUpdatesTaskMachine</code> и{" "}
            <code>Avpcheckup</code>; <strong>UNK_QuietRacket</strong> получала
            адреса серверов управления через TXT-записи{" "}
            <code>Google DNS-over-HTTPS (DoH)</code> и закреплялась через задачу{" "}
            <code>GeForceService</code>. Главный индикатор в логах процессов:{" "}
            <code>chrome.exe → cmd.exe → curl.exe → msgbox.exe</code>.
          </p>
          <div className="source-check-links">
            <Link href="/learn/company-patch-priority">
              День 39: приоритет патчей и patch gap →
            </Link>
            <Link href="/learn/analysis-yara">
              День 45: правило YARA MAL_BlueMoon_ExploitKit →
            </Link>
            <Link href="/learn/tools-hmac">
              День 25: как TA412 подделывала HMAC в Chrome →
            </Link>
            <a
              href="https://www.proofpoint.com/us/blog/threat-insight/once-bluemoon-multiple-state-aligned-threat-actors-rapidly-adopt-novel-exploit"
              target="_blank"
              rel="noreferrer"
            >
              Отчёт Proofpoint (оригинал)
              <ExternalLink size={13} />
            </a>
          </div>
        </article>
        <article>
          <h3>
            2. Разбор квиза по API: почему 200 OK при смене /api/orders/104 на
            105 — это «Пока неизвестно», а не доказанный IDOR
          </h3>
          <p>
            В канале прошёл показательный опрос на 184 человека: «Ты тестируешь
            API, меняешь <code>GET /api/orders/104</code> на <code>105</code> и
            получаешь статус <code>200 OK</code>. Это уязвимость IDOR?». Лишь 33%
            выбрали правильный ответ — <strong>«Пока неизвестно»</strong>. Почему
            нельзя писать отчёт об уязвимости только по коду <code>200 OK</code>?
            Потому что статус <code>200 OK</code> говорит лишь о том, что сервер
            технически обработал HTTP-запрос. Внутри тела ответа может оказаться:
            (а) твой же собственный второй заказ №105, (б) пустой объект{" "}
            <code>{`{}`}</code> или текст{" "}
            <code>{`{"status": "access_denied"}`}</code>, (в) общедоступная
            справочная карточка товара.
          </p>
          <p>
            Настоящая уязвимость <strong>IDOR</strong> доказана только тогда,
            когда ты глазами проверил тело ответа (JSON) и подтвердил, что под
            аккаунтом Пользователя А сервер вернул приватные данные заказа,
            принадлежащего Пользователю Б. При этом код{" "}
            <code>403 Forbidden</code> (или <code>404 Not Found</code> для чужого
            ID) означает, что защита сработала штатно, а сам IDOR встречается в
            любых HTTP-методах (<code>GET</code>, <code>POST</code>,{" "}
            <code>PUT</code>, <code>DELETE</code>).
          </p>
          <div className="source-check-links">
            <Link href="/learn/company-idor-evidence">
              День 40: проверка IDOR без ложной тревоги →
            </Link>
            <Link href="/learn/web-shop-baskets">
              День 56: чужая корзина в Juice Shop →
            </Link>
            <Link href="/learn/web-authorization">
              День 59: как чинят проверку владельца в коде →
            </Link>
          </div>
        </article>
        <article>
          <h3>
            3. Бытовая приватность против мифа о «полной анонимности в сети»
          </h3>
          <p>
            Отдельный большой разбор канала посвящён трезвому взгляду на
            приватность в 2026 году. Когда мы пользуемся смартфоном и
            экосистемами (Яндекс, Apple, Xiaomi, Google), сервисы собирают
            огромный пласт телеметрии: от геолокации, времени поездок и пищевых
            привычек до истории поисковых запросов и сетевых подключений у
            интернет-провайдера. Пытаться достичь «абсолютной стопроцентной
            анонимности» в обычной жизни — значит отказаться от банковских карт,
            доставки, смартфона и госуслуг.
          </p>
          <p>
            Поэтому в курсе мы чётко разделяем <strong>миф о невидимости</strong>{" "}
            и <strong>разумную цифровую гигиену</strong>: использование{" "}
            <code>Tor Browser</code> защищает маршрут конкретного окна браузера,
            но не делает невидимыми остальные программы на компьютере и не
            скрывает личность, если ты сам вошёл в личный аккаунт.
          </p>
          <div className="source-check-links">
            <Link href="/learn/tor-browser">
              День 5: Tor Browser и бытовая приватность →
            </Link>
            <a
              href="https://t.me/+WkwxUkuswtY2ZTQ6"
              target="_blank"
              rel="noreferrer"
            >
              Читать обсуждение в канале
              <ExternalLink size={13} />
            </a>
          </div>
        </article>
        <article>
          <h3>
            4. Базовая веб-разведка (PortSwigger Academy), обзор 50 вакансий в
            ИБ и архив материалов
          </h3>
          <p>
            В октябре 2026 года на канале вышли новые практические материалы для
            новичков: совместный с <code>@Arakcheev_R</code> видеоразбор базовой
            разведки сайта с пошаговым прохождением лабораторной работы из{" "}
            <strong>PortSwigger Web Security Academy</strong>, честный разбор 50
            актуальных вакансий в ИБ (почему работодатели ждут не слепого запуска
            сканеров, а понимания сетей, Linux, логов и кода) и структурированный
            архив материалов (книги, курсы, платформы, репозитории и переводы
            исследований вроде BlueMoon).
          </p>
          <div className="source-check-links">
            <a
              href="https://youtu.be/3Pal2X7mXqc"
              target="_blank"
              rel="noreferrer"
            >
              YouTube: базовая разведка сайта и лаба PortSwigger
              <ExternalLink size={13} />
            </a>
            <a
              href="https://youtube.com/shorts/xME1L9RVev0"
              target="_blank"
              rel="noreferrer"
            >
              Shorts: внутрянка поиска работы в ИБ (50 вакансий)
              <ExternalLink size={13} />
            </a>
            <a
              href="https://vt.tiktok.com/ZSgPsKmhD/"
              target="_blank"
              rel="noreferrer"
            >
              TikTok: обзор вакансий и опыта в ИБ
              <ExternalLink size={13} />
            </a>
            <a
              href="https://t.me/PocketHackerOne/270"
              target="_blank"
              rel="noreferrer"
            >
              Пост об архиве в Telegram
              <ExternalLink size={13} />
            </a>
            <a
              href="https://paywall.pw/krxayarn0exj"
              target="_blank"
              rel="noreferrer"
            >
              Архив «Карманного хакера»
              <ExternalLink size={13} />
            </a>
          </div>
        </article>
      </div>
      <h2 className="resources-heading">Из тем — в практику</h2>
      <p className="program-note">
        Новые задания разыгрываются в вымышленной компании. Журналы и адреса
        созданы для упражнений. На настоящую инфраструктуру подключаться не
        нужно.
      </p>
      <div className="source-lesson-list">
        {course.map((lesson) => {
          const references = lesson.resources.filter((resource) =>
            resource.url.startsWith("https://t.me/PocketHackerOne/"),
          );
          return (
            <article key={lesson.id}>
              <div>
                <h3>
                  <Link href={"/learn/" + lesson.id}>
                    {lesson.title}
                    <ArrowRight size={16} />
                  </Link>
                </h3>
                <p>{lesson.summary}</p>
              </div>
              <div className="source-post-links">
                {references.map((resource) => (
                  <a
                    href={resource.url}
                    key={resource.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Пост {resource.url.split("/").at(-1)}
                    <ExternalLink size={13} />
                  </a>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      <h2 className="resources-heading">Какие выводы требуют осторожности</h2>
      <div className="resource-list">
        {corrections.map((item) => (
          <article key={item.post}>
            <h3>{item.topic}</h3>
            <p>{item.text}</p>
            <div className="source-check-links">
              <a
                href={"https://t.me/PocketHackerOne/" + item.post}
                target="_blank"
                rel="noreferrer"
              >
                Исходная тема
                <ExternalLink size={13} />
              </a>
              <a href={item.source} target="_blank" rel="noreferrer">
                {item.label}
                <ExternalLink size={13} />
              </a>
            </div>
          </article>
        ))}
      </div>
      <h2 className="resources-heading">Что не стало заданиями</h2>
      <p className="program-note">
        Реклама, оценки зарплат, неподтверждённые цифры и личные мнения не
        выдаются за правила для всех компаний. Скрытые кейлоггеры, помехи чужим
        сетям, обход защиты и «розыгрыши» не добавлены. Вместо них — поиск
        следов, проверка разрешений и восстановление на собственных данных.
      </p>
      <details className="source-index">
        <summary>
          Указатель всех {audit.public_post_count} доступных записей
        </summary>
        <p>
          Темы ниже — редакционные метки для навигации, не заголовки автора и не
          одобрение каждого совета.
        </p>
        <div className="source-index-grid">
          {audit.posts.map((post) => (
            <a key={post.id} href={post.url} target="_blank" rel="noreferrer">
              <span>#{post.id}</span>
              <span>{post.topic}</span>
              <small>{post.date?.slice(0, 10)}</small>
            </a>
          ))}
        </div>
      </details>
      <div className="course-actions">
        <Button asChild>
          <Link href="/learn/soc-first-shift">
            Начать первую смену
            <ArrowRight size={16} />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/paths/blue-team">Вся программа</Link>
        </Button>
      </div>
    </div>
  );
}
