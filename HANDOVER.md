# Watch Style Club — 開発引き継ぎ書

> 最終更新: 2026-06-30 / 作成: Claude Code セッション末
> このドキュメント単体で次セッションが開発を再開できることを目標に記述。

---

## Product Vision（最重要・全設計の前提）

Watch Style Club は **Apple Watch の SNS ではない**。

目的は——
> **「購入前に完成形を見て、そのまま再現・購入できる Style Commerce Platform」** を作ること。

- 現在は **Apple Watch を PMF 市場**として展開している。
- 将来的には **アパレル / スニーカー / ガジェット / フード** へ横展開できる **SKU中心プラットフォーム**を目指す。

### 設計原則
- すべての設計は「**Apple Watch 専用**」ではなく「**SKU中心**」を前提とする。
- **新しい機能を追加するときは、Apple Watch だけでなく他カテゴリへ展開できる設計かを必ず確認すること。**

> 関連: §10「`posts.watch_model` がApple Watch固有 → 他カテゴリ展開時に要再設計」/ §11-P2「他カテゴリ展開（brands/skus に category 追加）」も参照。

---

## 0. 概要 / 環境

- **プロダクト**: Apple Watch の「Style（本体 × バンド × 文字盤）」を共有・発見・再現する SKU中心のコミュニティ。AWJ（Apple Watch Journal）の顧客接点・メール会員獲得が事業目的。
- **本番URL**: https://watch-style-club.vercel.app （Vercel・git push で自動デプロイ）
- **コード**: `~/Desktop/クライアント別/カンパーニュ/楽天/画像生成アプリ/watch-style-club/`
- **スタック**: Next.js 14.2.35 (App Router) / TypeScript / Supabase (`@supabase/ssr` 0.12) / Tailwind / Vercel
- **Supabase project ref**: `zhinkicjsbnrxmhfkwwu`（local と本番は同一プロジェクト＝migration は1回実行で両方反映）
- **ローカル起動**: `npm --prefix watch-style-club run dev -- -p 3100`（Claude では preview の launch名 `wsc`）。**3000はTOTONOE等の別アプリが使う**ので 3100 固定。
- **管理者アカウント**: `@kenta1987`（email `kenta@ideareal.co.jp`, `profiles.role='admin'`）。検証用パスワード `WscTest1234!`（**要変更**）。

---

## 1. 現在の状態（Current Status）

### コア機能
- ✅ **Auth**: username+password / Google OAuth / Magic Link（3方式併存）
- ✅ **Profile / Onboarding**: username（不変・@handle・公開唯一ID）, display_name, avatar, bio, favorite_watch
- ✅ **User Collection**: 所有 Watch / Band / Face（owned_* テーブル・/settings で CRUD）
- ✅ **Style投稿**: 複数メディア（最大5・動画1・各50MB）・カバー選択（←→）・SKU選択式 or 未登録バンド
- ✅ **メディア表示**: カード=カバー（動画▶/時間・複数▣）／詳細=カルーセル（`<video controls>`）
- ✅ **Timeline**（=「今日のApple Watch」）: Editor's Pick rail + 今週人気 rail + 新着フィード
- ✅ **Gallery**: 検索・フィルタ（model/brand/color）
- ✅ **Ranking**: 今週/今月（`get_ranking` RPC）
- ✅ **Like / Bookmark**: 機能実装（toggle_like RPC / post_bookmarks）
- ✅ **Editor's Pick**: `posts.featured_at`（運営がレビュー画面でPick）
- ✅ **SKU中心設計**: brands → series → skus（`is_awj` フラグ）→ posts.sku_id
- ✅ **Recommended Face**: SKU に紐づく編集部おすすめ文字盤（複数・priority順・投稿者は入力しない）
- ✅ **Product ページ** `/sku/[handle]`: おすすめ文字盤一覧 + このSKUのStyle + 🛒Shopify
- ✅ **Admin**: 投稿レビュー（承認/Pick/SKU紐付け/複数メディア・動画プレビュー）, SKU/Face管理, キャンペーン応募+CSV, 週次ダイジェスト
- ✅ **Campaign**: 投稿時に自動応募紐付け（1ユーザー1応募）+ 応募者CSV（BOM付UTF-8）
- ✅ **Slack通知**: 新規投稿時（`SLACK_WEBHOOK_URL` 空なら no-op）

### 部分実装 / 未実装
- 🟡 **Follow**: `follows` テーブル・RLSのみ（UI未実装）
- 🟡 **Shopify連携**: handle参照で購入リンク自動生成のみ。**価格/在庫API・商品ページ埋め込みは未**
- 🟡 **SMTP**: Supabaseデフォルト（**レート厳しい**）。本番キャンペーン前に Resend 等接続が必須
- 🟡 **Face Apple共有リンク**: Admin に入力欄あり（`apple_share_url`）。データ空＝「準備中」表示
- 🟢 **Point Engine（Style Points / Phase 5A-C）**: 実装済み（**migration 0015 はユーザーが SQL Editor で要実行**）。コミュニティ貢献ポイント（購入ポイントではない）。承認+100 / Pick+300 / プロフィール完成+100 を自動付与。Header SP・プロフィールStats・設定の履歴・`/admin/points`・`/admin/points/rules`（コードレスでpt調整）まで実装。**Point と Score（将来の信用スコア）は別概念**。カテゴリ非依存（将来 アパレル/スニーカー等で共通利用・Shopifyアプリ中核）。
- 🔴 **Shopify App化（埋め込み）**: 未着手
- 🔴 **AI Coordinate / AI Recommendation**: 未着手（Recommended Face は現状 編集部手動）
- 🔴 **他カテゴリ展開**（アパレル/スニーカー等）: SKU構造は対応可。`posts.watch_model` がApple Watch固有なので将来要調整
- 🔴 **SKU画像アップロード**: `skus.image_path` は http URL のときのみ表示（専用バケット未定義）

### 開発フェーズ
- **フェーズ1 MVP** → **Phase 2.0（リテンション）** → **User × Style（v2.1）** → **SKU中心設計** → **複数メディア/動画** まで完了。
- **2026年8月キャンペーンの稼働ラインには到達**（投稿→承認→公開→応募→CSV）。残課題は SMTP 接続。

---

## 2. 今回のセッションで実装した内容

1. **Google OAuth**: 「Googleで続ける」を /login・/signup に追加。初回は username 未設定→ /onboarding で必須入力。username+password・Magic Link は併存。
2. **ヘッダーのユーザーメニュー**: アバタークリックで マイページ/設定/ログアウト ドロップダウン（`HeaderUserMenu`）。
3. **複数メディア + 動画投稿**:
   - DB: `post_media`（media_type, storage_path, width/height/duration_seconds, sort_order）+ RLS。
   - 投稿フォーム全面刷新（モデル→バンド→カラー→複数メディア→コメント）。カバー選択（←→）。
   - 表示: カード=カバー（▶/時間/▣）、詳細=カルーセル。`getStyleById` が全メディア返却。
4. **SKU選択式の投稿**: AWJ取扱は ブランド→シリーズ→カラー のカスケード（`getAwjPickerTree`、`is_awj` フィルタ）。選択で `posts.sku_id` 保存、商品URLは handle から自動。未登録バンドは自由入力。
5. **skus.is_awj** 追加（将来 Nomad/Pitaka 等の未取扱ブランド登録に備える）。
6. **Storage**: `post-images` に `file_size_limit=50MB` + 動画mime許可。
7. **UI修正**: いいねハートを左右対称（Feather形）に。

---

## 3. 変更ファイル一覧（直近の複数メディア/動画バッチ）

### 追加
- `supabase/migrations/0014_post_media.sql`
- `lib/format.ts`（`formatDuration`）
- `lib/shopify.ts`（`shopUrlForHandle`）
- `components/media/CoverMedia.tsx`（カバー：画像/動画＋バッジ）
- `components/media/MediaCarousel.tsx`（詳細：カルーセル＋video）

### 変更
- `lib/database.types.ts`（post_media / skus.is_awj）
- `lib/posts.ts`（MediaItem / cover系フィールド / attachCoverInfo / getStyleById 全メディア）
- `lib/image.ts`（readMediaMeta）
- `lib/catalog.ts`（getAwjPickerTree）
- `lib/actions/posts.ts`（createPost をメディア配列+SKU対応に改修）
- `components/post/PostForm.tsx`（全面刷新）
- `app/post/new/page.tsx`（pickerTree 受け渡し）
- `components/timeline/TimelineItem.tsx`（cover/carousel、🛒 SKU由来）
- `app/(public)/p/[id]/page.tsx`（media カルーセル）
- `components/gallery/GalleryCard.tsx` / `components/profile/StyleGrid.tsx` / `components/timeline/MiniCard.tsx`（動画/複数バッジ）
- `app/(public)/timeline/page.tsx`（MiniCardにcover情報）
- `app/admin/page.tsx` / `components/admin/ReviewCard.tsx`（複数/動画プレビュー）
- `components/timeline/LikeButton.tsx`（ハート修正）

### 削除（過去セッション含む現状の欠番）
- `components/timeline/AICoordinateButton.tsx`
- `components/style/ReproduceStyle.tsx`
- `supabase/migrations/0005_style_face.FUTURE.sql`
- `supabase/migrations/0010_recommended_face.sql`（SKU設計に置換）

---

## 4. Migration 一覧（全て **適用済み**）

| # | ファイル | 内容 | 状態 |
|---|---|---|---|
| 0001 | schema | profiles/posts/post_likes/campaigns/campaign_entries/watch_models/band_brands | ✅適用 |
| 0002 | rls_functions | RLS全般・is_admin()・handle_new_user トリガー・toggle_like RPC | ✅適用 |
| 0003 | storage | post-images バケット（非公開）+ ポリシー | ✅適用 |
| 0004 | phase20 | featured_at / post_bookmarks / get_ranking RPC / index | ✅適用 |
| ~~0005~~ | （削除） | Face Library案・廃止 | — |
| 0006 | user_profiles | profiles に username/display_name/avatar_path/bio/favorite_watch | ✅適用 |
| 0007 | collections | owned_watches/bands/faces | ✅適用 |
| 0008 | follows | follows（構造のみ） | ✅適用 |
| 0009 | avatars_storage | avatars バケット（公開） | ✅適用 |
| ~~0010~~ | （削除） | recommended_face_*（postごと）・SKU設計に置換 | — |
| 0011 | catalog | brands / series / skus | ✅適用 |
| 0012 | face_recommendations | face_recommendations（SKU紐付け） | ✅適用 |
| 0013 | posts_sku | posts.sku_id | ✅適用 |
| 0014 | post_media | post_media / skus.is_awj / Storage設定（50MB+動画mime） | ✅適用 |
| 0015 | point_engine | point_accounts / point_ledger(+campaign_id) / point_rules / RLS / award_points() / public_points() / seed rules | 🔴**未適用（要SQL実行）** |

> **0015 は未適用**。Supabase SQL Editor で `supabase/migrations/0015_point_engine.sql` を実行すること（local=本番 同一なので1回で両反映）。実行までは Point 系UIは 0 表示で安全に動作（テーブル無し＝graceful）。新しい migration を足す場合は `0016_` から。番号 0005/0010 は欠番（再利用しない）。

---

## 5. DB構成（主要テーブル）

| テーブル | 役割 |
|---|---|
| `profiles` | ユーザー公開情報。`username`(不変・@handle), `display_name`, `avatar_path`, `bio`, `favorite_watch`, `role`(member/admin), `nickname`(旧・display_name互換), `watch_model`, `marketing_opt_in` |
| `posts` | Style投稿。`image_path`(=カバーのコピー), `sku_id`(AWJ), `band_brand/name/color`+`product_url`(未登録fallback), `status`(pending/approved/rejected), `like_count`, `featured_at`(Editor's Pick) |
| `post_media` | 投稿の複数メディア。`media_type`(image/video), `storage_path`, `width/height/duration_seconds`, `sort_order`(0=カバー) |
| `post_likes` | いいね（複合PK post_id+user_id）。`toggle_like` RPCで増減 |
| `post_bookmarks` | 保存（非公開・本人のみ閲覧） |
| `brands` | ブランド（Campagne Sélection 等）。slug, name |
| `series` | シリーズ（FKM 等）。brand_id |
| `skus` | カラー単位の最小Style単位。`color_name`, `shopify_product_handle/variant_id`(Shopify源泉), `is_awj`(AWJ取扱), `image_path` |
| `face_recommendations` | SKUごとの編集部おすすめ文字盤（複数）。`name/category/apple_share_url/editor_comment/rating/priority/watch_model(nullで全機種)/is_published` |
| `owned_watches` / `owned_bands` / `owned_faces` | ユーザーの所有コレクション（プロフィール表示・本人編集） |
| `follows` | フォロー（構造のみ・UI未） |
| `campaigns` / `campaign_entries` | キャンペーンと応募（1ユーザー1応募 unique） |
| `watch_models` / `band_brands` | フィルタ用マスタ（seed） |
| `point_accounts` | Style Points 残高（1ユーザー1行・**ledgerの集計キャッシュ**）。`balance`/`lifetime_earned`/`lifetime_spent`。直接更新しない |
| `point_ledger` | ポイント元帳（**真実の源・追記のみ**）。`delta`/`reason`/`source_type`/`source_id`/`campaign_id`(分析用nullable)/`metadata`。一意index `(user_id,reason,source_type,source_id)` で重複付与防止 |
| `point_rules` | 付与ルール（`code`/`name`/`points`/`is_active`/`description`）。`/admin/points/rules` でコードレス編集。seed 7件（自動付与は style_approved/editors_pick/profile_completed の3つのみ active） |

**重要関数**: `is_admin()`（SECURITY DEFINER）, `handle_new_user()`（signup時 profiles 自動生成トリガー）, `toggle_like(p_post_id)`, `get_ranking(p_period, p_limit)`, `award_points(...)`（**唯一の残高更新入口・冪等・service_role限定**）, `public_points(user_id)`（公開プロフィール用に balance/lifetime_earned のみ返す）。

> **Point と Score は別概念（重要）**: 今回実装の **Style Points (SP)** は「コミュニティ貢献ポイント」（獲得/消費の通貨）。将来導入する **Style Score（信用スコア）** は SP から交換され、ランキング/おすすめユーザー/Editor's Pickアルゴリズム等に使う**別物・別テーブル**で、今回は未実装。混同しないこと。
> **カテゴリ非依存**: `reason`/`source_type` は汎用文字列で Apple Watch 専用ではない。将来 アパレル/スニーカー/ガジェット/フード でも同一エンジンを使う前提（Shopifyアプリの中核機能）。

---

## 6. Storage構成

| バケット | 公開 | 用途 | アップロードRLS | 制限 |
|---|---|---|---|---|
| `post-images` | **非公開** | 投稿の画像・動画（cover/carousel） | 自分のフォルダ `{user_id}/...` のみ | file_size_limit **50MB** / mime: image jpeg,png,webp + video mp4,quicktime |
| `avatars` | **公開** | プロフィールアバター | 自分のフォルダのみ | （特になし） |

- **post-images は署名URL配信**（`lib/storage.ts getSignedUrls(paths, expiresInSec=600)`、動画は詳細で3600秒）。
- avatars は公開URL（`lib/avatar.ts avatarUrl(path)`）。
- 承認前の画像が直URL拡散しないよう post-images は非公開。

---

## 7. 認証構成

3方式併存（**外部に表示されるのは常に @username のみ**）:

1. **username + password**（主）: `/login` で username 入力 → サーバーアクション `loginWithUsername`（`lib/actions/auth.ts`）が **service_role で username→email を解決**（email はクライアントに出さない）→ `signInWithPassword`。失敗は「IDまたはパスワードが違います」で統一。
2. **Google OAuth**: 「Googleで続ける」（`components/auth/GoogleButton.tsx`）→ `signInWithOAuth({provider:'google', redirectTo: SITE_URL||origin + '/auth/callback'})`。
3. **Magic Link**（フォールバック）: `/login/magic`。

**フロー**:
- `signUpWithUsername`: 空き確認 → signUp → service_role で profiles.username/display_name 確定。
- `/auth/callback`（`app/auth/callback/route.ts`）: `exchangeCodeForSession` → **profile.username が無い or watch_model が無い → /onboarding**。Google初回は username 無し→必ず onboarding。
- **Onboarding**（`/onboarding`）: username 未設定なら必須入力（一意・`^[a-z0-9_]{3,20}$`）。display_name は Google の full_name/name を初期値、email ローカル部から username 候補。
- **email の役割**: 本人確認・通知・パスワードリセットのみ（非公開）。
- **アカウントリンク**: 同一email既存ユーザーは Supabase が email確認済なら Google identity を自動リンク → 既存 profile（Style/Collection/Like/Bookmark）維持。
- **middleware**（`lib/supabase/middleware.ts`）: `/post`・`/admin`・`/onboarding`・`/settings` は要ログイン。`/admin` は `profiles.role='admin'` 二重チェック。

**Supabase設定（既済）**: Auth > URL Configuration の Redirect URLs に `http://localhost:3100/auth/callback` と `https://watch-style-club.vercel.app/auth/callback`。Google Provider 有効化＋Client ID/Secret（Google Cloud の Authorized redirect URI は `https://zhinkicjsbnrxmhfkwwu.supabase.co/auth/v1/callback`）。

---

## 8. ディレクトリ構成

```
watch-style-club/
├─ app/
│  ├─ (public)/         page(LP) / timeline / gallery / ranking / p/[id] / u/[username] / sku/[handle]
│  ├─ (auth)/           login / login/magic / signup / forgot-password / reset-password / onboarding
│  ├─ post/             new / thanks
│  ├─ admin/            page(review) / skus / skus/[id] / campaigns / campaigns/[slug] / campaigns/[slug]/export / digest / digest/export
│  ├─ auth/             callback/route.ts / signout/route.ts
│  ├─ layout.tsx / globals.css
├─ components/
│  ├─ auth/    GoogleButton, HeaderAuth, HeaderUserMenu, OnboardingForm
│  ├─ post/    PostForm, ProductCard
│  ├─ media/   CoverMedia, MediaCarousel
│  ├─ style/   StyleSpec, RecommendedFace
│  ├─ timeline/ TimelineItem, AuthorHeader, LikeButton, BookmarkButton, MiniCard, SectionRail, FeaturedRail
│  ├─ gallery/ FilterBar, GalleryCard
│  ├─ profile/ ProfileEditForm, CollectionManager, StyleGrid
│  ├─ admin/   ReviewCard
├─ lib/
│  ├─ supabase/  client.ts, server.ts(createClient/createAdminClient), middleware.ts
│  ├─ actions/   auth.ts, posts.ts, profile.ts, admin.ts, catalog.ts, campaign.ts(※読取はlib直下)
│  ├─ posts.ts, catalog.ts, profile-data.ts, campaign.ts, digest.ts, bookmarks.ts, storage.ts,
│  │  avatar.ts, image.ts, notify.ts, shopify.ts, format.ts, database.types.ts
├─ supabase/migrations/  0001..0014（0005/0010欠番）
├─ middleware.ts / .env.local(gitignore) / .env.local.example
```

---

## 9. 未Push内容

- 🟡 **Phase 5 Point Engine の実装が未コミット**（`git status` に変更あり）。typecheck通過・preview検証済みだが **migration 0015 の適用待ち**のため、適用→実機確認後に commit/push する想定。
  - コミット案: `feat: Phase 5 Style Points engine (point_accounts/ledger/rules, admin)`。
- 直近コミット: `8c4b3b9 feat: multi-media video posts and SKU-based posting`。
- 次に変更を加えたら: 通常どおり `git add -A && git commit -m "..." && git push origin main`（Vercel 自動デプロイ）。
- **注意**: 0015 未適用のまま push しても Point系UIは 0 表示で安全（テーブル無し＝graceful）だが、機能を効かせるには本番Supabaseで0015実行が必須。

---

## 10. 既知の課題 / 技術的負債

- ⚠️ **SMTP**: Supabaseデフォルトメールはレート厳しい。8月キャンペーン前に **Resend等を Auth > SMTP に接続必須**（magic link/reset/verify が届かない事故防止）。
- ⚠️ **service_role キーがチャット履歴に露出**。`.env.local` のみ（gitignore済）だが **ローテーション推奨**。
- ⚠️ **テスト用 admin パスワード `WscTest1234!`** が残存 → 変更すべき。
- **動画ポスター無し**: カードは `<video preload=metadata>` の先頭フレーム頼み。サーバーサムネ生成が将来課題。
- **署名URL失効**: 動画は3600秒。長尺は再生途中失効の可能性（短尺Style前提）。
- **Drag&Drop未**: 投稿のカバー並べ替えは ←→ のみ（D&Dとmasonryは width/height 保存済みなので実装余地）。
- **SHOPIFYドメイン**: `lib/shopify.ts` が env 未設定時 `shop.applewatchjournal.net` をハードコード fallback。`NEXT_PUBLIC_SHOPIFY_DOMAIN` を設定推奨。
- **is_awj=false の運用UI無し**: Admin にトグル/「取扱希望」導線が未。
- **SKU画像バケット未定義**: `skus.image_path` は http URL のときのみ表示。
- **posts.watch_model がApple Watch固有**: 他カテゴリ展開時に要再設計。
- **Follow UI未**: テーブルのみ。
- **手書き `database.types.ts`**: Supabase接続後 `npm run types` で自動生成に置換推奨（現状は手書きメンテ）。supabase-js の型制約上、各テーブルに `Relationships: []`・スキーマに `Views/Enums/CompositeTypes` が必要（無いと型が never 化）。
- **PostgREST embed の曖昧性**: posts↔profiles は likes/bookmarks 経由でも関係が成立し曖昧化するため、`profiles!posts_user_id_fkey(...)` と **FK明示が必須**（外すと一覧が空になる既往バグ）。

---

## 11. 次にやるべきこと（優先順位）

### P0（キャンペーン前提・最優先）
- **SMTP（Resend）接続** ＋ 日本語メールテンプレ（reset/verify/magic）。
- **admin パスワード変更** / service_role ローテーション。
- **本物の動画で実機テスト**（mp4/mov アップ → 承認 → Timeline▶ / 詳細再生）。
- 8月キャンペーンの **運用文言**（投稿ガイドライン・応募規約・SNS告知）。

### P1
- **Shopify 価格/在庫のライブ取得**（Storefront API）＋ /sku ページに価格表示。
- **is_awj=false 運用**（Nomad等の未取扱ブランド登録UI＋「取扱希望」導線）。
- **SKU画像アップロード**（バケット＋Admin）。
- **マイページ強化**（保存タブ充実・いいねしたStyle・実績/バッジ）。

### P2
- **Shopify 商品ページ埋め込み**（handleでWSC APIを叩き faces+styles 返す App Block）。
- **Point Engine**（投稿/いいね/応募でポイント）。
- **AI Coordinate / Recommendation**（Face自動推薦）。
- **Follow / コメント**（需要が見えてから）。
- **他カテゴリ展開**（apparel/sneaker：brands/skus に category 追加）。

---

## 12. 今後のロードマップ（Phase単位）

- **Phase 3 — 運用ローンチ**: SMTP・運用文言・8月キャンペーン稼働・実データ蓄積。
- **Phase 4 — Commerce強化**: Shopify価格/在庫連携・SKU画像・商品ページ埋め込み・未取扱ブランド「取扱希望」。
- **Phase 5 — Community**: Follow・コメント・マイページ実績/バッジ・通知。
- **Phase 6 — Point Engine**: 投稿/応募/いいねでポイント、リワード。
- **Phase 7 — Shopify App化**: WSCをShopifyアプリとして配布、商品ページにStyle/Faceブロック。
- **Phase 8 — Recommendation Engine**: AIによるFace/Style推薦（現在は編集部手動のRecommended Faceを置換）。
- **将来 — 多カテゴリ**: アパレル・スニーカー・ガジェット・フード（SKU中心設計を維持）。

---

## 13. Git情報

- **Branch**: `main`
- **Remote**: `https://github.com/kenta-1987/watch-style-club.git`（origin と同期済み）
- **最後のCommit**: `8c4b3b9 feat: multi-media video posts and SKU-based posting`
- **次回Commit Message案**（着手内容に応じて）:
  - `chore: connect Resend SMTP & localize auth emails`
  - `feat: Shopify Storefront price/stock on /sku`
  - `feat: SKU image upload & is_awj admin toggle`

---

## 14. 次の Claude へ

**現状**: フェーズ1 MVP〜複数メディア投稿まで完成し、本番(https://watch-style-club.vercel.app)に全反映済み。8月キャンペーンの稼働ラインには到達。migration 0001-0014（0005/0010欠番）は全て本番Supabaseに適用済み。

**壊してはいけないもの**:
- **既存投稿の互換**: `posts.image_path` は常にカバーのコピー。post_media が無い旧投稿は image_path で表示。これを壊すと既存投稿が消える。
- **PostgREST embed は `profiles!posts_user_id_fkey(...)` のFK明示**（外すと一覧が空）。
- **RLS**: 投稿は `status='pending'` でのみ insert 可、承認は admin のみ。catalog/faces は公開read・admin write。これを緩めない。
- **外部表示は @username のみ**（email/本名を出さない）。
- **手書き `database.types.ts` の構造**（Relationships/Views/Enums/CompositeTypes）。

**最初に着手すべき**: P0 の **SMTP接続**（キャンペーンの前提）→ 実データで動画/複数メディアの本番テスト → 運用文言。

**注意**:
- migration はDDLなのでClaudeからは適用不可。**SQLを出してユーザーがSupabase SQL Editorで実行**→その後検証、の流れ。新規は `0015_`。
- local と本番は同一Supabase。migration 1回で両方反映。
- 開発サーバーは preview の `wsc`（:3100）。手動 `npm run dev` は 3000 が別アプリで埋まり 3001 に逃げるので使わない。
- 大きめ実装の前に「DB案/UI案/migration案」を出してユーザー確認を取る運用（このプロジェクトの慣習）。
- ユーザーの記憶ファイル（MEMORY.md の `watch-style-club-project.md`）にも最新状況あり。

---

## 15. セルフレビュー

**この引き継ぎ書だけで開発継続できるか**: 概ね YES。アーキ・DB・Storage・Auth・ファイル構成・migration状態・既知課題・優先順位・壊してはいけない点まで網羅。

**不足の補足**:
- **環境変数**（`.env.local` / Vercel）: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`(サーバ専用), `NEXT_PUBLIC_SITE_URL`, `SLACK_WEBHOOK_URL`(任意), `NEXT_PUBLIC_SHOPIFY_DOMAIN`(任意)。本番は Vercel Env に同様（SITE_URLは本番ドメイン）。
- **検証手段**: Claude は service_role + curl で DB を直接読める（REST `/rest/v1/...`）。preview で実機確認。動画など実ファイルが要る検証はユーザー操作が必要。
- **シードされた実データ**: ブランド `Campagne Sélection` → series `FKM` → sku `Starlight`(handle `cmpg-fkmband`, is_awj=true) → Face `Modular Ultra`★5 / `California`★4。投稿2件（kenta1987・承認済・FKM投稿はEditor's Pick）。
- **typecheck**: `npx tsc --noEmit` で随時確認（このプロジェクトの品質ゲート）。
```
