import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page-container empty-state">
      <span className="eyebrow">404 / OFF THE MAP</span>
      <h1>Страница не найдена</h1>
      <p>Page not found</p>
      <Link href="/" className="subtle-link">
        На главную / Home →
      </Link>
    </div>
  );
}
