import "server-only";
import nodemailer from "nodemailer";

function localMailTest() {
  return (
    !process.env.VERCEL &&
    process.env.KAIRON_TEST_MAIL === "1" &&
    process.env.AUTH_URL === "http://localhost:3000"
  );
}
export function isMailConfigured() {
  return (
    localMailTest() ||
    Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD)
  );
}
export async function sendAccountCode(
  to: string,
  code: string,
  purpose: "register" | "reset",
) {
  if (!isMailConfigured()) throw new Error("Mail is not configured");
  const transporter = localMailTest()
    ? nodemailer.createTransport({
        host: "127.0.0.1",
        port: 2526,
        secure: false,
        ignoreTLS: true,
      })
    : nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD?.replace(/\s/g, ""),
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
  const action =
    purpose === "register" ? "подтверждения почты" : "восстановления пароля";
  await transporter.sendMail({
    from: {
      name: "Kairon",
      address: localMailTest() ? "kairon@example.test" : process.env.SMTP_USER!,
    },
    to,
    subject: `Kairon — код ${action}`,
    text: `Код ${action} в Kairon: ${code}\n\nВведите его на странице, где вы запросили письмо. Код действует 10 минут и используется один раз. После пяти неверных попыток потребуется новый код.\n\nНикому не пересылайте этот код. Если вы не запрашивали письмо, просто проигнорируйте его.\n\nKairon — бесплатное обучение кибербезопасности.`,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}
