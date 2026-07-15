"use client";

import { useState, useTransition } from "react";
import { syncShopifyProducts, type SyncResult } from "@/lib/actions/shopify-sync";

/**
 * 「Shopifyから同期」ボタン（/admin/products）。
 * Pull同期のみ（Webhookはスコープ外）。結果はボタン下に表示。
 */
export function SyncButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncResult | null>(null);

  function onClick() {
    startTransition(async () => {
      const r = await syncShopifyProducts();
      setResult(r);
    });
  }

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-50"
      >
        {pending ? "同期中…" : "⟳ Shopifyから同期"}
      </button>
      {result && (
        <p className={`mt-1 max-w-60 text-xs ${result.ok ? "text-emerald-600" : "text-red-500"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
