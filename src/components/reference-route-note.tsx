import Link from "next/link";

export function ReferenceRouteNote() {
  return (
    <aside className="program-note" aria-label="Дополнительные материалы">
      <p>
        Это справочник: сюда можно вернуться, когда понадобится определённая
        тема. Для первого знакомства всё уже расставлено по порядку в маршруте
        по дням — выбирать между разделами сейчас не нужно.
      </p>
      <Link href="/study-plan" className="subtle-link">
        Вернуться к маршруту по дням →
      </Link>
    </aside>
  );
}
