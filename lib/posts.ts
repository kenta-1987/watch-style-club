import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrls } from "@/lib/storage";

/** ギャラリー・タイムライン共通の公開投稿型 */
export type PublicPost = {
  id: string;
  nickname: string;
  watch_model: string;
  band_brand: string | null;
  band_name: string | null;
  color: string | null;
  comment: string | null;
  product_url: string | null;
  product_handle: string | null;
  image_path: string;
  like_count: number;
  featured_at: string | null;
  created_at: string;
};

/** ランキング表示用：公開投稿＋期間内スコア */
export type RankedPost = PublicPost & { score: number };

const PUBLIC_COLUMNS =
  "id, nickname, watch_model, band_brand, band_name, color, comment, product_url, product_handle, image_path, like_count, featured_at, created_at";

export type ApprovedPostsOptions = {
  model?: string;
  brand?: string;
  color?: string;
  limit?: number;
};

/**
 * 承認済み投稿を新着順で取得し、画像の署名URLをまとめて返す（サーバー専用）。
 * ギャラリー（検索・グリッド）とタイムライン（新着フィード）で共有する。
 */
export async function getApprovedPosts(opts: ApprovedPostsOptions = {}): Promise<{
  posts: PublicPost[];
  signedUrls: Record<string, string>;
}> {
  const supabase = createClient();

  let query = supabase
    .from("posts")
    .select(PUBLIC_COLUMNS)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (opts.model) query = query.eq("watch_model", opts.model);
  if (opts.brand) query = query.eq("band_brand", opts.brand);
  if (opts.color) query = query.eq("color", opts.color);
  if (opts.limit) query = query.limit(opts.limit);

  const { data } = await query.returns<PublicPost[]>();
  const posts = data ?? [];
  const signedUrls = await getSignedUrls(posts.map((p) => p.image_path));

  return { posts, signedUrls };
}

/** Editor's Pick：featured_at が立っている承認済み投稿を新しい順で取得 */
export async function getFeaturedPosts(limit = 6): Promise<{
  posts: PublicPost[];
  signedUrls: Record<string, string>;
}> {
  const supabase = createClient();
  const { data } = await supabase
    .from("posts")
    .select(PUBLIC_COLUMNS)
    .eq("status", "approved")
    .not("featured_at", "is", null)
    .order("featured_at", { ascending: false })
    .limit(limit)
    .returns<PublicPost[]>();

  const posts = data ?? [];
  const signedUrls = await getSignedUrls(posts.map((p) => p.image_path));
  return { posts, signedUrls };
}

/** 人気ランキング：get_ranking(期間) で並べた投稿＋スコア＋署名URL */
export async function getRanking(
  period: "week" | "month",
  limit = 30
): Promise<{ posts: RankedPost[]; signedUrls: Record<string, string> }> {
  const supabase = createClient();

  const { data: ranked } = await supabase.rpc("get_ranking", {
    p_period: period,
    p_limit: limit,
  });
  const rows = ranked ?? [];
  if (rows.length === 0) return { posts: [], signedUrls: {} };

  const ids = rows.map((r) => r.post_id);
  const { data: postRows } = await supabase
    .from("posts")
    .select(PUBLIC_COLUMNS)
    .in("id", ids)
    .returns<PublicPost[]>();

  const byId = new Map((postRows ?? []).map((p) => [p.id, p]));
  // get_ranking の順序（スコア降順）を保ったまま合流
  const posts: RankedPost[] = rows
    .map((r) => {
      const p = byId.get(r.post_id);
      return p ? { ...p, score: Number(r.score) } : null;
    })
    .filter((p): p is RankedPost => p !== null);

  const signedUrls = await getSignedUrls(posts.map((p) => p.image_path));
  return { posts, signedUrls };
}
