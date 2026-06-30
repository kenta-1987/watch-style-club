import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Brand = { id: string; slug: string; name: string };
export type Series = { id: string; brand_id: string; name: string; slug: string | null };
export type Sku = {
  id: string;
  series_id: string;
  color_name: string;
  color_hex: string | null;
  shopify_product_handle: string | null;
  shopify_variant_id: string | null;
  image_path: string | null;
  is_active: boolean;
};

export type FaceRecommendation = {
  id: string;
  sku_id: string;
  watch_model: string | null;
  name: string;
  category: string | null;
  apple_share_url: string | null;
  editor_comment: string | null;
  rating: number | null;
  priority: number;
  is_published: boolean;
};

// ===== 投稿フォーム用：AWJ取扱バンドの ブランド→シリーズ→カラー ツリー =====
export type PickerSku = { id: string; colorName: string; colorHex: string | null };
export type PickerSeries = { id: string; name: string; skus: PickerSku[] };
export type PickerBrand = { id: string; name: string; series: PickerSeries[] };

/** is_awj かつ is_active な SKU だけを ブランド→シリーズ→カラー の階層で返す */
export async function getAwjPickerTree(): Promise<PickerBrand[]> {
  const supabase = createClient();
  const [{ data: skus }, { data: seriesRows }, { data: brandRows }] = await Promise.all([
    supabase
      .from("skus")
      .select("id, color_name, color_hex, series_id")
      .eq("is_awj", true)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .returns<{ id: string; color_name: string; color_hex: string | null; series_id: string }[]>(),
    supabase
      .from("series")
      .select("id, brand_id, name")
      .order("name")
      .returns<{ id: string; brand_id: string; name: string }[]>(),
    supabase.from("brands").select("id, name").order("name").returns<{ id: string; name: string }[]>(),
  ]);

  const skusBySeries = new Map<string, PickerSku[]>();
  for (const s of skus ?? []) {
    const a = skusBySeries.get(s.series_id) ?? [];
    a.push({ id: s.id, colorName: s.color_name, colorHex: s.color_hex });
    skusBySeries.set(s.series_id, a);
  }
  const seriesByBrand = new Map<string, PickerSeries[]>();
  for (const se of seriesRows ?? []) {
    const sk = skusBySeries.get(se.id);
    if (!sk || sk.length === 0) continue;
    const a = seriesByBrand.get(se.brand_id) ?? [];
    a.push({ id: se.id, name: se.name, skus: sk });
    seriesByBrand.set(se.brand_id, a);
  }
  return (brandRows ?? [])
    .map((b) => ({ id: b.id, name: b.name, series: seriesByBrand.get(b.id) ?? [] }))
    .filter((b) => b.series.length > 0);
}

/** SKU 選択用のフラットリスト（ラベル = Brand Series Color） */
export type SkuOption = { id: string; label: string };

type SkuOptionRow = {
  id: string;
  color_name: string;
  series: { name: string; brands: { name: string } | null } | null;
};

export async function getSkuOptions(): Promise<SkuOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("skus")
    .select("id, color_name, series(name, brands(name))")
    .order("created_at", { ascending: true })
    .returns<SkuOptionRow[]>();

  return (data ?? []).map((s) => ({
    id: s.id,
    label: [s.series?.brands?.name, s.series?.name, s.color_name]
      .filter(Boolean)
      .join(" "),
  }));
}

export async function getBrands(): Promise<Brand[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("brands")
    .select("id, slug, name")
    .order("name")
    .returns<Brand[]>();
  return data ?? [];
}

export async function getSeriesByBrand(brandId: string): Promise<Series[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("series")
    .select("id, brand_id, name, slug")
    .eq("brand_id", brandId)
    .order("name")
    .returns<Series[]>();
  return data ?? [];
}

/** Brand → Series → SKU のツリー（Admin カタログ画面用） */
export type CatalogTree = {
  brand: Brand;
  series: { series: Series; skus: Sku[] }[];
}[];

export async function getCatalogTree(): Promise<CatalogTree> {
  const supabase = createClient();
  const [{ data: brands }, { data: allSeries }, { data: allSkus }] = await Promise.all([
    supabase.from("brands").select("id, slug, name").order("name").returns<Brand[]>(),
    supabase
      .from("series")
      .select("id, brand_id, name, slug")
      .order("name")
      .returns<Series[]>(),
    supabase
      .from("skus")
      .select(
        "id, series_id, color_name, color_hex, shopify_product_handle, shopify_variant_id, image_path, is_active"
      )
      .order("created_at", { ascending: true })
      .returns<Sku[]>(),
  ]);

  const seriesByBrand = new Map<string, Series[]>();
  for (const s of allSeries ?? []) {
    const arr = seriesByBrand.get(s.brand_id) ?? [];
    arr.push(s);
    seriesByBrand.set(s.brand_id, arr);
  }
  const skusBySeries = new Map<string, Sku[]>();
  for (const k of allSkus ?? []) {
    const arr = skusBySeries.get(k.series_id) ?? [];
    arr.push(k);
    skusBySeries.set(k.series_id, arr);
  }

  return (brands ?? []).map((brand) => ({
    brand,
    series: (seriesByBrand.get(brand.id) ?? []).map((series) => ({
      series,
      skus: skusBySeries.get(series.id) ?? [],
    })),
  }));
}

export type SkuPage = {
  sku: Sku;
  brandName: string | null;
  brandSlug: string | null;
  seriesName: string | null;
  label: string;
  faces: FaceRecommendation[];
};

/**
 * 公開Productページ用：shopify_product_handle から SKU を解決。
 * 現状は 1 handle = 1 SKU 前提（最初の1件）。将来 variant_id で多SKU対応に拡張可能。
 */
export async function getSkuPageByHandle(handle: string): Promise<SkuPage | null> {
  const supabase = createClient();
  const { data: skuRow } = await supabase
    .from("skus")
    .select(
      "id, series_id, color_name, color_hex, shopify_product_handle, shopify_variant_id, is_active, image_path, series(name, slug, brands(name, slug))"
    )
    .eq("shopify_product_handle", handle)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<
      Sku & {
        image_path: string | null;
        series: { name: string; slug: string | null; brands: { name: string; slug: string } | null } | null;
      }
    >();

  if (!skuRow) return null;

  const { data: faces } = await supabase
    .from("face_recommendations")
    .select(
      "id, sku_id, watch_model, name, category, apple_share_url, editor_comment, rating, priority, is_published"
    )
    .eq("sku_id", skuRow.id)
    .eq("is_published", true)
    .order("priority", { ascending: false })
    .returns<FaceRecommendation[]>();

  const { series, ...sku } = skuRow;
  return {
    sku,
    brandName: series?.brands?.name ?? null,
    brandSlug: series?.brands?.slug ?? null,
    seriesName: series?.name ?? null,
    label: [series?.brands?.name, series?.name, skuRow.color_name].filter(Boolean).join(" "),
    faces: faces ?? [],
  };
}

/** 1つのSKUとそのFace一覧（priority降順） */
export async function getSkuWithFaces(skuId: string): Promise<{
  sku: Sku | null;
  faces: FaceRecommendation[];
  label: string;
}> {
  const supabase = createClient();
  const { data: skuRow } = await supabase
    .from("skus")
    .select(
      "id, series_id, color_name, color_hex, shopify_product_handle, shopify_variant_id, image_path, is_active, series(name, brands(name))"
    )
    .eq("id", skuId)
    .maybeSingle<Sku & { series: { name: string; brands: { name: string } | null } | null }>();

  if (!skuRow) return { sku: null, faces: [], label: "" };

  const label = [skuRow.series?.brands?.name, skuRow.series?.name, skuRow.color_name]
    .filter(Boolean)
    .join(" ");

  const { data: faces } = await supabase
    .from("face_recommendations")
    .select(
      "id, sku_id, watch_model, name, category, apple_share_url, editor_comment, rating, priority, is_published"
    )
    .eq("sku_id", skuId)
    .order("priority", { ascending: false })
    .returns<FaceRecommendation[]>();

  const { series: _series, ...sku } = skuRow;
  return { sku, faces: faces ?? [], label };
}
