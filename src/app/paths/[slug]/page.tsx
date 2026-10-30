import { notFound, redirect } from "next/navigation";
import { StarterPath } from "@/components/starter-path";
import { getLearningPath, learningPaths } from "@/lib/learning-paths";
import { paths } from "@/lib/curriculum";

export function generateStaticParams() {
  return learningPaths.map((path) => ({ slug: path.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const path = getLearningPath(slug);
  return {
    title: path ? path.title : "Раздел обучения",
  };
}

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
