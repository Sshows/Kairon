export function GET() {
  return Response.json(
    {
      error: "Аккаунты отключены. Прогресс сохраняется в браузере.",
      next: "/study-plan",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
