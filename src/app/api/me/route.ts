import { getCurrentUser } from "@/lib/access";
import { getAccountProgress } from "@/lib/account-progress";
import { privateJson, accountFailure } from "@/lib/account-http";
import { isMailConfigured } from "@/lib/email";
import { isAuthConfigured } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await getCurrentUser();
    return privateJson({
      user: user ? { id: user.id, email: user.email, name: user.name } : null,
      progress: user ? await getAccountProgress(user.id) : null,
      registrationAvailable: isAuthConfigured() && isMailConfigured(),
    });
  } catch (error) {
    return accountFailure(error);
  }
}
