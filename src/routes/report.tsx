import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ProgressBar, ReviewBadge } from "@/components/Badges";
import {
  buildVisiblePeriodReports,
  getGroups,
  getProgramInfo,
  isAdmin,
  STATUS_LABEL,
  visibleParticipantIdsFor,
  type ParticipantPeriodReport,
  type ReportPeriod,
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
    lateDays: days.filter((d) => (d.record.wirdDone || d.record.listenedToPeer) && !d.record.uploaded).length,
    redoDays: days.filter((d) => d.record.needsRedo).length,
    progress: period === "weekly" ? report.weeklyProgress : report.monthlyProgress,
  };
}

function printReports(reports: ParticipantPeriodReport[], title: string) {
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#183c2b;margin:24px;line-height:1.6}
      h1,h2{margin:0 0 8px} .meta{color:#667;margin-bottom:16px}.student{page-break-inside:avoid;margin:0 0 24px;border:1px solid #d8c38a;border-radius:12px;padding:16px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}th{background:#1f4b36;color:#d9b85f}th,td{border:1px solid #d8c38a;padding:6px;text-align:right}
      .summary{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0}.box{border:1px solid #d8c38a;border-radius:10px;padding:8px}.box b{display:block;font-size:18px;color:#9a742b}
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
          ${r.days.map((d) => `<tr><td>${d.day.dateLabel}</td><td>${d.record.wirdDone ? "نعم" : "لا"}</td><td>${d.record.listenedToPeer ? "نعم" : "لا"}</td><td>${d.record.uploaded ? "نعم" : "لا"}</td><td>${d.partnerUploaded ? "نعم" : "لا"}</td><td>${STATUS_LABEL[d.status]}</td><td>${d.completion}%</td><td>${d.record.progressNote ?? ""}</td></tr>`).join("")}
        </tbody></table>
      </section>`).join("")}
    <script>window.print()</script></body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function ReportPage() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const { today, effectiveDailyRecords, currentUser: user } = useSohbaStore();
  const programInfo = getProgramInfo(today);
  const visibleIds = visibleParticipantIdsFor(user);
  const groups = getGroups(effectiveDailyRecords, today).filter((g) => g.participants.some((p) => visibleIds.includes(p.id)));
  const periodReports = buildVisiblePeriodReports(period, effectiveDailyRecords, user, today);
  const admin = isAdmin(user);

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
          <button onClick={() => printReports(periodReports, admin ? "تقرير جميع الطلاب" : "تقرير الطالب")} className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--gold)]/40 bg-white/60 px-3 py-2 text-xs text-[color:var(--green-deep)]">
            <Download className="h-4 w-4" /> PDF
          </button>
          <button onClick={() => printReports(periodReports, admin ? "تقرير جميع الطلاب" : "تقرير الطالب")} className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--gold)]/40 bg-white/60 px-3 py-2 text-xs text-[color:var(--green-deep)]">
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
                <th className="px-3 py-2 font-normal">الإعادة</th>
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
                    <td className="px-3 py-2">{stats.redoDays}</td>
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
