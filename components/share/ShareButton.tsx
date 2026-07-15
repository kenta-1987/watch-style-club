"use client";

import { useState } from "react";
import type { ShareablePost } from "@/lib/share";
import { ShareMenu } from "@/components/share/ShareMenu";

/**
 * 共有トリガー（アイコン1つ）。詳細ページ・Timeline・Galleryカードで共通利用する。
 * クリックでShareMenu（モバイルはbottom sheet／PCはmodal）を開く。
 */
const ShareIcon = (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="18" cy="5" r="2.7" />
    <circle cx="6" cy="12" r="2.7" />
    <circle cx="18" cy="19" r="2.7" />
    <path strokeLinecap="round" d="M8.3 10.7 15.7 6.6M8.3 13.3l7.4 4.1" />
  </svg>
);

export function ShareButton({
  post,
  imageUrl,
  className = "",
  variant = "icon",
}: {
  post: ShareablePost;
  /** Instagram案内・Web Share APIでの画像共有に使うカバー画像URL（署名URL可） */
  imageUrl?: string;
  className?: string;
  /** "icon": Timeline/Gallery/詳細の小アイコン。 "cta": 投稿完了画面用の大きめボタン */
  variant?: "icon" | "cta";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "cta" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-white hover:opacity-80 ${className}`}
        >
          {ShareIcon}
          SNSでシェアする
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="シェア"
          title="シェア"
          className={`inline-flex items-center gap-1.5 text-black/70 transition hover:text-black ${className}`}
        >
          {ShareIcon}
        </button>
      )}

      {open && <ShareMenu post={post} imageUrl={imageUrl} onClose={() => setOpen(false)} />}
    </>
  );
}
