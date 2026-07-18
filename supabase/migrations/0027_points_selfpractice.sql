-- =============================================================
-- 0027: 手動ポイント付与・早退・自主練記録
--   1. practice_attendances.status に 'early_leave'(早退)を追加
--   2. point_grants: 幹部・主将・管理者が理由付きで手動ポイントを付与
--      (アプリ外の貢献・大会運営の手伝いなどを評価するため)
--   3. self_practices: 各メンバーが自主練(水中/ウエイト/その他)を記録。
--      チーム内公開でモチベーションになるようにする。ポイント加点対象。
--
-- 何度実行しても安全(idempotent)。
-- 新規デプロイ: 0001 → … → 0026 → 0027 の順。
-- =============================================================

-- ---------- 1. 早退 ----------
alter table public.practice_attendances drop constraint if exists practice_attendances_status_check;
alter table public.practice_attendances add constraint practice_attendances_status_check
  check (status in ('present', 'absent', 'late', 'excused', 'early_leave'));

-- ---------- 2. 手動ポイント付与 ----------
create table if not exists public.point_grants (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  granted_by uuid not null references public.users (id) on delete cascade,
  points int not null check (points between 1 and 200),
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_point_grants_team_user
  on public.point_grants (team_id, user_id);

alter table public.point_grants enable row level security;

drop policy if exists point_grants_select on public.point_grants;
drop policy if exists point_grants_insert on public.point_grants;
drop policy if exists point_grants_delete on public.point_grants;

-- 閲覧: チーム内全員(誰がなぜポイントを得たか透明にする)
create policy point_grants_select on public.point_grants for select
  using (public.is_team_member(team_id));
-- 付与: 幹部・主将・管理者のみ、本人名義(granted_by)で
create policy point_grants_insert on public.point_grants for insert
  with check (
    granted_by = auth.uid()
    and public.has_team_role(team_id, array['executive','captain','admin']::public.membership_role[])
  );
-- 取消: 付与者本人 or 管理者(誤付与の訂正用)
create policy point_grants_delete on public.point_grants for delete
  using (
    granted_by = auth.uid()
    or public.has_team_role(team_id, array['admin']::public.membership_role[])
  );

-- ---------- 3. 自主練記録 ----------
create table if not exists public.self_practices (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  practice_date date not null default current_date,
  -- 種別: swim(水中自主) / weight(ウエイト) / other(その他)
  category text not null check (category in ('swim', 'weight', 'other')),
  menu text,
  created_at timestamptz not null default now()
);

create index if not exists idx_self_practices_team_date
  on public.self_practices (team_id, practice_date desc);
create index if not exists idx_self_practices_user
  on public.self_practices (team_id, user_id, practice_date desc);

alter table public.self_practices enable row level security;

drop policy if exists self_practices_select on public.self_practices;
drop policy if exists self_practices_insert on public.self_practices;
drop policy if exists self_practices_update on public.self_practices;
drop policy if exists self_practices_delete on public.self_practices;

-- 閲覧: チーム内全員(自主練を見せ合うことでモチベーションにする)
create policy self_practices_select on public.self_practices for select
  using (public.is_team_member(team_id));
-- 記録・修正・削除: 本人のみ
create policy self_practices_insert on public.self_practices for insert
  with check (user_id = auth.uid() and public.is_team_member(team_id));
create policy self_practices_update on public.self_practices for update
  using (user_id = auth.uid());
create policy self_practices_delete on public.self_practices for delete
  using (user_id = auth.uid());
