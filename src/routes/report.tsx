import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ProgressBar, ReviewBadge } from "@/components/Badges";
import { HeatmapLegend, ParticipantHeatmap } from "@/components/Heatmap";
import {
  buildVisiblePeriodReports,
  getGroups,
  getProgramInfo,
  isAdmin,
  programWeekLabel,
  programWeekRef,
  sameProgramWeek,
  STATUS_LABEL,
  visibleParticipantIdsFor,
  weeklyRecitationsForParticipant,
  type ParticipantPeriodReport,
  type ProgramDay,
  type ReportPeriod,
  type WeeklySheikhRecitation,
} from "@/lib/sohba-data";
import { useSohbaStore } from "@/lib/store";
import { Download, FileSpreadsheet } from "lucide-react";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "التقرير — صُحبة القرآن" },
      { name: "description", content: "تقرير أسبوعي وشهري لإنجاز المشاركين والمجموعات" },
    ],
  }),
  component: ReportPage,
});

function periodStats(report: ParticipantPeriodReport, period: ReportPeriod) {
  const { days } = report;
  return {
    totalDays: days.length,
    wirdDays: days.filter((d) => d.record.wirdDone).length,
    listenedDays: days.filter((d) => d.record.listenedToPeer).length,
    uploadedDays: days.filter((d) => d.record.uploaded).length,
    pairedUploadDays: days.filter((d) => d.record.uploaded && d.partnerUploaded).length,
    lateDays: days.filter((d) => d.record.markedLate).length,
    progress: period === "weekly" ? report.weeklyProgress : report.monthlyProgress,
  };
}

const MODE_LABEL: Record<WeeklySheikhRecitation["mode"], string> = {
  in_person: "حضوري",
  online: "أونلاين",
};

// Notes typed by the sheikh or a participant land inside the printable HTML
// document below, so they have to be escaped rather than interpolated raw.
const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (value: string) => value.replace(/[&<>"]/g, (char) => ESCAPES[char]);

function printReports(
  reports: ParticipantPeriodReport[],
  title: string,
  recitationsFor: (participantId: string) => WeeklySheikhRecitation[] | null,
) {
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#183c2b;margin:24px;line-height:1.6}
      h1,h2{margin:0 0 8px} h3{margin:16px 0 4px;font-size:14px;color:#1f4b36} .meta{color:#667;margin-bottom:16px}.student{page-break-inside:avoid;margin:0 0 24px;border:1px solid #d8c38a;border-radius:12px;padding:16px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}th{background:#1f4b36;color:#d9b85f}th,td{border:1px solid #d8c38a;padding:6px;text-align:right}
      .summary{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0}.box{border:1px solid #d8c38a;border-radius:10px;padding:8px}.box b{display:block;font-size:18px;color:#9a742b}
      .empty{font-size:12px;color:#667}
      @media print{button{display:none}.student{break-inside:avoid}body{margin:12mm}}
    </style></head><body>
    <h1>${title}</h1><div class="meta">صُحبة القرآن - ${new Date().toLocaleDateString("ar-MY")}</div>
    ${reports.map((r) => `
      <section class="student">
        <h2>${r.name}</h2>
        <div class="meta">${r.periodLabel} - المجموعة: ${r.groupName} - النظير: ${r.partnerName}</div>
        <div class="summary">
          <div class="box"><span>الورد</span><b>${r.days.filter((d) => d.record.wirdDone).length}</b></div>
          <div class="box"><span>سمع للنظير</span><b>${r.days.filter((d) => d.record.listenedToPeer).length}</b></div>
          <div class="box"><span>رفع فردي</span><b>${r.days.filter((d) => d.record.uploaded).length}</b></div>
          <div class="box"><span>رفع مشترك</span><b>${r.days.filter((d) => d.record.uploaded && d.partnerUploaded).length}</b></div>
          <div class="box"><span>التقدم</span><b>${Math.round(r.days.reduce((s, d) => s + d.completion, 0) / Math.max(1, r.days.length))}%</b></div>
        </div>
        <table><thead><tr><th>اليوم</th><th>الورد</th><th>سمع للنظير</th><th>رفع</th><th>رفع النظير</th><th>الحالة</th><th>النسبة</th><th>ملاحظة</th></tr></thead><tbody>
          ${r.days.map((d) => `<tr><td>${d.day.dateLabel}</td><td>${d.record.wirdDone ? "نعم" : "لا"}</td><td>${d.record.listenedToPeer ? "نعم" : "لا"}</td><td>${d.record.uploaded ? "نعم" : "لا"}</td><td>${d.partnerUploaded ? "نعم" : "لا"}</td><td>${STATUS_LABEL[d.status]}</td><td>${d.completion}%</td><td>${esc(d.record.progressNote ?? "")}</td></tr>`).join("")}
        </tbody></table>
        ${(() => {
          const recitations = recitationsFor(r.id);
          if (!recitations) return "";
          const heading = `<h3>سرد الشيخ الأسبوعي</h3>`;
          if (!recitations.length) return `${heading}<div class="empty">لم يُسجَّل سرد أسبوعي بعد.</div>`;
          return `${heading}<table><thead><tr><th>الأسبوع</th><th>المقدار المسرود</th><th>النوع</th><th>التقييم</th><th>الأخطاء</th><th>ملاحظات الشيخ</th></tr></thead><tbody>
            ${recitations.map((w) => `<tr><td>${programWeekLabel(w)}</td><td>${esc(w.portion) || "—"}</td><td>${MODE_LABEL[w.mode]}</td><td>${esc(w.grade)}</td><td>${esc(w.errors.join("، ")) || "—"}</td><td>${esc(w.note) || "—"}</td></tr>`).join("")}
          </tbody></table>`;
        })()}
      </section>`).join("")}
    <script>window.print()</script></body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function RecitationDetails({ recitation }: { recitation: WeeklySheikhRecitation }) {
  return (
    <div className="rounded-xl border border-[color:var(--gold)]/30 bg-white/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-sm text-[color:var(--green-deep)]">{programWeekLabel(recitation)}</span>
        <span className="rounded-full border border-[color:var(--status-done)]/40 bg-[color:var(--status-done)]/10 px-2.5 py-0.5 text-xs text-[color:var(--status-done)]">
          {recitation.grade}
        </span>
        <span className="rounded-full border border-[color:var(--gold)]/40 px-2.5 py-0.5 text-[11px] text-muted-foreground">
          {MODE_LABEL[recitation.mode]}
        </span>
      </div>
      {recitation.portion && (
        <p className="mt-2 text-sm text-[color:var(--green-deep)]">المقدار المسرود: {recitation.portion}</p>
      )}
      {recitation.errors.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {recitation.errors.map((e) => (
            <span key={e} className="rounded-full border border-[color:var(--status-redo)]/40 bg-[color:var(--status-redo)]/10 px-2 py-0.5 text-[11px] text-[color:var(--status-redo)]">
              {e}
            </span>
          ))}
        </div>
      )}
      {recitation.note && <p className="mt-2 text-sm text-muted-foreground">ملاحظة الشيخ: {recitation.note}</p>}
    </div>
  );
}

function WeeklyRecitationCard({ name, recitations, today }: { name: string; recitations: WeeklySheikhRecitation[]; today: ProgramDay }) {
  const [expanded, setExpanded] = useState(false);
  const recordedThisWeek = recitations.some((r) => sameProgramWeek(r, programWeekRef(today)));
  const [latest, ...older] = recitations;

  return (
    <div className="rounded-2xl border border-[color:var(--gold)]/30 bg-[color:var(--gold)]/5 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-[color:var(--green-deep)]">{name}</span>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
            recordedThisWeek
              ? "border-[color:var(--status-done)]/40 bg-[color:var(--status-done)]/10 text-[color:var(--status-done)]"
              : "border-[color:var(--gold)]/40 bg-white/60 text-muted-foreground"
          }`}
        >
          {recordedThisWeek ? "سُجِّل سرد هذا الأسبوع" : "لم يُسجَّل سرد هذا الأسبوع"}
        </span>
      </div>

      {latest ? <RecitationDetails recitation={latest} /> : (
        <p className="text-sm text-muted-foreground">لم يسجّل الشيخ سردًا لهذا الطالب بعد.</p>
      )}

      {older.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-xs text-[color:var(--gold-deep)] underline-offset-4 hover:underline"
          >
            {expanded ? "إخفاء الأسابيع السابقة" : `عرض الأسابيع السابقة (${older.length})`}
          </button>
          {expanded && (
            <div className="mt-2 space-y-2">
              {older.map((r) => (
                <RecitationDetails key={programWeekLabel(r)} recitation={r} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReportPage() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const { today, effectiveDailyRecords, currentUser: user, weeklySheikhRecitations } = useSohbaStore();
  const programInfo = getProgramInfo(today);
  const visibleIds = visibleParticipantIdsFor(user);
  const groups = getGroups(effectiveDailyRecords, today).filter((g) => g.participants.some((p) => visibleIds.includes(p.id)));
  const periodReports = buildVisiblePeriodReports(period, effectiveDailyRecords, user, today);
  const admin = isAdmin(user);
  // The sheikh's سرد is a private evaluation: the sheikh sees every student's,
  // a student sees only their own — not their partner's, even though the daily
  // numbers above are shared within the pair. `null` means "not for this
  // viewer", so the section is omitted rather than shown empty.
  const recitationsFor = (participantId: string) =>
    admin || (user?.role === "participant" && user.participantId === participantId)
      ? weeklyRecitationsForParticipant(weeklySheikhRecitations, participantId)
      : null;
  const recitationReports = periodReports.filter((r) => recitationsFor(r.id) !== null);
  const print = () => printReports(periodReports, admin ? "تقرير جميع الطلاب" : "تقرير الطالب", recitationsFor);

  const groupRanking = groups
    .map((g) => {
      const members = periodReports.filter((p) => p.groupId === g.id);
      const memberStats = members.map((p) => periodStats(p, period));
      const avg = Math.round(memberStats.reduce((s, p) => s + p.progress, 0) / Math.max(1, memberStats.length));
      const pairedDays = Math.round(memberStats.reduce((s, p) => s + p.pairedUploadDays, 0) / 2);
      const totalDays = memberStats[0]?.totalDays ?? programInfo.currentDay;
      return { ...g, avg, pairedDays, totalDays };
    })
    .sort((a, b) => b.avg - a.avg);

  return (
    <AppLayout>
      <header className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-[color:var(--green-deep)]">التقرير</h1>
          <p className="text-sm text-muted-foreground">{period === "weekly" ? "تقرير آخر سبعة أيام" : `تقرير شهر ${programInfo.currentMonth}`} — اليوم {programInfo.currentDay}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPeriod("weekly")} className={`rounded-xl border px-3 py-2 text-xs ${period === "weekly" ? "border-[color:var(--green-deep)] bg-[color:var(--green-deep)] text-[color:var(--gold)]" : "border-[color:var(--gold)]/40 bg-white/60 text-[color:var(--green-deep)]"}`}>أسبوعي</button>
          <button onClick={() => setPeriod("monthly")} className={`rounded-xl border px-3 py-2 text-xs ${period === "monthly" ? "border-[color:var(--green-deep)] bg-[color:var(--green-deep)] text-[color:var(--gold)]" : "border-[color:var(--gold)]/40 bg-white/60 text-[color:var(--green-deep)]"}`}>شهري</button>
          <button onClick={print} className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--gold)]/40 bg-white/60 px-3 py-2 text-xs text-[color:var(--green-deep)]">
            <Download className="h-4 w-4" /> PDF
          </button>
          <button onClick={print} className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--gold)]/40 bg-white/60 px-3 py-2 text-xs text-[color:var(--green-deep)]">
            <FileSpreadsheet className="h-4 w-4" /> طباعة
          </button>
        </div>
      </header>

      {admin && (
        <section className="mb-6 rounded-2xl border border-[color:var(--gold)]/40 bg-card p-5">
          <h2 className="mb-3 font-display text-xl text-[color:var(--green-deep)]">ترتيب المجموعات</h2>
          <ul className="space-y-3">
            {groupRanking.map((g, idx) => (
              <li key={g.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--green-deep)] font-display text-[color:var(--gold)]">{idx + 1}</span>
                <div className="min-w-0">
                  <div className="truncate font-display text-[color:var(--green-deep)]">{g.name}</div>
                  <div className="text-xs text-muted-foreground">أيام الرفع المشترك: {g.pairedDays} من {g.totalDays}</div>
                  <ProgressBar value={g.avg} />
                </div>
                <span className="font-display text-lg text-[color:var(--gold-deep)]">{g.avg}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recitationReports.length > 0 && (
        <section className="mb-6 rounded-2xl border border-[color:var(--gold)]/40 bg-card p-5">
          <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-xl text-[color:var(--green-deep)]">سرد الشيخ الأسبوعي</h2>
            <span className="text-xs text-muted-foreground">للعرض فقط — الإدخال من صلاحية الشيخ</span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">{programWeekLabel(programWeekRef(today))}</p>
          <ul className="space-y-3">
            {recitationReports.map((r) => (
              <li key={r.id}>
                <WeeklyRecitationCard name={r.name} recitations={recitationsFor(r.id) ?? []} today={today} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6 rounded-2xl border border-[color:var(--gold)]/40 bg-card p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-xl text-[color:var(--green-deep)]">خريطة الالتزام</h2>
          <HeatmapLegend />
        </div>
        <ul className="space-y-4">
          {periodReports.map((r) => (
            <li key={r.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4">
              <div className="min-w-0">
                <div className="truncate font-medium text-[color:var(--green-deep)]">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.groupName}</div>
              </div>
              <ParticipantHeatmap report={r} />
            </li>
          ))}
        </ul>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[color:var(--gold)]/40 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-right text-sm">
            <thead className="bg-[color:var(--green-deep)] text-[color:var(--gold)]">
              <tr>
                <th className="px-3 py-2 font-normal">المشارك</th>
                <th className="px-3 py-2 font-normal">النظير</th>
                <th className="px-3 py-2 font-normal">المجموعة</th>
                <th className="px-3 py-2 font-normal">المراجعة</th>
                <th className="px-3 py-2 font-normal">أيام الورد</th>
                <th className="px-3 py-2 font-normal">سمع للنظير</th>
                <th className="px-3 py-2 font-normal">رفع فردي</th>
                <th className="px-3 py-2 font-normal">رفع مشترك</th>
                <th className="px-3 py-2 font-normal">التأخر</th>
                <th className="px-3 py-2 font-normal">التقدم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--gold)]/20">
              {periodReports.map((r) => {
                const stats = periodStats(r, period);
                return (
                  <tr key={r.id} className="hover:bg-[color:var(--gold)]/5">
                    <td className="px-3 py-2 font-medium text-[color:var(--green-deep)]">{r.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.partnerName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.groupName}</td>
                    <td className="px-3 py-2"><ReviewBadge type={r.reviewType} /></td>
                    <td className="px-3 py-2">{stats.wirdDays}/{stats.totalDays}</td>
                    <td className="px-3 py-2">{stats.listenedDays}</td>
                    <td className="px-3 py-2">{stats.uploadedDays}</td>
                    <td className="px-3 py-2">{stats.pairedUploadDays}</td>
                    <td className="px-3 py-2">{stats.lateDays}</td>
                    <td className="px-3 py-2 w-40"><div className="flex items-center gap-2"><ProgressBar value={stats.progress} /><span className="w-10 text-left text-xs text-muted-foreground">{stats.progress}%</span></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppLayout>
  );
}
