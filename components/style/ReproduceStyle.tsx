"use client";

import { useState } from "react";

/**
 * 🟢 このStyleを再現
 * Style プラットフォームの中核アクション。押すと2つの再現手段を提示する：
 *   ① 文字盤を追加（Appleの文字盤共有リンク／レシピ）— 未保存なら近日対応
 *   ② このバンドを見る（商品ページ）
 *
 * faceShareUrl はまだ DB 未保存（将来 0005 で追加）。プロップだけ用意しておき、
 * 値が来たら ① がそのまま機能するようにしてある。
 */
export function ReproduceStyle({
  productUrl,
  faceShareUrl,
}: {
  productUrl?: string | null;
  faceShareUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [faceNote, setFaceNote] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        <span className="text-base leading-none">🟢</span>
        このStyleを再現
      </button>

      {open && (
        <div className="mt-2 space-y-2 rounded-xl border border-black/10 bg-white p-3">
          {/* ① 文字盤を追加 */}
          {faceShareUrl ? (
            <a
              href={faceShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2.5 text-sm hover:bg-black/[0.03]"
            >
              <span>
                <span className="mr-2 text-black/40">①</span>文字盤を追加
              </span>
              <span className="text-black/40">→</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setFaceNote((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-black/10 px-3 py-2.5 text-left text-sm hover:bg-black/[0.03]"
            >
              <span>
                <span className="mr-2 text-black/40">①</span>文字盤を追加
              </span>
              <span className="text-xs text-black/30">近日対応</span>
            </button>
          )}
          {faceNote && (
            <p className="rounded-lg bg-black/[0.04] px-3 py-2 text-xs text-black/50">
              Apple Watch の文字盤共有リンク／設定レシピに対応予定です。投稿者が文字盤を登録すると、ここから同じ文字盤を追加できるようになります。
            </p>
          )}

          {/* ② このバンドを見る */}
          {productUrl ? (
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2.5 text-sm hover:bg-black/[0.03]"
            >
              <span>
                <span className="mr-2 text-black/40">②</span>このバンドを見る
              </span>
              <span className="text-black/40">→</span>
            </a>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2.5 text-sm text-black/35">
              <span>
                <span className="mr-2">②</span>このバンドを見る
              </span>
              <span className="text-xs">準備中</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
