-- =============================================================
-- 0008: プロフィール(姓名)・役職併用・試合削除権限・視聴ログ
--   1. users に family_name / given_name(漢字フルネームの姓・名)
--   2. memberships に secondary_role(管理者のみ役職を併用できる)
--   3. matches の削除をマネージャーにも許可(2段階確認はアプリ側)
--   4. clip_views(メンバーごとのクリップ閲覧回数・時間ログ)
--
-- 既存デプロイへの適用: このファイルを Supabase SQL Editor に
-- 丸ごと貼り付けて Run するだけ。
-- ※ 何度実行しても安全(idempotent)に書いてあります。
-- 新規デプロイ: 0001 → 0004 → 0005 → 0006 → 0007 → 0008 の順。
-- =============================================================

-- ---------- 1. 姓名(漢字フルネーム) ----------
alter table public.users add column if not exists family_name text;
alter table public.users add column if not exists given_name text;
-- 本人が自分のプロフィールを更新できるよう列単位のUPDATE権限を付与
grant update (name, avatar_url, family_name, given_name)
  on table public.users to authenticated;

-- サインアップ時のメタデータから姓名も取り込む
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, family_name, given_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'family_name',
    new.raw_user_meta_data ->> 'given_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------- 2. 役職の併用(管理者のみ) ----------
alter table public.memberships add column if not exists secondary_role public.membership_role;
-- 管理者(primary=admin)以外は併用不可
alter table public.memberships
  drop constraint if exists memberships_secondary_role_admin_only;
alter table public.memberships
  add constraint memberships_secondary_role_admin_only
  check (secondary_role is null or role = 'admin');

-- 権限判定(RLS)を primary/secondary の和集合にする
create or replace function public.has_team_role(p_team_id uuid, p_roles public.membership_role[])
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.team_id = p_team_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and (m.role = any (p_roles) or m.secondary_role = any (p_roles))
  );
$$;

-- ---------- 3. 試合削除をマネージャーにも許可 ----------
drop policy if exists matches_delete on public.matches;
create policy matches_delete on public.matches for delete
  using (public.has_team_role(team_id, array['manager','admin']::public.membership_role[]));

-- ---------- 4. クリップ視聴ログ ----------
create table if not exists public.clip_views (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  clip_id uuid not null references public.video_clips (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade default auth.uid(),
  -- クリップ画面の滞在時間(秒)。0〜24時間でガード
  dwell_seconds integer not null default 0 check (dwell_seconds between 0 and 86400),
  -- 外部動画リンク(該当場面を開く)を押したか
  opened_video boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_clip_views_team_user on public.clip_views (team_id, user_id);
create index if not exists idx_clip_views_clip on public.clip_views (clip_id);

-- team_id は親クリップから強制(0001の関数を再利用)
drop trigger if exists trg_clip_view_team on public.clip_views;
create trigger trg_clip_view_team before insert or update of clip_id on public.clip_views
  for each row execute function public.enforce_clip_child_team();

alter table public.clip_views enable row level security;

-- 閲覧集計はスタッフが全員分を、各メンバーは自分の分を見られる
drop policy if exists clip_views_select on public.clip_views;
create policy clip_views_select on public.clip_views for select
  using (
    user_id = auth.uid()
    or public.has_team_role(team_id, array['manager','tactical_staff','executive','captain','admin']::public.membership_role[])
  );
-- 記録は本人分のみ
drop policy if exists clip_views_insert on public.clip_views;
create policy clip_views_insert on public.clip_views for insert
  with check (public.is_team_member(team_id) and user_id = auth.uid());
drop policy if exists clip_views_update on public.clip_views;
create policy clip_views_update on public.clip_views for update
  using (user_id = auth.uid());
