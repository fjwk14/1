-- =============================================================
-- 0011: クリップコメントのスレッド化 + 宛先メンション
--   コメント(話題)ごとにセクションを分け、返信でラリーできるようにする。
--   parent_comment_id : 返信先(nullなら話題の起点)
--   mention_user_ids  : 宛先メンション(誰に向けたコメントか)
--
-- 何度実行しても安全(idempotent)。
-- 新規デプロイ: 0001 → … → 0010 → 0011 の順。
-- =============================================================

alter table public.clip_comments
  add column if not exists parent_comment_id uuid
    references public.clip_comments (id) on delete cascade;

alter table public.clip_comments
  add column if not exists mention_user_ids uuid[] not null default '{}';

create index if not exists idx_clip_comments_thread
  on public.clip_comments (clip_id, parent_comment_id, created_at);

-- 返信は同じクリップの親コメントにのみ付けられる(スレッドの整合性)
create or replace function public.enforce_comment_parent()
returns trigger language plpgsql as $$
declare
  v_parent_clip uuid;
  v_parent_parent uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;
  select clip_id, parent_comment_id into v_parent_clip, v_parent_parent
    from public.clip_comments where id = new.parent_comment_id;
  if v_parent_clip is null or v_parent_clip <> new.clip_id then
    raise exception 'parent comment not found in this clip';
  end if;
  -- ネストは1段まで(返信への返信は同じスレッドにぶら下げる)
  if v_parent_parent is not null then
    new.parent_comment_id := v_parent_parent;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_comment_parent on public.clip_comments;
create trigger trg_comment_parent
  before insert or update of parent_comment_id on public.clip_comments
  for each row execute function public.enforce_comment_parent();
