export async function GET() {
  return Response.json(
    { status: "ok", service: "kairon-web", stage: 0, version: "0.1.0" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
