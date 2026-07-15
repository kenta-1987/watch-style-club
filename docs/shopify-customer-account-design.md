# Shopify Customer Account Login — 設計（レビュー待ち・未実装）

> 状態: **設計のみ。コードは一切書いていない。** ユーザーレビュー後にGOが出たら実装に着手する。
> 作成: 2026-07-15

---

## 0. 結論（先出し）

- **8月MVPには入れない**ことを推奨する（§12参照）。理由：Shopify側の前提確認（新しい顧客アカウント有効化・Customer Account API有効化・Protected Customer Data申請）に外部リードタイムがあり、8月キャンペーンの主要導線（SMTP接続・購入証明連携）とは独立して後回しにできる「追加ログイン手段」だから。
- Supabase sessionの確立は、**Phase 0で作った`verification_tokens`（purpose列で分岐する汎用トークン）とSupabaseのMagic Linkをそのまま再利用**するのが最も安全かつ実装差分が小さい。新しい確立方式（generateLink+verifyOtpによるサイレント発行等）は採用しない。
- `external_identities`は**トークンを保存しない**（Option C: ログイン時だけCustomer Account APIを使う）。理由は§6。

---

## 1. 現在のコード確認結果

| 項目 | 現状 |
|---|---|
| Auth方式 | username+password / Google OAuth / Magic Link の3方式併存（`lib/actions/auth.ts`, `components/auth/GoogleButton.tsx`, `app/(auth)/login/magic/page.tsx`） |
| Supabase session確立の実装パターン | ①`signInWithPassword`（サーバー側でusername→email解決） ②`signInWithOAuth({provider:'google'})`→`/auth/callback`で`exchangeCodeForSession` ③`signInWithOtp`→同じく`/auth/callback` |
| `profiles`と`auth.users`の関係 | `profiles.id`が`auth.users.id`を参照する1:1（`supabase/migrations/0001_schema.sql`）。**emailはprofilesに複製していない**（`match_user_by_email()`で都度`auth.users`を引く設計が0018で確立済み） |
| Google OAuth callbackの現状 | `app/auth/callback/route.ts`。`code`を`exchangeCodeForSession`→username/watch_model未設定なら`/onboarding`。**Supabase純正プロバイダの自動アカウントリンク**（同一email・確認済みなら既存identityへ自動リンク）に依存しており、これはSupabaseの内部機構。Shopifyは純正プロバイダではないため、この自動リンクは適用されない＝独自実装が必須（今回の設計そのもの） |
| `verified_purchases`実装状況 | **実装済み・稼働中**（0018）。`profile_id`+`sku_id`+`channel`+`purchased_at`のみを持つ台帳。`record_verified_purchase()`（SECURITY DEFINER・service_role限定）経由でのみ書き込み。Webhook（`app/api/webhooks/shopify/orders/route.ts`）が正 |
| `verification_tokens`実装状況 | **実装済み・稼働中**（0018）。`purpose`列で分岐する汎用トークン。現状`purchase_claim`のみ使用。コメントに「将来 invitation / event_checkin 等を追加してもテーブルは増やさない」と明記済み → **今回のShopifyアカウント連携もここに`purpose='shopify_link'`として追加するのが設計思想と一致する** |
| 既存Shopify App設定 | `SHOPIFY_WEBHOOK_SECRET`のみ環境変数化済み（Phase 0のorders/create Webhook用）。これは**Admin APIのカスタムApp**（`read_orders`スコープ）であり、**Customer Account APIとは別物**（§2参照） |
| Customer Accountsが「新しい顧客アカウント」か | **未確認・ユーザー確認が必要**（§2） |
| Customer Account API有効化可否 | **未確認・ユーザー確認が必要**（§2） |
| Protected Customer Data申請状況 | **未確認・ユーザー確認が必要**（§2） |
| callback URL設定場所 | Customer Account APIは**Partner Dashboard側のアプリ設定**でcallback URIを登録する（Admin APIカスタムAppの設定画面とは別画面の可能性が高い。§2で要確認） |
| 必要scope | Customer Account APIは`openid email customer-account-api:full`等のOIDC系scopeを使う（正確な値はShopify公式ドキュメントで実装直前に再確認すること。本設計では値を断定しない） |
| 取得できるcustomer情報 | GraphQL `customer` query経由で`id / email / firstName / lastName`等（Phase 1では最小限のみ利用。§9） |
| 本番/開発環境の検証方法 | 本番: `https://watch-style-club.vercel.app/auth/shopify/callback`固定。ローカル: **localhost不可のため、ngrok等のHTTPSトンネルを使い、そのトンネルURLをテスト用callbackとしてPartner Dashboardに一時登録**する運用（§11） |

---

## 2. Customer Account API利用可否（要ユーザー確認）

以下はShopify管理画面／Partner Dashboardでしか確認できないため、**私からは確認不可**。実装着手前に必ずユーザー側で確認してほしい。

1. **設定 → お客様アカウント** で「新しいお客様アカウント」になっているか（旧クラシックアカウントだとCustomer Account API自体が使えない）。
2. Customer Account APIは**Admin APIのカスタムApp（現行のWebhook用App）とは別の「アプリ」概念**で扱われる可能性が高い。Partner Dashboard（`partners.shopify.com`）でAWJ StoreがPartner組織に紐付いているか、Customer Account API用のアプリ登録ができるか確認。
3. **Protected Customer Data**（email/name等の顧客個人情報アクセス）の申請・承認状況。未承認だと本番相当のデータアクセスが制限される場合がある。
4. Callback URI登録画面の場所（Partner Dashboard内のアプリ設定 → Customer Account API設定タブ、想定）。
5. 必要scopeの正式名称（`openid`, `email`等のOIDC標準scopeに加え、Shopify固有のscopeがあるかを実装直前に公式ドキュメントで再確認）。

→ **これらが確認できるまで実装ステップには進めない**（§11のステップ0として明記）。

---

## 3. 推奨認証フロー図

```
[/login または /settings]
  「AWJ Storeのアカウントで続ける」
        │
        ▼
[/auth/shopify/start]  (Route Handler)
  - state = crypto.randomBytes(32)
  - code_verifier = crypto.randomBytes(32) (PKCE)
  - code_challenge = base64url(sha256(code_verifier))
  - state / code_verifier を httpOnly Cookie に保存（TTL 10分・Secure・SameSite=Lax）
  - Discoveryで authorization_endpoint を取得（ハードコードしない）
  - Shopifyへ302 redirect（state, code_challenge=S256, redirect_uri=/auth/shopify/callback を付与）
        │
        ▼
   [Shopify Customer Account ログイン画面]
        │
        ▼
[/auth/shopify/callback]  (Route Handler)
  1. code, state を受け取る
  2. Cookieのstateと完全一致を検証（不一致は即エラー画面）
  3. Cookieのcode_verifierで token endpoint にPOST（code_verifier検証はShopify側）
  4. access_token を受け取る（このプロセス内のみで保持。ブラウザへは一切渡さない）
  5. GraphQL customer query で { id, email, firstName, lastName } を取得
  6. access_token は**このリクエスト処理が終わったら破棄**（保存しない。§6）
  7. Cookie（state/code_verifier）を削除
  8. ここから分岐 ↓
```

### パターンA：WSCログイン済み（`auth.uid()`が存在）

```
8. 現在のSupabase sessionのユーザー(=profile) が既に他のprofileにこのShopify customer_idが
   紐付いていないか確認（external_identitiesのunique制約でDB側もガード）
9. Shopify customerのemailと、現在ログイン中ユーザーのemail(auth.users.email)を比較
   - 一致 → その場で link_external_identity() を呼び、/settings?linked=ok へ
   - 不一致 → 即リンクせず、確認画面
     「Shopifyアカウント（xxx@example.com）と現在ログイン中のアカウント（yyy@example.com）の
      メールアドレスが異なります。それでも連携しますか？」
     ユーザーが明示的に確認ボタンを押した場合のみ link_external_identity() を呼ぶ
```

### パターンB／C：WSC未ログイン（統合フロー・下記理由により同一ロジックにする）

```
8. Shopify customerのemailで match_user_by_email() を呼ぶ（0018で実装済みの関数を再利用）
9. 見つかっても見つからなくても、ここで即ログインさせない。
   verification_tokens に purpose='shopify_link' で1行発行する：
     payload = { shopify_customer_id, shopify_email, first_name, last_name, shop_domain }
     target_email = shopify_email
     expires_at = now() + 15分（購入証明クレームの30日よりずっと短くする。ログイン用途のため）
10. supabase.auth.signInWithOtp({ email: shopify_email, shouldCreateUser: true,
      options: { emailRedirectTo: `${site}/auth/callback?redirect=/shopify/finish-link?token=...` } })
    を呼ぶ（＝実際にメールを送信する。既存ユーザーならログイン用、未登録ならサインアップ用に
    Supabaseが自動で出し分ける。email一致だけでは絶対にログインさせず、必ず受信箱を
    開いてリンクをクリックする、という「本人確認」を必須にする）
11. 画面には「xxx@example.com 宛に確認メールを送りました」と表示して終了
        │
        ▼（ユーザーがメール内リンクをクリック）
[/auth/callback]（既存route。変更不要）
  - exchangeCodeForSession でSupabase session確立（これは全く新しいユーザーでも既存ユーザーでも
    Supabase標準のMagic Linkフローそのまま。改造しない）
  - redirect先 = /shopify/finish-link?token=...
        │
        ▼
[/shopify/finish-link?token=...]（新規ページ・server component + server action）
  - 今ログイン中のuser.email と verification_tokens.target_email が一致するか再検証
    （一致しない＝メール転送等の攻撃を防ぐ最終ゲート）
  - purpose='shopify_link' のトークンをconsume（Phase 0のconsumeVerificationToken()と同じ関数を
    purpose分岐で拡張して再利用）
  - link_external_identity(profile_id=user.id, ...) を呼ぶ
  - 新規ユーザー（username未設定）なら /onboarding へ、既存ユーザーなら /settings へ
```

**この設計にした理由（B/Cを分けない）**:
- Supabase Auth自体が「そのemailのユーザーが存在するか」を`signInWithOtp`内部で自動判定し、存在すればログイン用、しなければ新規作成用のメールを送り分けてくれる。これを使えばB/Cで分岐コードを書く必要がなく、実装・テストの両方が半分になる。
- 「email一致だけで無条件ログインさせない」という要件を、**実際のメール受信という物理的な本人確認ステップ**で満たす。これはPhase 0の購入証明クレーム（`/claim/[token]`）と全く同じ思想であり、コードパターンも共通化できる。

---

## 4. Supabase session確立方式の比較

| 方式 | 概要 | 評価 |
|---|---|---|
| A. Magic Linkを送信して確立 | `signInWithOtp`で実際にメール送信→ユーザーがクリック→`/auth/callback`が処理 | **採用**。Supabase標準のセッション発行経路をそのまま使うため、独自のセッション偽造が一切発生しない。実際のメール受信を要求するため、なりすまし耐性が最も高い |
| B. Admin APIの`generateLink`＋その場で`verifyOtp` | サーバー側でリンクを生成し、メール送信せずその場でトークンを検証してセッションを即時発行（ユーザーはメールを見ない） | **不採用**。「email一致だけでログインさせない」という要件に反する。Shopify OAuthで一度emailの所有を証明していても、それを理由にSupabase側の確認を省略するのは責務混同（Shopifyで認証されたことと、そのemailのSupabaseアカウントを乗っ取れないことは別問題）。特にパターンB（既存の別アカウントへの誤リンク）でリスクが高い |
| C. サーバー側ワンタイムコード交換 | 独自のワンタイムコードテーブルを新設し、コード交換でセッション確立 | **不採用（テーブルは作るがセッション確立には使わない）**。Phase 0の`verification_tokens`と機能が重複するため新設しない。ただし「Shopifyの文脈情報を一時的に保持する」役割としては流用する（§3の`purpose='shopify_link'`） |
| D. Shopify連携確認後に既存Authへ戻す方式 | パターンAの場合はそもそも新規セッション確立が不要 | パターンAはこれに該当。新規セッション発行ロジック自体を通らない設計にする |

**結論**: 新規セッションが必要なのはパターンB/Cのみで、そこは既存のMagic Link経路（A）をそのまま使う。**新しいセッション確立の仕組みは何も作らない。**

---

## 5. 推奨DB設計

### 5.1 `external_identities`（新規・migration 0019候補）

```sql
create table if not exists public.external_identities (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  provider            text not null,              -- 'shopify' 固定（将来 'amazon' 等を見越した汎用列）
  shop_domain         text not null,               -- 'xxx.myshopify.com'。provider内の名前空間として必須
  external_customer_id text not null,              -- Shopify Customer ID（gid://shopify/Customer/... または数値ID、実装時に正規化方式を決める）
  external_email      text,                        -- 連携時点のメール（表示・監査用。認証には使わない）
  first_name          text,
  last_name           text,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 同一Shopify顧客が複数WSCプロフィールに紐付かない
create unique index if not exists external_identities_provider_shop_customer_idx
  on public.external_identities (provider, shop_domain, external_customer_id);

-- 1プロフィールにつき同一shopの連携は1件まで（複数shop対応は将来）
create unique index if not exists external_identities_profile_provider_shop_idx
  on public.external_identities (profile_id, provider, shop_domain);
```

**Phase 1では`access_token_encrypted`/`refresh_token_encrypted`/`expires_at`/`scopes`列を持たない**（§6で理由を説明）。将来Customer Account APIを継続利用する要件が具体化したら、別migrationで追加する（既存行に影響しない追加のみの変更で対応可能）。

### 5.2 `verification_tokens`（既存テーブルの`purpose`拡張のみ・migration不要）

- 新しい値 `purpose = 'shopify_link'` を使うだけで、テーブル構造の変更は不要。
- `payload`に`{ shopify_customer_id, shopify_email, first_name, last_name, shop_domain }`を格納。
- `dedupe_key`は使わない（nullable・Webhook再送対策専用のため、ログイン起点のこのフローでは不要）。

### 5.3 書き込み関数（`award_points()`/`record_verified_purchase()`と同じ思想）

```sql
create or replace function public.link_external_identity(
  p_profile_id           uuid,
  p_provider             text,
  p_shop_domain          text,
  p_external_customer_id text,
  p_external_email       text,
  p_first_name           text,
  p_last_name            text,
  p_metadata             jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.external_identities
    (profile_id, provider, shop_domain, external_customer_id, external_email, first_name, last_name, metadata)
  values
    (p_profile_id, p_provider, p_shop_domain, p_external_customer_id, p_external_email, p_first_name, p_last_name, p_metadata)
  on conflict (profile_id, provider, shop_domain) do update set
    external_customer_id = excluded.external_customer_id,
    external_email       = excluded.external_email,
    first_name            = excluded.first_name,
    last_name             = excluded.last_name,
    metadata              = excluded.metadata,
    updated_at            = now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.link_external_identity(uuid,text,text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.link_external_identity(uuid,text,text,text,text,text,text,jsonb) to service_role;
```

- `on conflict (profile_id, provider, shop_domain) do update` にしているのは、同一ユーザーがShopify側でメールアドレスを変更した後に再連携した場合に対応するため（Shopify customer_idが変わらない前提）。
- `(provider, shop_domain, external_customer_id)`のunique制約に違反する場合（＝**別のprofileに既に連携済みのShopify顧客**）はこの関数がエラーを返す。呼び出し側（Route Handler）でこれを検知し、「このShopifyアカウントは既に別のWSCアカウントに連携されています」という専用エラー画面を出す（アカウント乗っ取り対策の要）。

### 5.4 解除（unlink）

```sql
create or replace function public.unlink_external_identity(
  p_profile_id uuid,
  p_provider   text,
  p_shop_domain text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.external_identities
  where profile_id = p_profile_id and provider = p_provider and shop_domain = p_shop_domain;
end;
$$;

revoke all on function public.unlink_external_identity(uuid,text,text) from public, anon, authenticated;
grant execute on function public.unlink_external_identity(uuid,text,text) to service_role;
```

service_role限定にしているのは、`link_external_identity`と対称にして「書き込みは全てSECURITY DEFINER関数経由」という0015/0018からの不変条件を崩さないため。呼び出し元のServer Actionは`auth.uid()`が`p_profile_id`と一致することを確認してから呼ぶ。

---

## 6. Token保存方式の比較（Option A/B/C）

| Option | 概要 | 評価 |
|---|---|---|
| A. Tokenを保存する設計 | `external_identities`にaccess/refresh tokenを暗号化して保持し、後から任意にCustomer Account APIを呼べるようにする | **不採用（Phase 1）**。暗号鍵管理・ローテーション・漏洩時の影響範囲が増える。Phase 1の要件（ログイン時にid/email/name取得だけ）には過剰 |
| B. Identityだけ保存し、tokenは短期セッション（メモリ/リクエストスコープ）に限定 | tokenはcallbackリクエストの処理中だけ変数として存在し、レスポンスを返したら破棄。DBにも保存しない | **採用**。§5.1の設計はこれに対応（token列を持たない） |
| C. Customer Account APIをログイン時だけ使い、注文はverified_purchasesに任せる | 責務分離を明文化：「誰として認証したか」= external_identities、「何を買ったか」= verified_purchases（Webhookが正） | **採用（Bと併用）**。ユーザー提示の方針そのもの。今回の設計全体がこの前提で書かれている |

**結論**: B+Cを採用。`external_identities`はtokenを一切持たない。access_tokenはcallbackハンドラのローカル変数としてのみ存在し、GraphQL呼び出し1回に使ったら即座にスコープを抜けて破棄される（明示的なdelete処理も不要＝そもそも保存しない）。

---

## 7. RLS案

```sql
alter table public.external_identities enable row level security;

-- 閲覧：本人 or admin のみ（Shopify customer_id等の外部識別子は他人に見せない）
create policy ei_select_own on public.external_identities for select
  using (auth.uid() = profile_id or public.is_admin());

-- 書き込みポリシーは作らない（= link_external_identity() / unlink_external_identity() 経由のみ）
```

- `verified_purchases`（0018）と全く同じ形。新しいRLSパターンを持ち込まない。
- `verification_tokens`は既存のadmin限定ポリシーをそのまま使う（`purpose`が増えるだけでポリシー変更不要）。

---

## 8. 必要環境変数

| 変数名 | 用途 |
|---|---|
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` | Customer Account API用アプリのクライアントID（Admin API用カスタムAppとは別の可能性が高い。§2で要確認） |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET` | 同クライアントシークレット（サーバー専用・絶対にクライアントへ渡さない） |
| `SHOPIFY_SHOP_ID` または `SHOPIFY_SHOP_DOMAIN` | Discovery document取得・GraphQLエンドポイント組み立てに使う識別子（正確にどちらの形式が必要かはShopify公式ドキュメントで実装直前に確認） |
| `NEXT_PUBLIC_SITE_URL` | 既存流用（callback URI組み立てに使用。新規追加なし） |

`SHOPIFY_WEBHOOK_SECRET`（Phase 0）とは**別変数**として扱う（同じ値になるとは限らないため）。

---

## 9. UI変更範囲（Phase 1は最小限）

**入れるもの**:
- `/login`・`/signup`に「AWJ Storeのアカウントで続ける」ボタン（`GoogleButton.tsx`と同じ見た目パターンで`ShopifyButton.tsx`を新設）
- `/settings`に「連携アカウント」セクション：連携済み表示（`external_email`のみ表示・Shopify customer_idは表示しない）＋「連携を解除」
- パターンAのemail不一致確認画面（1画面）
- 連携失敗・トークン期限切れ画面（Phase 0の`/claim/[token]`の「このリンクは無効です」と同じ表現を流用）
- `/onboarding`：新規ユーザーの場合、Shopifyのfirst_name/last_nameをdisplay_name初期値候補に（Googleの`full_name`と同じ扱い方を流用。**Shopify customer_id・emailそのものはUIに一切表示しない**）

**入れないもの（Phase 1では不要）**:
- 連携済みユーザー向けの「Shopifyプロフィールを再同期」ボタン（Phase 1は取得したid/email/nameを保存するだけで、再取得の運用は考えない）
- 複数shopの連携UI

---

## 10. 実装ステップ（GOが出たら着手する順序）

0. **（実装前提条件）** §2の未確認事項をユーザーがShopify管理画面で確認・報告
1. `supabase/migrations/0019_external_identities.sql`（テーブル・RLS・関数）をSQLとして提示 → ユーザーがSupabase SQL Editorで実行
2. `lib/database.types.ts`に`external_identities`型・新規関数の型を追加
3. `lib/shopify-oidc.ts`（新規）：Discovery document取得＋キャッシュ、state/PKCE生成・検証ヘルパー
4. `app/auth/shopify/start/route.ts`：OAuth開始（state/PKCE Cookie発行→Shopifyへredirect）
5. `app/auth/shopify/callback/route.ts`：code交換→GraphQL customer取得→パターンA/B分岐
6. `lib/actions/shopify-link.ts`：`link_external_identity`/`unlink_external_identity`呼び出しのServer Action（`auth.uid()`検証込み）
7. `app/shopify/finish-link/page.tsx`：Magic Link経由後の最終リンク確定ページ（`consumeVerificationToken`の`purpose='shopify_link'`分岐を追加）
8. `components/auth/ShopifyButton.tsx`／`/settings`の連携UI
9. ローカル検証：ngrok等のHTTPSトンネル経由でShopify Customer Accountログイン→callback→リンク確定まで実地確認
10. 本番デプロイ・Partner Dashboardのcallback URIを本番URLに更新確認

---

## 11. ローカル/本番の検証方法

- **本番callback**: `https://watch-style-club.vercel.app/auth/shopify/callback`（固定）
- **ローカル**: Shopify Customer Account APIはlocalhostのredirect_uriを受け付けないため、`ngrok http 3100`等でHTTPSトンネルを張り、そのURL（例: `https://xxxx.ngrok-free.app/auth/shopify/callback`）を**開発用途として一時的に**Partner Dashboardのcallback URI一覧に追加する。
  - 本番URLとローカルトンネルURLを両方登録できるか（複数callback URI登録可否）は§2の確認事項に含める。
  - ngrokのURLはセッション毎に変わる（無料プランの場合）ため、検証のたびにPartner Dashboard側の登録URLを更新する運用になる可能性がある。固定サブドメインが必要ならngrokの有料プラン等を検討。

---

## 12. セキュリティリスクの整理

| リスク | 対策 |
|---|---|
| CSRF（callbackへの不正リクエスト） | state値をhttpOnly Cookieと比較検証。不一致は即エラーで処理中断 |
| Authorization Code横取り | PKCE（S256）必須。code_verifierはCookieのみに保存しブラウザJSからアクセス不可（httpOnly） |
| state/code_verifierの再利用 | Cookieは検証後に即削除。TTLも10分程度に短縮 |
| Callback URI偽装 | Shopify側で完全一致のURIのみ許可される前提（Discoveryの発行元ドメインもハードコードせず動的取得） |
| Shopify access tokenの漏洩 | **そもそも保存しない**（§6）。callbackリクエストのローカル変数としてのみ存在 |
| Supabase session と Shopify token の混同 | 別々の資格情報として明確に分離。Shopify tokenを使ってSupabase操作をする経路を一切作らない |
| email一致だけでのなりすましログイン | パターンB/Cとも「実際のメール受信」を必須のゲートにする（§3・§4） |
| アカウント乗っ取り（他人のWSCアカウントへの無断連携） | パターンAでのemail不一致は確認画面必須。`external_identities`のunique制約で1 Shopify顧客=1 WSCプロフィールを強制 |
| Protected Customer Dataの過剰取得 | Phase 1はid/email/firstName/lastNameのみ取得。ordersやfull profileへの範囲拡張はしない |
| Audit log不足 | Phase 1では`created_at`/`updated_at`のみ（簡易）。連携・解除の詳細な監査ログテーブルは今回作らず、Phase 2候補とする（要件が具体化してから設計） |
| RLSバイパス | 書き込みは`link_external_identity()`/`unlink_external_identity()`（service_role限定のSECURITY DEFINER関数）経由のみ。クライアントからの直接INSERT/DELETEは一切許可しない |
| ログアウト時の扱い | Shopify側のログアウトはWSCのSupabase sessionに影響しない（別セッション管理のため）。WSC側ログアウトはSupabase sessionのみ終了し、`external_identities`の連携情報は保持（再ログイン時に再認証すれば良く、連携を都度やり直す必要はない） |

---

## 13. 8月MVPで入れるべきかの最終判定

**判定：8月MVPには含めない（Phase 2以降）。**

理由:
1. §2の未確認事項（新しい顧客アカウント有効化・Customer Account API有効化・Protected Customer Data申請）は**Shopify側の設定変更や審査を伴う可能性があり、リードタイムが読めない**。8月キャンペーンの日程に対して依存関係を持ち込みたくない。
2. 8月MVPの必須導線（投稿→承認→公開→応募→CSV）は**既存のusername+password/Google/Magic Linkで完結**しており、Shopifyログインが無くても運用可能。
3. `verified_purchases`（購入証明台帳・Webhook経由）は既に独立して動いており、購入者向けのWelcome Mission `purchased`可視性判定もこれだけで機能する。Customer Account APIが無くても「購入証明→ミッション」の価値提供は8月時点で成立する。
4. Shopifyログインは「便利な追加導線」であって「無いと機能が壊れるもの」ではないため、優先度をP1〜P2に置くのが妥当。

**推奨タイミング**: SMTP接続・8月キャンペーン運用が落ち着いた後（HANDOVER.mdのPhase 4「Commerce強化」領域）に、§2の確認事項をまず着手してから本設計の実装に入る。
