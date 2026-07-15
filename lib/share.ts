// ============================================================================
// SNS Share Phase 1 — 共有文面・URL生成の共通ロジック
//
// 【設計】
//   - API自動投稿はしない（X/Facebook/LINEの共有インテントURL・Web Share API・リンクコピーのみ）。
//   - 投稿者の非公開情報（email等）は絶対に含めない。@username / display_name のみ利用。
//   - ここはブラウザ/サーバーどちらからも import される純粋関数のみ（"use client"にしない）。
// ============================================================================

export const SHARE_HASHTAGS = ["#WatchStyleClub", "#AppleWatch"];

/** buildShareText 等が必要とする最小限の投稿情報（PublicPost からそのまま渡せる） */
export type ShareablePost = {
  id: string;
  watch_model: string;
  band_brand: string | null;
  band_name: string | null;
  color: string | null;
  skuBrandName: string | null;
  skuProductName: string | null;
  skuColorName: string | null;
  author: { username: string | null; displayName: string | null };
  nickname: string;
  recommendedFace: { name: string } | null;
};

/** 本番URL固定（NEXT_PUBLIC_SITE_URL未設定時のフォールバック）。lib/notify.ts と同じ考え方。 */
const FALLBACK_SITE_URL = "https://watch-style-club.vercel.app";

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL;
}

/** 投稿の公開URL（絶対URL）。 */
export function buildShareUrl(post: Pick<ShareablePost, "id">): string {
  return `${getSiteUrl()}/p/${post.id}`;
}

/**
 * バンドの表示ラベル（例: "Campagne Sélection FKM / Starlight"）。
 * SKU紐付け投稿は skus→products→brands 由来、未登録バンドは自由入力欄由来。どちらも無ければ null。
 * StyleSpec / GalleryCard のBAND表示もこの関数を使う（表示ロジックの一元化）。
 */
export function buildBandLabel(post: ShareablePost): string | null {
  const brand = post.skuBrandName ?? post.band_brand;
  const productOrName = post.skuProductName ?? post.band_name;
  const color = post.skuColorName ?? post.color;
  const head = [brand, productOrName].filter(Boolean).join(" ");
  const label = [head, color].filter(Boolean).join(" / ");
  return label || null;
}

/** OGP用タイトル（例: "@kenta1987のApple Watch Style | Watch Style Club"）。 */
export function buildShareTitle(post: ShareablePost): string {
  const handle = post.author.username ? `@${post.author.username}` : post.author.displayName ?? post.nickname;
  return `${handle}のApple Watch Style | Watch Style Club`;
}

/** OGP用description（例: "Apple Watch Ultra 2 × Campagne Sélection FKM Starlight"）。 */
export function buildShareDescription(post: ShareablePost): string {
  const band = buildBandLabel(post);
  return band ? `${post.watch_model} × ${band}` : post.watch_model;
}

/**
 * SNS投稿文面（X等で使う本文）。ブランド/シリーズ/カラー/Watchモデル/共通ハッシュタグから自動生成。
 * 投稿URLはSNS側の共有インテントが別パラメータで付与するため、本文には含めない（重複防止）。
 */
export function buildShareText(post: ShareablePost): string {
  const band = buildBandLabel(post);
  const lines: string[] = [];

  lines.push(band ? `${band} のStyleを投稿しました。` : "Styleを投稿しました。");
  lines.push("");
  lines.push(post.recommendedFace ? `${post.watch_model} × ${post.recommendedFace.name}` : post.watch_model);
  lines.push("");
  lines.push(SHARE_HASHTAGS.join(" "));

  return lines.join("\n");
}

export function buildXShareUrl(post: ShareablePost): string {
  const params = new URLSearchParams({
    text: buildShareText(post),
    url: buildShareUrl(post),
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function buildFacebookShareUrl(post: ShareablePost): string {
  const params = new URLSearchParams({ u: buildShareUrl(post) });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

export function buildLineShareUrl(post: ShareablePost): string {
  const params = new URLSearchParams({
    text: `${buildShareText(post)}\n${buildShareUrl(post)}`,
  });
  return `https://social-plugins.line.me/lineit/share?${params.toString()}`;
}

/** Pinterest（Phase 1.1 候補・設計のみ）。imageUrl は絶対URLの画像（og:imageと同じもの想定）。 */
export function buildPinterestShareUrl(post: ShareablePost, imageUrl: string): string {
  const params = new URLSearchParams({
    url: buildShareUrl(post),
    media: imageUrl,
    description: buildShareText(post),
  });
  return `https://www.pinterest.com/pin/create/button/?${params.toString()}`;
}

/** OGP/OG画像の絶対URL（/api/og-image/[id] 経由。署名URLの期限切れを避けるため常にこのプロキシを指す）。 */
export function buildOgImageUrl(postId: string): string {
  return `${getSiteUrl()}/api/og-image/${postId}`;
}
