-- =============================================================
-- 0015: 練習記録 + 出欠
--   practices: 1回の練習(日付・時間・メニュー・メモ)。
--   practice_attendances: その練習の各メンバーの出欠(出席/欠席/遅刻/見学)。
--   マネージャーの負担軽減のため、当日の練習内容と出欠を1画面で残す。
--
-- 何度実行しても安全(idempotent)。
-- 新規デプロイ: 0001 → … → 0014 → 0015 の順。
-- =============================================================

-- ---------- practices ----------
create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  practice_date date not null default current_date,
  start_time text, -- "19:00" など自由入力(厳密な時刻型にはしない)
  end_time text,
  location text,
  menu text, -- 当日メニュー(複数行の自由記述)
  note text,
  created_by uuid references public.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_practices_team_date
  on public.practices (team_id, practice_date desc);

-- ---------- practice_attendances ----------
create table if not exists public.practice_attendances (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'present'
    check (status in ('present', 'absent', 'late', 'excused')),
  created_at timestamptz not null default now(),
  unique (practice_id, user_id)
);

create index if not exists idx_practice_attendances_practice
  on public.practice_attendances (practice_id);
create index if not exists idx_practice_attendances_user
  on public.practice_attendances (team_id, user_id);

-- ---------- RLS ----------
alter table public.practices enable row level security;
alter table public.practice_attendances enable row level security;

drop policy if exists practices_select on public.practices;
drop policy if exists practices_insert on public.practices;
drop policy if exists practices_update on public.practices;
drop policy if exists practices_delete on public.practices;

-- 閲覧は全チームメンバー。記録・編集・削除はマネージャー・管理者のみ。
create policy practices_select on public.practices for select
  using (public.is_team_member(team_id));
create policy practices_insert on public.practices for insert
  with check (
    public.has_team_role(team_id, array['manager','admin']::public.membership_role[])
    and created_by = auth.uid()
  );
create policy practices_update on public.practices for update
  using (public.has_team_role(team_id, array['manager','admin']::public.membership_role[]));
create policy practices_delete on public.practices for delete
  using (public.has_team_role(team_id, array['manager','admin']::public.membership_role[]));

drop policy if exists practice_attendances_select on public.practice_attendances;
drop policy if exists practice_attendances_insert on public.practice_attendances;
drop policy if exists practice_attendances_update on public.practice_attendances;
drop policy if exists practice_attendances_delete on public.practice_attendances;

create policy practice_attendances_select on public.practice_attendances for select
  using (public.is_team_member(team_id));
create policy practice_attendances_insert on public.practice_attendances for insert
  with check (public.has_team_role(team_id, array['manager','admin']::public.membership_role[]));
create policy practice_attendances_update on public.practice_attendances for update
  using (public.has_team_role(team_id, array['manager','admin']::public.membership_role[]));
create policy practice_attendances_delete on public.practice_attendances for delete
  using (public.has_team_role(team_id, array['manager','admin']::public.membership_role[]));
