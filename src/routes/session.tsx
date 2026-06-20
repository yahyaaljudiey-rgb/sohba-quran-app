import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ReviewBadge } from "@/components/Badges";
import { allParticipants, getGroups, isAdmin, monthlyReviewKey } from "@/lib/sohba-data";
import { useSohbaStore } from "@/lib/store";

export const Route = createFileRoute("/session")({
  head: () => ({
    meta: [
      { title: "جلسة التسميع — صُحبة القرآن" },
      { name: "description", content: "تقييم الشيخ لجلسة التسميع وتسجيل الأخطاء والملاحظات" },
    ],
  }),
  component: SessionPage,
});

const grades = ["ممتاز", "جيد جدًا", "جيد", "يحتاج تثبيت", "إعادة"] as const;
const errorTypes = ["خطأ في الحفظ", "خطأ تجويدي", "تردد", "نسيان", "ضعف ربط"];

function SessionPage() {
  const { today, currentUser, effectiveDailyRecords, monthlySheikhReviews, saveMonthlySheikhReview } = useSohbaStore();
  const list = allParticipants(effectiveDailyRecords, today);
  const [pid, setPid] = useState(list[0].id);
  const [mode, setMode] = useState<"online" | "in_person">("in_person");
  const [grade, setGrade] = useState<(typeof grades)[number]>("جيد جدًا");
  const [errs, setErrs] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  if (!isAdmin(currentUser)) {
    return <AppLayout><div className="rounded-2xl border border-[color:var(--gold)]/40 bg-card p-6 text-sm text-muted-foreground">هذه الصفحة خاصة بمسؤول البرنامج.</div></AppLayout>;
  }

  const groups = getGroups(effectiveDailyRecords, today);
  const p = list.find((x) => x.id === pid) ?? list[0];
  const g = groups.find((gg) => gg.id === p.groupId) ?? groups[0];
  const monthlyReview = monthlySheikhReviews[monthlyReviewKey(pid, today)];

  const toggleErr = (e: string) =>
    setErrs((s) => (s.includes(e) ? s.filter((x) => x !== e) : [...s, e]));

  return (
    <AppLayout>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-[color:var(--green-deep)]">تسميع الشيخ الشهري</h1>
        <p className="text-sm text-muted-foreground">جلسة شهرية واحدة لكل طالب في شهر {today.hijriMonthName} {today.hijriYear}هـ.</p>
      </header>

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

        <div className="mt-5">
          <div className="mb-2 text-sm text-muted-foreground">أنواع الأخطاء</div>
          <div className="flex flex-wrap gap-2">
            {errorTypes.map((e) => {
              const on = errs.includes(e);
              return (
                <button
                  key={e}
                  onClick={() => toggleErr(e)}
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
    </AppLayout>
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