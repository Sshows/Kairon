import { cookies } from "next/headers";
export { copy } from "./i18n-client";
export type { Locale } from "./i18n-client";
import type { Locale } from "./i18n-client";
export async function getLocale(): Promise<Locale> {
  return (await cookies()).get("kairon-locale")?.value === "en" ? "en" : "ru";
}
