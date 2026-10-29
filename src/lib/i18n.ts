export { copy } from "./i18n-client";
export type { Locale } from "./i18n-client";
import type { Locale } from "./i18n-client";
// The beginner learning route is published in Russian.
export async function getLocale(): Promise<Locale> {
  return "ru";
}
