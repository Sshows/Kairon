// Public application routes are deliberately enumerated. A file extension or
// an unknown/new route never grants public access.
const publicRoutes = new Set([
  "/login",
  "/privacy",
  "/api/account",
  "/api/me",
  "/api/health",
  "/api/auth/csrf",
  "/api/auth/session",
  "/api/auth/providers",
  "/api/auth/signin",
  "/api/auth/signout",
  "/api/auth/error",
  "/api/auth/callback/credentials",
  "/icon.svg",
  "/favicon.ico",
]);

export function isPublicRoute(pathname: string) {
  return publicRoutes.has(pathname) || pathname.startsWith("/_next/static/");
}

export function safeReturnTo(value: unknown) {
  if (typeof value !== "string" || !/^\/(?:[a-zA-Z0-9_-]+\/?)*$/.test(value))
    return "/study-plan";
  if (/^\/(?:api|_next|login|privacy|downloads|labs|images)(?:\/|$)/.test(value))
    return "/study-plan";
  return value;
}
