import { version } from "../../../../package.json";
export async function GET() {
  return Response.json(
    { status: "ok", service: "kairon-web", stage: 1, version },
    { headers: { "Cache-Control": "no-store" } },
  );
}
