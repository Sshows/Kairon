import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { getLocale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/access";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Kairon — кибербезопасность с нуля",
    template: "%s · Kairon",
  },
  description:
    "Учебная платформа по кибербезопасности: Kali Linux, сети, веб-безопасность и расследования. Подробные объяснения с примерами и практика на своём компьютере.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, user] = await Promise.all([getLocale(), getCurrentUser()]);
  return (
    <html lang={locale} className="dark">
      <body>
        <a className="skip-link" href="#main-content">
          {locale === "ru" ? "Перейти к содержимому" : "Skip to content"}
        </a>
        <Shell locale={locale} user={user}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
