import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "ADMIN" | "USER";
    sessionVersion: number;
  }
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: "ADMIN" | "USER";
      sessionVersion: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "ADMIN" | "USER";
    sessionVersion: number;
  }
}
