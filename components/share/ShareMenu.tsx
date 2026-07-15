"use client";

import { useEffect, useState } from "react";
import type { ShareablePost } from "@/lib/share";
import {
  buildShareText,
  buildShareTitle,
  buildShareUrl,
  buildXShareUrl,
  buildFacebookShareUrl,
  buildLineShareUrl,
} from "@/lib/share";
import { trackShareEvent } from "@/lib/share-analytics";
import { InstagramShareGuide } from "@/components/share/InstagramShareGuide";

type RowDef = {
  key: "native" | "x" | "facebook" | "line" | "instagram" | "copy";
  label: string;
  icon: React.ReactNode;
};

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * 共有メニュー（モバイル: bottom sheet / PC: 中央モーダル。CSSのブレークポイントのみで切り替え）。
 * 詳細・Timeline・Gallery すべてから同じものを開く（重複実装しない）。
 */
export function ShareMenu({
  post,
  imageUrl,
  onClose,
}: {
  post: ShareablePost;
  imageUrl?: string;
  onClose: () => void;
}) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showInstagramGuide, setShowInstagramGuide] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const url = buildShareUrl(post);
  const text = buildShareText(post);
  const title = buildShareTitle(post);

  async function handleNativeShare() {
    trackShareEvent("native", post.id);
    try {
      await navigator.share({ title, text, url });
    } catch {
      // ユーザーによるキャンセル等は無視
    }
    onClose();
  }

  async function handleCopy() {
    trackShareEvent("copy", post.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => onClose(), 900);
    } catch {
      setCopied(false);
    }
  }

  function handleX() {
    trackShareEvent("x", post.id);
    openInNewTab(buildXShareUrl(post));
    onClose();
  }
  function handleFacebook() {
    trackShareEvent("facebook", post.id);
    openInNewTab(buildFacebookShareUrl(post));
    onClose();
  }
  function handleLine() {
    trackShareEvent("line", post.id);
    openInNewTab(buildLineShareUrl(post));
    onClose();
  }
  function handleInstagram() {
    trackShareEvent("instagram", post.id);
    setShowInstagramGuide(true);
  }

  if (showInstagramGuide) {
    return (
      <InstagramShareGuide
        post={post}
        imageUrl={imageUrl}
        onClose={() => {
          setShowInstagramGuide(false);
          onClose();
        }}
      />
    );
  }

  const rows: RowDef[] = [
    ...(canNativeShare
      ? [
          {
            key: "native" as const,
            label: "端末でシェア",
            icon: (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v13m0-13 4 4m-4-4-4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
              </svg>
            ),
          },
        ]
      : []),
    {
      key: "x",
      label: "Xでシェア",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      key: "facebook",
      label: "Facebookでシェア",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z" />
        </svg>
      ),
    },
    {
      key: "line",
      label: "LINEでシェア",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M12 2C6.48 2 2 5.69 2 10.24c0 4.08 3.54 7.5 8.32 8.14.32.07.76.22.87.5.1.26.06.66.03.92l-.14.86c-.04.26-.2 1 .87.55 1.07-.46 5.77-3.4 7.87-5.82C21.13 13.83 22 12.13 22 10.24 22 5.69 17.52 2 12 2zM8.6 12.9H7c-.15 0-.27-.12-.27-.27V9.05c0-.15.12-.27.27-.27s.27.12.27.27v3.3h1.33c.15 0 .27.12.27.27s-.12.28-.27.28zm1.62-.27c0 .15-.12.27-.27.27s-.27-.12-.27-.27V9.05c0-.15.12-.27.27-.27s.27.12.27.27zm3.36 0c0 .12-.08.22-.19.26-.03.01-.07.02-.1.02-.09 0-.18-.04-.23-.12l-1.51-2.05v1.89c0 .15-.12.27-.27.27s-.27-.12-.27-.27V9.05c0-.12.08-.22.19-.26.03 0 .07-.01.1-.01.08 0 .17.04.22.11l1.51 2.05V9.05c0-.15.12-.27.27-.27s.27.12.27.27v3.58zm3.03-2.2c.15 0 .27.13.27.28s-.12.27-.27.27h-1.33v.81h1.33c.15 0 .27.12.27.27s-.12.27-.27.27h-1.6c-.15 0-.27-.12-.27-.27V9.05c0-.15.12-.27.27-.27h1.6c.15 0 .27.12.27.27s-.12.27-.27.27h-1.33v.81z" />
        </svg>
      ),
    },
    {
      key: "instagram",
      label: "Instagramで使う",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      key: "copy",
      label: copied ? "コピーしました" : "リンクをコピー",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      ),
    },
  ];

  function handleRowClick(key: RowDef["key"]) {
    if (key === "native") return handleNativeShare();
    if (key === "x") return handleX();
    if (key === "facebook") return handleFacebook();
    if (key === "line") return handleLine();
    if (key === "instagram") return handleInstagram();
    if (key === "copy") return handleCopy();
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* 背景 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* パネル：モバイルは下からのbottom sheet、sm以上は中央モーダル */}
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-2 pb-[env(safe-area-inset-bottom)]
                   sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2
                   sm:rounded-2xl sm:p-3"
      >
        <div className="mx-auto mb-1 mt-1 h-1 w-10 rounded-full bg-black/15 sm:hidden" />
        <p className="px-3 py-2 text-sm font-medium text-black/70">シェア</p>
        <div className="flex flex-col">
          {rows.map((row) => (
            <button
              key={row.key}
              type="button"
              data-share-platform={row.key}
              onClick={() => handleRowClick(row.key)}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-black/5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5">
                {row.icon}
              </span>
              {row.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 w-full rounded-lg px-3 py-2.5 text-center text-sm text-black/50 hover:bg-black/5"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
