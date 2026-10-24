import { getCurrentUser } from "@/lib/access";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  return Response.json(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      ethicsAcceptedAt: user.ethicsAcceptedAt,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
