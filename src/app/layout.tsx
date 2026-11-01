import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { getLocale } from "@/lib/i18n";
import { LearningAccountProvider } from "@/components/learning-account";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Kairon — кибербезопасность по дням",
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
  const locale = await getLocale();
  return (
    <html lang={locale} className="dark">
      <body>
        <a className="skip-link" href="#main-content">
          {locale === "ru" ? "Перейти к содержимому" : "Skip to content"}
        </a>
        <LearningAccountProvider>
          <Shell>{children}</Shell>
        </LearningAccountProvider>
      </body>
    </html>
  );
}
