-- =============================================================
-- 0018: 分析チーム記録項目を拡充する(3項目追加)
--   分析モードのタップ項目が縦パス・速攻参加・対人守備の3つだけで
--   手薄だったため、プレー総合スコアの手薄な軸(創出力・ボール奪取・
--   決定力)に実データを供給する項目を追加する:
--     off_ball_move : マーク外し(味方の得点機会を作るオフボールの動き) → 創出力
--     rebound_win   : リバウンド奪取(こぼれ球の回収)                  → ボール奪取
--     drive_break   : ドライブ突破(守備を割ってゴール前まで運ぶ)      → 決定力
--   いずれも player_id 必須・subtype/result なし(既存CHECKのelse分岐で成立)。
--
-- 何度実行しても安全(idempotent)。
-- 新規デプロイ: 0001 → … → 0017 → 0018 の順。
-- =============================================================

alter table public.stats_events drop constraint if exists stats_events_type_check;
alter table public.stats_events add constraint stats_events_type_check
  check (type in (
    'shot', 'assist', 'cut', 'drawn_exclusion', 'exclusion',
    'offensive_foul', 'miss', 'gk_faced', 'attack_end_no_shot', 'opponent_goal',
    'key_pass', 'counter_join', 'defense_stop',
    'off_ball_move', 'rebound_win', 'drive_break'
  ));
