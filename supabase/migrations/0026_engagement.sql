-- =============================================================
-- 0026: エンゲージメント基盤
--   1. memberships.enrollment_year(入部年度)= 学年の算出に使う
--   2. proposals(改善・課題の提案ボックス)
--   3. qa_questions / qa_answers(先輩に聞けるQ&A掲示板)
--
--   ポイント/レベル/バッジは新テーブルを作らず、既存データ
--   (コンディション・出欠・FB・コメント・クリップ・提案採用・Q&A)
--   から算出する(src/lib/points.ts)。二重計上や整合ズレが起きない。
--
--   匿名投稿(is_anonymous)は表示上の匿名。created_by は
--   ポイント付与とモデレーションのため保持するが、UIでは著者名を出さない。
--
-- 何度実行しても安全(idempotent)。
-- 新規デプロイ: 0001 → … → 0025 → 0026 の順。
-- =============================================================

-- ---------- 1. 入部年度(学年) ----------
alter table public.memberships add column if not exists enrollment_year int;

-- ---------- 2. 提案ボックス ----------
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  created_by uuid not null references public.users (id) on delete cascade,
  -- 種別: app(アプリ改善) / team(チームの課題) / practice(練習メニュー) / other
  category text not null check (category in ('app', 'team', 'practice', 'other')),
  title text not null,
  body text not null,
  solution text,
  is_anonymous boolean not null default false,
  -- 状態: open(受付) / reviewing(検討中) / adopted(採用) / declined(見送り)
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'adopted', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists idx_proposals_team
  on public.proposals (team_id, created_at desc);

alter table public.proposals enable row level security;

drop policy if exists proposals_select on public.proposals;
drop policy if exists proposals_insert on public.proposals;
drop policy if exists proposals_update on public.proposals;
drop policy if exists proposals_delete on public.proposals;

-- 閲覧: チーム内全員
create policy proposals_select on public.proposals for select
  using (public.is_team_member(team_id));
-- 投稿: 本人名義のみ
create policy proposals_insert on public.proposals for insert
  with check (created_by = auth.uid() and public.is_team_member(team_id));
-- 更新: 状態変更は幹部・主将・管理者。著者も自分の投稿を編集できる
create policy proposals_update on public.proposals for update
  using (
    created_by = auth.uid()
    or public.has_team_role(team_id, array['executive','captain','admin']::public.membership_role[])
  );
-- 削除: 著者 or 管理者
create policy proposals_delete on public.proposals for delete
  using (
    created_by = auth.uid()
    or public.has_team_role(team_id, array['admin']::public.membership_role[])
  );

-- ---------- 3. Q&A掲示板 ----------
create table if not exists public.qa_questions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  created_by uuid not null references public.users (id) on delete cascade,
  -- 種別: class(授業・単位) / job(就活) / skill(水球) / life(部の生活) / other
  category text not null check (category in ('class', 'job', 'skill', 'life', 'other')),
  title text not null,
  body text not null,
  is_anonymous boolean not null default false,
  -- ベストアンサー(質問者が選ぶ)。qa_answers への参照
  resolved_answer_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_qa_questions_team
  on public.qa_questions (team_id, created_at desc);

create table if not exists public.qa_answers (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  question_id uuid not null references public.qa_questions (id) on delete cascade,
  created_by uuid not null references public.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_qa_answers_question
  on public.qa_answers (question_id, created_at);

-- resolved_answer_id の参照整合(回答削除時はNULLに戻す)
alter table public.qa_questions
  drop constraint if exists qa_questions_resolved_answer_fk;
alter table public.qa_questions
  add constraint qa_questions_resolved_answer_fk
  foreign key (resolved_answer_id) references public.qa_answers (id) on delete set null;

alter table public.qa_questions enable row level security;
alter table public.qa_answers enable row level security;

drop policy if exists qa_questions_select on public.qa_questions;
drop policy if exists qa_questions_insert on public.qa_questions;
drop policy if exists qa_questions_update on public.qa_questions;
drop policy if exists qa_questions_delete on public.qa_questions;
drop policy if exists qa_answers_select on public.qa_answers;
drop policy if exists qa_answers_insert on public.qa_answers;
drop policy if exists qa_answers_update on public.qa_answers;
drop policy if exists qa_answers_delete on public.qa_answers;

-- 質問: チーム内で閲覧、本人名義で投稿、著者(ベストアンサー選択・編集)/管理者
create policy qa_questions_select on public.qa_questions for select
  using (public.is_team_member(team_id));
create policy qa_questions_insert on public.qa_questions for insert
  with check (created_by = auth.uid() and public.is_team_member(team_id));
create policy qa_questions_update on public.qa_questions for update
  using (
    created_by = auth.uid()
    or public.has_team_role(team_id, array['admin']::public.membership_role[])
  );
create policy qa_questions_delete on public.qa_questions for delete
  using (
    created_by = auth.uid()
    or public.has_team_role(team_id, array['admin']::public.membership_role[])
  );

-- 回答: チーム内で閲覧、本人名義で投稿、著者/管理者が編集・削除
create policy qa_answers_select on public.qa_answers for select
  using (public.is_team_member(team_id));
create policy qa_answers_insert on public.qa_answers for insert
  with check (created_by = auth.uid() and public.is_team_member(team_id));
create policy qa_answers_update on public.qa_answers for update
  using (
    created_by = auth.uid()
    or public.has_team_role(team_id, array['admin']::public.membership_role[])
  );
create policy qa_answers_delete on public.qa_answers for delete
  using (
    created_by = auth.uid()
    or public.has_team_role(team_id, array['admin']::public.membership_role[])
  );
