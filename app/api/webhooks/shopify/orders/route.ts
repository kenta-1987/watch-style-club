import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Shopify orders/create Webhook — 購入証明台帳への取り込み。
 *
 * 責務はこれだけ（それ以外の処理を足さない。HANDOVER.md §16 参照）：
 *   1. HMAC検証（生ボディに対して。失敗は401即返し）
 *   2. line_items を skus.shopify_variant_id と突合して sku_id を解決
 *   3. メール一致するprofileがあれば record_verified_purchase()、
 *      なければ verification_tokens（purpose='purchase_claim'）を発行
 *   4. 例外は握りつぶし、常に200を返す（Shopifyのリトライ地獄を避ける）
 *
 * 注文番号・住所・配送状況・決済状態・金額など、購入証明に不要な情報は一切保存しない。
 * Webhookペイロードの生JSONを保存する処理も作らない。
 */

type ShopifyLineItem = { variant_id: number | string | null };
type ShopifyOrder = {
  id: number | string;
  email?: string | null;
  contact_email?: string | null;
  created_at?: string | null;
  line_items?: ShopifyLineItem[];
};

function verifyHmac(rawBody: string, hmacHeader: string | null, secret: string): boolean {
  if (!hmacHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");

  if (!secret || !verifyHmac(rawBody, hmacHeader, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  // HMAC検証後は例外を握りつぶし、常に200を返す（Shopifyのリトライ地獄を避ける）
  try {
    const shopDomain = request.headers.get("x-shopify-shop-domain") ?? null;
    const order = JSON.parse(rawBody) as ShopifyOrder;
    const email = (order.email || order.contact_email || "").trim();
    const purchasedAt = order.created_at ?? new Date().toISOString();
    const lineItems = order.line_items ?? [];

    if (!email || lineItems.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const admin = createAdminClient();

    const variantIds = Array.from(
      new Set(lineItems.map((li) => (li.variant_id != null ? String(li.variant_id) : null)).filter(Boolean))
    ) as string[];
    if (variantIds.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { data: skuRows } = await admin
      .from("skus")
      .select("id, shopify_variant_id")
      .in("shopify_variant_id", variantIds)
      .returns<{ id: string; shopify_variant_id: string | null }[]>();

    // 解決できなかった行（AWJ非取扱商品）は無視。同一注文内の重複sku_idは1回にまとめる。
    const skuIds = Array.from(new Set((skuRows ?? []).map((s) => s.id)));
    if (skuIds.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { data: profileId } = await admin.rpc("match_user_by_email", { p_email: email });

    for (const skuId of skuIds) {
      const dedupeKey = `shopify:${shopDomain ?? "unknown"}:${order.id}:${skuId}`;

      if (profileId) {
        await admin.rpc("record_verified_purchase", {
          p_profile_id: profileId,
          p_sku_id: skuId,
          p_channel: "shopify",
          p_shop_domain: shopDomain,
          p_purchased_at: purchasedAt,
          p_verification_source: "shopify_webhook",
          p_dedupe_key: dedupeKey,
        });
      } else {
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await admin
          .from("verification_tokens")
          .upsert(
            {
              token,
              purpose: "purchase_claim",
              target_email: email,
              payload: { sku_id: skuId, channel: "shopify", shop_domain: shopDomain, purchased_at: purchasedAt },
              dedupe_key: dedupeKey,
              expires_at: expiresAt,
            },
            { onConflict: "dedupe_key", ignoreDuplicates: true }
          );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[shopify webhook] failed", e);
    return NextResponse.json({ ok: true });
  }
}
