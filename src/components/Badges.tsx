import { REVIEW_COLOR, REVIEW_LABEL, STATUS_COLOR, STATUS_LABEL, type ParticipantStatus, type ReviewType } from "@/lib/sohba-data";

export function StatusBadge({ status }: { status: ParticipantStatus }) {
  const attention = status === "ready" || status === "late" || status === "redo";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-300 ${STATUS_COLOR[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${attention ? "pulse-dot" : ""}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ReviewBadge({ type }: { type: ReviewType }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${REVIEW_COLOR[type]}`}>
      {REVIEW_LABEL[type]}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="progress-shine h-2 w-full overflow-hidden rounded-full bg-[color:var(--muted)]">
      <div
        className="h-full rounded-full gold-shimmer transition-[width] duration-700 ease-out"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}