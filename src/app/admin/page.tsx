import { requireUser } from "@/lib/access";
import { redirect } from "next/navigation";
export default async function RetiredAccountPage() {
  await requireUser();
  redirect("/study-plan");
}
