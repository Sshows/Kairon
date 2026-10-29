import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Hexagon,
  Home,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

type Props = { children: React.ReactNode };
export function Shell({ children }: Props) {
  return (
    <div className="app-shell focused-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Kairon — главная">
          <span className="brand-icon">
            <Hexagon size={29} />
            <span>K</span>
          </span>
          <strong>
            kairon<span>_</span>
          </strong>
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
