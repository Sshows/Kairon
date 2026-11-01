import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isPublicRoute, safeReturnTo } from "@/lib/access-policy";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (isPublicRoute(path)) return NextResponse.next();

  // This cheap check rejects anonymous requests before rendering. Every page,
  // API and file handler also checks the current account in PostgreSQL; this
  // proxy is not the authority for blocking/revocation or private data.
  const secret = process.env.AUTH_SECRET;
  const token =
    secret && secret.length >= 32
      ? await getToken({
          req: request,
          secret,
          secureCookie: request.nextUrl.protocol === "https:",
        })
      : null;
  if (!token?.sub) {
    const isData =
      path.startsWith("/api/") ||
      path.startsWith("/downloads/") ||
      path.startsWith("/labs/") ||
      path.startsWith("/images/");
    const target = new URL("/login", request.url);
    target.searchParams.set("next", safeReturnTo(path));
    const response = isData
      ? NextResponse.json(
          { error: "Войдите в аккаунт, чтобы открыть материалы." },
          { status: 401 },
        )
      : NextResponse.redirect(target);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", "Cookie");
    return response;
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
