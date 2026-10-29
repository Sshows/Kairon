import { describe, expect, it } from "vitest";
import {
  dayPlan,
  learningDays,
  learningStages,
  getLearningDay,
  getLessonDay,
  getLearningStage,
  totalDays,
  totalPlannedMinutes,
} from "../src/lib/day-plan";
import { lessons, getLesson } from "../src/lib/lessons";

describe("one complete beginner route", () => {
  it("places every published lesson exactly once in a continuous 60-day sequence", () => {
    expect(learningDays).toHaveLength(60);
    expect(learningDays.map((day) => day.day)).toEqual(
      Array.from({ length: 60 }, (_, index) => index + 1),
    );
    const ids = learningDays.flatMap((day) => day.lessonIds);
    expect(ids).toHaveLength(lessons.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(lessons.map((lesson) => lesson.id)));
    expect(dayPlan.totalLessons).toBe(lessons.length);
    expect(totalDays).toBe(learningDays.length);
  });

  it("starts with actual setup and public official downloads before terminology and tools", () => {
    const first = getLearningDay(1)!;
    expect(first.lessonIds).toEqual(["kali-install"]);
    expect(
      first.resources.map((resource) => new URL(resource.url).hostname),
    ).toEqual(["www.kali.org", "www.virtualbox.org", "www.7-zip.org"]);
    expect(getLessonDay("lab-files")!.day).toBeLessThan(
      getLessonDay("suspicious-file")!.day,
    );
    expect(getLessonDay("basics-ip")!.day).toBeLessThan(
      getLessonDay("tools-nmap")!.day,
    );
    expect(getLessonDay("tools-start")!.day).toBeLessThan(
      getLessonDay("tools-file")!.day + 1,
    );
    expect(getLessonDay("tools-hash")!.day).toBeLessThan(
      getLessonDay("tools-hashcat")!.day,
    );
    expect(getLessonDay("web-shop-start")!.day).toBe(50);
    expect(getLessonDay("web-csrf")!.day).toBe(60);
  });

  it("derives honest daily time from the lessons and includes a concrete preparation and outcome", () => {
    for (const day of learningDays) {
      expect(day.lessonIds.length, String(day.day)).toBeGreaterThan(0);
      expect(day.lessonIds.length, String(day.day)).toBeLessThanOrEqual(2);
      const actual = day.lessonIds.reduce(
        (sum, id) => sum + getLesson(id)!.minutes,
        0,
      );
      expect(day.minutes, String(day.day)).toBe(actual);
      expect(day.minutes).toBeGreaterThanOrEqual(40);
      expect(day.minutes).toBeLessThanOrEqual(120);
      expect(day.title.length).toBeGreaterThan(10);
      expect(day.summary.length).toBeGreaterThan(80);
      expect(day.goal.length).toBeGreaterThan(35);
      expect(day.outcome.length).toBeGreaterThan(35);
      expect(day.prepare.length).toBeGreaterThan(0);
      expect(getLearningStage(day.stageId)).toBeDefined();
    }
    expect(totalPlannedMinutes).toBe(
      lessons.reduce((sum, lesson) => sum + lesson.minutes, 0),
    );
    expect(totalPlannedMinutes).toBe(4218);
    expect(dayPlan.dailyGuidance).toContain("перерывы");
    expect(dayPlan.calendarGuidance).toContain("12 недель");
  });

  it("partitions the route into eight stages without gaps and rejects unknown lookups", () => {
    expect(learningStages).toHaveLength(8);
    const stageDays = learningStages.flatMap((stage) => {
      const days = learningDays.filter((day) => day.stageId === stage.id);
      expect(days[0].day).toBe(stage.firstDay);
      expect(days.at(-1)!.day).toBe(stage.lastDay);
      return days.map((day) => day.day);
    });
    expect(stageDays).toEqual(learningDays.map((day) => day.day));
    expect(getLearningDay(0)).toBeUndefined();
    expect(getLearningDay(61)).toBeUndefined();
    expect(getLearningDay(1.5)).toBeUndefined();
    expect(getLearningDay(Number.NaN)).toBeUndefined();
    expect(getLessonDay("unknown")).toBeUndefined();
    expect(getLearningStage("unknown")).toBeUndefined();
  });
});
