import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Home,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

type Props = { children: React.ReactNode };
export function Shell({ children }: Props) {
  return (
    <div className="app-shell focused-shell">
      <div className="liquid-ambient" aria-hidden="true">
        <span className="liquid-orb liquid-orb-a" />
        <span className="liquid-orb liquid-orb-b" />
        <span className="liquid-orb liquid-orb-c" />
      </div>
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Kairon — главная">
          <span className="brand-icon" aria-hidden="true">
            <svg
              viewBox="0 0 44 44"
              width="36"
              height="36"
              fill="none"
              className="brand-logo-svg"
            >
              <defs>
                <linearGradient
                  id="kairon-crest-grad"
                  x1="4"
                  y1="4"
                  x2="40"
                  y2="40"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#d9ff7a" />
                  <stop offset="48%" stopColor="#4be89b" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
                <linearGradient
                  id="kairon-crest-surface"
                  x1="6"
                  y1="4"
                  x2="38"
                  y2="40"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#132530" stopOpacity="0.92" />
                  <stop offset="100%" stopColor="#091118" stopOpacity="0.96" />
                </linearGradient>
                <linearGradient
                  id="kairon-crest-shine"
                  x1="10"
                  y1="6"
                  x2="34"
                  y2="24"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <rect
                x="2.5"
                y="2.5"
                width="39"
                height="39"
                rx="13"
                fill="url(#kairon-crest-surface)"
                stroke="url(#kairon-crest-grad)"
                strokeWidth="1.5"
              />
              <path
                d="M9 8.5C15.5 5.5 28.5 5.5 35 8.5C30 15 14 15 9 8.5Z"
                fill="url(#kairon-crest-shine)"
              />
              <path
                d="M14.5 12.5V31.5M14.5 22L25.5 12.5M18.8 18.4L29.5 31.5"
                stroke="url(#kairon-crest-grad)"
                strokeWidth="3.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="29.5" cy="13" r="2.4" fill="#d9ff7a" />
            </svg>
          </span>
          <span className="brand-wordmark" aria-hidden="true">
            <strong>
              Kairon<span>.</span>
            </strong>
            <small className="brand-sub">cyber flow</small>
          </span>
        </Link>
        <div className="sidebar-scroll">
          <p className="nav-caption">ШАГ ЗА ШАГОМ</p>
          <nav aria-label="Главная навигация">
            <Link href="/" className="nav-link">
              <Home size={18} />
              Главная
            </Link>
            <Link href="/study-plan" className="nav-link">
              <CalendarDays size={18} />
              План по дням
            </Link>
            <Link href="/materials" className="nav-link">
              <BookOpen size={18} />
              Дополнительные материалы
            </Link>
          </nav>
          <div className="simple-sidebar-help">
            <p>Впервые здесь?</p>
            <span>
              Начни с первого дня. В каждом занятии уже указан следующий шаг.
            </span>
          </div>
          <nav className="quiet-nav" aria-label="Помощь">
            <Link href="/glossary" className="nav-link">
              <HelpCircle size={17} />
              Непонятное слово
            </Link>
            <Link href="/ethics" className="nav-link">
              <ShieldCheck size={17} />
              Правила практики
            </Link>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <span className="status-dot" />
          <span>Всё обучение бесплатно</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">Кибербезопасность с первого дня</span>
          <span className="free-learning-label">Без регистрации</span>
        </header>
        <main id="main-content">{children}</main>
        <footer className="footer">
          <span>© {new Date().getFullYear()} Kairon · Бесплатные уроки</span>
          <div className="simple-footer-actions">
            <a
              href="https://github.com/Sshows/Kairon"
              target="_blank"
              rel="noreferrer"
            >
              GitHub <ArrowUpRight size={13} />
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
