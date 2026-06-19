import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { Home, Users, BookOpen, Mic, CalendarCheck, BarChart3, Bell, LogOut, UserRound } from "lucide-react";
import { participantOptions, userDisplayName, verifyAdminCode, verifyParticipantCode, type CurrentUser } from "@/lib/sohba-data";
import { useSohbaStore } from "@/lib/store";

const nav = [
  { to: "/", label: "الرئيسية", icon: Home, roles: ["admin", "participant"], mobile: true },
  { to: "/groups", label: "المجموعات", icon: Users, roles: ["admin", "participant"], mobile: false },
  { to: "/wird", label: "الورد", icon: BookOpen, roles: ["admin", "participant"], mobile: true },
  { to: "/session", label: "الشيخ", icon: Mic, roles: ["admin"], mobile: true },
  { to: "/pair-review", label: "الأقران", icon: CalendarCheck, roles: ["admin", "participant"], mobile: true },
  { to: "/report", label: "التقرير", icon: BarChart3, roles: ["admin", "participant"], mobile: true },
  { to: "/notifications", label: "إشعارات", icon: Bell, roles: ["admin", "participant"], mobile: true },
] as const;

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-hero)] shadow-[var(--shadow-elegant)]">
        <svg viewBox="0 0 32 32" className="h-6 w-6 text-[color:var(--gold)]" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 26V10c0-2 1.5-3 3-3h14c1.5 0 3 1 3 3v16" />
          <path d="M6 26h20" />
          <path d="M16 7V4" />
          <circle cx="16" cy="3" r="1" fill="currentColor" />
          <path d="M11 14h10M11 18h10" />
        </svg>
      </div>
      <div className="min-w-0">
        <div className="font-display text-lg leading-tight text-[color:var(--green-deep)] truncate">صُحبة القرآن</div>
        <div className="text-[11px] text-muted-foreground">رحلة الحفظ والمراجعة</div>
      </div>
    </div>
  );
}

function LoginPanel({ onLogin }: { onLogin: (user: CurrentUser) => void }) {
  const participants = participantOptions();
  const [mode, setMode] = useState<"participant" | "admin">("participant");
  const [participantId, setParticipantId] = useState(participants[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const codeValid = mode === "admin" ? verifyAdminCode(code) : verifyParticipantCode(participantId, code);

  const submit = () => {
    if (!codeValid) {
      setError(true);
      return;
    }
    onLogin(mode === "admin" ? { role: "admin", name: "الشيخ الحوري" } : { role: "participant", participantId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[color:var(--green-deep)]/25 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="w-full max-w-md rounded-2xl border border-[color:var(--gold)]/40 bg-card p-4 shadow-[var(--shadow-elegant)] sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-hero)] text-[color:var(--gold)]">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl text-[color:var(--green-deep)]">الدخول</h1>
            <p className="text-xs text-muted-foreground">اختر اسمك وأدخل رمز مجموعتك للتسجيل اليومي.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setMode("participant"); setCode(""); setError(false); }}
            className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
              mode === "participant"
                ? "border-[color:var(--green-deep)] bg-[color:var(--green-deep)] text-[color:var(--gold)]"
                : "border-[color:var(--gold)]/40 bg-white/60 text-[color:var(--green-deep)]"
            }`}
          >
            مشارك
          </button>
          <button
            onClick={() => { setMode("admin"); setCode(""); setError(false); }}
            className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
              mode === "admin"
                ? "border-[color:var(--green-deep)] bg-[color:var(--green-deep)] text-[color:var(--gold)]"
                : "border-[color:var(--gold)]/40 bg-white/60 text-[color:var(--green-deep)]"
            }`}
          >
            الشيخ
          </button>
        </div>

        {mode === "participant" && (
          <>
            <label className="mt-4 block text-sm text-muted-foreground">اسم المشارك</label>
            <select
              value={participantId}
              onChange={(e) => { setParticipantId(e.target.value); setError(false); }}
              className="mt-2 w-full rounded-xl border border-[color:var(--gold)]/40 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[color:var(--green-deep)]"
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </>
        )}

        <label className="mt-4 block text-sm text-muted-foreground">
          {mode === "admin" ? "رمز الشيخ (رقمين)" : "رمز مجموعتك (رقمين)"}
        </label>
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 2)); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          inputMode="numeric"
          maxLength={2}
          placeholder="••"
          className="mt-2 w-full rounded-xl border border-[color:var(--gold)]/40 bg-white/80 px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:border-[color:var(--green-deep)]"
        />
        {error && <p className="mt-2 text-xs text-[color:var(--status-redo)]">الرمز غير صحيح، حاول مرة أخرى.</p>}

        <div className="mt-4 grid grid-cols-1 gap-2">
          <button
            onClick={submit}
            className="rounded-xl bg-[color:var(--green-deep)] px-4 py-2 text-sm font-semibold text-[color:var(--gold)]"
          >
            {mode === "admin" ? "دخول مسؤول البرنامج" : "دخول كمشارك"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { ready, currentUser: user, login, logout } = useSohbaStore();

  const role = user?.role ?? "participant";
  const visibleNav = nav.filter((n) => (n.roles as readonly string[]).includes(role));
  const mobileNav = role === "admin"
    ? visibleNav.filter((n) => n.mobile).slice(0, 6)
    : visibleNav.filter((n) => ["/", "/wird", "/pair-review", "/notifications", "/report"].includes(n.to));

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {ready && !user && <LoginPanel onLogin={login} />}
      <header className="sticky top-0 z-40 border-b border-[color:var(--gold)]/30 bg-[color:var(--cream)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          <Logo />
          <div className="hidden items-center gap-2 md:flex">
            <nav className="flex items-center gap-1">
              {visibleNav.map((n) => {
                const active = pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`relative rounded-lg px-3 py-2 text-sm transition-all duration-300 ${
                      active
                        ? "bg-[color:var(--green-deep)] text-[color:var(--gold)] shadow-[var(--shadow-elegant)]"
                        : "text-[color:var(--green-deep)] hover:bg-[color:var(--gold)]/15 hover:-translate-y-0.5"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
            {user && (
              <button onClick={logout} className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--gold)]/40 bg-white/60 px-3 py-2 text-xs text-[color:var(--green-deep)]">
                <LogOut className="h-3.5 w-3.5" /> {userDisplayName(user)}
              </button>
            )}
          </div>
          {user && (
            <button onClick={logout} className="md:hidden rounded-lg border border-[color:var(--gold)]/40 bg-white/60 px-2 py-1.5 text-[11px] text-[color:var(--green-deep)]">
              {userDisplayName(user)}
            </button>
          )}
        </div>
      </header>

      <main key={pathname} className="mx-auto max-w-6xl px-3 py-4 page-enter sm:px-4 sm:py-6">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-[color:var(--gold)]/30 bg-[color:var(--cream)]/95 backdrop-blur-md">
        <ul className={`mx-auto grid max-w-2xl ${mobileNav.length <= 5 ? "grid-cols-5" : "grid-cols-6"}`}>
          {mobileNav.map((n) => {
            const Icon = n.icon;
            const active = pathname === n.to;
            return (
              <li key={n.to}>
                <Link
                  to={n.to}
                  className={`relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] transition-all duration-300 ${
                    active ? "text-[color:var(--green-deep)]" : "text-muted-foreground"
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-transform duration-300 ${active ? "text-[color:var(--gold-deep)] scale-110" : ""}`} />
                  <span className="truncate">{n.label}</span>
                  {active && <span className="absolute -top-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[color:var(--gold-deep)]" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
