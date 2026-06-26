import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrls } from "@/lib/storage";
import { getBookmarkedPostIds } from "@/lib/bookmarks";
import { TimelineItem } from "@/components/timeline/TimelineItem";
import type { PublicPost } from "@/lib/posts";

export const dynamic = "force-dynamic";

const PUBLIC_COLUMNS =
  "id, nickname, watch_model, band_brand, band_name, color, comment, product_url, product_handle, image_path, like_count, featured_at, created_at";

export default async function PostPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: post } = await supabase
    .from("posts")
    .select(PUBLIC_COLUMNS)
    .eq("id", params.id)
    .eq("status", "approved")
    .maybeSingle<PublicPost>();

  if (!post) notFound();

  const [{ data: userData }, signedUrls] = await Promise.all([
    supabase.auth.getUser(),
    getSignedUrls([post.image_path]),
  ]);
  const user = userData.user;
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
        />
      </div>
    </div>
  );
}
