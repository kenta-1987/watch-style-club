import "server-only";
import { createClient } from "@/lib/supabase/server";

/** 指定ユーザーが、与えた投稿群のうち保存済みの post_id 集合を返す */
export async function getBookmarkedPostIds(
  userId: string,
  postIds: string[]
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const supabase = createClient();
  const { data } = await supabase
    .from("post_bookmarks")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds)
    .returns<{ post_id: string }[]>();
  return new Set((data ?? []).map((b) => b.post_id));
}
