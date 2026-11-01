import { requireUser } from "@/lib/access";
import { AccountProfile } from "@/components/account-profile";
import { learningDays } from "@/lib/day-plan";
export const metadata = {
  title: "Мой прогресс",
  robots: { index: false, follow: false },
};
export default async function ProfilePage() {
  await requireUser();
  return (
    <div className="account-page">
      <AccountProfile
        learningDays={learningDays.map(({ day, title, lessonIds }) => ({
          day,
          title,
          lessonIds,
        }))}
      />
    </div>
  );
}
