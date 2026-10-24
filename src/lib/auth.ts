import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { hash } from "bcryptjs";
import { z } from "zod";
import { findSessionUser, getDatabase, withUser } from "@/lib/db";
import { isValidPassword, verifyPassword } from "@/lib/password";
import { consumeLoginAttempt } from "@/lib/rate-limit";

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL &&
    process.env.AUTH_SECRET &&
    process.env.AUTH_SECRET.length >= 32,
  );
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().refine(isValidPassword),
});

type LoginUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: "ADMIN" | "USER";
  blocked: boolean;
  sessionVersion: number;
};

// Проверка неизвестного аккаунта тоже выполняет bcrypt. Это не учетная запись.
let dummyHash: Promise<string> | undefined;

const nextAuth = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(input) {
        if (!isAuthConfigured()) return null;
        const parsed = credentialsSchema.safeParse(input);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        if (!(await consumeLoginAttempt(email))) return null;
        const rows = await getDatabase().$queryRaw<
          LoginUser[]
        >`SELECT * FROM public.kairon_lookup_login(${email})`;
        const user = rows[0];
        dummyHash ??= hash("kairon-timing-placeholder-never-a-user", 12);
        const correct = await verifyPassword(
          password,
          user?.passwordHash ?? (await dummyHash),
        );
        if (!user || !correct || user.blocked) return null;
        await withUser(user.id, (tx) =>
          tx.auditLog.create({
            data: { userId: user.id, action: "AUTH_SIGN_IN" },
          }),
        );
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.sessionVersion = user.sessionVersion;
      }
      if (!token.sub || !isAuthConfigured()) return null;
      const current = await findSessionUser(token.sub);
      if (
        !current ||
        current.blocked ||
        current.sessionVersion !== token.sessionVersion
      )
        return null;
      token.role = current.role;
      token.name = current.name;
      token.email = current.email;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role === "ADMIN" ? "ADMIN" : "USER";
      session.user.sessionVersion =
        typeof token.sessionVersion === "number" ? token.sessionVersion : 0;
      return session;
    },
  },
  logger: {
    // Не отправляем вложенные ошибки драйвера или DSN в публичные логи.
    error(error) {
      console.error("[auth]", error.name);
    },
  },
});

export const { auth, signIn, signOut, handlers } = nextAuth;
