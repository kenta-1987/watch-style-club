import "server-only";

type NewPostNotice = {
  nickname: string;
  watchModel: string;
  bandBrand?: string | null;
  bandName?: string | null;
  color?: string | null;
  comment?: string | null;
};

/**
 * 新規投稿を Slack に通知（ベストエフォート）。
 * - SLACK_WEBHOOK_URL が未設定なら何もしない
 * - 失敗しても例外を投げない（投稿処理を止めない）
 */
export async function notifyNewPost(notice: NewPostNotice): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const adminUrl = `${siteUrl}/admin`;

  const band = [notice.bandBrand, notice.bandName, notice.color]
    .filter(Boolean)
    .join(" / ");

  const lines = [
    "🆕 *新しい着画が投稿されました（承認待ち）*",
    `• ニックネーム：${notice.nickname}`,
    `• Apple Watch：${notice.watchModel}`,
    band ? `• バンド：${band}` : null,
    notice.comment ? `• コメント：${notice.comment}` : null,
    `→ 承認はこちら：${adminUrl}`,
  ].filter(Boolean);

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    });
  } catch {
    // 通知失敗は無視（投稿は成立させる）
  }
}
