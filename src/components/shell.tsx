import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Compass,
  Hexagon,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
  Globe,
  LogOut,
  Monitor,
} from "lucide-react";
import { copy, type Locale } from "@/lib/i18n";
import { changeLocale, logout } from "@/app/actions";
import { Button } from "./ui/button";
type ShellUser = { name: string; role: "ADMIN" | "USER" } | null;
export function Shell({
  children,
  locale,
  user,
}: {
  children: React.ReactNode;
  locale: Locale;
  user: ShellUser;
}) {
  const t = copy[locale];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Kairon">
          <span className="brand-icon">
            <Hexagon size={29} />
            <span>K</span>
          </span>
          <strong>
            kairon<span>_</span>
          </strong>
        </Link>
        <div className="sidebar-scroll">
          <p className="nav-caption">{t.workspace}</p>
          <nav aria-label={t.workspace}>
            <Link href="/" className="nav-link">
              <LayoutGrid size={18} />
              {t.overview}
            </Link>
            <Link href="/#paths" className="nav-link">
              <Compass size={18} />
              {t.paths}
              <span className="nav-count">5</span>
            </Link>
            <Link href="/learn/kali-install" className="nav-link">
              <Monitor size={18} />
              {locale === "ru" ? "Запустить Kali" : "Set up Kali"}
            </Link>
            <Link href="/profile" className="nav-link">
              <UserRound size={18} />
              {t.profile}
            </Link>
            {user?.role === "ADMIN" && (
              <Link href="/admin" className="nav-link">
                <Wrench size={18} />
                {t.admin}
              </Link>
            )}
          </nav>
          <p className="nav-caption second">{t.resources}</p>
          <nav aria-label={t.resources}>
            <Link href="/projects" className="nav-link">
              <Wrench size={18} />
              {locale === "ru" ? "Проекты с нуля" : "Hands-on projects"}
            </Link>
            <Link href="/resources" className="nav-link">
              <BookOpen size={18} />
              {locale === "ru" ? "Книги и проекты" : "Books & projects"}
            </Link>
            <Link href="/sources/pocket-hacker" className="nav-link">
              <ShieldCheck size={18} />
              {locale === "ru" ? "Разбор источника" : "Source review"}
            </Link>
            <Link href="/glossary" className="nav-link">
              <BookOpen size={18} />
              {t.glossary}
            </Link>
            <Link href="/ethics" className="nav-link">
              <ShieldCheck size={18} />
              {t.ethics}
            </Link>
          </nav>
          <div className="mentor-card">
            <span className="mini-icon">
              <Sparkles size={18} />
            </span>
            <h3>{t.mentor}</h3>
            <p>{t.mentorBody}</p>
            <span className="muted-tag">{t.mentorStatus}</span>
          </div>
        </div>
        <div className="sidebar-bottom">
          <span className="status-dot" />
          <span>{t.foundation}</span>
          <span className="mono">v0.5</span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            <span>Kairon</span>
            <span className="slash">/</span>
            {t.learn}
          </span>
          <div className="topbar-actions">
            <form action={changeLocale}>
              <Button
                variant="ghost"
                size="sm"
                aria-label={
                  locale === "ru"
                    ? "Switch to English"
                    : "Переключить на русский"
                }
              >
                <Globe size={15} />
                {locale.toUpperCase()}
              </Button>
            </form>
            {user ? (
              <>
                <Link href="/profile" className="account-name">
                  {user.name}
                </Link>
                <form action={logout}>
                  <Button variant="ghost" size="icon" aria-label={t.logout}>
                    <LogOut size={17} />
                  </Button>
                </form>
              </>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href="/login">
                  {t.login}
                  <ArrowUpRight size={15} />
                </Link>
              </Button>
            )}
          </div>
        </header>
        <main id="main-content">{children}</main>
        <footer className="footer">
          <span>
            © {new Date().getFullYear()} Kairon{" "}
            <span className="footer-separator">·</span>
            {t.roadmap}
          </span>
          <a
            href="https://github.com/Sshows/Kairon"
            target="_blank"
            rel="noreferrer"
          >
            {t.sources}
            <ArrowUpRight size={13} />
          </a>
        </footer>
      </div>
    </div>
  );
}
