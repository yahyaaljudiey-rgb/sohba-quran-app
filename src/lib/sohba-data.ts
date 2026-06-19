export type ReviewType = "quarter" | "half";
export type Level = 1 | 2;
export type ParticipantStatus =
  | "idle"
  | "wird_done"
  | "ready"
  | "recited"
  | "redo"
  | "late";

export interface Participant {
  id: string;
  name: string;
  groupId: number;
  reviewType: ReviewType;
  status: ParticipantStatus;
  progress: number; // 0..100
  notes?: string;
}

export interface Group {
  id: number;
  name: string;
  level: Level;
  tone: "cream" | "sky";
  code: string;
  participants: Participant[];
}

export interface ProgramDay {
  absoluteDay: number;
  hijriMonthIndex: number;
  hijriMonthName: string;
  hijriDay: number;
  hijriYear: number;
  week: number;
  monthLength: number;
  dateLabel: string;
}

export interface DailyRecord {
  participantId: string;
  day: number;
  hijriMonthIndex: number;
  wirdDone: boolean;
  listenedToPeer: boolean;
  uploaded: boolean;
  needsRedo: boolean;
  progressNote?: string;
}

export type DailyRecordPatch = Partial<Pick<DailyRecord, "wirdDone" | "listenedToPeer" | "uploaded" | "needsRedo" | "progressNote">>;

export interface WirdPlan {
  level: Level;
  reviewType: ReviewType;
  title: string;
  dailyPortion: string;
  surah: string;
  ayat: string;
  juz: string;
  pages: string;
  quarters: string;
}

export interface ParticipantReport extends Participant {
  groupName: string;
  partnerName: string;
  monthDaysElapsed: number;
  wirdDays: number;
  listenedDays: number;
  uploadedDays: number;
  pairedUploadDays: number;
  lateDays: number;
  redoDays: number;
  weeklyProgress: number;
  monthlyProgress: number;
}

export type ReportPeriod = "weekly" | "monthly";

export interface ParticipantPeriodReport extends ParticipantReport {
  period: ReportPeriod;
  periodLabel: string;
  days: Array<{
    day: ProgramDay;
    record: DailyRecord;
    partnerUploaded: boolean;
    completion: number;
    status: ParticipantStatus;
  }>;
}

export interface MonthlySheikhReview {
  participantId: string;
  hijriMonthIndex: number;
  hijriYear: number;
  mode: "online" | "in_person";
  reviewType: ReviewType;
  grade: string;
  errors: string[];
  note: string;
  savedAt: string;
}

export type CurrentUser =
  | { role: "participant"; participantId: string }
  | { role: "admin"; name: string };

export type NotificationTarget =
  | { type: "all" }
  | { type: "group"; groupId: number }
  | { type: "participant"; participantId: string };

export interface ProgramNotification {
  id: string;
  title: string;
  body: string;
  kind: "thanks" | "alert" | "reminder" | "general";
  target: NotificationTarget;
  createdAt: string;
  author: string;
}

export const STATUS_LABEL: Record<ParticipantStatus, string> = {
  idle: "لم يبدأ",
  wird_done: "أنجز الورد",
  ready: "سمّع للنظير",
  recited: "رُفع الثنائي",
  redo: "يحتاج إعادة",
  late: "متأخر",
};

export const STATUS_COLOR: Record<ParticipantStatus, string> = {
  idle: "bg-status-idle/15 text-muted-foreground border-status-idle/30",
  wird_done: "bg-status-ready/15 text-[color:var(--status-ready)] border-status-ready/40",
  ready: "bg-status-ready/20 text-[color:var(--gold-deep)] border-status-ready/50",
  recited: "bg-status-done/15 text-[color:var(--status-done)] border-status-done/40",
  redo: "bg-status-redo/15 text-[color:var(--status-redo)] border-status-redo/40",
  late: "bg-status-late/15 text-[color:var(--status-late)] border-status-late/40",
};

export const REVIEW_LABEL: Record<ReviewType, string> = {
  quarter: "ربع حزب",
  half: "نصف حزب (ربعان)",
};

export const LEVEL_LABEL: Record<Level, string> = {
  1: "المستوى الأول",
  2: "المستوى الثاني",
};

export const REVIEW_COLOR: Record<ReviewType, string> = {
  quarter: "bg-[color:var(--review-quarter)]/12 text-[color:var(--review-quarter)] border-[color:var(--review-quarter)]/30",
  half: "bg-[color:var(--review-half)]/12 text-[color:var(--review-half)] border-[color:var(--review-half)]/30",
};

// Malaysia Hijri calendar: 1 Muharram 1448 AH starts on 16 June 2026.
const PROGRAM_START_GREGORIAN = "2026-06-16T00:00:00+08:00";
const PROGRAM_HIJRI_YEAR = 1448;
const HIJRI_MONTHS = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
];
const HIJRI_MONTH_LENGTHS = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];
const PROGRAM_YEAR_DAYS = HIJRI_MONTH_LENGTHS.reduce((sum, days) => sum + days, 0);
const dayMs = 24 * 60 * 60 * 1000;

const mk = (id: string, name: string, groupId: number, reviewType: ReviewType): Participant => ({
  id,
  name,
  groupId,
  reviewType,
  status: "idle",
  progress: 0,
});

const baseGroups: Group[] = [
  {
    id: 1, name: "أهل الهمة", level: 2, tone: "sky", code: "47",
    participants: [
      mk("p1", "حسان البكالي", 1, "half"),
      mk("p2", "أنس الزجام", 1, "half"),
    ],
  },
  {
    id: 2, name: "رواد الإتقان", level: 2, tone: "sky", code: "58",
    participants: [
      mk("p13", "نسيم المصعبي", 2, "half"),
      mk("p14", "عبدالرحمن الزراع", 2, "half"),
    ],
  },
  {
    id: 3, name: "أهل القرآن", level: 1, tone: "cream", code: "19",
    participants: [
      mk("p3", "محمد صلاح", 3, "quarter"),
      mk("p4", "يونس المليكي", 3, "quarter"),
    ],
  },
  {
    id: 4, name: "رفقاء القرآن", level: 1, tone: "cream", code: "73",
    participants: [
      mk("p5", "محسن اليحيصي", 4, "quarter"),
      mk("p6", "عرفات عمران", 4, "quarter"),
    ],
  },
  {
    id: 5, name: "أهل العزم", level: 1, tone: "cream", code: "26",
    participants: [
      mk("p7", "عبدالله الفقيه", 5, "quarter"),
      mk("p8", "عبدالكريم اليافعي", 5, "quarter"),
    ],
  },
  {
    id: 6, name: "رواد التميز", level: 1, tone: "cream", code: "84",
    participants: [
      mk("p9", "سعد حيدري", 6, "quarter"),
      mk("p10", "أنس خالد فرعة", 6, "quarter"),
    ],
  },
  {
    id: 7, name: "بُناة المجد", level: 1, tone: "cream", code: "35",
    participants: [
      mk("p11", "يحيى الجديعي", 7, "quarter"),
      mk("p12", "عبدالرحمن الرهاوي", 7, "quarter"),
    ],
  },
];

const ADMIN_CODE = "90";

export const verifyParticipantCode = (participantId: string, code: string) => {
  const group = baseGroups.find((g) => g.participants.some((p) => p.id === participantId));
  return group?.code === code.trim();
};

export const verifyAdminCode = (code: string) => code.trim() === ADMIN_CODE;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const dailyCompletion = (record?: DailyRecord) => {
  if (!record) return 0;
  if (record.needsRedo) return 50;
  if (record.uploaded) return 100;
  if (record.listenedToPeer) return 70;
  if (record.wirdDone) return 35;
  return 0;
};

export const getProgramDay = (date = new Date()): ProgramDay => {
  // Native Intl Islamic calendar matches Malaysia for the configured 1448 start; the fixed start keeps day indexing stable.
  const start = new Date(PROGRAM_START_GREGORIAN);
  const absoluteDay = Math.max(1, Math.floor((date.getTime() - start.getTime()) / dayMs) + 1);
  let remaining = absoluteDay;
  let monthIndex = 0;

  while (remaining > HIJRI_MONTH_LENGTHS[monthIndex % 12]) {
    remaining -= HIJRI_MONTH_LENGTHS[monthIndex % 12];
    monthIndex += 1;
  }

  const hijriMonthIndex = monthIndex % 12;
  const hijriYear = PROGRAM_HIJRI_YEAR + Math.floor(monthIndex / 12);
  const monthLength = HIJRI_MONTH_LENGTHS[hijriMonthIndex];
  const hijriMonthName = HIJRI_MONTHS[hijriMonthIndex];

  return {
    absoluteDay,
    hijriMonthIndex,
    hijriMonthName,
    hijriDay: remaining,
    hijriYear,
    week: Math.ceil(remaining / 7),
    monthLength,
    dateLabel: `${remaining} ${hijriMonthName} ${hijriYear}هـ`,
  };
};

const baseParticipants = () => baseGroups.flatMap((g) => g.participants);

const findGroupById = (groupId: number) => baseGroups.find((g) => g.id === groupId);

const requireGroupById = (groupId: number): Group => {
  const group = findGroupById(groupId);
  if (!group) throw new Error(`لا توجد مجموعة بالمعرف ${groupId}`);
  return group;
};

const requirePartner = (participantId: string): Participant => {
  const partner = getPartner(participantId);
  if (!partner) throw new Error(`لا يوجد نظير مسجل للمشارك ${participantId}`);
  return partner;
};

const dailyRecordFor = (participant: Participant, day: number, hijriMonthIndex: number): DailyRecord => ({
  participantId: participant.id,
  day,
  hijriMonthIndex,
  wirdDone: false,
  listenedToPeer: false,
  uploaded: false,
  needsRedo: false,
});

export const buildDailyRecords = (untilDay = PROGRAM_YEAR_DAYS): DailyRecord[] => {
  const participants = baseParticipants();
  const records: DailyRecord[] = [];
  const start = new Date(PROGRAM_START_GREGORIAN).getTime();

  for (let day = 1; day <= untilDay; day += 1) {
    const programDay = getProgramDay(new Date(start + (day - 1) * dayMs));
    participants.forEach((participant) => {
      records.push(dailyRecordFor(participant, day, programDay.hijriMonthIndex));
    });
  }

  return records;
};

export const dailyRecords = buildDailyRecords();

export const getPartner = (participantId: string) => {
  const group = baseGroups.find((g) => g.participants.some((p) => p.id === participantId));
  return group?.participants.find((p) => p.id !== participantId);
};

export const dailyRecordKey = (participantId: string, day: number) => `${participantId}:${day}`;
const DAILY_RECORDS_STORAGE_KEY = "sohba-daily-records-v2";

const CURRENT_USER_STORAGE_KEY = "sohba-current-user-v1";

export const readCurrentUser = (): CurrentUser | null => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(CURRENT_USER_STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
};

export const saveCurrentUser = (user: CurrentUser | null) => {
  if (typeof window === "undefined") return;
  if (user) {
    window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  }
};

export const userDisplayName = (user: CurrentUser | null) => {
  if (!user) return "الدخول";
  if (user.role === "admin") return user.name;
  return baseParticipants().find((p) => p.id === user.participantId)?.name ?? "مشارك";
};

export const isAdmin = (user: CurrentUser | null) => user?.role === "admin";

export const visibleParticipantIdsFor = (user: CurrentUser | null) => {
  if (!user || user.role === "admin") return baseParticipants().map((p) => p.id);
  const partner = getPartner(user.participantId);
  return [user.participantId, partner?.id].filter(Boolean) as string[];
};

export const canEditParticipant = (user: CurrentUser | null, participantId: string) =>
  isAdmin(user) || visibleParticipantIdsFor(user).includes(participantId);

export const readDailyRecordOverrides = (): Record<string, DailyRecordPatch> => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(DAILY_RECORDS_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
};

export const saveDailyRecordPatch = (participantId: string, patch: DailyRecordPatch, day = getProgramDay().absoluteDay, user: CurrentUser | null = readCurrentUser()) => {
  if (typeof window === "undefined" || day > getProgramDay().absoluteDay || !canEditParticipant(user, participantId)) return;
  const overrides = readDailyRecordOverrides();
  const key = dailyRecordKey(participantId, day);
  overrides[key] = { ...overrides[key], ...patch };
  window.localStorage.setItem(DAILY_RECORDS_STORAGE_KEY, JSON.stringify(overrides));
};

export const getEffectiveDailyRecords = () => {
  const overrides = readDailyRecordOverrides();
  return dailyRecords.map((record) => ({
    ...record,
    ...overrides[dailyRecordKey(record.participantId, record.day)],
  }));
};

export const getRecordForDay = (participantId: string, day = getProgramDay().absoluteDay) =>
  dailyRecords.find((r) => r.participantId === participantId && r.day === day);

export const getEffectiveRecordForDay = (participantId: string, day = getProgramDay().absoluteDay) =>
  getEffectiveDailyRecords().find((r) => r.participantId === participantId && r.day === day);

export const getTodayRecord = (participantId: string) => getRecordForDay(participantId);

export const getEffectiveTodayRecord = (participantId: string) => getEffectiveRecordForDay(participantId);

export const dayRelativeLabel = (absoluteDay: number, today = getProgramDay()) => {
  if (absoluteDay === today.absoluteDay) return "اليوم";
  if (absoluteDay === today.absoluteDay - 1) return "أمس";
  return "";
};

export const selectableProgramDays = (today = getProgramDay()) => {
  const start = new Date(PROGRAM_START_GREGORIAN).getTime();
  const days = Array.from({ length: PROGRAM_YEAR_DAYS }, (_, index) => {
    const absoluteDay = index + 1;
    return getProgramDay(new Date(start + index * dayMs));
  });
  const pastAndToday = days.filter((day) => day.absoluteDay <= today.absoluteDay).reverse();
  const future = days.filter((day) => day.absoluteDay > today.absoluteDay);
  return [...pastAndToday, ...future];
};

export const isPairUploadedToday = (groupId: number) => {
  const group = findGroupById(groupId);
  if (!group) return false;
  return group.participants.every((p) => getTodayRecord(p.id)?.uploaded);
};

export const isEffectivePairUploadedForDay = (groupId: number, day = getProgramDay().absoluteDay) => {
  const group = findGroupById(groupId);
  if (!group) return false;
  return group.participants.every((p) => getEffectiveRecordForDay(p.id, day)?.uploaded);
};

export const isEffectivePairUploadedToday = (groupId: number) => isEffectivePairUploadedForDay(groupId);

export const statusForParticipantOnDay = (participant: Participant, day = getProgramDay().absoluteDay, records = getEffectiveDailyRecords()): ParticipantStatus => {
  const record = records.find((r) => r.participantId === participant.id && r.day === day);
  if (!record) return "idle";
  const group = baseGroups.find((g) => g.id === participant.groupId);
  const pairUploaded = Boolean(group?.participants.every((p) => records.find((r) => r.participantId === p.id && r.day === day)?.uploaded));
  if (record.needsRedo) return "redo";
  if (record.uploaded && pairUploaded) return "recited";
  if (record.listenedToPeer) return "ready";
  if (record.wirdDone) return "wird_done";
  return "idle";
};

const statusFromRecord = (participant: Participant, records = dailyRecords, today = getProgramDay()): ParticipantStatus =>
  statusForParticipantOnDay(participant, today.absoluteDay, records);

const participantMonthReport = (participant: Participant, records = dailyRecords, today = getProgramDay()): ParticipantReport => {
  const group = requireGroupById(participant.groupId);
  const partner = requirePartner(participant.id);
  const monthRecords = records.filter(
    (r) => r.participantId === participant.id && r.hijriMonthIndex === today.hijriMonthIndex,
  );
  const partnerMonthRecords = records.filter(
    (r) => r.participantId === partner.id && r.hijriMonthIndex === today.hijriMonthIndex,
  );
  const monthDaysElapsed = today.hijriDay;
  const wirdDays = monthRecords.filter((r) => r.wirdDone).length;
  const listenedDays = monthRecords.filter((r) => r.listenedToPeer).length;
  const uploadedDays = monthRecords.filter((r) => r.uploaded).length;
  const pairedUploadDays = monthRecords.filter((r) => {
    const partnerRecord = partnerMonthRecords.find((pr) => pr.day === r.day);
    return r.uploaded && Boolean(partnerRecord?.uploaded);
  }).length;
  const redoDays = monthRecords.filter((r) => r.needsRedo).length;
  const lateDays = monthRecords.filter((r) => (r.wirdDone || r.listenedToPeer) && !r.uploaded).length;
  const monthStartDay = today.absoluteDay - today.hijriDay + 1;
  const weekStartDay = Math.max(monthStartDay, today.absoluteDay - 6);
  const weekRecords = monthRecords.filter((r) => r.day >= weekStartDay);
  const weeklyProgress = Math.round(weekRecords.reduce((sum, r) => sum + dailyCompletion(r), 0) / Math.max(1, weekRecords.length));
  const monthlyProgress = Math.round(monthRecords.reduce((sum, r) => sum + dailyCompletion(r), 0) / Math.max(1, monthDaysElapsed));

  return {
    ...participant,
    groupName: group.name,
    partnerName: partner.name,
    status: statusFromRecord(participant, records, today),
    progress: clamp(monthlyProgress, 0, 100),
    monthDaysElapsed,
    wirdDays,
    listenedDays,
    uploadedDays,
    pairedUploadDays,
    lateDays,
    redoDays,
    weeklyProgress,
    monthlyProgress,
  };
};

export const participantReports = (records = getEffectiveDailyRecords(), today = getProgramDay()): ParticipantReport[] =>
  baseParticipants().map((participant) => participantMonthReport(participant, records, today));

export const reportDayRange = (period: ReportPeriod, today = getProgramDay()) => {
  const recordsStart = period === "weekly"
    ? Math.max(1, today.absoluteDay - 6)
    : today.absoluteDay - today.hijriDay + 1;
  const start = new Date(PROGRAM_START_GREGORIAN).getTime();
  return Array.from({ length: today.absoluteDay - recordsStart + 1 }, (_, index) =>
    getProgramDay(new Date(start + (recordsStart + index - 1) * dayMs)),
  );
};

export const buildParticipantPeriodReport = (participantId: string, period: ReportPeriod, records = getEffectiveDailyRecords(), today = getProgramDay()): ParticipantPeriodReport | null => {
  const participant = baseParticipants().find((p) => p.id === participantId);
  if (!participant) return null;
  const base = participantMonthReport(participant, records, today);
  const partner = getPartner(participantId);
  const days = reportDayRange(period, today).map((day) => {
    const record = records.find((r) => r.participantId === participantId && r.day === day.absoluteDay) ?? dailyRecordFor(participant, day.absoluteDay, day.hijriMonthIndex);
    const partnerRecord = partner
      ? records.find((r) => r.participantId === partner.id && r.day === day.absoluteDay)
      : undefined;
    return {
      day,
      record,
      partnerUploaded: Boolean(partnerRecord?.uploaded),
      completion: dailyCompletion(record),
      status: statusForParticipantOnDay(participant, day.absoluteDay, records),
    };
  });

  return {
    ...base,
    period,
    periodLabel: period === "weekly" ? "التقرير الأسبوعي" : `تقرير شهر ${today.hijriMonthName}`,
    days,
  };
};

export const buildVisiblePeriodReports = (period: ReportPeriod, user: CurrentUser | null = readCurrentUser(), today = getProgramDay()) =>
  visibleParticipantIdsFor(user)
    .map((id) => buildParticipantPeriodReport(id, period, getEffectiveDailyRecords(), today))
    .filter(Boolean) as ParticipantPeriodReport[];

export const getGroups = (records = getEffectiveDailyRecords(), today = getProgramDay()): Group[] => baseGroups.map((group) => ({
  ...group,
  participants: group.participants.map((participant) => {
    const report = participantMonthReport(participant, records, today);
    return {
      ...participant,
      status: report.status,
      progress: report.progress,
    };
  }),
}));

export const allParticipants = (): Participant[] =>
  participantReports().map((participant) => ({
    id: participant.id,
    name: participant.name,
    groupId: participant.groupId,
    reviewType: participant.reviewType,
    status: participant.status,
    progress: participant.progress,
    notes: participant.notes,
  }));

const QURAN_PAGES = 604;
const QURAN_QUARTERS = 240;

const portionQuarters: Record<ReviewType, number> = {
  quarter: 1,
  half: 2,
};

const surahForPage = (page: number) => {
  if (page <= 49) return "سورة البقرة";
  if (page <= 76) return "سورة آل عمران";
  if (page <= 106) return "سورة النساء";
  if (page <= 127) return "سورة المائدة";
  return "ورد مصحفي متتابع";
};

const programDayFromAbsolute = (absoluteDay: number) => {
  const start = new Date(PROGRAM_START_GREGORIAN).getTime();
  return getProgramDay(new Date(start + (absoluteDay - 1) * dayMs));
};

const buildWirdPlan = (level: Level, reviewType: ReviewType, absoluteDay = getProgramDay().absoluteDay): WirdPlan => {
  const programDay = programDayFromAbsolute(absoluteDay);
  const quartersPerDay = portionQuarters[reviewType];
  const startQuarter = ((absoluteDay - 1) * quartersPerDay) % QURAN_QUARTERS;
  const endQuarter = startQuarter + quartersPerDay;
  const pageStart = Math.floor((startQuarter * QURAN_PAGES) / QURAN_QUARTERS) + 1;
  const pageEnd = Math.min(QURAN_PAGES, Math.max(pageStart, Math.floor((endQuarter * QURAN_PAGES) / QURAN_QUARTERS)));
  const hizbStart = Math.floor(startQuarter / 4) + 1;
  const hizbEnd = Math.floor((endQuarter - 1) / 4) + 1;
  const quarterStart = (startQuarter % 4) + 1;
  const quarterEnd = ((endQuarter - 1) % 4) + 1;
  const quarterLabel = hizbStart === hizbEnd
    ? `الحزب ${hizbStart}، الربع ${quarterStart}${quartersPerDay > 1 ? `-${quarterEnd}` : ""}`
    : `الحزب ${hizbStart} الربع ${quarterStart} إلى الحزب ${hizbEnd} الربع ${quarterEnd}`;

  return {
    level,
    reviewType,
    title: `ورد ${LEVEL_LABEL[level]}`,
    dailyPortion: REVIEW_LABEL[reviewType],
    surah: surahForPage(pageStart),
    ayat: `ورد يوم ${programDay.dateLabel}`,
    juz: `الأسبوع ${programDay.week} من شهر ${programDay.hijriMonthName}`,
    pages: `صفحات ${pageStart} - ${pageEnd}`,
    quarters: quarterLabel,
  };
};

export const getWirdForLevel = (level: Level) => buildWirdPlan(level, level === 2 ? "half" : "quarter");

export const getWirdForLevelOnDay = (level: Level, absoluteDay: number) => {
  const reviewType = level === 2 ? "half" : "quarter";
  return buildWirdPlan(level, reviewType, absoluteDay);
};

export const getWirdForParticipant = (participantId: string) => {
  const group = baseGroups.find((g) => g.participants.some((p) => p.id === participantId));
  return getWirdForLevel(group?.level ?? 1);
};

export const participantOptions = () => baseParticipants();


const NOTIFICATIONS_STORAGE_KEY = "sohba-notifications-v1";

const seedNotifications: ProgramNotification[] = [
  {
    id: "seed-wird",
    title: "تذكير بالورد اليومي",
    body: "حافظ على وردك اليومي قبل غروب الشمس.",
    kind: "reminder",
    target: { type: "all" },
    createdAt: new Date(PROGRAM_START_GREGORIAN).toISOString(),
    author: "النظام",
  },
];

export const readStoredNotifications = (): ProgramNotification[] => {
  if (typeof window === "undefined") return seedNotifications;
  try {
    const stored = JSON.parse(window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) ?? "[]") as ProgramNotification[];
    return [...seedNotifications, ...stored];
  } catch {
    return seedNotifications;
  }
};

export const saveProgramNotification = (notification: Omit<ProgramNotification, "id" | "createdAt" | "author">, user: CurrentUser | null = readCurrentUser()) => {
  if (typeof window === "undefined" || !isAdmin(user)) return;
  const stored = JSON.parse(window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) ?? "[]") as ProgramNotification[];
  stored.unshift({
    ...notification,
    id: `n-${Date.now()}`,
    createdAt: new Date().toISOString(),
    author: user.name,
  });
  window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(stored));
};

const participantGroupId = (participantId: string) =>
  baseParticipants().find((p) => p.id === participantId)?.groupId;

export const notificationsForUser = (all: ProgramNotification[] = readStoredNotifications(), user: CurrentUser | null = readCurrentUser()) => {
  if (!user || user.role === "admin") return all;
  const groupId = participantGroupId(user.participantId);
  return all.filter((n) => {
    if (n.target.type === "all") return true;
    if (n.target.type === "participant") return n.target.participantId === user.participantId;
    if (n.target.type === "group") return n.target.groupId === groupId;
    return false;
  });
};

export const targetLabel = (target: NotificationTarget) => {
  if (target.type === "all") return "الجميع";
  if (target.type === "group") return baseGroups.find((g) => g.id === target.groupId)?.name ?? "مجموعة";
  return baseParticipants().find((p) => p.id === target.participantId)?.name ?? "طالب";
};

const MONTHLY_SHEIKH_STORAGE_KEY = "sohba-monthly-sheikh-review-v1";
export const monthlyReviewKey = (participantId: string, today = getProgramDay()) => `${participantId}:${today.hijriYear}:${today.hijriMonthIndex}`;

export const readMonthlySheikhReviews = (): Record<string, MonthlySheikhReview> => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(MONTHLY_SHEIKH_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
};

export const getMonthlySheikhReview = (participantId: string) =>
  readMonthlySheikhReviews()[monthlyReviewKey(participantId)];

export const saveMonthlySheikhReview = (review: Omit<MonthlySheikhReview, "hijriMonthIndex" | "hijriYear" | "savedAt">) => {
  if (typeof window === "undefined") return;
  const today = getProgramDay();
  const reviews = readMonthlySheikhReviews();
  reviews[monthlyReviewKey(review.participantId, today)] = {
    ...review,
    hijriMonthIndex: today.hijriMonthIndex,
    hijriYear: today.hijriYear,
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(MONTHLY_SHEIKH_STORAGE_KEY, JSON.stringify(reviews));
};

export const getProgramInfo = (today = getProgramDay()) => ({
  startDate: "1 محرم 1448هـ",
  currentDate: today.dateLabel,
  currentDay: today.hijriDay,
  currentMonth: today.hijriMonthName,
  currentWeek: today.week,
  monthProgress: Math.round((today.hijriDay / today.monthLength) * 100),
  participants: baseParticipants().length,
  groups: baseGroups.length,
});

export const whatsappMessages = [
  "تم بحمد الله إنجاز الورد اليومي.",
  "تذكير: لا يكتمل رفع اليوم إلا بعد أن يسمع كل نظير لصاحبه في نفس اليوم.",
  "تذكير بمراجعة الأقران الأسبوعية بين الثنائي.",
  "الرجاء عدم تأخير الورد حتى لا تتراكم المراجعة.",
  "نوع المراجعة المطلوبة هذا الأسبوع: ربع حزب.",
  "نوع المراجعة المطلوبة هذا الأسبوع: نصف حزب.",
];
