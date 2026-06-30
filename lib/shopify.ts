const SHOPIFY_BASE =
  process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN || "https://shop.applewatchjournal.net";

/** SKU の Shopify handle から商品URLを生成（AWJ取扱バンドの購入導線） */
export function shopUrlForHandle(handle: string | null | undefined): string | null {
  if (!handle) return null;
  return `${SHOPIFY_BASE}/products/${handle}`;
}
