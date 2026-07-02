// ============================================================================
// Shopify購入証明連携 Phase 0 — 購入証明台帳（verified_purchases）の読み取りヘルパー
//
// 【重要】このファイルは読み取り専用。verified_purchases への書き込みは
//   record_verified_purchase()（SECURITY DEFINER・service_role限定）経由のみ。
//   Webhook（app/api/webhooks/shopify/orders/route.ts）と
//   /claim/[token] の consume（lib/actions/verification.ts）以外から書かない。
//
// 【owned_bands との違い】owned_bands は自己申告のコレクション。
//   verified_purchases は購入証明（Shopify注文メール一致）による事実。完全に別データソースで、
//   /post/new のUIでも混在させない。
// ============================================================================
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type VerifiedSkuOption = {
  skuId: string;
  brandId: string;
  seriesId: string;
  brandName: string;
  seriesName: string;
  colorName: string;
  purchasedAt: string;
};

type Row = {
  sku_id: string;
  purchased_at: string;
  skus: {
    series_id: string;
    color_name: string;
    series: {
      brand_id: string;
      name: string;
      brands: { name: string } | null;
    } | null;
  } | null;
};

/**
 * ログイン中ユーザーが購入証明済み（verified_purchases）の SKU 一覧。
 * 同一 SKU を複数回購入していても skuId で重複排除する（直近の purchased_at を採用）。
 */
export async function getMyVerifiedSkus(): Promise<VerifiedSkuOption[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("verified_purchases")
    .select(
      "sku_id, purchased_at, skus(series_id, color_name, series(brand_id, name, brands(name)))"
    )
    .eq("profile_id", user.id)
    .order("purchased_at", { ascending: false })
    .returns<Row[]>();

  const bySkuId = new Map<string, VerifiedSkuOption>();
  for (const row of data ?? []) {
    if (bySkuId.has(row.sku_id)) continue;
    const series = row.skus?.series;
    if (!series) continue;
    bySkuId.set(row.sku_id, {
      skuId: row.sku_id,
      brandId: series.brand_id,
      seriesId: row.skus!.series_id,
      brandName: series.brands?.name ?? "",
      seriesName: series.name,
      colorName: row.skus!.color_name,
      purchasedAt: row.purchased_at,
    });
  }
  return Array.from(bySkuId.values());
}

/** 指定ユーザーが1件でも購入証明を持つか（mission_definitions.visibility='purchased' の判定用）。 */
export async function hasAnyVerifiedPurchase(userId: string): Promise<boolean> {
  const supabase = createClient();
  const { count } = await supabase
    .from("verified_purchases")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", userId);
  return (count ?? 0) > 0;
}
