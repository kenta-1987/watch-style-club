import "server-only";
import { getFeaturedPosts, getRanking, getApprovedPosts } from "@/lib/posts";
import { getSignedUrls } from "@/lib/storage";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

export type DigestItem = {
  postId: string;
  nickname: string;
  watchModel: string;
  brand: string | null;
  comment: string | null;
  productUrl: string | null;
  imageUrl: string; // 7日有効の署名URL（メールに貼れる）
  postUrl: string;
  score?: number;
};

export type Digest = {
  editorsPick: DigestItem[];
  weekly: DigestItem[];
  recent: DigestItem[];
};

/**
 * 週次ダイジェスト用データ。
 * 画像は7日有効の署名URLにして、メールに貼っても失効しないようにする。
 */
export async function getDigest(): Promise<Digest> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const [feat, week, recent] = await Promise.all([
    getFeaturedPosts(6),
    getRanking("week", 10),
    getApprovedPosts({ limit: 10 }),
  ]);

  const allPaths = [
    ...feat.posts,
    ...week.posts,
    ...recent.posts,
  ].map((p) => p.image_path);
  const urls = await getSignedUrls(allPaths, SEVEN_DAYS);

  const toItem = (
    p: {
      id: string;
      nickname: string;
      watch_model: string;
      band_brand: string | null;
      comment: string | null;
      product_url: string | null;
      image_path: string;
    },
    score?: number
  ): DigestItem => ({
    postId: p.id,
    nickname: p.nickname,
    watchModel: p.watch_model,
    brand: p.band_brand,
    comment: p.comment,
    productUrl: p.product_url,
    imageUrl: urls[p.image_path] ?? "",
    postUrl: `${siteUrl}/p/${p.id}`,
    score,
  });

  return {
    editorsPick: feat.posts.map((p) => toItem(p)),
    weekly: week.posts.map((p) => toItem(p, p.score)),
    recent: recent.posts.map((p) => toItem(p)),
  };
}
