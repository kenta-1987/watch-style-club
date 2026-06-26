"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function FilterBar({
  models,
  brands,
  colors,
}: {
  models: string[];
  brands: string[];
  colors: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = {
    model: searchParams.get("model") ?? "",
    brand: searchParams.get("brand") ?? "",
    color: searchParams.get("color") ?? "",
  };

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(qs ? `/gallery?${qs}` : "/gallery");
  }

  const hasFilter = current.model || current.brand || current.color;
  const selectClass =
    "rounded-full border border-black/15 bg-white px-3 py-1.5 text-sm outline-none focus:border-ink";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={current.model}
        onChange={(e) => update("model", e.target.value)}
        className={selectClass}
        aria-label="Apple Watch モデルで絞り込む"
      >
        <option value="">すべてのモデル</option>
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <select
        value={current.brand}
        onChange={(e) => update("brand", e.target.value)}
        className={selectClass}
        aria-label="ブランドで絞り込む"
      >
        <option value="">すべてのブランド</option>
        {brands.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>

      {colors.length > 0 && (
        <select
          value={current.color}
          onChange={(e) => update("color", e.target.value)}
          className={selectClass}
          aria-label="カラーで絞り込む"
        >
          <option value="">すべてのカラー</option>
          {colors.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}

      {hasFilter && (
        <button
          type="button"
          onClick={() => router.push("/gallery")}
          className="rounded-full px-3 py-1.5 text-sm text-black/50 hover:text-ink"
        >
          クリア
        </button>
      )}
    </div>
  );
}
