import { permanentRedirect } from "next/navigation";
import { requireUser } from "@/lib/access";
export default async function ReadingPage() {
  await requireUser();
  permanentRedirect("/study-plan");
}
