# Shopify購入証明連携 Phase 0 — セットアップ手順

対象: Watch Style Club Shopify Webhook 連携（`app/api/webhooks/shopify/orders/route.ts`）
最終更新: 2026-07-03

---

## 0. 前提

`supabase/migrations/0018_verified_purchases.sql` を **Supabase SQL Editor で実行**してから進めること。
（`verified_purchases` / `verification_tokens` / `record_verified_purchase()` / `match_user_by_email()` を作成する。local=本番同一プロジェクトのため1回で両方に反映される。）

---

## 1. Shopify側：カスタムApp作成

1. AWJ Store の Shopify管理画面 → **設定** → **アプリと販売チャネル** → **アプリを開発**
2. **カスタムアプリを作成**（例: `Watch Style Club Sync`）
3. **Configuration** タブ → Admin API スコープで `read_orders` を有効化
4. **API資格情報** タブでアプリをインストール → Admin API アクセストークンを発行（Webhook検証には使わないが、将来 Storefront/Admin API連携で使う可能性あり。念のため保管）

---

## 2. Webhook登録

推奨方法: **Admin API の `webhookSubscriptionCreate`**（管理画面のWebhook設定よりHMAC Secretを確実に取得できるため）。

GraphQL Admin API（`2024-xx` 以降）で以下を実行:

```graphql
mutation {
  webhookSubscriptionCreate(
    topic: ORDERS_CREATE
    webhookSubscription: {
      callbackUrl: "https://watch-style-club.vercel.app/api/webhooks/shopify/orders"
      format: JSON
    }
  ) {
    webhookSubscription { id }
    userErrors { field message }
  }
}
```

- `callbackUrl` は本番URL固定（ローカル検証はngrok等のトンネル経由 or 合成payload＋curlで代替）。
- **今回は `orders/create` のみ購読**（`orders/fulfilled`等は対象外・スコープ外）。

### Webhook Secret の取得

- カスタムAppの場合、**Configuration** タブの **Webhook** セクションに表示される **共有シークレット** を使う
  （または `webhookSubscriptionCreate` 実行後、アプリ全体で共通の signing secret がAPI資格情報タブに表示される）。
- この値を `SHOPIFY_WEBHOOK_SECRET` として `.env.local`（ローカル）と Vercel Env（本番）に設定する。

---

## 3. skus.shopify_variant_id の整備

Webhookは `line_items[].variant_id` を `skus.shopify_variant_id` と突合して sku_id を解決する。
AWJ取扱SKU（`is_awj=true`）には variant_id が正しく登録されている必要がある。
`/admin/skus` で未設定のSKUがないか確認すること。

---

## 4. 検証手順（実データ以前・合成payload）

本物の注文を待たずに、HMAC検証とルーティングをローカルで確認する:

```bash
SECRET="（.env.localのSHOPIFY_WEBHOOK_SECRET）"
BODY='{"id":123456,"email":"test@example.com","created_at":"2026-07-03T00:00:00Z","line_items":[{"variant_id":"（skus.shopify_variant_idの実値）"}]}'
HMAC=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

curl -X POST http://localhost:3100/api/webhooks/shopify/orders \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -H "X-Shopify-Shop-Domain: test-shop.myshopify.com" \
  -d "$BODY"
```

- 期待結果: `{"ok":true}` が返る。
- `test@example.com` がWSC会員のメールと一致すれば `verified_purchases` に1行追加される。
- 一致しなければ `verification_tokens`（purpose='purchase_claim'）に1行追加され、
  `/claim/{token}` でアクセス可能になる（tokenはDBから確認）。

確認クエリ（Supabase SQL Editor）:
```sql
select * from verified_purchases order by created_at desc limit 5;
select token, target_email, expires_at, consumed_at from verification_tokens order by created_at desc limit 5;
```

---

## 5. 注文確認メールへのリンク追加（8月MVP・手動運用）

Checkout Extensibility状況やメール配信元（Shopify標準 / Klaviyo等）が未確認のため、
8月MVPでは **注文確認メール本文に `https://watch-style-club.vercel.app/claim/{token}` のリンクを手動追加**する運用で代替可能
（Webhookで発行された token を都度メールに差し込む）。即時クレームリンク化は9月フェーズで検討。

---

## 6. スコープ外（今回作らない）

- Customer Account API（OAuth連携）
- 注文の複製保存・`/admin/orders` 等の管理画面
- Shopify App Store対応
- GDPR系必須Webhook（`customers/redact`等）
- `orders/fulfilled` 等 `orders/create` 以外のWebhook
