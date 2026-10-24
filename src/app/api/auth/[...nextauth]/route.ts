import { handlers, isAuthConfigured } from "@/lib/auth";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

function unavailable() {
  return Response.json(
    { error: "Авторизация ещё не настроена." },
    { status: 503 },
  );
}

export function GET(request: NextRequest) {
  return isAuthConfigured() ? handlers.GET(request) : unavailable();
}

export function POST(request: NextRequest) {
  return isAuthConfigured() ? handlers.POST(request) : unavailable();
}
