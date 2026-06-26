"use client";

import { useState } from "react";

/**
 * ✨ AIコーデを作る — 将来は背景/服/文字盤の生成へ。
 * 現状は Coming Soon を表示するだけ。
 */
export function AICoordinateButton() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-black/15 py-2.5 text-sm font-medium text-black/80 hover:bg-black/[0.03]"
      >
        ✨ AIコーデを作る
      </button>
      {open && (
        <p className="mt-2 rounded-lg bg-black/[0.04] px-3 py-2 text-center text-xs text-black/50">
          Coming Soon — 背景・服・文字盤を変えたコーデ画像を生成できるようになります。
        </p>
      )}
    </div>
  );
}
