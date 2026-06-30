import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBookmarkedPostIds } from "@/lib/bookmarks";
import { getStyleById } from "@/lib/posts";
import { TimelineItem } from "@/components/timeline/TimelineItem";

export const dynamic = "force-dynamic";

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
