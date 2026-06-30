import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getApprovedPosts, getFeaturedPosts, getRanking } from "@/lib/posts";
import { getBookmarkedPostIds } from "@/lib/bookmarks";
import { TimelineItem } from "@/components/timeline/TimelineItem";
import { SectionRail } from "@/components/timeline/SectionRail";
import { MiniCard } from "@/components/timeline/MiniCard";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const supabase = createClient();
  const [{ posts, signedUrls }, featured, ranking, userRes] = await Promise.all([
    getApprovedPosts({ limit: 50 }),
    getFeaturedPosts(6),
    getRanking("week", 5),
    supabase.auth.getUser(),
  ]);

  const user = userRes.data.user;
  const isAuthed = !!user;

  // ログイン中なら、表示中の投稿について いいね済み / 保存済み を取得
  let likedSet = new Set<string>();
  let savedSet = new Set<string>();
  if (user && posts.length > 0) {
    const ids = posts.map((p) => p.id);
    const [{ data: likes }, bookmarks] = await Promise.all([
      supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", ids)
        .returns<{ post_id: string }[]>(),
      getBookmarkedPostIds(user.id, ids),
    ]);
    likedSet = new Set((likes ?? []).map((l) => l.post_id));
    savedSet = bookmarks;
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Home ヘッダー */}
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs tracking-widest text-black/40">TODAY&apos;S STYLES</p>
          <h1 className="mt-0.5 text-2xl font-semibold">今日のApple Watch Style</h1>
        </div>
        <Link href="/gallery" className="shrink-0 text-sm text-black/50 hover:text-ink">
          一覧で探す →
        </Link>
      </header>

      {/* 常時表示の投稿CTA */}
      <Link
        href="/post/new"
        className="mt-4 flex items-center justify-center rounded-full bg-ink py-3 text-sm font-medium text-white hover:opacity-80"
      >
        ＋ あなたのStyleを投稿する
      </Link>

      <div className="mt-6 space-y-4">
        {/* Editor's Pick */}
        {featured.posts.length > 0 && (
          <SectionRail
            title="Editor's Pick"
            subtitle="編集部が選ぶ、今注目のApple Watchコーデ"
          >
            {featured.posts.map((p) => (
              <MiniCard
                key={p.id}
                id={p.id}
                imageUrl={featured.signedUrls[p.image_path] ?? ""}
                nickname={p.author.displayName ?? p.nickname}
                coverType={p.coverType}
                coverDuration={p.coverDuration}
                mediaCount={p.mediaCount}
              />
            ))}
          </SectionRail>
        )}

        {/* 今週人気 */}
        {ranking.posts.length > 0 && (
          <SectionRail
            title="今週人気"
            subtitle="いいねの多い着画ランキング"
            moreHref="/ranking"
          >
            {ranking.posts.map((p, i) => (
              <MiniCard
                key={p.id}
                id={p.id}
                imageUrl={ranking.signedUrls[p.image_path] ?? ""}
                nickname={p.author.displayName ?? p.nickname}
                rank={i + 1}
                metric={`♡ ${p.score}`}
                coverType={p.coverType}
                coverDuration={p.coverDuration}
                mediaCount={p.mediaCount}
              />
            ))}
          </SectionRail>
        )}
      </div>

      {/* 新着フィード */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold">新着</h2>
        {posts.length === 0 ? (
          <p className="mt-6 text-center text-sm text-black/50">
            まだ投稿がありません。最初の着画を投稿しましょう！
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {posts.map((post) => (
              <TimelineItem
                key={post.id}
                post={post}
                imageUrl={signedUrls[post.image_path] ?? ""}
                liked={likedSet.has(post.id)}
                saved={savedSet.has(post.id)}
                isAuthed={isAuthed}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
