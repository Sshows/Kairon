import { requireUser } from "@/lib/access";
import { permanentRedirect } from "next/navigation";

export default async function RetiredTerminalPage() {
  await requireUser();
  permanentRedirect("/learn/kali-install");
}
