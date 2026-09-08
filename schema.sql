-- ============================================================
-- Zed West — تجهيز قاعدة البيانات
-- انسخ الكود ده كامل والصقه في Supabase → SQL Editor → Run
-- ============================================================

create table if not exists locations (
  id text primary key,
  name text not null,
  building text
);

create table if not exists tasks (
  id text primary key,
  name text not null,
  description text,
  frequency text default 'يومي',
  location_id text references locations(id) on delete cascade,
  active boolean default true
);

create table if not exists instances (
  id text primary key,
  date date not null,
  task_id text references tasks(id) on delete cascade,
  location_id text references locations(id) on delete cascade,
  status text default 'incomplete',
  supervisor_name text,
  completed_at timestamptz,
  notes text,
  photo text,
  scanned boolean default false
);

create index if not exists idx_instances_date on instances(date);

-- تفعيل الحماية على مستوى الصفوف
alter table locations enable row level security;
alter table tasks enable row level security;
alter table instances enable row level security;

-- سياسة مبسطة: أي شخص معه رابط ومفتاح anon (اللي هيتضاف داخل التطبيق فقط)
-- يقدر يقرأ ويكتب. مناسب لأداة داخلية للفريق وليست عامة على الإنترنت.
create policy "allow all read" on locations for select using (true);
create policy "allow all write" on locations for insert with check (true);
create policy "allow all update" on locations for update using (true);
create policy "allow all delete" on locations for delete using (true);

create policy "allow all read" on tasks for select using (true);
create policy "allow all write" on tasks for insert with check (true);
create policy "allow all update" on tasks for update using (true);
create policy "allow all delete" on tasks for delete using (true);

create policy "allow all read" on instances for select using (true);
create policy "allow all write" on instances for insert with check (true);
create policy "allow all update" on instances for update using (true);
create policy "allow all delete" on instances for delete using (true);
