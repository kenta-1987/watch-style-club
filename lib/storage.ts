import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

const BUCKET = "post-images";

/**
 * 非公開バケットの画像パス群に対し、署名付きURLをまとめて発行する（サーバー専用）。
 * 管理画面・ギャラリーの表示に使う。失効するのでキャッシュしないこと。
 */
export async function getSignedUrls(
  paths: string[],
  expiresInSec = 600
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrls(unique, expiresInSec);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}
