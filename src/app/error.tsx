"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page-container empty-state">
      <h1>Не удалось загрузить страницу</h1>
      <p>Попробуй снова. Если ошибка повторится, обратись к администратору.</p>
      <button className="subtle-link" onClick={reset}>
        Повторить / Try again
      </button>
    </div>
  );
}
