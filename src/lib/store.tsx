import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  canEditParticipant,
  dailyRecordKey,
  dailyRecords,
  getProgramDay,
  readCurrentUser,
  readDailyRecordOverrides,
  readMonthlySheikhReviews,
  readStoredNotifications,
  saveCurrentUser,
  saveDailyRecordPatch,
  saveMonthlySheikhReview as persistMonthlySheikhReview,
  saveProgramNotification,
  type CurrentUser,
  type DailyRecord,
  type DailyRecordPatch,
  type MonthlySheikhReview,
  type ProgramDay,
  type ProgramNotification,
} from "@/lib/sohba-data";

interface SohbaStore {
  ready: boolean;
  today: ProgramDay;
  currentUser: CurrentUser | null;
  login: (user: CurrentUser) => void;
  logout: () => void;
  effectiveDailyRecords: DailyRecord[];
  updateDailyRecord: (participantId: string, patch: DailyRecordPatch, day?: number) => void;
  notifications: ProgramNotification[];
  addNotification: (notification: Omit<ProgramNotification, "id" | "createdAt" | "author">) => void;
  monthlySheikhReviews: Record<string, MonthlySheikhReview>;
  saveMonthlySheikhReview: (review: Omit<MonthlySheikhReview, "hijriMonthIndex" | "hijriYear" | "savedAt">) => void;
}

const SohbaStoreContext = createContext<SohbaStore | null>(null);

// The Hijri day changes silently while the app stays open; recompute it
// periodically and whenever the tab regains focus instead of freezing it
// at the moment the app first loaded.
const DAY_REFRESH_INTERVAL_MS = 60_000;

export function SohbaStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState<ProgramDay>(() => getProgramDay());
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [recordOverrides, setRecordOverrides] = useState<ReturnType<typeof readDailyRecordOverrides>>({});
  const [notifications, setNotifications] = useState<ProgramNotification[]>([]);
  const [monthlySheikhReviews, setMonthlySheikhReviews] = useState<Record<string, MonthlySheikhReview>>({});

  useEffect(() => {
    setCurrentUser(readCurrentUser());
    setRecordOverrides(readDailyRecordOverrides());
    setNotifications(readStoredNotifications());
    setMonthlySheikhReviews(readMonthlySheikhReviews());
    setReady(true);

    const refreshToday = () => setToday((prev) => {
      const next = getProgramDay();
      return next.absoluteDay === prev.absoluteDay ? prev : next;
    });
    const intervalId = window.setInterval(refreshToday, DAY_REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshToday);
    window.addEventListener("focus", refreshToday);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshToday);
      window.removeEventListener("focus", refreshToday);
    };
  }, []);

  const effectiveDailyRecords = useMemo(
    () => dailyRecords.map((record) => ({ ...record, ...recordOverrides[dailyRecordKey(record.participantId, record.day)] })),
    [recordOverrides],
  );

  const login = (user: CurrentUser) => {
    saveCurrentUser(user);
    setCurrentUser(user);
  };

  const logout = () => {
    saveCurrentUser(null);
    setCurrentUser(null);
  };

  const updateDailyRecord = (participantId: string, patch: DailyRecordPatch, day = today.absoluteDay) => {
    if (!canEditParticipant(currentUser, participantId) || day > today.absoluteDay) return;
    saveDailyRecordPatch(participantId, patch, day, currentUser);
    setRecordOverrides(readDailyRecordOverrides());
  };

  const addNotification = (notification: Omit<ProgramNotification, "id" | "createdAt" | "author">) => {
    saveProgramNotification(notification, currentUser);
    setNotifications(readStoredNotifications());
  };

  const saveMonthlySheikhReview = (review: Omit<MonthlySheikhReview, "hijriMonthIndex" | "hijriYear" | "savedAt">) => {
    persistMonthlySheikhReview(review);
    setMonthlySheikhReviews(readMonthlySheikhReviews());
  };

  const value: SohbaStore = {
    ready,
    today,
    currentUser,
    login,
    logout,
    effectiveDailyRecords,
    updateDailyRecord,
    notifications,
    addNotification,
    monthlySheikhReviews,
    saveMonthlySheikhReview,
  };

  return <SohbaStoreContext.Provider value={value}>{children}</SohbaStoreContext.Provider>;
}

export function useSohbaStore() {
  const store = useContext(SohbaStoreContext);
  if (!store) throw new Error("useSohbaStore must be used within a SohbaStoreProvider");
  return store;
}
