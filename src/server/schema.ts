/*
  Database schema. Every statement is idempotent, so it runs safely at each
  start-up (locally on the embedded Postgres, in production on the real one).
*/
export const SCHEMA = /* sql */ `
create table if not exists counters (
  name  text primary key,
  value integer not null
);
-- The first member gets 101, so the counter starts one below.
insert into counters (name, value) values ('member_code', 100)
  on conflict (name) do nothing;

create table if not exists staff (
  id            serial primary key,
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  is_owner      boolean not null default false,
  permissions   jsonb not null default '[]'::jsonb,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists members (
  code          integer primary key,
  email         text not null unique,
  password_hash text not null,
  phone         text not null,
  ultimate_code text not null,
  title         text not null
                check (title in ('consultant','manager','senior_manager','director')),
  status        text not null default 'active'
                check (status in ('active','suspended')),
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);
create unique index if not exists members_ultimate_code_key
  on members (lower(ultimate_code));

create table if not exists member_grants (
  member_code integer not null references members(code) on delete cascade,
  grant_key   text not null,
  granted_by  integer references staff(id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (member_code, grant_key)
);

create table if not exists sessions (
  token_hash text primary key,
  kind       text not null check (kind in ('member','staff')),
  subject_id integer not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_subject_idx on sessions (kind, subject_id);

create table if not exists notifications (
  id         serial primary key,
  title      text not null,
  body       text not null,
  audience   text not null check (audience in ('all','codes')),
  sent_by    integer references staff(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists notification_targets (
  notification_id integer not null references notifications(id) on delete cascade,
  member_code     integer not null references members(code) on delete cascade,
  primary key (notification_id, member_code)
);

create table if not exists notification_reads (
  notification_id integer not null references notifications(id) on delete cascade,
  member_code     integer not null references members(code) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (notification_id, member_code)
);

-- Messages between members and the team: one conversation per member.
create table if not exists messages (
  id             serial primary key,
  member_code    integer not null references members(code) on delete cascade,
  from_staff     boolean not null default false,
  staff_id       integer references staff(id) on delete set null,
  body           text not null,
  read_by_staff  boolean not null default false,
  read_by_member boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists messages_member_idx on messages (member_code, created_at);

-- Member profile: name, city, and whether they appear in the (optional) ranking.
alter table members add column if not exists full_name text;
alter table members add column if not exists city text;
alter table members add column if not exists show_in_ranking boolean not null default false;

-- Profile photo, already shrunk to a small JPEG (stored as base64 text).
create table if not exists member_avatars (
  member_code integer primary key references members(code) on delete cascade,
  data_b64    text not null,
  updated_at  timestamptz not null default now()
);

-- What a member has done: "video:<slug>" formation finished, "toolbox:<id>" script used.
create table if not exists member_progress (
  member_code  integer not null references members(code) on delete cascade,
  item_key     text not null,
  completed_at timestamptz not null default now(),
  primary key (member_code, item_key)
);

-- A member's reserved place at one occurrence of a live.
create table if not exists live_reservations (
  member_code integer not null references members(code) on delete cascade,
  live_id     text not null,
  starts_at   timestamptz not null,
  created_at  timestamptz not null default now(),
  primary key (member_code, live_id, starts_at)
);

-- Which live is on air right now (one row; live_id is null when nothing is live).
create table if not exists live_status (
  id         integer primary key check (id = 1),
  live_id    text,
  started_at timestamptz,
  started_by integer references staff(id) on delete set null
);
insert into live_status (id) values (1) on conflict (id) do nothing;

-- PV needed to unlock a formation, as set by staff. A formation without a row
-- here uses the default written in lib/data.ts.
create table if not exists video_pv (
  slug       text primary key,
  pv         integer not null check (pv >= 0),
  updated_by integer references staff(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- A member asking to unlock a formation because they earned enough PV on Ultimate
-- this month. Staff check the PV on the member's Ultimate account, then approve.
-- An approval counts only during its month ("month" is "YYYY-MM", Algiers time).
create table if not exists unlock_requests (
  id            serial primary key,
  member_code   integer not null references members(code) on delete cascade,
  video_slug    text not null,
  pv_claimed    integer not null check (pv_claimed >= 0),
  pv_required   integer not null check (pv_required >= 0),
  note          text,
  locale        text not null default 'fr',
  month         text not null,
  status        text not null default 'pending'
                check (status in ('pending','approved','rejected','revoked')),
  decided_by    integer references staff(id) on delete set null,
  decided_at    timestamptz,
  decision_note text,
  created_at    timestamptz not null default now()
);
create index if not exists unlock_requests_member_idx on unlock_requests (member_code, month);
create index if not exists unlock_requests_status_idx on unlock_requests (status, month);
create unique index if not exists unlock_requests_one_pending
  on unlock_requests (member_code, video_slug, month) where status = 'pending';

-- Phones / browsers a member agreed to receive notifications on.
create table if not exists push_subscriptions (
  id          serial primary key,
  member_code integer not null references members(code) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_member_idx on push_subscriptions (member_code);

-- Row-level security on every table, with no policies. The website connects as the
-- table owner (which is not affected), but a host that exposes the database through
-- a public data API (Supabase does for the "public" schema) can then read nothing.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end
$$;
`;
