import { AccountForm } from "@/components/account-form";
export const metadata = { title: "Вход и регистрация" };
export default function LoginPage() {
  return (
    <div className="account-page">
      <AccountForm />
    </div>
  );
}
