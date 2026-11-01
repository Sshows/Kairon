import { notFound, permanentRedirect } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getBookLesson } from "@/lib/book-courses";
import { getLessonDay } from "@/lib/day-plan";
type Props = { params: Promise<{ course: string; lesson: string }> };
export default async function BookLesson({ params }: Props) {
  await requireUser();
  const { course, lesson } = await params;
  if (!getBookLesson(course, lesson) || !getLessonDay(lesson)) notFound();
  permanentRedirect(`/learn/${lesson}`);
}
