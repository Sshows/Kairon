import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, isAuthConfigured } from "@/lib/auth";
import { findSessionUser, withUser } from "@/lib/db";

export const getCurrentUser = cache(async () => {
  if (!isAuthConfigured()) return null;
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await findSessionUser(session.user.id);
  if (
    !user ||
    user.blocked ||
    user.sessionVersion !== session.user.sessionVersion
  )
    return null;
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/** Вызывать из Server Action после requireUser; принимать только user.id сессии. */
export async function acceptEthics(userId: string) {
  const user = await requireUser();
  if (user.id !== userId) throw new Error("Forbidden");
  return withUser(user.id, async (tx) => {
    const result = await tx.user.update({
      where: { id: user.id },
      data: { ethicsAcceptedAt: new Date() },
    });
    await tx.auditLog.create({
      data: { userId: user.id, action: "ETHICS_ACCEPTED_V1" },
    });
    return result.ethicsAcceptedAt;
  });
}
