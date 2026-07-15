-- =============================================================
-- 0022: 5対6(退水守備)の記録項目を追加
--   down_man_stop: 自チームが退水して5対6になった局面を、相手に
--   得点させず守り切った回数。分析チームがD(ディフェンス)項目として記録し、
--   守備力軸に反映される。
--   分母は既存の exclusion(自チームの退水)イベント数を使う
--   (スタッツ表・ダッシュボードで「退水守備成功率」として表示)。
--
-- 何度実行しても安全(idempotent)。
-- 新規デプロイ: 0001 → … → 0021 → 0022 の順。
-- =============================================================

alter table public.stats_events drop constraint if exists stats_events_type_check;
alter table public.stats_events add constraint stats_events_type_check
  check (type in (
    'shot', 'assist', 'cut', 'drawn_exclusion', 'exclusion',
    'offensive_foul', 'miss', 'gk_faced', 'attack_end_no_shot', 'opponent_goal',
    'key_pass', 'counter_join', 'defense_stop',
    'off_ball_move', 'rebound_win', 'drive_break',
    'side_switch', 'screen', 'shot_block', 'steal_ball',
    'down_man_stop'
  ));
