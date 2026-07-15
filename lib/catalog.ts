// ============================================================================
// Product Catalog（第一級概念） — Brand → Category → Product → SKU
//
// 【設計】docs/product-catalog-redesign.md 参照。
//   - Product が商品（名前/説明/画像/URL/販売状態/Shopify handle）を持つ。
//   - SKU はバリアント（カラー）に専念。投稿は sku_id のみ保持し、
//     ブランド名・商品名・画像・URLは常に SKU → Product → Brand から導出する。
//   - 事実列（Shopify同期が上書き）とWSC編集列（is_published等）は分離されている。
//   - series は 0022 で削除予定。このファイルは一切参照しない。
// ============================================================================
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Brand = { id: string; slug: string; name: string };
export type Category = { id: string; slug: string; name: string; sort_order: number };

export type Product = {
  id: string;
  brand_id: string;
  category_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  image_path: string | null;
  product_url: string | null;
  shopify_product_id: string | null;
  shopify_product_handle: string | null;
  sales_status: "active" | "sold_out" | "discontinued";
  source: string;
  is_published: boolean;
  is_recommended: boolean;
  is_featured: boolean;
  sort_order: number;
  wsc_description: string | null;
  synced_at: string | null;
};

export type Sku = {
  id: string;
  product_id: string;
  color_name: string;
  color_hex: string | null;
  shopify_variant_id: string | null;
  image_path: string | null;
  is_active: boolean;
  position: number;
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

// ===== 投稿フォーム用：AWJ取扱の ブランド → 商品 → カラー(SKU) ツリー =====
export type PickerSku = { id: string; colorName: string; colorHex: string | null };
export type PickerProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  productUrl: string | null;
  handle: string | null;
  skus: PickerSku[];
};
export type PickerBrand = { id: string; name: string; products: PickerProduct[] };

/** 商品画像URL（http URLのみ表示可。storage pathは将来対応） */
function productImageUrl(imagePath: string | null): string | null {
  return imagePath && imagePath.startsWith("http") ? imagePath : null;
}

/**
 * 投稿フォームのAWJピッカー：掲載中（is_published）かつ販売終了でない商品の、
 * is_awj かつ is_active な SKU だけを Brand → Product → SKU の階層で返す。
 */
export async function getAwjPickerTree(): Promise<PickerBrand[]> {
  const supabase = createClient();
  const [{ data: skus }, { data: productRows }, { data: brandRows }] = await Promise.all([
    supabase
      .from("skus")
      .select("id, color_name, color_hex, product_id, position")
      .eq("is_awj", true)
      .eq("is_active", true)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<{ id: string; color_name: string; color_hex: string | null; product_id: string; position: number }[]>(),
    supabase
      .from("products")
      .select("id, brand_id, name, image_path, product_url, shopify_product_handle, sort_order")
      .eq("is_published", true)
      .neq("sales_status", "discontinued")
      .order("sort_order", { ascending: true })
      .order("name")
      .returns<
        {
          id: string;
          brand_id: string;
          name: string;
          image_path: string | null;
          product_url: string | null;
          shopify_product_handle: string | null;
          sort_order: number;
        }[]
      >(),
    supabase.from("brands").select("id, name").order("name").returns<{ id: string; name: string }[]>(),
  ]);

  const skusByProduct = new Map<string, PickerSku[]>();
  for (const s of skus ?? []) {
    const a = skusByProduct.get(s.product_id) ?? [];
    a.push({ id: s.id, colorName: s.color_name, colorHex: s.color_hex });
    skusByProduct.set(s.product_id, a);
  }
  const productsByBrand = new Map<string, PickerProduct[]>();
  for (const p of productRows ?? []) {
    const sk = skusByProduct.get(p.id);
    if (!sk || sk.length === 0) continue;
    const a = productsByBrand.get(p.brand_id) ?? [];
    a.push({
      id: p.id,
      name: p.name,
      imageUrl: productImageUrl(p.image_path),
      productUrl: p.product_url,
      handle: p.shopify_product_handle,
      skus: sk,
    });
    productsByBrand.set(p.brand_id, a);
  }
  return (brandRows ?? [])
    .map((b) => ({ id: b.id, name: b.name, products: productsByBrand.get(b.id) ?? [] }))
    .filter((b) => b.products.length > 0);
}

/** SKU 選択用のフラットリスト（ラベル = Brand Product Color。Admin レビューのSKU紐付け用） */
export type SkuOption = { id: string; label: string };

type SkuOptionRow = {
  id: string;
  color_name: string;
  products: { name: string; brands: { name: string } | null } | null;
};

export async function getSkuOptions(): Promise<SkuOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("skus")
    .select("id, color_name, products(name, brands(name))")
    .order("created_at", { ascending: true })
    .returns<SkuOptionRow[]>();

  return (data ?? []).map((s) => ({
    id: s.id,
    label: [s.products?.brands?.name, s.products?.name, s.color_name]
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

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, sort_order")
    .order("sort_order")
    .returns<Category[]>();
  return data ?? [];
}

const PRODUCT_COLUMNS =
  "id, brand_id, category_id, slug, name, description, image_path, product_url, shopify_product_id, shopify_product_handle, sales_status, source, is_published, is_recommended, is_featured, sort_order, wsc_description, synced_at";

const SKU_COLUMNS =
  "id, product_id, color_name, color_hex, shopify_variant_id, image_path, is_active, position";

/** Brand → Product → SKU のツリー（Admin カタログ画面用。非公開商品も含む） */
export type CatalogTree = {
  brand: Brand;
  products: { product: Product; skus: Sku[] }[];
}[];

export async function getCatalogTree(): Promise<CatalogTree> {
  const supabase = createClient();
  const [{ data: brands }, { data: allProducts }, { data: allSkus }] = await Promise.all([
    supabase.from("brands").select("id, slug, name").order("name").returns<Brand[]>(),
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("name")
      .returns<Product[]>(),
    supabase
      .from("skus")
      .select(SKU_COLUMNS)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<Sku[]>(),
  ]);

  const productsByBrand = new Map<string, Product[]>();
  for (const p of allProducts ?? []) {
    const arr = productsByBrand.get(p.brand_id) ?? [];
    arr.push(p);
    productsByBrand.set(p.brand_id, arr);
  }
  const skusByProduct = new Map<string, Sku[]>();
  for (const k of allSkus ?? []) {
    const arr = skusByProduct.get(k.product_id) ?? [];
    arr.push(k);
    skusByProduct.set(k.product_id, arr);
  }

  return (brands ?? []).map((brand) => ({
    brand,
    products: (productsByBrand.get(brand.id) ?? []).map((product) => ({
      product,
      skus: skusByProduct.get(product.id) ?? [],
    })),
  }));
}

export type ProductPage = {
  product: Product;
  brandName: string | null;
  brandSlug: string | null;
  label: string;
  skus: Sku[];
  faces: FaceRecommendation[];
};

/**
 * 公開Productページ用：products.shopify_product_handle から商品を解決。
 * 1 handle = 1 Product（配下の全SKU＋全Faceを返す）。
 * 旧「1 handle = 1 SKU 前提」の暫定実装を解消。
 */
export async function getProductPageByHandle(handle: string): Promise<ProductPage | null> {
  const supabase = createClient();
  const { data: productRow } = await supabase
    .from("products")
    .select(`${PRODUCT_COLUMNS}, brands(name, slug)`)
    .eq("shopify_product_handle", handle)
    .maybeSingle<Product & { brands: { name: string; slug: string } | null }>();

  if (!productRow) return null;

  const { data: skus } = await supabase
    .from("skus")
    .select(SKU_COLUMNS)
    .eq("product_id", productRow.id)
    .eq("is_active", true)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Sku[]>();

  const skuIds = (skus ?? []).map((s) => s.id);
  const { data: faces } =
    skuIds.length > 0
      ? await supabase
          .from("face_recommendations")
          .select(
            "id, sku_id, watch_model, name, category, apple_share_url, editor_comment, rating, priority, is_published"
          )
          .in("sku_id", skuIds)
          .eq("is_published", true)
          .order("priority", { ascending: false })
          .returns<FaceRecommendation[]>()
      : { data: [] as FaceRecommendation[] };

  const { brands, ...product } = productRow;
  return {
    product,
    brandName: brands?.name ?? null,
    brandSlug: brands?.slug ?? null,
    label: [brands?.name, product.name].filter(Boolean).join(" "),
    skus: skus ?? [],
    faces: faces ?? [],
  };
}

/** 1つのSKUとそのFace一覧（priority降順）。商品情報はProductから導出。 */
export async function getSkuWithFaces(skuId: string): Promise<{
  sku: Sku | null;
  product: Product | null;
  brandName: string | null;
  faces: FaceRecommendation[];
  label: string;
}> {
  const supabase = createClient();
  const { data: skuRow } = await supabase
    .from("skus")
    .select(`${SKU_COLUMNS}, products(${PRODUCT_COLUMNS}, brands(name))`)
    .eq("id", skuId)
    .maybeSingle<Sku & { products: (Product & { brands: { name: string } | null }) | null }>();

  if (!skuRow) return { sku: null, product: null, brandName: null, faces: [], label: "" };

  const { products: productRow, ...sku } = skuRow;
  const brandName = productRow?.brands?.name ?? null;
  const label = [brandName, productRow?.name, skuRow.color_name].filter(Boolean).join(" ");

  const { data: faces } = await supabase
    .from("face_recommendations")
    .select(
      "id, sku_id, watch_model, name, category, apple_share_url, editor_comment, rating, priority, is_published"
    )
    .eq("sku_id", skuId)
    .order("priority", { ascending: false })
    .returns<FaceRecommendation[]>();

  let product: Product | null = null;
  if (productRow) {
    const { brands: _b, ...rest } = productRow;
    product = rest;
  }
  return { sku, product, brandName, faces: faces ?? [], label };
}
