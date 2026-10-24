"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { isAuthConfigured, signIn, signOut } from "@/lib/auth";
import { requireUser, acceptEthics } from "@/lib/access";
export async function changeLocale() {
  const jar = await cookies();
  jar.set(
    "kairon-locale",
    jar.get("kairon-locale")?.value === "en" ? "ru" : "en",
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 31536000,
    },
  );
  revalidatePath("/", "layout");
}
export async function logout() {
  await signOut({ redirectTo: "/" });
}
export async function loginAction(
  _previous: { error: string } | null,
  formData: FormData,
) {
  if (!isAuthConfigured())
    return {
      error:
        "Вход пока недоступен. Обратитесь к администратору. / Sign-in is currently unavailable.",
    };
  const email = formData.get("email"),
    password = formData.get("password");
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.length > 254 ||
    password.length > 72
  )
    return { error: "Проверьте введённые данные. / Check your credentials." };
  try {
    await signIn("credentials", { email, password, redirectTo: "/profile" });
  } catch (error) {
    if (error instanceof AuthError)
      return {
        error:
          "Не удалось войти. Проверьте данные или попробуйте позже. / Unable to sign in. Check your details or try again later.",
      };
    throw error;
  }
  return null;
}
export async function acceptRules(formData: FormData) {
  const user = await requireUser();
  if (formData.get("accept") !== "on") return;
  await acceptEthics(user.id);
  redirect("/profile");
}
