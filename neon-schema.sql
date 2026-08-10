-- شغّل هذا الملف كاملًا في Neon: Vercel Dashboard > Storage > قاعدة بياناتك > Query (أو SQL Editor)

create table if not exists daily_records (
  participant_id text not null,
  day integer not null,
  wird_done boolean not null default false,
  listened_to_peer boolean not null default false,
  uploaded boolean not null default false,
  marked_late boolean not null default false,
  progress_note text,
  updated_at timestamptz not null default now(),
  primary key (participant_id, day)
);

-- ترقية لقاعدة بيانات منشورة مسبقًا (تستبدل "إعادة" بحالة "متأخر" المحسوبة
-- تلقائيًا عند التسجيل بعد انتهاء يوم الورد):
alter table daily_records add column if not exists marked_late boolean not null default false;
alter table daily_records drop column if exists needs_redo;

create table if not exists notifications (
  id text primary key,
  title text not null,
  body text not null,
  kind text not null,
  target jsonb not null,
  created_at timestamptz not null default now(),
  author text not null
);

create table if not exists monthly_sheikh_reviews (
  participant_id text not null,
  hijri_year integer not null,
  hijri_month_index integer not null,
  mode text not null,
  review_type text not null,
  grade text not null,
  errors jsonb not null default '[]',
  note text,
  saved_at timestamptz not null default now(),
  primary key (participant_id, hijri_year, hijri_month_index)
);

-- السرد الأسبوعي: يسجّله الشيخ لكل طالب على حدة (سجل واحد لكل أسبوع هجري)،
-- ويظهر للطالب في تقريره للقراءة فقط. الإدخال والتعديل من صلاحية الشيخ وحده،
-- والتحقق من ذلك يتم في دوال السيرفر (src/lib/server-fns.ts).
create table if not exists weekly_sheikh_recitations (
  participant_id text not null,
  hijri_year integer not null,
  hijri_month_index integer not null,
  week integer not null,
  mode text not null,
  portion text not null default '',
  grade text not null,
  errors jsonb not null default '[]',
  note text,
  saved_at timestamptz not null default now(),
  primary key (participant_id, hijri_year, hijri_month_index, week)
);
