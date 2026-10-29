import { notFound, redirect } from "next/navigation";
import { StarterPath } from "@/components/starter-path";
import { getLearningPath } from "@/lib/learning-paths";
import { paths } from "@/lib/curriculum";

export default async function PathPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const path = getLearningPath(slug);
  if (path) return <StarterPath pathId={path.id} />;
  if (paths.some((entry) => entry.slug === slug)) redirect("/study-plan");
  notFound();
}
