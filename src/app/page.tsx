import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Check,
  Code2,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Catalog } from "@/components/catalog";
import { Button } from "@/components/ui/button";
import { copy, getLocale } from "@/lib/i18n";
export default async function Home() {
  const locale = await getLocale(),
    t = copy[locale];
  return (
    <div className="page-container">
      <div className="welcome-line">
        <span>{t.freeStart}</span>
        <span className="version-pill">
          <span />
          {t.stage}
        </span>
      </div>
      <section className="hero">
        <div className="hero-content">
          <div className="hero-kicker">
            <span className="tiny-line" />
            HELLO, EXPLORER
          </div>
          <h1>
            {t.heroTitle.split("\n").map((line, i) => (
              <span key={line} className={i === 1 ? "accent" : ""}>
                {line}
              </span>
            ))}
          </h1>
          <p>{t.heroBody}</p>
          <div className="hero-actions">
            <Button asChild>
              <Link href="/learn/kali-install">
                {t.heroAction}
                <ArrowDown size={17} />
              </Link>
            </Button>
            <Link href="#how-it-works" className="subtle-link">
              {t.heroSecondary}
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="hero-footnote">
            <ShieldCheck size={14} />
            {locale === "ru"
              ? "Уроки открыты без регистрации"
              : "Lessons open without an account"}
            <span>·</span>
            {locale === "ru"
              ? "Твой темп. Твой путь."
              : "Your pace. Your path."}
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbital orbital-1" />
          <div className="orbital orbital-2" />
          <div className="orbital orbital-3" />
          <div className="orbit-cross horizontal" />
          <div className="orbit-cross vertical" />
          <div className="orbit-core">
            <Code2 size={52} strokeWidth={1} />
          </div>
          <span className="orbit-node node-a">
            <Terminal size={17} />
          </span>
          <span className="orbit-node node-b">
            <ShieldCheck size={17} />
          </span>
          <span className="orbit-node node-c">
            <Check size={16} />
          </span>
          <span className="visual-coordinate coord-a">SYS.00 / INITIALIZE</span>
          <span className="visual-coordinate coord-b">
            [ LEARN → BUILD → DEFEND ]
          </span>
          <span className="visual-coordinate coord-c">55° / KAIRON</span>
        </div>
      </section>
      <Catalog locale={locale} />
      <section id="how-it-works" className="how-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE METHOD</span>
            <h2>
              {locale === "ru"
                ? "Меньше шума. Больше понимания."
                : "Less noise. More understanding."}
            </h2>
          </div>
          <span className="section-number">01 — 03</span>
        </div>
        <div className="method-grid">
          {[
            { icon: BookOpen, title: t.format, body: t.formatBody },
            {
              icon: Terminal,
              title:
                locale === "ru"
                  ? "Сайт рядом, практика в Kali"
                  : "Read here, practice in Kali",
              body:
                locale === "ru"
                  ? "Запусти готовую Kali. Выполни шаги на своём компьютере. Сравни результат с примером и проверь, что понял."
                  : "Launch a ready-made Kali VM. Follow the steps on your computer, compare results, and check your understanding.",
            },
            { icon: ShieldCheck, title: t.safe, body: t.safeBody },
          ].map((item, i) => (
            <article key={item.title} className="method-item">
              <span className="method-index">0{i + 1}</span>
              <item.icon size={23} strokeWidth={1.5} />
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="ethics-banner">
        <span className="ethics-symbol">
          <ShieldCheck size={24} />
        </span>
        <div>
          <h3>
            {locale === "ru"
              ? "Сильные навыки начинаются с ответственности."
              : "Strong skills start with responsibility."}
          </h3>
          <p>
            {locale === "ru"
              ? "Изучи правила до первой практики. Чужие системы — только с явным разрешением."
              : "Read the rules before your first lab. Test other systems only with explicit permission."}
          </p>
        </div>
        <Link href="/ethics">
          {t.ethics}
          <ArrowUpRight size={18} />
        </Link>
      </section>
    </div>
  );
}
