"use client";

import { useState } from "react";
import type { ShareablePost } from "@/lib/share";
import { buildShareText, buildShareUrl } from "@/lib/share";
import { trackShareEvent } from "@/lib/share-analytics";

/**
 * Instagramには通常のWeb共有URLが無いため、「直接投稿できる」と誤認させない案内モーダル。
 * できること：キャプション/URLのコピー、カバー画像を新しいタブで開く（長押し保存を案内）、
 * 対応端末ではWeb Share APIでの画像共有を試みる（失敗時は静かにフォールバック）。
 * Instagram APIによる自動投稿はしない。
 */
export function InstagramShareGuide({
  post,
  imageUrl,
  onClose,
}: {
  post: ShareablePost;
  imageUrl?: string;
  onClose: () => void;
}) {
  const [captionCopied, setCaptionCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const caption = buildShareText(post);
  const url = buildShareUrl(post);

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 1500);
    } catch {
      // no-op
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 1500);
    } catch {
      // no-op
    }
  }

  async function shareImageIfPossible() {
    if (!imageUrl) return;
    try {
      if (typeof navigator.share !== "function") return;
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], "style.jpg", { type: blob.type || "image/jpeg" });
      if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) return;
      await navigator.share({ files: [file], text: caption });
    } catch {
      // 画像共有が使えない環境では静かに何もしない（開く/コピー導線で代替可能）
    }
  }

  function openImage() {
    if (!imageUrl) return;
    trackShareEvent("instagram", post.id);
    window.open(imageUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 pb-[env(safe-area-inset-bottom)]
                   sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2
                   sm:rounded-2xl"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15 sm:hidden" />
        <h2 className="text-base font-semibold">Instagramで使う</h2>
        <p className="mt-2 text-sm text-black/60">
          Instagramには自動投稿の仕組みがないため、以下の手順でご自身の端末から投稿してください。
        </p>

        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
              1
            </span>
            <span>
              投稿画像を保存
              <button
                type="button"
                data-share-platform="instagram"
                onClick={openImage}
                className="ml-2 rounded-full border border-black/15 px-3 py-1 text-xs hover:bg-black/5"
              >
                画像を開く
              </button>
              <span className="mt-1 block text-xs text-black/40">
                開いたら長押し（またはドラッグ）で保存してください。
              </span>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
              2
            </span>
            <span>
              キャプションをコピー
              <button
                type="button"
                data-share-platform="instagram"
                onClick={copyCaption}
                className="ml-2 rounded-full border border-black/15 px-3 py-1 text-xs hover:bg-black/5"
              >
                {captionCopied ? "コピーしました" : "コピー"}
              </button>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
              3
            </span>
            <span>Instagramアプリで投稿</span>
          </li>
        </ol>

        <button
          type="button"
          onClick={copyUrl}
          className="mt-4 w-full rounded-full border border-black/15 py-2 text-xs hover:bg-black/5"
        >
          {urlCopied ? "投稿URLをコピーしました" : "投稿URLもコピーしておく（プロフィール欄用）"}
        </button>

        {imageUrl && typeof navigator !== "undefined" && typeof navigator.share === "function" && (
          <button
            type="button"
            onClick={shareImageIfPossible}
            className="mt-2 w-full rounded-full border border-black/10 py-2 text-xs text-black/50 hover:bg-black/5"
          >
            端末の共有機能で画像を送る（対応端末のみ）
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg px-3 py-2.5 text-center text-sm text-black/50 hover:bg-black/5"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
