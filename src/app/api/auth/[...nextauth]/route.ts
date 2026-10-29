function retired() {
  return Response.json(
    {
      error: "Вход отключён. Все уроки открыты бесплатно.",
      next: "/study-plan",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
export const GET = retired;
export const POST = retired;
