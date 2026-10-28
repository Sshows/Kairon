export async function GET() {
  return Response.json(
    { status: "ok", service: "kairon-web", stage: 1, version: "0.9.0" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
