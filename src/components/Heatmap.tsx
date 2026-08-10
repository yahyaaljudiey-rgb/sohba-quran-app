import { STATUS_LABEL, type ParticipantPeriodReport, type ParticipantStatus } from "@/lib/sohba-data";

const HEATMAP_COLOR: Record<ParticipantStatus, string> = {
  idle: "bg-[color:var(--status-idle)]/15",
  wird_done: "bg-[color:var(--status-ready)]/35",
  ready: "bg-[color:var(--status-ready)]/65",
  recited: "bg-[color:var(--gold)]",
  late: "bg-[color:var(--status-late)]/70",
};

export const HEATMAP_LEGEND: { status: ParticipantStatus; label: string }[] = [
  { status: "idle", label: STATUS_LABEL.idle },
  { status: "wird_done", label: STATUS_LABEL.wird_done },
  { status: "ready", label: STATUS_LABEL.ready },
  { status: "recited", label: STATUS_LABEL.recited },
  { status: "late", label: STATUS_LABEL.late },
];

function groupByWeek(days: ParticipantPeriodReport["days"]) {
  const weeks: ParticipantPeriodReport["days"][] = [];
  let current: ParticipantPeriodReport["days"] = [];
  let lastWeek: number | null = null;
  for (const d of days) {
    if (lastWeek !== null && d.day.week !== lastWeek) {
      weeks.push(current);
      current = [];
    }
    current.push(d);
    lastWeek = d.day.week;
  }
  if (current.length) weeks.push(current);
  return weeks;
}

export function ParticipantHeatmap({ report }: { report: ParticipantPeriodReport }) {
  const weeks = groupByWeek(report.days);
  return (
    <div className="flex items-start gap-1.5 overflow-x-auto pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-1">
          {week.map((d) => (
            <div
              key={d.day.absoluteDay}
              title={`${d.day.dateLabel} — ${STATUS_LABEL[d.status]} (${d.completion}%)`}
              className={`h-3.5 w-3.5 rounded-[3px] transition-colors ${HEATMAP_COLOR[d.status]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function HeatmapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      {HEATMAP_LEGEND.map(({ status, label }) => (
        <span key={status} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-[3px] ${HEATMAP_COLOR[status]}`} />
          {label}
        </span>
      ))}
    </div>
  );
}
