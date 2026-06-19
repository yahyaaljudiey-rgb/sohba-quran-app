import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ReviewBadge, StatusBadge } from "@/components/Badges";
import { getEffectiveRecordForDay, participantReports, REVIEW_LABEL, dayRelativeLabel, selectableProgramDays, statusForParticipantOnDay, visibleParticipantIdsFor, type DailyRecordPatch, type ParticipantStatus, type ReviewType } from "@/lib/sohba-data";
import { useSohbaStore } from "@/lib/store";
import { BookOpen, CheckCircle2, Copy, Mic, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/pair-review")({
  head: () => ({
    meta: [
      { title: "مراجعة الأقران — صُحبة القرآن" },
      { name: "description", content: "متابعة التسميع اليومي بين كل ثنائي" },
    ],
  }),
  component: PairReviewPage,
});

type Filter = "all" | "done" | "pending" | "late" | "redo" | "quarter" | "half";

function PairReviewPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [copied, setCopied] = useState<string | null>(null);
  const { today, currentUser, effectiveDailyRecords, updateDailyRecord } = useSohbaStore();
  const dayOptions = selectableProgramDays(today);
  const [selectedDay, setSelectedDay] = useState(dayOptions[0].absoluteDay);
  const visibleIds = visibleParticipantIdsFor(currentUser);
  const list = participantReports(effectiveDailyRecords, today).filter((p) => visibleIds.includes(p.id));
  const currentAbsoluteDay = today.absoluteDay;
  const isFutureDay = selectedDay > currentAbsoluteDay;

  const filtered = useMemo(() => {
    return list.filter((p) => {
      const selectedStatus = statusForParticipantOnDay(p, selectedDay);
      switch (filter) {
        case "done": return selectedStatus === "recited";
        case "pending": return ["idle", "wird_done", "ready"].includes(selectedStatus);
        case "late": return selectedStatus === "late";
        case "redo": return selectedStatus === "redo";
        case "quarter": return p.reviewType === "quarter";
        case "half": return p.reviewType === "half";
        default: return true;
      }
    });
  }, [filter, list, selectedDay]);

  const chips: { v: Filter; label: string }[] = [
    { v: "all", label: "الكل" },
    { v: "done", label: "رُفع الثنائي" },
    { v: "pending", label: "لم يكتمل" },
    { v: "late", label: "متأخر" },
    { v: "redo", label: "يحتاج إعادة" },
    { v: "quarter", label: "ربع حزب" },
    { v: "half", label: "نصف حزب" },
  ];

  const updateToday = (participantId: string, patch: DailyRecordPatch) =>
    updateDailyRecord(participantId, patch, selectedDay);

  const copyMessage = (name: string, type: ReviewType, status: ParticipantStatus) => {
    const msg = `السلام عليكم أخي ${name},\nتذكير بالتسميع اليومي بين النظيرين — ورد اليوم: ${REVIEW_LABEL[type]}.\nالحالة الحالية: ${status === "recited" ? "رُفع الثنائي بحمد الله" : "بانتظار اكتمال الورد والتسميع والرفع"}.\nبارك الله فيكم.`;
    navigator.clipboard?.writeText(msg);
    setCopied(name);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <AppLayout>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-[color:var(--green-deep)]">مراجعة الأقران</h1>
        <p className="text-sm text-muted-foreground">التسميع اليومي بين كل ثنائي. زر الشيخ الشهري مستقل في جلسة التسميع.</p>
      </header>

      <div className="mb-4 rounded-2xl border border-[color:var(--gold)]/40 bg-card p-4">
        <label className="text-sm text-muted-foreground">اليوم المراد تسجيله</label>
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(Number(e.target.value))}
          className="mt-2 w-full rounded-xl border border-[color:var(--gold)]/40 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[color:var(--green-deep)]"
        >
          {dayOptions.map((day) => (
            <option key={day.absoluteDay} value={day.absoluteDay} disabled={day.absoluteDay > currentAbsoluteDay}>
              {day.dateLabel}{dayRelativeLabel(day.absoluteDay) ? ` — ${dayRelativeLabel(day.absoluteDay)}` : day.absoluteDay > currentAbsoluteDay ? " — قادم" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.v}
            onClick={() => setFilter(c.v)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              filter === c.v
                ? "border-[color:var(--green-deep)] bg-[color:var(--green-deep)] text-[color:var(--gold)]"
                : "border-[color:var(--gold)]/40 bg-white/60 text-[color:var(--green-deep)] hover:bg-[color:var(--gold)]/10"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[color:var(--gold)]/40 bg-card">
        <ul className="divide-y divide-[color:var(--gold)]/20">
          {filtered.map((p) => {
            const today = getEffectiveRecordForDay(p.id, selectedDay);
            const selectedStatus = statusForParticipantOnDay(p, selectedDay);
            const actions = [
              {
                label: "وردي",
                icon: BookOpen,
                patch: today?.wirdDone ? { wirdDone: false, listenedToPeer: false, uploaded: false } : { wirdDone: true },
                active: Boolean(today?.wirdDone),
              },
              {
                label: "سمعت له",
                icon: Mic,
                patch: today?.listenedToPeer ? { listenedToPeer: false, uploaded: false } : { wirdDone: true, listenedToPeer: true },
                active: Boolean(today?.listenedToPeer),
              },
              {
                label: "رفعت",
                icon: CheckCircle2,
                patch: today?.uploaded ? { uploaded: false } : { wirdDone: true, listenedToPeer: true, uploaded: true },
                active: Boolean(today?.uploaded),
              },
              { label: "إعادة", icon: RotateCcw, patch: { needsRedo: !today?.needsRedo }, active: Boolean(today?.needsRedo) },
            ];
            return (
              <li key={p.id} className="px-4 py-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-display text-lg text-[color:var(--green-deep)]">{p.name}</div>
                    <div className="text-xs text-muted-foreground">نظيره: {p.partnerName} · {p.groupName}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ReviewBadge type={p.reviewType} />
                      <StatusBadge status={selectedStatus} />
                    </div>
                  </div>
                  <button
                    onClick={() => copyMessage(p.name, p.reviewType, p.status)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--green-soft)]/50 bg-[color:var(--green-soft)]/10 px-2.5 py-1.5 text-xs text-[color:var(--green-deep)] hover:bg-[color:var(--green-soft)]/20"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied === p.name ? "تم النسخ" : "رسالة"}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {actions.map((a) => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.label}
                        onClick={() => updateToday(p.id, a.patch)}
                        disabled={isFutureDay}
                        className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          a.active
                            ? "border-[color:var(--green-deep)] bg-[color:var(--green-deep)] text-[color:var(--gold)]"
                            : "border-[color:var(--gold)]/40 bg-white/60 text-[color:var(--green-deep)] hover:bg-[color:var(--gold)]/10"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{a.label}</span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">لا توجد نتائج</li>
          )}
        </ul>
      </div>
    </AppLayout>
  );
}
