"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  if (data?.role !== "admin") throw new Error("forbidden");
  return supabase;
}

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function revalidateCatalog() {
  revalidatePath("/admin/products");
  revalidatePath("/post/new");
  revalidatePath("/timeline");
  revalidatePath("/gallery");
}

export async function createBrand(formData: FormData) {
  const supabase = await assertAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const slug = String(formData.get("slug") ?? "").trim() || slugify(name);
  await supabase.from("brands").insert({ name, slug });
  revalidateCatalog();
}

/** Product 作成（手動登録。Shopify由来は同期が upsert する） */
export async function createProduct(formData: FormData) {
  const supabase = await assertAdmin();
  const brand_id = String(formData.get("brand_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!brand_id || !name) return;
  const category_id = String(formData.get("category_id") ?? "").trim() || null;
  await supabase.from("products").insert({
    brand_id,
    category_id,
    name,
    slug: slugify(name) || `product-${Date.now()}`,
    source: "manual",
    is_published: false, // 掲載は明示的にONにする（勝手に公開しない）
  });
  revalidateCatalog();
}

/**
 * Product 編集。事実列（name/description/product_url/image_path/handle/sales_status）と
 * WSC編集列（is_published/is_recommended/is_featured/sort_order/wsc_description）の両方を
 * 管理画面から編集できる（手動商品は事実列も人が正）。
 */
export async function updateProduct(formData: FormData) {
  const supabase = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const salesStatus = String(formData.get("sales_status") ?? "active");
  await supabase
    .from("products")
    .update({
      name: String(formData.get("name") ?? "").trim() || undefined,
      description: String(formData.get("description") ?? "").trim() || null,
      wsc_description: String(formData.get("wsc_description") ?? "").trim() || null,
      product_url: String(formData.get("product_url") ?? "").trim() || null,
      image_path: String(formData.get("image_path") ?? "").trim() || null,
      shopify_product_handle:
        String(formData.get("shopify_product_handle") ?? "").trim() || null,
      category_id: String(formData.get("category_id") ?? "").trim() || null,
      sales_status: (["active", "sold_out", "discontinued"].includes(salesStatus)
        ? salesStatus
        : "active") as "active" | "sold_out" | "discontinued",
      is_published: formData.get("is_published") === "on",
      is_recommended: formData.get("is_recommended") === "on",
      is_featured: formData.get("is_featured") === "on",
      sort_order: Number(formData.get("sort_order") ?? 0) || 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidateCatalog();
}

/** 掲載ON/OFFだけを素早く切り替えるトグル */
export async function toggleProductPublished(formData: FormData) {
  const supabase = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "") === "true";
  if (!id) return;
  await supabase
    .from("products")
    .update({ is_published: next, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidateCatalog();
}

export async function createSku(formData: FormData) {
  const supabase = await assertAdmin();
  const product_id = String(formData.get("product_id") ?? "");
  const color_name = String(formData.get("color_name") ?? "").trim();
  if (!product_id || !color_name) return;
  await supabase.from("skus").insert({
    product_id,
    color_name,
    color_hex: String(formData.get("color_hex") ?? "").trim() || null,
    shopify_variant_id: String(formData.get("shopify_variant_id") ?? "").trim() || null,
  });
  revalidateCatalog();
}

export async function addFace(formData: FormData) {
  const supabase = await assertAdmin();
  const sku_id = String(formData.get("sku_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!sku_id || !name) return;

  const ratingRaw = String(formData.get("rating") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "").trim();

  await supabase.from("face_recommendations").insert({
    sku_id,
    name,
    category: String(formData.get("category") ?? "").trim() || null,
    apple_share_url: String(formData.get("apple_share_url") ?? "").trim() || null,
    editor_comment: String(formData.get("editor_comment") ?? "").trim() || null,
    watch_model: String(formData.get("watch_model") ?? "").trim() || null,
    rating: ratingRaw ? Number(ratingRaw) : null,
    priority: priorityRaw ? Number(priorityRaw) : 0,
  });
  revalidatePath(`/admin/skus/${sku_id}`);
  revalidatePath("/timeline");
}

export async function deleteFace(formData: FormData) {
  const supabase = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const sku_id = String(formData.get("sku_id") ?? "");
  if (!id) return;
  await supabase.from("face_recommendations").delete().eq("id", id);
  if (sku_id) revalidatePath(`/admin/skus/${sku_id}`);
  revalidatePath("/timeline");
}
