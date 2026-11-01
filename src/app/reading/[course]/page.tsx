import { notFound, permanentRedirect } from "next/navigation";
import { requireUser } from "@/lib/access";
import { getBookCourse } from "@/lib/book-courses";
import { getLessonDay } from "@/lib/day-plan";
type Props = { params: Promise<{ course: string }> };
export default async function BookCourse({ params }: Props) {
  await requireUser();
  const course = getBookCourse((await params).course);
  const day = course && getLessonDay(course.lessons[0].id);
  if (!day) notFound();
  permanentRedirect(`/days/${day.day}`);
}
