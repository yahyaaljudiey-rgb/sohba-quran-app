import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ProgressBar, ReviewBadge, StatusBadge } from "@/components/Badges";
import { dailyCompletion, findRecordForDay, getGroups, getPartner, getWirdForLevelOnDay, isPairUploadedOnDay, participantReports, dayRelativeLabel, selectableProgramDays, statusForParticipantOnDay, visibleParticipantIdsFor, type DailyRecordPatch } from "@/lib/sohba-data";
import { useSohbaStore } from "@/lib/store";
import { BookOpen, CheckCircle2, Mic, RotateCcw, type LucideIcon } from "lucide-react";

export const Route = createFileRoute("/wird")({
  head: () => ({
    meta: [
      { title: "الورد اليومي — صُحبة القرآن" },
      { name: "description", content: "متابعة الورد اليومي وحالة الإنجاز لكل مشارك" },
    ],
  }),
  component: WirdPage,
});

function WirdPage() {
  const { today, currentUser, effectiveDailyRecords, updateDailyRecord } = useSohbaStore();
  const dayOptions = selectableProgramDays(today);
  const [selectedDay, setSelectedDay] = useState(dayOptions[0].absoluteDay);
  const visibleIds = visibleParticipantIdsFor(currentUser);
  const list = participantReports(effectiveDailyRecords, today).filter((p) => visibleIds.includes(p.id));
  const groups = getGroups(effectiveDailyRecords, today).filter((g) => g.participants.some((p) => visibleIds.includes(p.id)));
  const [selectedId, setSelectedId] = useState(list[0]?.id ?? "");

  const selected = list.find((p) => p.id === selectedId) ?? list[0];
  if (!selected) return <AppLayout><div className="rounded-2xl border border-[color:var(--gold)]/40 bg-card p-6 text-sm text-muted-foreground">اختر اسمك من نافذة الدخول أولًا.</div></AppLayout>;
  const group = groups.find((g) => g.id === selected.groupId) ?? groups[0];
  const partner = getPartner(selected.id);
  const selectedProgramDay = dayOptions.find((day) => day.absoluteDay === selectedDay) ?? dayOptions[0];
  const todayRecord = findRecordForDay(effectiveDailyRecords, selected.id, selectedDay);
  const pairUploaded = isPairUploadedOnDay(effectiveDailyRecords, group.id, selectedDay);
  const todayWird = getWirdForLevelOnDay(group.level, selectedDay);
  const status = statusForParticipantOnDay(selected, selectedDay, effectiveDailyRecords);
  const isFutureDay = selectedDay > today.absoluteDay;

  const updateToday = (patch: DailyRecordPatch) => updateDailyRecord(selected.id, patch, selectedDay);

  const actions: { label: string; patch: DailyRecordPatch; icon: LucideIcon; active: boolean }[] = [
    {
      label: "أنجزت وردي",
      patch: todayRecord?.wirdDone
        ? { wirdDone: false, listenedToPeer: false, uploaded: false }
        : { wirdDone: true },
      icon: BookOpen,
      active: Boolean(todayRecord?.wirdDone),
    },
    {
      label: "سمعت لنظيري",
      patch: todayRecord?.listenedToPeer
        ? { listenedToPeer: false, uploaded: false }
        : { wirdDone: true, listenedToPeer: true },
      icon: Mic,
      active: Boolean(todayRecord?.listenedToPeer),
    },
    {
      label: "رفعت اليوم",
      patch: todayRecord?.uploaded
        ? { uploaded: false }
        : { wirdDone: true, listenedToPeer: true, uploaded: true },
      icon: CheckCircle2,
      active: Boolean(todayRecord?.uploaded),
    },
    { label: "يحتاج إعادة", patch: { needsRedo: !todayRecord?.needsRedo }, icon: RotateCcw, active: Boolean(todayRecord?.needsRedo) },
  ];

  return (
    <AppLayout>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-[color:var(--green-deep)]">الورد اليومي</h1>
        <p className="text-sm text-muted-foreground">سجّل وردك اليومي وتسميعك لنظيرك ورفع اليوم.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-5">
        <aside className="rounded-2xl border border-[color:var(--gold)]/40 bg-card p-3">
          <div className="px-2 py-1 text-xs text-muted-foreground">المشارك</div>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[color:var(--gold)]/40 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[color:var(--green-deep)] lg:hidden"
          >
            {list.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ul className="mt-1 hidden max-h-[60vh] space-y-1 overflow-y-auto lg:block">
            {list.map((p) => {
              const active = p.id === selectedId;
              return (
                <li key={p.id}>
                  <button
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full rounded-xl px-3 py-2 text-right transition-colors ${
                      active
                        ? "bg-[color:var(--green-deep)] text-[color:var(--gold)]"
                        : "hover:bg-[color:var(--gold)]/10"
                    }`}
                  >
                    <div className="truncate text-sm">{p.name}</div>
                    <div className={`text-[11px] ${active ? "text-[color:var(--cream)]/70" : "text-muted-foreground"}`}>
                      {groups.find((g) => g.id === p.groupId)!.name}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="rounded-2xl border border-[color:var(--gold)]/40 bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{group.name}</div>
              <h2 className="truncate font-display text-xl text-[color:var(--green-deep)] sm:text-2xl">{selected.name}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <ReviewBadge type={selected.reviewType} />
                <StatusBadge status={status} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">النظير: {partner?.name} — {pairUploaded ? "تم رفع الثنائي اليوم" : "ينتظر اكتمال رفع الطرفين"}</div>
            </div>
            <div className="text-left">
              <div className="text-xs text-muted-foreground">إنجاز اليوم</div>
              <div className="font-display text-2xl text-[color:var(--gold-deep)] sm:text-3xl">{dailyCompletion(todayRecord)}%</div>
            </div>
          </div>

          <div className="ornamental-divider my-5"><span>۞</span></div>

          <div className="mb-4 rounded-2xl border border-[color:var(--gold)]/30 bg-white/60 p-4">
            <label className="text-sm text-muted-foreground">اليوم المراد تسجيله</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-[color:var(--gold)]/40 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[color:var(--green-deep)]"
            >
              {dayOptions.map((day) => (
                <option key={day.absoluteDay} value={day.absoluteDay} disabled={day.absoluteDay > today.absoluteDay}>
                  {day.dateLabel}{dayRelativeLabel(day.absoluteDay, today) ? ` — ${dayRelativeLabel(day.absoluteDay, today)}` : day.absoluteDay > today.absoluteDay ? " — قادم" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-[color:var(--gold)]/30 bg-[color:var(--cream)] p-4">
            <div className="text-xs text-[color:var(--gold-deep)]">ورد {selectedProgramDay.dateLabel} — {todayWird.title}</div>
            <div className="mt-1 font-display text-xl text-[color:var(--green-deep)]">{todayWird.surah}</div>
            <div className="text-sm text-muted-foreground">{todayWird.dailyPortion} · {todayWird.ayat}</div>
            <div className="mt-3 rounded-xl border border-[color:var(--gold)]/30 bg-white/70 p-3 text-center">
              <div className="mb-1 text-[11px] text-muted-foreground">يبدأ الورد من قوله تعالى</div>
              <p className="font-display text-lg leading-loose text-[color:var(--green-deep)]" dir="rtl">{todayWird.startAyahText}</p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">الموضع:</span> {todayWird.quarters}</div>
              <div><span className="text-muted-foreground">الصفحات:</span> {todayWird.pages}</div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[color:var(--gold)]/30 bg-white/60 p-4">
            <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div><div className="font-display text-lg text-[color:var(--green-deep)]">{todayRecord?.wirdDone ? "نعم" : "لا"}</div><div className="text-muted-foreground">الورد</div></div>
              <div><div className="font-display text-lg text-[color:var(--green-deep)]">{todayRecord?.listenedToPeer ? "نعم" : "لا"}</div><div className="text-muted-foreground">سمع للنظير</div></div>
              <div><div className="font-display text-lg text-[color:var(--green-deep)]">{todayRecord?.uploaded ? "نعم" : "لا"}</div><div className="text-muted-foreground">رفع اليوم</div></div>
            </div>
            <div className="mb-2 text-sm text-muted-foreground">مستوى إنجاز اليوم المختار</div>
            <ProgressBar value={dailyCompletion(todayRecord)} />
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>متوسط الشهر</span>
              <span>{selected.progress}%</span>
            </div>
            <div className="mt-1"><ProgressBar value={selected.progress} /></div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={() => updateToday(a.patch)}
                  disabled={isFutureDay}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-2xl sm:p-3 sm:text-sm ${
                    a.active
                      ? "border-[color:var(--green-deep)] bg-[color:var(--green-deep)] text-[color:var(--gold)]"
                      : "border-[color:var(--gold)]/40 bg-white/60 text-[color:var(--green-deep)] hover:bg-[color:var(--gold)]/10"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{a.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <label className="text-sm text-muted-foreground">ملاحظة التقدم اليومي</label>
            <textarea
              value={todayRecord?.progressNote ?? ""}
              onChange={(e) => updateToday({ progressNote: e.target.value })}
              rows={3}
              placeholder="مثال: سمعت لنظيري الربع كاملا، وبقيت مراجعة موضع كذا..."
              className="mt-1 w-full rounded-xl border border-[color:var(--gold)]/40 bg-white/70 p-3 text-sm outline-none focus:border-[color:var(--green-deep)]"
            />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}