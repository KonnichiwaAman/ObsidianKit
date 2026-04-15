import { useMemo, useState } from "react";
import { GraduationCap, Plus, Trash2 } from "lucide-react";

interface Course {
  id: number;
  name: string;
  credits: string;
  grade: string;
}

const GRADE_POINTS: Record<string, number> = {
  "A+": 4.0,
  A: 4.0,
  "A-": 3.7,
  "B+": 3.3,
  B: 3.0,
  "B-": 2.7,
  "C+": 2.3,
  C: 2.0,
  "C-": 1.7,
  "D+": 1.3,
  D: 1.0,
  F: 0,
};

const GRADE_OPTIONS = Object.keys(GRADE_POINTS);

export default function GpaCalculator() {
  const [courses, setCourses] = useState<Course[]>([
    { id: 1, name: "", credits: "3", grade: "A" },
    { id: 2, name: "", credits: "3", grade: "B+" },
  ]);

  const summary = useMemo(() => {
    let totalCredits = 0;
    let totalPoints = 0;
    let validCourseCount = 0;

    for (const course of courses) {
      const credits = Number.parseFloat(course.credits);
      const gradePoint = GRADE_POINTS[course.grade];
      if (!Number.isFinite(credits) || credits <= 0 || gradePoint === undefined) {
        continue;
      }

      totalCredits += credits;
      totalPoints += credits * gradePoint;
      validCourseCount += 1;
    }

    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

    return {
      totalCredits,
      totalPoints,
      gpa,
      validCourseCount,
    };
  }, [courses]);

  function updateCourse(id: number, patch: Partial<Course>) {
    setCourses((current) =>
      current.map((course) => (course.id === id ? { ...course, ...patch } : course)),
    );
  }

  function addCourse() {
    setCourses((current) => [
      ...current,
      {
        id: Date.now(),
        name: "",
        credits: "3",
        grade: "A",
      },
    ]);
  }

  function removeCourse(id: number) {
    setCourses((current) => current.filter((course) => course.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Current GPA</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{summary.gpa.toFixed(3)}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Total Credits</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{summary.totalCredits.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Quality Points</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{summary.totalPoints.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Counted Courses</p>
          <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{summary.validCourseCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <GraduationCap className="h-4 w-4 text-[var(--color-text-secondary)]" />
            Courses
          </div>
          <button
            onClick={addCourse}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Course
          </button>
        </div>

        <div className="space-y-2">
          {courses.map((course) => (
            <div
              key={course.id}
              className="grid grid-cols-1 gap-2 rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] p-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
            >
              <input
                type="text"
                value={course.name}
                onChange={(event) => updateCourse(course.id, { name: event.target.value })}
                placeholder="Course name (optional)"
                className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
              />
              <input
                type="number"
                min="0"
                step="0.5"
                value={course.credits}
                onChange={(event) => updateCourse(course.id, { credits: event.target.value })}
                placeholder="Credits"
                className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
              />
              <select
                value={course.grade}
                onChange={(event) => updateCourse(course.id, { grade: event.target.value })}
                className="rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-3 py-2 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-hover)]"
              >
                {GRADE_OPTIONS.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade} ({GRADE_POINTS[grade].toFixed(1)})
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeCourse(course.id)}
                disabled={courses.length === 1}
                className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-2 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
                aria-label="Remove course"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-4 py-3">
        <p className="text-xs text-[var(--color-text-muted)]">
          GPA is calculated as total quality points divided by total attempted credits using a 4.0 scale.
        </p>
      </div>
    </div>
  );
}
