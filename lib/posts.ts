import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrls } from "@/lib/storage";

/** 投稿者（profiles から join）。username 未設定でも壊れないよう全て nullable。 */
export type PostAuthor = {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarPath: string | null;
};

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
  author: PostAuthor;
};

/** ランキング表示用：公開投稿＋期間内スコア */
export type RankedPost = PublicPost & { score: number };

// posts↔profiles は user_id 以外に likes/bookmarks 経由の関係もあり曖昧になるため、
// FK名で明示（profiles!posts_user_id_fkey）。
const PUBLIC_COLUMNS =
  "id, user_id, nickname, watch_model, band_brand, band_name, color, comment, product_url, product_handle, image_path, like_count, featured_at, created_at, profiles!posts_user_id_fkey(username, display_name, avatar_path)";

type RawPost = Omit<PublicPost, "author"> & {
  user_id: string;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_path: string | null;
  } | null;
};

/** DB行（profiles 埋め込み）を PublicPost にフラット化 */
function mapPost(r: RawPost): PublicPost {
  const { user_id, profiles, ...rest } = r;
  return {
    ...rest,
    author: {
      userId: user_id,
      username: profiles?.username ?? null,
      displayName: profiles?.display_name ?? null,
      avatarPath: profiles?.avatar_path ?? null,
    },
  };
}

export type ApprovedPostsOptions = {
  model?: string;
  brand?: string;
  color?: string;
  userId?: string;
  limit?: number;
};

/**
 * 承認済み投稿を新着順で取得し、画像の署名URLをまとめて返す（サーバー専用）。
 * ギャラリー（検索・グリッド）・タイムライン・プロフィールで共有する。
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
  if (opts.userId) query = query.eq("user_id", opts.userId);
  if (opts.limit) query = query.limit(opts.limit);

  const { data } = await query.returns<RawPost[]>();
  const posts = (data ?? []).map(mapPost);
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
    .returns<RawPost[]>();

  const posts = (data ?? []).map(mapPost);
  const signedUrls = await getSignedUrls(posts.map((p) => p.image_path));
  return { posts, signedUrls };
}

/** 指定IDの承認済み投稿をまとめて取得（保存したStyle等）。新着順。 */
export async function getStylesByIds(ids: string[]): Promise<{
  posts: PublicPost[];
  signedUrls: Record<string, string>;
}> {
  if (ids.length === 0) return { posts: [], signedUrls: {} };
  const supabase = createClient();
  const { data } = await supabase
    .from("posts")
    .select(PUBLIC_COLUMNS)
    .in("id", ids)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .returns<RawPost[]>();
  const posts = (data ?? []).map(mapPost);
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
    .returns<RawPost[]>();

  const byId = new Map((postRows ?? []).map((r) => [r.id, mapPost(r)]));
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
