import { serveMemberFile } from "@/lib/member-files";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return serveMemberFile("downloads", (await params).path);
}
