import { AccountProfile } from "@/components/account-profile";
export const metadata = {
  title: "Мой прогресс",
  robots: { index: false, follow: false },
};
export default function ProfilePage() {
  return (
    <div className="account-page">
      <AccountProfile />
    </div>
  );
}
