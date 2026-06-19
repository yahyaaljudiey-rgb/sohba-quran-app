import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  getGroups,
  isAdmin,
  notificationsForUser,
  participantOptions,
  targetLabel,
  type NotificationTarget,
  type ProgramNotification,
} from "@/lib/sohba-data";
import { useSohbaStore } from "@/lib/store";
import { AlertTriangle, Bell, CalendarCheck, Copy, Heart, Send } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "الإشعارات — صُحبة القرآن" },
      { name: "description", content: "إشعارات البرنامج الموجهة للطلاب والمجموعات" },
    ],
  }),
  component: NotificationsPage,
});

const kindMeta: Record<ProgramNotification["kind"], { icon: typeof Bell; color: string; label: string }> = {
  reminder: { icon: CalendarCheck, color: "var(--gold-deep)", label: "تذكير" },
  alert: { icon: AlertTriangle, color: "var(--status-late)", label: "تنبيه" },
  thanks: { icon: Heart, color: "var(--status-done)", label: "شكر" },
  general: { icon: Bell, color: "var(--green-deep)", label: "عام" },
};

function NotificationsPage() {
  const { today, effectiveDailyRecords, currentUser: user, notifications: allNotifications, addNotification } = useSohbaStore();
  const admin = isAdmin(user);
  const [copied, setCopied] = useState<string | null>(null);
  const [kind, setKind] = useState<ProgramNotification["kind"]>("general");
  const [targetMode, setTargetMode] = useState<NotificationTarget["type"]>("all");
  const [targetId, setTargetId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const groups = getGroups(effectiveDailyRecords, today);
  const participants = participantOptions();
  const notifications = notificationsForUser(allNotifications, user);

  const target: NotificationTarget =
    targetMode === "all"
      ? { type: "all" }
      : targetMode === "group"
        ? { type: "group", groupId: Number(targetId || groups[0]?.id || 1) }
        : { type: "participant", participantId: targetId || participants[0]?.id || "" };

  const send = () => {
    if (!title.trim() || !body.trim()) return;
    addNotification({ title: title.trim(), body: body.trim(), kind, target });
    setTitle("");
    setBody("");
  };

  const copy = (id: string, txt: string) => {
    navigator.clipboard?.writeText(txt);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <AppLayout>
      <header className="mb-6">
        <h1 className="font-display text-3xl text-[color:var(--green-deep)]">الإشعارات</h1>
        <p className="text-sm text-muted-foreground">
          {admin ? "اكتب إشعارًا وحدد هل يصل للجميع أو لمجموعة أو لطالب معين." : "هنا تظهر الرسائل الموجهة لك أو لمجموعتك أو لجميع المشاركين."}
        </p>
      </header>

      {admin && (
        <section className="mb-6 rounded-2xl border border-[color:var(--gold)]/40 bg-card p-4 sm:p-5">
          <h2 className="mb-4 font-display text-xl text-[color:var(--green-deep)]">إرسال إشعار</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm text-muted-foreground">
              نوع الرسالة
              <select value={kind} onChange={(e) => setKind(e.target.value as ProgramNotification["kind"])} className="mt-1 w-full rounded-xl border border-[color:var(--gold)]/40 bg-white/80 px-3 py-2 text-sm outline-none">
                <option value="general">عام</option>
                <option value="thanks">كلمة شكر</option>
                <option value="alert">تنبيه</option>
                <option value="reminder">تذكير</option>
              </select>
            </label>
            <label className="text-sm text-muted-foreground">
              المستهدف
              <select value={targetMode} onChange={(e) => { setTargetMode(e.target.value as NotificationTarget["type"]); setTargetId(""); }} className="mt-1 w-full rounded-xl border border-[color:var(--gold)]/40 bg-white/80 px-3 py-2 text-sm outline-none">
                <option value="all">الجميع</option>
                <option value="group">مجموعة</option>
                <option value="participant">طالب معين</option>
              </select>
            </label>
            {targetMode === "group" && (
              <label className="text-sm text-muted-foreground sm:col-span-2">
                المجموعة
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="mt-1 w-full rounded-xl border border-[color:var(--gold)]/40 bg-white/80 px-3 py-2 text-sm outline-none">
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </label>
            )}
            {targetMode === "participant" && (
              <label className="text-sm text-muted-foreground sm:col-span-2">
                الطالب
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="mt-1 w-full rounded-xl border border-[color:var(--gold)]/40 bg-white/80 px-3 py-2 text-sm outline-none">
                  {participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            )}
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الإشعار" className="rounded-xl border border-[color:var(--gold)]/40 bg-white/80 px-3 py-2 text-sm outline-none sm:col-span-2" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="نص الرسالة..." className="rounded-xl border border-[color:var(--gold)]/40 bg-white/80 px-3 py-2 text-sm outline-none sm:col-span-2" />
          </div>
          <button onClick={send} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[color:var(--green-deep)] px-4 py-2 text-sm font-semibold text-[color:var(--gold)]">
            <Send className="h-4 w-4" /> إرسال
          </button>
        </section>
      )}

      <section className="space-y-3">
        {notifications.map((n) => {
          const meta = kindMeta[n.kind];
          const Icon = meta.icon;
          return (
            <article key={n.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 rounded-2xl border border-[color:var(--gold)]/40 bg-card p-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${meta.color} 15%, transparent)` }}>
                <Icon className="h-5 w-5" style={{ color: meta.color }} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-[color:var(--green-deep)]">{n.title}</h2>
                  <span className="rounded-full border border-[color:var(--gold)]/30 px-2 py-0.5 text-[10px] text-muted-foreground">{meta.label}</span>
                  <span className="rounded-full border border-[color:var(--gold)]/30 px-2 py-0.5 text-[10px] text-muted-foreground">{targetLabel(n.target)}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
                <div className="mt-2 text-[11px] text-muted-foreground">{n.author} · {new Date(n.createdAt).toLocaleDateString("ar-MY")}</div>
              </div>
              <button onClick={() => copy(n.id, `${n.title}
${n.body}`)} className="self-start rounded-lg border border-[color:var(--green-soft)]/50 bg-[color:var(--green-soft)]/10 px-2.5 py-1.5 text-xs text-[color:var(--green-deep)]">
                <Copy className="h-3.5 w-3.5" />
                <span className="sr-only">نسخ</span>
              </button>
              {copied === n.id && <div className="col-span-3 text-xs text-[color:var(--status-done)]">تم النسخ</div>}
            </article>
          );
        })}
        {notifications.length === 0 && <div className="rounded-2xl border border-[color:var(--gold)]/40 bg-card p-6 text-sm text-muted-foreground">لا توجد إشعارات حاليًا.</div>}
      </section>
    </AppLayout>
  );
}
