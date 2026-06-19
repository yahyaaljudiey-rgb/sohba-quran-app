import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ProgressBar, ReviewBadge, StatusBadge } from "@/components/Badges";
import { getGroups, getProgramInfo, getWirdForLevel, participantReports } from "@/lib/sohba-data";
import { useSohbaStore } from "@/lib/store";
import { BookOpen, Users, CheckCircle2, Clock, CalendarCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "صُحبة القرآن — لوحة المتابعة" },
      { name: "description", content: "متابعة الورد والتسميع والمراجعة لبرنامج صُحبة القرآن الكريم" },
      { property: "og:title", content: "صُحبة القرآن — لوحة المتابعة" },
      { property: "og:description", content: "متابعة الورد والتسميع والمراجعة لبرنامج صُحبة القرآن الكريم" },
    ],
  }),
  component: Index,
});

function Index() {
  const { today, effectiveDailyRecords } = useSohbaStore();
  const programInfo = getProgramInfo(today);
  const reports = participantReports(effectiveDailyRecords, today);
  const groups = getGroups(effectiveDailyRecords, today);
  const recited = reports.filter((p) => p.status === "recited").length;
  const late = reports.filter((p) => p.status === "late").length;
  const wirdDone = reports.filter((p) => p.wirdDays >= programInfo.currentDay).length;
  const pairedUploads = reports.reduce((sum, p) => sum + p.pairedUploadDays, 0) / 2;
  const progress = Math.round(reports.reduce((s, p) => s + p.monthlyProgress, 0) / reports.length);

  const stats = [
    { label: "المشاركون", value: programInfo.participants, icon: Users },
    { label: "المجموعات", value: programInfo.groups, icon: Sparkles },
    { label: "أنجز الورد", value: wirdDone, icon: BookOpen },
    { label: "تم التسميع", value: recited, icon: CheckCircle2 },
    { label: "المتأخرون", value: late, icon: Clock },
    { label: "رفع الثنائيات", value: pairedUploads, icon: CalendarCheck },
  ];

  return (
    <AppLayout>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[image:var(--gradient-hero)] p-8 text-[color:var(--cream)] shadow-[var(--shadow-elegant)] card-enter">
        <div className="hero-aura" />
        <div className="arabesque-bg absolute inset-0 opacity-40" />
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[color:var(--gold)]/20 blur-3xl float-soft" />
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-[color:var(--gold)]/20 blur-3xl float-soft" style={{ animationDelay: "1.5s" }} />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/40 bg-black/20 px-3 py-1 text-xs tracking-wide text-[color:var(--gold)] backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--gold)] pulse-dot" />
            برنامج صُحبة القرآن الكريم
          </div>
          <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-5xl">
            بسم الله وعلى بركة الله تبدأ رحلة الصحبة المباركة
          </h1>
          <div className="ornamental-divider mt-4 max-w-md">
            <span className="ornament-spin text-[color:var(--gold)]">۞</span>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-loose text-[color:var(--cream)]/85 sm:text-base">
            انطلاق البرنامج: {programInfo.startDate} — اليوم {programInfo.currentDate}. متابعة الورد والتسميع المتبادل ورفع الثنائي في نفس اليوم.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="group rounded-2xl border border-[color:var(--gold)]/30 bg-black/20 p-4 backdrop-blur-md transition-all duration-500 hover:border-[color:var(--gold)]/60 hover:bg-black/25">
              <div className="text-[11px] uppercase tracking-wider text-[color:var(--gold)]">الأسبوع الهجري الحالي</div>
              <div className="mt-1 font-display text-2xl">الأسبوع {programInfo.currentWeek}</div>
            </div>
            {[getWirdForLevel(1), getWirdForLevel(2)].map((wird) => (
              <div key={wird.level} className="rounded-2xl border border-[color:var(--gold)]/30 bg-black/20 p-4 backdrop-blur-md transition-all duration-500 hover:border-[color:var(--gold)]/60 hover:bg-black/25">
                <div className="text-[11px] uppercase tracking-wider text-[color:var(--gold)]">{wird.title} — {wird.dailyPortion}</div>
                <div className="mt-1 font-display text-lg leading-snug">{wird.surah}</div>
                <div className="text-xs text-[color:var(--cream)]/75">{wird.quarters} · {wird.pages}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stagger mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card-lift group relative overflow-hidden rounded-2xl border border-[color:var(--gold)]/30 bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-[color:var(--gold)]/10 blur-xl transition-all duration-500 group-hover:scale-150 group-hover:bg-[color:var(--gold)]/20" />
              <Icon className="relative h-5 w-5 text-[color:var(--gold-deep)] transition-transform duration-500 group-hover:scale-125 group-hover:-rotate-6" />
              <div className="relative mt-2 font-display text-3xl text-[color:var(--green-deep)] tick-in">{s.value}</div>
              <div className="relative text-xs text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </section>

      {/* Monthly progress */}
      <section className="card-lift mt-6 rounded-2xl border border-[color:var(--gold)]/30 bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-[color:var(--green-deep)]">شريط التقدم الشهري</h2>
            <div className="text-xs text-muted-foreground">نسبة الأيام التي رفع فيها كل ثنائي في شهر {programInfo.currentMonth}</div>
          </div>
          <div className="font-display text-3xl text-[color:var(--gold-deep)] tick-in">{progress}%</div>
        </div>
        <div className="mt-3"><ProgressBar value={progress} /></div>
      </section>

      {/* Groups preview */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl text-[color:var(--green-deep)]">مجموعات الصُحبة</h2>
          <Link to="/groups" className="link-underline text-sm text-[color:var(--gold-deep)]">عرض الكل ←</Link>
        </div>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <article
              key={g.id}
              className={`card-lift relative overflow-hidden rounded-2xl border p-5 ${
                g.tone === "sky"
                  ? "border-[color:var(--sky-soft)] bg-[color:var(--sky-soft)]/40"
                  : "border-[color:var(--gold)]/40 bg-[color:var(--cream)]"
              } shadow-[var(--shadow-soft)]`}
            >
              <div className="absolute -top-1 right-4 grid h-9 w-9 place-items-center rounded-b-xl bg-[color:var(--green-deep)] font-display text-[color:var(--gold)] shadow-[var(--shadow-elegant)] glow-ring">
                {g.id}
              </div>
              <div className="ornamental-divider mb-3">
                <h3 className="whitespace-nowrap font-display text-lg text-[color:var(--green-deep)]">{g.name}</h3>
              </div>
              <ul className="space-y-2">
                {g.participants.map((p, i) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-[color:var(--gold)]/40 bg-white/60 px-3 py-2 transition-all duration-300 hover:border-[color:var(--gold-deep)]/50 hover:bg-white/80">
                    <span className="min-w-0 truncate text-sm text-[color:var(--green-deep)]">
                      <span className="text-muted-foreground">{i === 0 ? "الأول" : "الثاني"} /</span> {p.name}
                    </span>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between">
                <ReviewBadge type={g.participants[0].reviewType} />
                <Link to="/groups" className="link-underline text-xs text-[color:var(--gold-deep)]">التفاصيل</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
