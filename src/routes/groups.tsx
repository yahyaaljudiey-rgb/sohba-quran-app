import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ProgressBar, ReviewBadge, StatusBadge } from "@/components/Badges";
import { getGroups, LEVEL_LABEL, visibleParticipantIdsFor, type Level } from "@/lib/sohba-data";
import { useSohbaStore } from "@/lib/store";

export const Route = createFileRoute("/groups")({
  head: () => ({
    meta: [
      { title: "المجموعات — صُحبة القرآن" },
      { name: "description", content: "السبع مجموعات لبرنامج صُحبة القرآن الكريم" },
    ],
  }),
  component: GroupsPage,
});

function GroupsPage() {
  const levels: Level[] = [2, 1];
  const { today, effectiveDailyRecords, currentUser } = useSohbaStore();
  const visibleIds = visibleParticipantIdsFor(currentUser);
  const groups = getGroups(effectiveDailyRecords, today)
    .map((g) => ({ ...g, participants: g.participants.filter((p) => visibleIds.includes(p.id)) }))
    .filter((g) => g.participants.length > 0);
  return (
    <AppLayout>
      <header className="mb-6 animate-fade-in">
        <h1 className="font-display text-3xl text-[color:var(--green-deep)]">مجموعات الصُحبة</h1>
        <p className="text-sm text-muted-foreground">سبع مجموعات ثنائية موزعة على مستويين، كل ثنائي يتابع بعضه.</p>
      </header>

      {levels.map((lvl) => {
        const lvlGroups = groups.filter((g) => g.level === lvl);
        return (
          <section key={lvl} className="mb-8">
            <div className="ornamental-divider mb-5">
              <h2 className="whitespace-nowrap font-display text-xl text-[color:var(--green-deep)]">
                <span className="ornament-spin mx-2 text-[color:var(--gold-deep)]">۞</span>
                {LEVEL_LABEL[lvl]}
                <span className="mx-2 text-xs text-muted-foreground">
                  ({lvl === 2 ? "نصف حزب" : "ربع حزب"})
                </span>
              </h2>
            </div>
            <div className="stagger grid grid-cols-1 gap-5 md:grid-cols-2">
              {lvlGroups.map((g) => {
          const avg = Math.round(g.participants.reduce((s, p) => s + p.progress, 0) / g.participants.length);
          return (
            <article
              key={g.id}
              className={`card-lift relative overflow-hidden rounded-3xl border p-6 shadow-[var(--shadow-elegant)] ${
                g.tone === "sky"
                  ? "border-[color:var(--sky-soft)] bg-[color:var(--sky-soft)]/50"
                  : "border-[color:var(--gold)]/50 bg-[color:var(--cream)]"
              }`}
            >
              <div className="absolute -top-2 right-6 grid h-12 w-10 place-items-center rounded-b-2xl bg-[color:var(--green-deep)] font-display text-xl text-[color:var(--gold)] shadow-md float-soft">
                {g.id}
              </div>
              <div className="ornamental-divider mb-4 pt-2">
                <h2 className="whitespace-nowrap font-display text-2xl text-[color:var(--green-deep)]">{g.name}</h2>
              </div>

              <ul className="stagger space-y-3">
                {g.participants.map((p, i) => (
                  <li key={p.id} className="rounded-2xl border border-[color:var(--gold)]/40 bg-white/70 p-3 transition-colors hover:border-[color:var(--gold-deep)]/60">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">{i === 0 ? "الأول" : "الثاني"}</div>
                        <div className="truncate font-display text-lg text-[color:var(--green-deep)]">{p.name}</div>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <ReviewBadge type={p.reviewType} />
                      <span className="text-xs text-muted-foreground">{p.progress}%</span>
                    </div>
                    <div className="mt-2"><ProgressBar value={p.progress} /></div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">نسبة الإنجاز العامة</span>
                <span className="font-display text-lg text-[color:var(--gold-deep)]">{avg}%</span>
              </div>
            </article>
          );
              })}
            </div>
          </section>
        );
      })}
    </AppLayout>
  );
}