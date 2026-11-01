import { AccountForm } from "@/components/account-form";
import { safeReturnTo } from "@/lib/access-policy";
export const metadata = { title: "Вход и регистрация" };
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const returnTo = safeReturnTo((await searchParams).next);
  return (
    <div className="account-page">
      <AccountForm returnTo={returnTo} />
    </div>
  );
}
