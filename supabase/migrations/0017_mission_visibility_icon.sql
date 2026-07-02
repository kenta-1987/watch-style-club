-- Watch Style Club — Phase 5.1.1: Mission 表示条件（visibility）・アイコン（icon）
-- Supabase Studio の SQL Editor で実行（0016 の後）。
--
-- ■ visibility（表示条件・カテゴリ非依存の汎用文字列。CHECK制約は付けない＝将来値を自由に追加できる）
--   'always'        : 常時表示（現状の Welcome Mission はこれ＝デフォルト）
--   'logged_in'     : ログイン中のみ表示。現状 lib/missions.ts の呼び出し経路はすべてログイン前提のため
--                     実質 'always' と同じ挙動（ログアウト状態からミッションを見せるUI導線ができた時に効いてくる）
--   'purchased'     : 購入者限定（例: Ultra Mission）。判定コンテキストが無いため現状は「安全に非表示」になる
--                     プレースホルダー。実装時は lib/missions.ts の isMissionVisible() に判定を足すだけでよい。
--   'campaign_only' : キャンペーン期間中のみ（例: 夏キャンペーン）。同上、現状は非表示プレースホルダー。
--
-- ■ icon（絵文字1文字程度のUIアイコン。null許容＝未設定時はチェックマークのみのシンプル表示に自然に戻る）
alter table public.mission_definitions
  add column if not exists visibility text not null default 'always',
  add column if not exists icon text;

-- Welcome Mission の各行にアイコンを付与
update public.mission_definitions set icon = '🎉' where code = 'welcome_signup';
update public.mission_definitions set icon = '📝' where code = 'welcome_profile';
update public.mission_definitions set icon = '📷' where code = 'welcome_first_style';
