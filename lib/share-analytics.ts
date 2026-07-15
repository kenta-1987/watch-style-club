"use client";

// ============================================================================
// SNS Share Phase 1 — シェア計測フック
//
// 現状このプロジェクトに Analytics（gtag/Plausible/GA等）は導入されていない。
// そのため今回は「イベント送信の型・フックだけ」用意し、将来 Analytics 導入時に
// この1関数の中身を差し替えるだけで済むようにする。DB保存（share_events）は今回やらない。
// ============================================================================

export type SharePlatform = "x" | "facebook" | "line" | "instagram" | "copy" | "native" | "pinterest";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    plausible?: (event: string, options?: { props?: Record<string, unknown> }) => void;
    dataLayer?: unknown[];
  }
}

/**
 * シェア操作の計測（ベストエフォート）。既存 Analytics が無ければ no-op（開発時のみ console.debug）。
 * ボタンを押した事実だけを送る。実際にSNS投稿されたかの確認はできない（SPは付与しない）。
 */
export function trackShareEvent(platform: SharePlatform, postId: string): void {
  try {
    if (typeof window === "undefined") return;

    if (typeof window.gtag === "function") {
      window.gtag("event", "share", { method: platform, content_id: postId });
    }
    if (typeof window.plausible === "function") {
      window.plausible("share", { props: { platform, postId } });
    }
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: "share", platform, postId });
    }

    if (process.env.NODE_ENV !== "production") {
      console.debug("[share]", platform, postId);
    }
  } catch {
    // 計測失敗はシェア操作自体を止めない
  }
}
