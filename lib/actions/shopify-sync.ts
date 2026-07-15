"use server";

// ============================================================================
// Shopify 商品カタログ Pull 同期（Phase 1 MVP）
//
// 【設計】docs/product-catalog-redesign.md ④ 参照。
//   - /admin/products の「Shopifyから同期」ボタンからのみ実行（Webhookはスコープ外）。
//   - 事実列のみ上書き: name / description / image_path / product_url /
//     shopify_product_handle / sales_status / synced_at
//   - WSC編集列（is_published / is_recommended / is_featured / sort_order /
//     wsc_description / category_id）は絶対に触らない。
//   - 新規商品は is_published=false で入る（勝手に公開されない）。
//   - Shopifyから消えた source='shopify' 商品は sales_status='discontinued'
//     （行は消さない。投稿が参照しているため）。
//   - vendor → brands を find-or-create（brand は WSC 側の概念だが名前は Shopify に従う）。
// ============================================================================

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const API_VERSION = "2024-10";

type ShopifyVariantNode = {
  id: string;
  title: string;
  image: { url: string } | null;
};

type ShopifyProductNode = {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  vendor: string;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
  onlineStoreUrl: string | null;
  featuredImage: { url: string } | null;
  variants: { nodes: ShopifyVariantNode[] };
};

type ProductsQueryResult = {
  data?: {
    products: {
      nodes: ShopifyProductNode[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
  errors?: { message: string }[];
};

const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($cursor: String) {
    products(first: 50, after: $cursor) {
      nodes {
        id
        title
        handle
        descriptionHtml
        vendor
        status
        onlineStoreUrl
        featuredImage { url }
        variants(first: 50) {
          nodes {
            id
            title
            image { url }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function slugify(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

/** HTML簡易除去（description用。長文は3000字で切る） */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);
}

async function assertAdminUser() {
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
}

export type SyncResult = {
  ok: boolean;
  message: string;
  created?: number;
  updated?: number;
  discontinued?: number;
};

export async function syncShopifyProducts(): Promise<SyncResult> {
  await assertAdminUser();

  const shopDomain = process.env.SHOPIFY_ADMIN_SHOP_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
  if (!shopDomain || !token) {
    return {
      ok: false,
      message:
        "環境変数 SHOPIFY_ADMIN_SHOP_DOMAIN / SHOPIFY_ADMIN_API_TOKEN が未設定です（docs/product-catalog-redesign.md ④ 参照）。",
    };
  }

  // ① Shopifyから全商品をページング取得
  const nodes: ShopifyProductNode[] = [];
  let cursor: string | null = null;
  try {
    for (let page = 0; page < 20; page++) {
      const res: Response = await fetch(
        `https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
          },
          body: JSON.stringify({ query: PRODUCTS_QUERY, variables: { cursor } }),
          cache: "no-store",
        }
      );
      if (!res.ok) {
        return { ok: false, message: `Shopify APIエラー: HTTP ${res.status}` };
      }
      const json = (await res.json()) as ProductsQueryResult;
      if (json.errors?.length) {
        return { ok: false, message: `Shopify APIエラー: ${json.errors[0].message}` };
      }
      const conn = json.data?.products;
      if (!conn) break;
      nodes.push(...conn.nodes);
      if (!conn.pageInfo.hasNextPage) break;
      cursor = conn.pageInfo.endCursor;
    }
  } catch (e) {
    return {
      ok: false,
      message: `Shopifyへの接続に失敗しました: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }

  const admin = createAdminClient();
  let created = 0;
  let updated = 0;

  // ② vendor → brand の find-or-create 用に既存brandを引く
  const { data: brandRows } = await admin
    .from("brands")
    .select("id, name")
    .returns<{ id: string; name: string }[]>();
  const brandByName = new Map((brandRows ?? []).map((b) => [b.name.toLowerCase(), b.id]));

  // カテゴリ 'band' をデフォルトに（AWJの現行商材。将来productTypeでマップ）
  const { data: bandCategory } = await admin
    .from("categories")
    .select("id")
    .eq("slug", "band")
    .maybeSingle<{ id: string }>();

  // ③ 既存productsの同期キー
  const { data: existingProducts } = await admin
    .from("products")
    .select("id, shopify_product_id, source")
    .returns<{ id: string; shopify_product_id: string | null; source: string }[]>();
  const productByShopifyId = new Map(
    (existingProducts ?? [])
      .filter((p) => p.shopify_product_id)
      .map((p) => [p.shopify_product_id as string, p.id])
  );
  // handle は手動商品にも設定されている場合がある（0020のbackfill昇格）→ handleでも突合
  const { data: byHandleRows } = await admin
    .from("products")
    .select("id, shopify_product_handle")
    .not("shopify_product_handle", "is", null)
    .returns<{ id: string; shopify_product_handle: string }[]>();
  const productByHandle = new Map(byHandleRows?.map((p) => [p.shopify_product_handle, p.id]) ?? []);

  const seenShopifyIds = new Set<string>();

  for (const node of nodes) {
    seenShopifyIds.add(node.id);

    // brand find-or-create
    const vendorKey = (node.vendor || "その他").toLowerCase();
    let brandId = brandByName.get(vendorKey);
    if (!brandId) {
      const { data: newBrand } = await admin
        .from("brands")
        .insert({ name: node.vendor || "その他", slug: slugify(node.vendor || "other") })
        .select("id")
        .single<{ id: string }>();
      if (!newBrand) continue;
      brandId = newBrand.id;
      brandByName.set(vendorKey, brandId);
    }

    // 事実列のみ（WSC編集列は含めない）
    const factColumns = {
      name: node.title,
      description: stripHtml(node.descriptionHtml || ""),
      image_path: node.featuredImage?.url ?? null,
      product_url: node.onlineStoreUrl,
      shopify_product_handle: node.handle,
      sales_status: (node.status === "ACTIVE" ? "active" : "discontinued") as
        | "active"
        | "discontinued",
      synced_at: new Date().toISOString(),
      source: "shopify",
      updated_at: new Date().toISOString(),
    };

    const existingId = productByShopifyId.get(node.id) ?? productByHandle.get(node.handle);
    let productId: string;
    if (existingId) {
      await admin
        .from("products")
        .update({ ...factColumns, shopify_product_id: node.id })
        .eq("id", existingId);
      productId = existingId;
      updated++;
    } else {
      const { data: inserted } = await admin
        .from("products")
        .insert({
          ...factColumns,
          brand_id: brandId,
          category_id: bandCategory?.id ?? null,
          slug: slugify(node.handle || node.title),
          shopify_product_id: node.id,
          is_published: false, // 新規は非公開で入る
        })
        .select("id")
        .single<{ id: string }>();
      if (!inserted) continue;
      productId = inserted.id;
      created++;
    }

    // ④ variants → skus upsert（shopify_variant_id キー）
    for (let i = 0; i < node.variants.nodes.length; i++) {
      const v = node.variants.nodes[i];
      const colorName = v.title === "Default Title" ? "Default" : v.title;
      const { data: existingSku } = await admin
        .from("skus")
        .select("id")
        .eq("shopify_variant_id", v.id)
        .maybeSingle<{ id: string }>();
      if (existingSku) {
        await admin
          .from("skus")
          .update({
            product_id: productId,
            color_name: colorName,
            image_path: v.image?.url ?? null,
            position: i,
          })
          .eq("id", existingSku.id);
      } else {
        await admin.from("skus").insert({
          product_id: productId,
          color_name: colorName,
          shopify_variant_id: v.id,
          image_path: v.image?.url ?? null,
          position: i,
          is_awj: true, // Shopify同期商品 = AWJ取扱
        });
      }
    }
  }

  // ⑤ Shopifyから消えた source='shopify' 商品を discontinued に（行は消さない）
  let discontinued = 0;
  for (const p of existingProducts ?? []) {
    if (p.source === "shopify" && p.shopify_product_id && !seenShopifyIds.has(p.shopify_product_id)) {
      await admin
        .from("products")
        .update({ sales_status: "discontinued", synced_at: new Date().toISOString() })
        .eq("id", p.id);
      discontinued++;
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/post/new");
  return {
    ok: true,
    message: `同期完了: 新規${created}件 / 更新${updated}件 / 販売終了${discontinued}件`,
    created,
    updated,
    discontinued,
  };
}
