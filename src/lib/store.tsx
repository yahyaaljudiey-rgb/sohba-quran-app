import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getProgramDay,
  readCurrentUser,
  saveCurrentUser,
  type CurrentUser,
  type DailyRecord,
  type DailyRecordPatch,
  type MonthlySheikhReview,
  type ProgramDay,
  type ProgramNotification,
} from "@/lib/sohba-data";
import {
  addNotification as addNotificationFn,
  fetchDailyRecords,
  fetchMonthlySheikhReviews,
  fetchNotifications,
  saveMonthlySheikhReviewFn,
  updateDailyRecord as updateDailyRecordFn,
} from "@/lib/server-fns";

interface SohbaStore {
  ready: boolean;
  loadError: string | null;
  today: ProgramDay;
  currentUser: CurrentUser | null;
  login: (user: CurrentUser) => void;
  logout: () => void;
  effectiveDailyRecords: DailyRecord[];
  updateDailyRecord: (participantId: string, patch: DailyRecordPatch, day?: number) => Promise<void>;
  notifications: ProgramNotification[];
  addNotification: (notification: Omit<ProgramNotification, "id" | "createdAt" | "author">) => Promise<void>;
  monthlySheikhReviews: Record<string, MonthlySheikhReview>;
  saveMonthlySheikhReview: (review: Omit<MonthlySheikhReview, "hijriMonthIndex" | "hijriYear" | "savedAt">) => Promise<void>;
}

const SohbaStoreContext = createContext<SohbaStore | null>(null);

// The Hijri day changes silently while the app stays open, and — more
// importantly — other people's devices write to the shared database in the
// background. Re-poll on an interval and whenever the tab regains focus
// instead of freezing everything at the moment this tab first loaded.
const REFRESH_INTERVAL_MS = 30_000;

export function SohbaStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState<ProgramDay>(() => getProgramDay());
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [effectiveDailyRecords, setEffectiveDailyRecords] = useState<DailyRecord[]>([]);
  const [notifications, setNotifications] = useState<ProgramNotification[]>([]);
  const [monthlySheikhReviews, setMonthlySheikhReviews] = useState<Record<string, MonthlySheikhReview>>({});

  const refreshSharedData = async () => {
    try {
      const [records, notes, reviews] = await Promise.all([
        fetchDailyRecords(),
        fetchNotifications(),
        fetchMonthlySheikhReviews(),
      ]);
      setEffectiveDailyRecords(records);
      setNotifications(notes);
      setMonthlySheikhReviews(reviews);
      setLoadError(null);
    } catch (error) {
      console.error(error);
      setLoadError("تعذّر الاتصال بقاعدة البيانات. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.");
    }
  };

  useEffect(() => {
    setCurrentUser(readCurrentUser());
    refreshSharedData().finally(() => setReady(true));

    const tick = () => {
      setToday((prev) => {
        const next = getProgramDay();
        return next.absoluteDay === prev.absoluteDay ? prev : next;
      });
      refreshSharedData();
    };
    const intervalId = window.setInterval(tick, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, []);

  const login = (user: CurrentUser) => {
    saveCurrentUser(user);
    setCurrentUser(user);
  };

  const logout = () => {
    saveCurrentUser(null);
    setCurrentUser(null);
  };

  const updateDailyRecord = async (participantId: string, patch: DailyRecordPatch, day = today.absoluteDay) => {
    await updateDailyRecordFn({ data: { participantId, day, patch, user: currentUser } });
    await refreshSharedData();
  };

  const addNotification = async (notification: Omit<ProgramNotification, "id" | "createdAt" | "author">) => {
    await addNotificationFn({ data: { notification, user: currentUser } });
    await refreshSharedData();
  };

  const saveMonthlySheikhReview = async (review: Omit<MonthlySheikhReview, "hijriMonthIndex" | "hijriYear" | "savedAt">) => {
    await saveMonthlySheikhReviewFn({ data: { review, user: currentUser } });
    await refreshSharedData();
  };

  const value: SohbaStore = {
    ready,
    loadError,
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
