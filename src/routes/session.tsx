import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ReviewBadge } from "@/components/Badges";
import {
  allParticipants,
  getGroups,
  isAdmin,
  monthlyReviewKey,
  programWeekLabel,
  programWeekRef,
  recentProgramWeeks,
  weeklyRecitationKey,
  type Participant,
  type ProgramDay,
  type ProgramWeekRef,
} from "@/lib/sohba-data";
import { useSohbaStore } from "@/lib/store";

export const Route = createFileRoute("/session")({
  head: () => ({
    meta: [
      { title: "جلسة التسميع — صُحبة القرآن" },
      { name: "description", content: "سرد أسبوعي وتسميع شهري يسجلهما الشيخ لكل طالب" },
    ],
  }),
  component: SessionPage,
});

const grades = ["ممتاز", "جيد جدًا", "جيد", "يحتاج تثبيت", "إعادة"] as const;
const errorTypes = ["خطأ في الحفظ", "خطأ تجويدي", "تردد", "نسيان", "ضعف ربط"];

type SheikhTab = "weekly" | "monthly";

function SessionPage() {
  const { today, currentUser, effectiveDailyRecords } = useSohbaStore();
  const [tab, setTab] = useState<SheikhTab>("weekly");

  if (!isAdmin(currentUser)) {
    return <AppLayout><div className="rounded-2xl border border-[color:var(--gold)]/40 bg-card p-6 text-sm text-muted-foreground">هذه الصفحة خاصة بمسؤول البرنامج.</div></AppLayout>;
  }

  const list = allParticipants(effectiveDailyRecords, today);
  const groups = getGroups(effectiveDailyRecords, today);

  return (
    <AppLayout>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-[color:var(--green-deep)]">جلسات الشيخ</h1>
        <p className="text-sm text-muted-foreground">
          {tab === "weekly"
            ? "سرد أسبوعي لكل طالب على حدة — يظهر للطالب في تقريره."
            : `جلسة شهرية واحدة لكل طالب في شهر ${today.hijriMonthName} ${today.hijriYear}هـ.`}
        </p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:max-w-md">
        <ToggleBtn active={tab === "weekly"} onClick={() => setTab("weekly")}>السرد الأسبوعي</ToggleBtn>
        <ToggleBtn active={tab === "monthly"} onClick={() => setTab("monthly")}>التسميع الشهري</ToggleBtn>
      </div>

      {tab === "weekly"
        ? <WeeklyRecitationForm list={list} groups={groups} today={today} />
        : <MonthlyReviewForm list={list} groups={groups} today={today} />}
    </AppLayout>
  );
}

interface FormProps {
  list: Participant[];
  groups: ReturnType<typeof getGroups>;
  today: ProgramDay;
}

function WeeklyRecitationForm({ list, groups, today }: FormProps) {
  const { weeklySheikhRecitations, saveWeeklySheikhRecitation } = useSohbaStore();
  const weeks = recentProgramWeeks(8, today);
  const [pid, setPid] = useState(list[0].id);
  const [weekIndex, setWeekIndex] = useState(0);
  const [mode, setMode] = useState<"online" | "in_person">("in_person");
  const [portion, setPortion] = useState("");
  const [grade, setGrade] = useState<string>("جيد جدًا");
  const [errs, setErrs] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const week: ProgramWeekRef = weeks[Math.min(weekIndex, weeks.length - 1)] ?? programWeekRef(today);
  const key = weeklyRecitationKey(pid, week);
  const existing = weeklySheikhRecitations[key];

  // Switching student or week loads that سرد for editing instead of leaving the
  // previous entry's values in the form.
  const [loadedKey, setLoadedKey] = useState(key);
  if (loadedKey !== key) {
    setLoadedKey(key);
    setMode(existing?.mode ?? "in_person");
    setPortion(existing?.portion ?? "");
    setGrade(existing?.grade ?? "جيد جدًا");
    setErrs(existing?.errors ?? []);
    setNote(existing?.note ?? "");
    setSaved(false);
    setError(null);
  }

  const p = list.find((x) => x.id === pid) ?? list[0];
  const g = groups.find((gg) => gg.id === p.groupId) ?? groups[0];
  const toggleErr = (e: string) => setErrs((s) => (s.includes(e) ? s.filter((x) => x !== e) : [...s, e]));

  const save = async () => {
    setError(null);
    setSavingKey(key);
    try {
      await saveWeeklySheikhRecitation({ participantId: pid, ...week, mode, portion, grade, errors: errs, note });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر حفظ السرد، حاول مرة أخرى.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="rounded-3xl border border-[color:var(--gold)]/40 bg-card p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="الطالب">
          <select value={pid} onChange={(e) => setPid(e.target.value)} className={inputCls}>
            {list.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </Field>
        <Field label="الأسبوع">
          <select value={weekIndex} onChange={(e) => setWeekIndex(Number(e.target.value))} className={inputCls}>
            {weeks.map((w, index) => (
              <option key={weeklyRecitationKey("w", w)} value={index}>
                {programWeekLabel(w)}{index === 0 ? " (الأسبوع الحالي)" : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="المجموعة">
          <div className={`${inputCls} bg-muted/40`}>{g.name}</div>
        </Field>
        <Field label="ورد هذا الطالب">
          <div className="flex min-h-10 items-center rounded-xl border border-[color:var(--gold)]/40 bg-white/70 px-3 py-2">
            <ReviewBadge type={p.reviewType} />
          </div>
        </Field>

        <Field label="نوع السرد">
          <div className="grid grid-cols-2 gap-2">
            <ToggleBtn active={mode === "in_person"} onClick={() => setMode("in_person")}>حضوري</ToggleBtn>
            <ToggleBtn active={mode === "online"} onClick={() => setMode("online")}>أونلاين</ToggleBtn>
          </div>
        </Field>
        <Field label="المقدار المسرود">
          <input
            value={portion}
            onChange={(e) => setPortion(e.target.value)}
            placeholder="مثال: من الحزب ٣ إلى الحزب ٥"
            className={inputCls}
          />
        </Field>
      </div>

      {existing && (
        <div className="mt-4 rounded-2xl border border-[color:var(--status-done)]/30 bg-[color:var(--status-done)]/10 p-3 text-sm text-[color:var(--status-done)]">
          سُجّل سرد هذا الأسبوع لـ{p.name} بتقييم: {existing.grade} — أي حفظ جديد يُحدّث السجل نفسه.
        </div>
      )}

      <div className="ornamental-divider my-6"><span>۞</span></div>

      <div>
        <div className="mb-2 text-sm text-muted-foreground">تقييم السرد</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {grades.map((gr) => (
            <ToggleBtn key={gr} active={grade === gr} onClick={() => setGrade(gr)}>{gr}</ToggleBtn>
          ))}
        </div>
      </div>

      <ErrorTypePicker selected={errs} onToggle={toggleErr} />

      <div className="mt-5">
        <label className="text-sm text-muted-foreground">ملاحظات الشيخ على السرد</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="ملاحظات وتوجيه للطالب..."
          className="mt-1 w-full rounded-xl border border-[color:var(--gold)]/40 bg-white/70 p-3 text-sm outline-none focus:border-[color:var(--green-deep)]"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {error ? (
          <span className="text-sm text-[color:var(--status-redo)]">{error}</span>
        ) : saved ? (
          <span className="text-sm text-[color:var(--status-done)]">تم حفظ السرد بحمد الله ✓</span>
        ) : <span className="text-xs text-muted-foreground">{programWeekLabel(week)}</span>}
        <button
          onClick={save}
          disabled={savingKey === key}
          className="rounded-xl bg-[image:var(--gradient-hero)] px-6 py-2.5 text-sm font-semibold text-[color:var(--gold)] shadow-[var(--shadow-elegant)] disabled:opacity-60"
        >
          {savingKey === key ? "جارٍ الحفظ..." : existing ? "تحديث سرد الأسبوع" : "حفظ سرد الأسبوع"}
        </button>
      </div>
    </div>
  );
}

function MonthlyReviewForm({ list, groups, today }: FormProps) {
  const { monthlySheikhReviews, saveMonthlySheikhReview } = useSohbaStore();
  const [pid, setPid] = useState(list[0].id);
  const [mode, setMode] = useState<"online" | "in_person">("in_person");
  const [grade, setGrade] = useState<(typeof grades)[number]>("جيد جدًا");
  const [errs, setErrs] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const p = list.find((x) => x.id === pid) ?? list[0];
  const g = groups.find((gg) => gg.id === p.groupId) ?? groups[0];
  const monthlyReview = monthlySheikhReviews[monthlyReviewKey(pid, today)];

  const toggleErr = (e: string) => setErrs((s) => (s.includes(e) ? s.filter((x) => x !== e) : [...s, e]));

  return (
    <div className="rounded-3xl border border-[color:var(--gold)]/40 bg-card p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="المشارك">
          <select value={pid} onChange={(e) => setPid(e.target.value)} className={inputCls}>
            {list.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </Field>
        <Field label="المجموعة">
          <div className={`${inputCls} bg-muted/40`}>{g.name}</div>
        </Field>

        <Field label="نوع التسميع">
          <div className="grid grid-cols-2 gap-2">
            <ToggleBtn active={mode === "in_person"} onClick={() => setMode("in_person")}>حضوري</ToggleBtn>
            <ToggleBtn active={mode === "online"} onClick={() => setMode("online")}>أونلاين</ToggleBtn>
          </div>
        </Field>
        <Field label="ورد هذا الطالب">
          <div className="flex min-h-10 items-center rounded-xl border border-[color:var(--gold)]/40 bg-white/70 px-3 py-2">
            <ReviewBadge type={p.reviewType} />
          </div>
        </Field>
      </div>

      {monthlyReview && (
        <div className="mt-4 rounded-2xl border border-[color:var(--status-done)]/30 bg-[color:var(--status-done)]/10 p-3 text-sm text-[color:var(--status-done)]">
          تم تسجيل تسميع الشيخ لهذا الطالب في هذا الشهر بتقييم: {monthlyReview.grade}
        </div>
      )}

      <div className="ornamental-divider my-6"><span>۞</span></div>

      <div>
        <div className="mb-2 text-sm text-muted-foreground">تقييم الشيخ</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {grades.map((gr) => (
            <ToggleBtn key={gr} active={grade === gr} onClick={() => setGrade(gr)}>{gr}</ToggleBtn>
          ))}
        </div>
      </div>

      <ErrorTypePicker selected={errs} onToggle={toggleErr} />

      <div className="mt-5">
        <label className="text-sm text-muted-foreground">ملاحظات الشيخ</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="ملاحظات ودعاء للمسمِّع..."
          className="mt-1 w-full rounded-xl border border-[color:var(--gold)]/40 bg-white/70 p-3 text-sm outline-none focus:border-[color:var(--green-deep)]"
        />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        {saved ? (
          <span className="text-sm text-[color:var(--status-done)]">تم حفظ التقييم بحمد الله ✓</span>
        ) : <span />}
        <button
          onClick={async () => {
            await saveMonthlySheikhReview({ participantId: pid, mode, reviewType: p.reviewType, grade, errors: errs, note });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
          }}
          className="rounded-xl bg-[image:var(--gradient-hero)] px-6 py-2.5 text-sm font-semibold text-[color:var(--gold)] shadow-[var(--shadow-elegant)]"
        >
          {monthlyReview ? "تحديث تقييم الشهر" : "حفظ تقييم الشهر"}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-[color:var(--gold)]/40 bg-white/70 px-3 py-2 text-sm outline-none focus:border-[color:var(--green-deep)]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-sm text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function ErrorTypePicker({ selected, onToggle }: { selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-sm text-muted-foreground">أنواع الأخطاء</div>
      <div className="flex flex-wrap gap-2">
        {errorTypes.map((e) => {
          const on = selected.includes(e);
          return (
            <button
              key={e}
              onClick={() => onToggle(e)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                on
                  ? "border-[color:var(--status-redo)] bg-[color:var(--status-redo)]/15 text-[color:var(--status-redo)]"
                  : "border-[color:var(--gold)]/40 bg-white/60 text-[color:var(--green-deep)] hover:bg-[color:var(--gold)]/10"
              }`}
            >
              {e}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
        active
          ? "border-[color:var(--green-deep)] bg-[color:var(--green-deep)] text-[color:var(--gold)]"
          : "border-[color:var(--gold)]/40 bg-white/60 text-[color:var(--green-deep)] hover:bg-[color:var(--gold)]/10"
      }`}
    >
      {children}
    </button>
  );
}
