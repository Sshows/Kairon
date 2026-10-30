export async function GET() {
  return Response.json(
    { status: "ok", service: "kairon-web", stage: 1, version: "0.13.0" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
