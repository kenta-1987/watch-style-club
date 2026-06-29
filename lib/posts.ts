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

/** SKU から導出した編集部おすすめ文字盤（カードの代表1件） */
export type RecommendedFaceView = {
  name: string;
  category: string | null;
  shareUrl: string | null;
  comment: string | null;
  rating: number | null;
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
  sku_id: string | null;
  /** post.sku の Shopify handle（/sku/[handle] リンク用。未紐付けは null） */
  skuHandle: string | null;
  created_at: string;
  author: PostAuthor;
  /** post.sku → face_recommendations から導出（編集部管理・投稿者は入力しない） */
  recommendedFace: RecommendedFaceView | null;
};

/** ランキング表示用：公開投稿＋期間内スコア */
export type RankedPost = PublicPost & { score: number };

// posts↔profiles は user_id 以外に likes/bookmarks 経由の関係もあり曖昧になるため、
// FK名で明示（profiles!posts_user_id_fkey）。
const PUBLIC_COLUMNS =
  "id, user_id, nickname, watch_model, band_brand, band_name, color, comment, product_url, product_handle, image_path, like_count, featured_at, sku_id, created_at, profiles!posts_user_id_fkey(username, display_name, avatar_path), skus(shopify_product_handle)";

type RawPost = Omit<PublicPost, "author" | "recommendedFace" | "skuHandle"> & {
  user_id: string;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_path: string | null;
  } | null;
  skus: { shopify_product_handle: string | null } | null;
};

/** DB行（profiles / skus 埋め込み）を PublicPost にフラット化 */
function mapPost(r: RawPost): PublicPost {
  const { user_id, profiles, skus, ...rest } = r;
  return {
    ...rest,
    skuHandle: skus?.shopify_product_handle ?? null,
    author: {
      userId: user_id,
      username: profiles?.username ?? null,
      displayName: profiles?.display_name ?? null,
      avatarPath: profiles?.avatar_path ?? null,
    },
    recommendedFace: null,
  };
}

type FaceRow = {
  sku_id: string;
  watch_model: string | null;
  name: string;
  category: string | null;
  apple_share_url: string | null;
  editor_comment: string | null;
  rating: number | null;
  priority: number;
};

/**
 * 投稿群に、SKU 由来の代表 Recommended Face を付与する。
 * 機種スコープ：watch_model が null（全機種）か post の機種に一致するものを優先し、priority 最上位を採用。
 */
async function attachRecommendedFaces(
  supabase: ReturnType<typeof createClient>,
  posts: PublicPost[]
): Promise<void> {
  const skuIds = Array.from(
    new Set(posts.map((p) => p.sku_id).filter((s): s is string => !!s))
  );
  if (skuIds.length === 0) return;

  const { data } = await supabase
    .from("face_recommendations")
    .select(
      "sku_id, watch_model, name, category, apple_share_url, editor_comment, rating, priority"
    )
    .in("sku_id", skuIds)
    .eq("is_published", true)
    .order("priority", { ascending: false })
    .returns<FaceRow[]>();

  const bySku = new Map<string, FaceRow[]>();
  for (const f of data ?? []) {
    const arr = bySku.get(f.sku_id) ?? [];
    arr.push(f);
    bySku.set(f.sku_id, arr);
  }

  for (const p of posts) {
    if (!p.sku_id) continue;
    const list = bySku.get(p.sku_id);
    if (!list || list.length === 0) continue;
    const match =
      list.find((f) => !f.watch_model || f.watch_model === p.watch_model) ?? list[0];
    p.recommendedFace = {
      name: match.name,
      category: match.category,
      shareUrl: match.apple_share_url,
      comment: match.editor_comment,
      rating: match.rating,
    };
  }
}

export type ApprovedPostsOptions = {
  model?: string;
  brand?: string;
  color?: string;
  userId?: string;
  skuId?: string;
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
  if (opts.skuId) query = query.eq("sku_id", opts.skuId);
  if (opts.limit) query = query.limit(opts.limit);

  const { data } = await query.returns<RawPost[]>();
  const posts = (data ?? []).map(mapPost);
  await attachRecommendedFaces(supabase, posts);
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
  await attachRecommendedFaces(supabase, posts);
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
  await attachRecommendedFaces(supabase, posts);
  const signedUrls = await getSignedUrls(posts.map((p) => p.image_path));
  return { posts, signedUrls };
}

/** 単一の承認済み投稿（/p/[id]）。SKU由来Face付き。 */
export async function getStyleById(id: string): Promise<{
  post: PublicPost | null;
  signedUrls: Record<string, string>;
}> {
  const supabase = createClient();
  const { data } = await supabase
    .from("posts")
    .select(PUBLIC_COLUMNS)
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle<RawPost>();
  if (!data) return { post: null, signedUrls: {} };
  const post = mapPost(data);
  await attachRecommendedFaces(supabase, [post]);
  const signedUrls = await getSignedUrls([post.image_path]);
  return { post, signedUrls };
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

  await attachRecommendedFaces(supabase, posts);
  const signedUrls = await getSignedUrls(posts.map((p) => p.image_path));
  return { posts, signedUrls };
}
