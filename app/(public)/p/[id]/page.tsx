import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBookmarkedPostIds } from "@/lib/bookmarks";
import { getStyleById } from "@/lib/posts";
import { TimelineItem } from "@/components/timeline/TimelineItem";
import { buildShareTitle, buildShareDescription, buildShareUrl, buildOgImageUrl } from "@/lib/share";

export const dynamic = "force-dynamic";

/**
 * 投稿単位のOGP。非承認投稿は getStyleById が null を返すため、汎用metadataにフォールバックする
 * （＝pending/rejected投稿のOGPは公開しない）。og:imageは /api/og-image/[id] 経由の固定URL
 * （中身は毎回新しい署名URLから取得するため、metadataに署名URLそのものを埋め込まない）。
 */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { post } = await getStyleById(params.id);
  if (!post) {
    return { title: "投稿が見つかりません | Watch Style Club" };
  }

  const title = buildShareTitle(post);
  const description = buildShareDescription(post);
  const url = buildShareUrl(post);
  const ogImage = buildOgImageUrl(post.id);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Watch Style Club",
      images: [{ url: ogImage, width: 1200, height: 1200 }],
      locale: "ja_JP",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const { post, signedUrls, media } = await getStyleById(params.id);
  if (!post) notFound();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = !!user;

  let liked = false;
  let saved = false;
  if (user) {
    const [{ data: likeRow }, bookmarkSet] = await Promise.all([
      supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .eq("post_id", post.id)
        .maybeSingle(),
      getBookmarkedPostIds(user.id, [post.id]),
    ]);
    liked = !!likeRow;
    saved = bookmarkSet.has(post.id);
  }

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/timeline" className="text-sm text-black/50 hover:text-ink">
        ← タイムライン
      </Link>
      <div className="mt-3">
        <TimelineItem
          post={post}
          imageUrl={signedUrls[post.image_path] ?? ""}
          liked={liked}
          saved={saved}
          isAuthed={isAuthed}
          media={media}
        />
      </div>
    </div>
  );
}
