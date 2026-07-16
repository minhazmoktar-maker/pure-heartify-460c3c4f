import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Circle, Clock, GraduationCap } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import SectionHeader from "@/components/SectionHeader";
import { LEARNING_PATHS, LEARNING_CATEGORIES, type Course } from "@/data/learningPaths";

const KEY = "learn:completed";

function loadCompleted(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}
function saveCompleted(v: Record<string, string[]>) {
  localStorage.setItem(KEY, JSON.stringify(v));
}

const Learn = () => {
  const [completed, setCompleted] = useState<Record<string, string[]>>(loadCompleted);
  const [cat, setCat] = useState<(typeof LEARNING_CATEGORIES)[number]>("All");
  const [openCourse, setOpenCourse] = useState<Course | null>(null);

  const filtered = useMemo(
    () => (cat === "All" ? LEARNING_PATHS : LEARNING_PATHS.filter((c) => c.category === cat)),
    [cat],
  );

  const toggleLesson = (courseId: string, lessonId: string) => {
    const cur = new Set(completed[courseId] || []);
    cur.has(lessonId) ? cur.delete(lessonId) : cur.add(lessonId);
    const next = { ...completed, [courseId]: [...cur] };
    setCompleted(next);
    saveCompleted(next);
  };

  const courseProgress = (c: Course) => {
    const done = (completed[c.id] || []).length;
    return { done, total: c.lessons.length, pct: Math.round((done / c.lessons.length) * 100) };
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Learning Paths — Islamic Mini-Courses | Heartify"
        description="Structured beginner courses in Aqeedah, Fiqh, Qur'an, Seerah and Akhlaq — with per-lesson progress tracking."
        path="/learn"
      />
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        {!openCourse ? (
          <>
            <SectionHeader
              title="Learning Paths"
              description="Short, structured mini-courses. Read a lesson, mark it done, keep going."
              icon={GraduationCap}
              className="mb-6"
            />


            <div className="mb-5 flex flex-wrap gap-2">
              {LEARNING_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`rounded-pill border px-3 py-1 text-micro font-medium transition ${
                    cat === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-secondary"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((course) => {
                const p = courseProgress(course);
                return (
                  <button
                    key={course.id}
                    onClick={() => setOpenCourse(course)}
                    className="group flex flex-col rounded-card border border-border bg-card p-5 text-left transition hover:border-primary hover:shadow-md"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-pill bg-primary/10 px-2 py-0.5 text-micro font-medium text-primary">
                        {course.category}
                      </span>
                      <span className="text-micro text-muted-foreground">{course.level}</span>
                    </div>
                    <h2 className="font-heading text-heading font-semibold text-foreground group-hover:text-primary">
                      {course.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.summary}</p>
                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-micro text-muted-foreground">
                        <span>{p.done} / {p.total} lessons</span>
                        <span>{p.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-pill bg-secondary">
                        <div className="h-full bg-primary transition-all" style={{ width: `${p.pct}%` }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setOpenCourse(null)}
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> All courses
            </button>

            <header className="mb-6">
              <span className="rounded-pill bg-primary/10 px-2 py-0.5 text-micro font-medium text-primary">
                {openCourse.category} · {openCourse.level}
              </span>
              <h1 className="mt-2 font-heading text-title font-bold text-foreground">{openCourse.title}</h1>
              <p className="mt-1 text-muted-foreground">{openCourse.summary}</p>
            </header>

            <ol className="space-y-3">
              {openCourse.lessons.map((lesson, i) => {
                const done = (completed[openCourse.id] || []).includes(lesson.id);
                return (
                  <li
                    key={lesson.id}
                    className={`rounded-card border p-5 transition ${
                      done ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2 text-micro text-muted-foreground">
                          <span>Lesson {i + 1}</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {lesson.minutes} min read
                          </span>
                        </div>
                        <h3 className="font-heading text-base font-semibold text-foreground">
                          {lesson.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {lesson.body}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleLesson(openCourse.id, lesson.id)}
                        aria-label={done ? "Mark as not done" : "Mark as done"}
                        className="shrink-0 rounded-pill p-2 hover:bg-secondary"
                      >
                        {done ? (
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </main>
    </div>
  );
};

export default Learn;
