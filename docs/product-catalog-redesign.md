# Product Catalog 第一級昇格 — 再設計ドキュメント

> 状態: **設計のみ・未実装**。レビュー後にGOが出たら §8 の実装プロンプトで着手する。
> 作成: 2026-07-15
> 視点: 「画面を直す」ではなく、WSCを **商品(Product)中心のStyle Commerce Platform** へ再設計する。

---

## ① 現状レビュー

### 現在のDB設計（カタログ関連）

```
brands (id, slug, name, logo_path)
  └─ series (id, brand_id, slug, name)            ← 実質「商品」だが名前・責務が曖昧
       └─ skus (id, series_id, color_name, color_hex,
                shopify_product_handle,            ← 商品レベルの属性がSKU行に重複保存
                shopify_variant_id, image_path, is_active)

posts (watch_model text,                           ← 自由テキスト（watch_modelsマスタのlabel）
       sku_id → skus,                              ← AWJ取扱の場合のみ
       band_brand/band_name/color/product_url)    ← 未登録ブランドの自由入力

watch_models (label text PK, sort_order)           ← ただのラベル一覧。構造なし
owned_watches (user_id, model text, color text)    ← コレクション用。投稿フォームと未接続
```

### 何が問題か（本質）

1. **「Product」という概念が存在しない。** `series` が商品の役割を担っているが、名前・説明・商品画像・商品URL・販売状態のどれも持てない。「FKM」という文字列があるだけで、それが何の商品か、売っているのか、どんな説明かをDBは知らない。
2. **商品レベルの属性がSKU行に散らばっている。** `shopify_product_handle` は本来「商品」の属性なのに各SKU行に重複保存されており、`getSkuPageByHandle` は「1 handle = 1 SKU 前提（最初の1件）」という暫定コメント付きの実装になっている。同一商品の複数カラーを正しく表現できない。
3. **投稿が商品に「紐付く」のではなく、商品情報が投稿の「入力項目」になっている。** PostFormはブランド→シリーズ→カラーをカスケード選択させるが、これはカタログをフォームUIとして消費しているだけ。商品ページ→そこに紐づくStyle群、という逆方向の導線（Style Commerceの核）が構造的に弱い。
4. **Apple Watch情報が非構造。** `posts.watch_model` は「Apple Watch Ultra 2」という文字列。Family/世代/ケース素材/ケース色/サイズを持たないため、「Ultra 2 Black Titaniumに人気のStyle」のような切り口が原理的に作れない。HANDOVER.md §10 でも既知の負債として明記されている。
5. **毎回Apple Watchを選択させるUX。** ユーザーの所有Watchは `owned_watches` に存在するのに投稿フォームと接続されておらず、`profiles.watch_model`（単一・文字列）が初期値に使われているだけ。
6. **Shopifyが正本なのに同期機構がない。** カタログは全て管理画面から手入力。商品名変更・販売終了がWSCに反映されない。一方でWSC独自の編集（掲載ON/OFF・おすすめ・表示順）を載せる場所もない。「Shopifyのどこまでが正本で、どこからがWSCの編集レイヤーか」の境界が未定義。

### 良い点（維持する）

- SKU中心の思想はすでにある（`posts.sku_id`、`skus.shopify_variant_id` unique、`verified_purchases.sku_id`）。
- AWJ取扱（SKU必須）と未登録ブランド（自由入力）の二系統が動いている。
- RLS「公開read / admin write」、書き込みはSECURITY DEFINER関数経由、台帳中心設計などの規律が確立している。
- `verified_purchases` / Point Engine / Mission Engine はすべて `sku_id` / 汎用文字列ベースでカタログ再設計の影響を受けにくい。

---

## ② 新しいデータアーキテクチャ

### ER図

```
┌─────────┐     ┌──────────────────────────────┐     ┌──────────────────────────┐
│ brands  │1──*│ products（新設・第一級）        │1──*│ skus（既存を接続替え）      │
│ id      │     │ id                           │     │ id                       │
│ slug    │     │ brand_id                     │     │ product_id  ← series_id  │
│ name    │     │ slug                         │     │ color_name               │
│ logo    │     │ name / description           │     │ color_hex                │
└─────────┘     │ image_path / product_url     │     │ shopify_variant_id (uq)  │
                │ shopify_product_id (uq)      │     │ image_path               │
                │ shopify_product_handle (uq)  │     │ is_active / position     │
                │ source ('shopify'|'manual')  │     └────────────┬─────────────┘
                │ sales_status                 │                  │
                │   ('active'|'sold_out'|      │                  │ *
                │    'discontinued')           │     ┌────────────▼─────────────┐
                │ is_published（WSC掲載ON/OFF）│     │ posts（Style）            │
                │ is_recommended（おすすめ）    │     │ sku_id（AWJ）             │
                │ sort_order（表示順）          │     │ band_brand/name/color     │
                │ synced_at                    │     │   （未登録ブランド系統・維持）│
                └──────────────────────────────┘     │ user_watch_id → user_    │
                                                     │   watches（新・非構造併存） │
┌───────────────────────────┐                        │ watch_model text（互換維持）│
│ apple_watch_models（新設） │                        └──────────────────────────┘
│ id                        │
│ family ('Ultra'|'Series'| │        ┌───────────────────────────────┐
│         'SE')             │        │ user_watches（owned_watches進化）│
│ generation (2, 10, ...)   │1──────*│ id / user_id                  │
│ display_name              │        │ apple_watch_model_id ──────────┘
│ case_material             │        │ case_color（ユーザー個体の色）
│ case_sizes int[] (44,49..)│        │ case_size
│ released_year             │        │ nickname（'仕事用'等・任意）
│ sort_order / is_active    │        │ is_primary（メインWatch）
└───────────────────────────┘        │ created_at
                                     └───────────────────────────────┘

（変更なし）face_recommendations → sku_id / verified_purchases → sku_id /
            point_* / mission_* / campaigns / follows
（廃止予定）series（productsへ昇格後、Phase 3でdrop） / watch_models（apple_watch_modelsへ）
```

### 各テーブルの責務

| テーブル | 責務 | 正本 |
|---|---|---|
| `brands` | ブランド。AWJ取扱・未取扱の両方を登録できる | WSC |
| `products` | **商品＝カタログの第一級概念**。名前・説明・画像・URL・販売状態。Shopify商品と1:1（`shopify_product_id`）または手動登録（`source='manual'`） | 商品事実（名前・説明・販売状態）は**Shopify**、編集レイヤー（`is_published`/`is_recommended`/`sort_order`）は**WSC** |
| `skus` | 商品のバリアント（カラー等）。`shopify_variant_id`でShopifyと1:1。投稿・購入証明・おすすめ文字盤の結合点 | 同上（バリアント事実はShopify、`is_active`等はWSC） |
| `apple_watch_models` | Apple Watch本体の構造化カタログ（Family/世代/素材/サイズ）。Appleの製品ラインを表す**マスタ** | WSC（編集部管理・Apple公式情報を手動反映） |
| `user_watches` | ユーザーが所有する個体（モデル×色×サイズ×ニックネーム）。**My Watch** | ユーザー |
| `posts` | Style＝SKU × user_watch × メディア。商品情報は**保存せずSKUから導出** | ユーザー |

**設計原則（Stripe/Shopify流の責務分離）**:
- 「事実」と「編集」を同じ列に混ぜない。Shopify同期が上書きするのは `name/description/sales_status/image` などの事実列のみ。`is_published/is_recommended/sort_order` はWSC専有列で、同期は絶対に触らない。
- 投稿には商品のスナップショットを持たせない（`band_brand`等は未登録ブランド系統専用として残す）。AWJ投稿の表示は常に `sku → product → brand` をJOINして導出。商品名が変われば全投稿の表示も変わる＝カタログが正。

---

## ③ 投稿フロー：現状 → 改善後

### 現状

```
[投稿フォーム]
 1. Apple Watch モデルを毎回選択（文字列プルダウン・9択）
 2. バンド：AWJ取扱 → ブランド→シリーズ→カラー を3段カスケード選択
           未登録   → ブランド/名前/色/URL を自由入力
 3. メディア添付 → コメント → 投稿
 ※ 商品情報は「フォームの入力値」。投稿後にカタログを変えても投稿表示は追従（sku_id経由）
   するが、フォーム体験としては毎回ゼロから商品を「入力」している
```

### 改善後

```
[投稿フォーム]
 1. Watch：My Watchから選択（チップ。初期値=メインWatch）
    └ My Watch未登録なら「+ Watchを登録」→ その場でモデル/色/サイズ選択（1回だけ）
 2. バンド：
    a. あなたが購入したバンド（verified_purchases由来チップ・実装済み）→ 1タップ
    b. 商品カタログから選ぶ → 商品検索/一覧（is_published=trueのみ）→ カラー選択
    c. 未登録ブランド → 自由入力（現行維持）
 3. メディア → コメント → 投稿

[逆方向の導線（Style Commerceの核）]
 /products                     … 公開商品カタログ一覧（おすすめ・表示順反映）
 /p/[id]（投稿詳細）           … SKU→product導出の商品カード＋購入ボタン
 /sku/[handle] → /products/[slug] … 商品ページ＝「この商品のStyle一覧」＋おすすめ文字盤＋購入
```

投稿は「商品を入力する場」から「自分の持ち物（My Watch × 購入バンド）を組み合わせる場」に変わり、
商品ページは「この商品で、みんなどう合わせているか」を見せる場になる。これが Brand → Product → SKU → Style の縦串。

---

## ④ Shopify同期設計

### MVP（推奨）：管理画面からのオンデマンドPull同期

```
/admin/products に「Shopifyから同期」ボタン
  → Server Action が Shopify Admin GraphQL API（products query）を全件取得
  → upsert_product_from_shopify()（SECURITY DEFINER・service_role限定）で
     products / skus を shopify_product_id / shopify_variant_id キーにupsert
  → 事実列のみ上書き。is_published 等のWSC列は不変
  → 新規商品は is_published=false で入る（勝手に公開されない）
  → Shopifyから消えた商品は sales_status='discontinued'（行は消さない・投稿が参照するため）
```

- **Webhookでなくpullにする理由**: ①初回の全件インポートがどのみち必要で、pullは冪等・再実行可能・デバッグ容易。②AWJの商品数は少なく更新頻度も低いため、リアルタイム性の価値が薄い。③失敗が同期ボタンの再クリックで回復する（Webhookは取りこぼすと再送管理が要る）。
- 必要なもの: 既存カスタムAppに `read_products` スコープ追加＋Admin APIアクセストークン（環境変数 `SHOPIFY_ADMIN_API_TOKEN` 新設）。
- 既存の `orders/create` Webhook（購入証明）はそのまま。責務が違う（注文イベント vs 商品カタログ）。

### 将来版：Webhook + 定期リコンシリエーション

```
products/create・products/update・products/delete Webhook（既存のHMAC検証パターンを流用）
  → 同じ upsert_product_from_shopify() を呼ぶ（書き込み口を1つに保つ）
+ 日次cron（Vercel Cron）で全件pullして突き合わせ（Webhook取りこぼしの自己修復）
```

Webhookを足しても書き込み関数は同一なので、MVP→将来版は「トリガーが増えるだけ」の追加変更で済む。

---

## ⑤ My Watch設計

### データ

- `owned_watches` を**進化**させる（並行テーブルを作らない）。`apple_watch_model_id`（FK）/ `case_color` / `case_size` / `nickname` / `is_primary` を追加し、既存の `model`/`color` 文字列は互換のため残して後で整理。
- `is_primary` はユーザーごとに1件（部分unique index）。初期値は最初に登録したWatch。
- `profiles.watch_model`（単一文字列）は Phase 3 で役目を終える（onboardingでMy Watch登録に置き換え）。

### 影響範囲

| 画面 | 変更 |
|---|---|
| 投稿フォーム | モデルプルダウン → My Watchチップ選択（初期値=メイン）。未登録ユーザーにはインライン登録UI |
| プロフィール | 既存のコレクション表示が構造化データ（正式名称・素材・サイズ）で綺麗になる |
| 設定 | Watch追加フォームがモデル選択式（apple_watch_models参照）になり、メインWatch切替を追加 |
| 検索/ギャラリー | `posts.watch_model`（文字列フィルタ）は当面維持。Phase 3で `apple_watch_model_id` ベースのフィルタ（Family/素材/サイズ切り口）に拡張 |
| onboarding | 「お使いのApple Watch」入力がMy Watch初回登録を兼ねる |

### 将来的な価値（拡張性の担保）

`posts → user_watches → apple_watch_models` が構造で繋がるため:
- 「Ultra 2 に人気のStyle」= `apple_watch_models.family='Ultra' and generation=2` で posts を集計
- 「Series 10 Silver に人気」= モデル×`user_watches.case_color`
- 「Titanium Band ランキング」= products/SKU側に将来 `material` 属性を足せば横断集計可能
これらは全てSQL1本で書ける形になる（現状の文字列LIKEでは不可能）。

---

## ⑥ 移行方法（既存データを壊さない）

原則: **各段階が単独でデプロイ可能・ロールバック可能・既存投稿の表示を一瞬も壊さない**。0005/0010欠番の教訓どおり追加のみ→切替→削除の3段階。

```
0019_apple_watch_models.sql   … 新テーブル+seed（Ultra 2/Ultra/S10/S9/S8/S7/SE2/SE 等、
                                 family/generation/素材/サイズ入り）。既存には一切触れない
0020_products.sql             … products新設 → series全行をproductsへコピー
                                 （name=series.name, brand_id, slug, source='manual',
                                  is_published=true で現行公開状態を維持、
                                  shopify_product_handle は配下SKUの値から昇格）
                                 → skus.product_id 追加＆backfill → not null化
                                 → series_id は残す（コード切替完了まで）
0021_user_watches.sql         … owned_watches に apple_watch_model_id/case_color/case_size/
                                 nickname/is_primary 追加。既存行はmodel文字列から
                                 apple_watch_models へ可能な範囲でマッチング backfill。
                                 posts.user_watch_id (nullable) 追加。既存投稿はnullのまま
                                 （表示は watch_model 文字列でフォールバック＝旧投稿互換）
（コード切替: lib/catalog.ts等が products を参照するよう改修・十分な検証期間）
0022_cleanup.sql（Phase 3）    … skus.series_id drop / series drop /
                                 skus.shopify_product_handle drop / watch_models drop
```

- 検証はステージング環境がない（local=本番同一Supabase）ため、**0020実行前に対象テーブルのバックアップ**（`create table _bak_series_20xx as select * from series` 等）をmigration冒頭に含める。
- `database.types.ts` は各migrationと同時に更新（手書き運用のため）。

---

## ⑦ 実装優先順位

### Phase 1 — Product第一級昇格（アーキテクチャの核）
0019+0020 / `lib/catalog.ts` のproducts対応 / `/admin/products`（旧 /admin/skus 改修: 掲載ON/OFF・おすすめ・表示順の編集） / `/sku/[handle]` を product ベースに内部改修（URL互換維持） / PostFormのカスケードをproducts参照に切替。**外から見える挙動はほぼ不変・内部構造だけ正しくなる。**

### Phase 2 — My Watch + Shopify同期
0021 / 投稿フォームのMy Watchチップ / 設定・onboardingのWatch登録 / `/admin/products` に「Shopifyから同期」ボタン（`read_products`スコープ＋`SHOPIFY_ADMIN_API_TOKEN`）。**UX改善とカタログ鮮度がここで効く。**

### Phase 3 — 公開カタログ・分析・掃除
`/products` 公開カタログページ / モデル構造ベースの検索・ランキング（「Ultra 2に人気」等） / products Webhook＋日次リコンシリエーション / 0022クリーンアップ（series等のdrop）。

**時期の注意**: 8月キャンペーン直前に0020（構造の根幹）を入れるのはリスクがある。キャンペーン前はSMTP等のP0を優先し、**Phase 1はキャンペーン開始後の安定期間に入れる**ことを推奨（判断はユーザー）。

---

## ⑧ 実装プロンプト（Claude Codeへそのまま渡す）

```
Watch Style Club — Product Catalog 第一級昇格 Phase 1 実装

## 前提（必読）
- watch-style-club/docs/product-catalog-redesign.md（本設計書）と HANDOVER.md を先に読むこと。
- 設計はレビュー済み・確定。設計変更はしない。
- migration は Claude からは適用不可。SQLを提示してユーザーが Supabase SQL Editor で実行
  →その後コード切替、の順を厳守（local=本番同一プロジェクト）。
- 壊してはいけないもの: 既存投稿の表示（posts.image_path互換・sku_id経由の導出）、
  PostgREST embed の FK明示、RLS（公開read/admin write）、外部表示は@usernameのみ、
  手書き database.types.ts の構造、verified_purchases/point/mission の台帳設計。

## 1. Migration 0019_apple_watch_models.sql
- apple_watch_models: id uuid pk / family text ('Ultra'|'Series'|'SE') /
  generation int / display_name text（例 'Apple Watch Ultra 2'）/
  case_materials text[]（例 {'Titanium'}）/ case_colors text[] /
  case_sizes int[]（mm）/ released_year int / sort_order int / is_active boolean
- unique (family, generation)。RLS: 公開read / admin write（brands と同型）。
- seed: 現 watch_models の9機種相当を構造化して投入
  （Ultra 2, Ultra, Series 10, 9, 8, 7, SE 2世代, SE, その他は is_active=false の
   汎用行 'Other' として扱う）。display_name は現 posts.watch_model の文字列と
  完全一致させること（後のbackfillマッチングに使うため）。

## 2. Migration 0020_products.sql（バックアップ→追加→backfill の順で1ファイルに）
- 冒頭で create table _bak_series_YYYYMMDD as select * from series;
  create table _bak_skus_YYYYMMDD as select * from skus;
- products: id uuid pk / brand_id fk brands / slug text（brand内unique）/
  name text not null / description text / image_path text / product_url text /
  shopify_product_id text unique nullable / shopify_product_handle text unique nullable /
  source text not null default 'manual' / sales_status text not null default 'active'
  ('active'|'sold_out'|'discontinued' check) /
  is_published boolean not null default false / is_recommended boolean not null default false /
  sort_order int not null default 0 / synced_at timestamptz / created_at/updated_at
- RLS: select は is_published=true or is_admin()（非公開商品を一般に見せない）。write は admin。
- backfill: series 全行 → products（source='manual', is_published=true,
  shopify_product_handle は配下skusの最初の非null値を昇格、slugはseries.slug または slugify(name)）
- skus.product_id uuid fk 追加 → series_id 経由で backfill → not null 化。
  skus.position int default 0 追加。series_id 列は残す（Phase 3で削除）。
- database.types.ts に products / apple_watch_models 追加、skus に product_id/position 追加。

## 3. lib/catalog.ts 改修
- Product 型を新設し、getAwjPickerTree / getCatalogTree / getSkuPageByHandle /
  getSkuWithFaces / getSkuOptions を products 参照に切替
  （embed: skus → products → brands。series は一切参照しない）。
- getSkuPageByHandle は products.shopify_product_handle で1商品を引き、
  その配下の全SKU＋Faceを返す形に修正（「1 handle=1 SKU」の暫定実装を解消）。
- picker は is_published=true かつ sales_status<>'discontinued' の商品のみ表示。
- lib/posts.ts の PUBLIC_COLUMNS embed（skus(shopify_product_handle, color_name,
  series(name, brands(name)))）を products 経由に書き換え
  （skuBrandName/skuSeriesName→skuProductName へ。lib/share.ts の buildBandLabel も追従）。

## 4. /admin/products（/admin/skus を改修・リダイレクトで互換維持）
- Brand → Product → SKU のツリー編集。Product 行に:
  掲載トグル（is_published）/ おすすめトグル（is_recommended）/ 表示順（sort_order）/
  販売状態セレクト / name/description/product_url/画像URL編集。
- lib/actions/catalog.ts: createSeries → createProduct に改修（products へ insert）。
  既存の createSku は product_id を受ける形へ。

## 5. /sku/[handle] 内部改修
- URL・見た目は現状維持（外部リンク互換）。内部を getSkuPageByHandle の新実装に切替、
  商品名・説明・販売状態（sold_outなら購入ボタンを「在庫なし」表示）を products から表示。

## 6. PostForm 切替
- カスケードの series 段を products 段に置換（表示名は products.name）。
  UI 挙動は現状同等でよい（My Watch チップは Phase 2 のスコープ・今回やらない）。

## 7. 検証（必須）
- npx tsc --noEmit 0 errors / npm run build 成功。
- preview（wsc, :3100）で: タイムライン・ギャラリー・投稿詳細の既存投稿が
  従来どおり表示される（バンド名表示・🛒リンク含む）／ /sku/cmpg-fkmband が表示される／
  AWJピッカーで投稿フォームが動く／ /admin/products で掲載OFFにした商品が
  ピッカーから消える、を実機確認。
- service_role + REST で products backfill 結果（行数=旧series行数、skus.product_id
  非null）を確認してから報告。

## 8. 今回やらないこと（Phase 2/3）
- My Watch（0021）/ Shopify同期 / /products 公開ページ / series等のdrop /
  posts.watch_model の構造化 / ランキング拡張
```

---

## 補足: 既存機能との整合チェック済み事項

- `verified_purchases.sku_id` / `face_recommendations.sku_id` / `posts.sku_id` は全てSKUを指したままで無変更。Product昇格はSKUの「親」が変わるだけ。
- SNSシェア（`lib/share.ts buildBandLabel`）は `skuSeriesName` を参照しているため、Phase 1 のコード切替に追従修正が必要（§8-3に含めた）。
- 起票済みの既存バグ（SKU投稿でBAND表示が「—」）は、この再設計のPhase 1で `StyleSpec`/`GalleryCard` を products 導出に切り替える際に同時解消するのが自然（別修正が先に入っていれば競合しないよう注意）。
```
