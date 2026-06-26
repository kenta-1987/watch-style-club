import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrls } from "@/lib/storage";
import { getBookmarkedPostIds } from "@/lib/bookmarks";
import { TimelineItem } from "@/components/timeline/TimelineItem";
import type { PublicPost, PostAuthor } from "@/lib/posts";

export const dynamic = "force-dynamic";

const PUBLIC_COLUMNS =
  "id, user_id, nickname, watch_model, band_brand, band_name, color, comment, product_url, product_handle, image_path, like_count, featured_at, created_at, profiles!posts_user_id_fkey(username, display_name, avatar_path)";

type RawPost = Omit<PublicPost, "author"> & {
  user_id: string;
  profiles: { username: string | null; display_name: string | null; avatar_path: string | null } | null;
};

export default async function PostPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: raw } = await supabase
    .from("posts")
    .select(PUBLIC_COLUMNS)
    .eq("id", params.id)
    .eq("status", "approved")
    .maybeSingle<RawPost>();

  if (!raw) notFound();

  const author: PostAuthor = {
    userId: raw.user_id,
    username: raw.profiles?.username ?? null,
    displayName: raw.profiles?.display_name ?? null,
    avatarPath: raw.profiles?.avatar_path ?? null,
  };
  const { user_id: _uid, profiles: _pf, ...rest } = raw;
  const post: PublicPost = { ...rest, author };

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
