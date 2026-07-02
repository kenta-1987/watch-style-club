import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProfileByUsername,
  getProfileStats,
  getCollections,
} from "@/lib/profile-data";
import { getApprovedPosts, getStylesByIds } from "@/lib/posts";
import { getPublicPoints } from "@/lib/points";
import { getMissionGroupStatus, type MissionGroupStatus } from "@/lib/missions";
import { avatarUrl } from "@/lib/avatar";
import { StyleGrid } from "@/components/profile/StyleGrid";
import { MissionCard } from "@/components/missions/MissionCard";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-black/45">{label}</p>
    </div>
  );
}

function CollectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wider text-black/40">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-black/30">—</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {items.map((it, i) => (
            <li key={i} className="text-sm text-black/80">
              {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const profile = await getProfileByUsername(params.username);
  if (!profile) notFound();

  const supabase = createClient();
  const [
    { data: userData },
    stats,
    collections,
    { posts: styles, signedUrls: styleUrls },
    points,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getProfileStats(profile.id),
    getCollections(profile.id),
    getApprovedPosts({ userId: profile.id, limit: 60 }),
    getPublicPoints(profile.id),
  ]);

  const isOwner = userData.user?.id === profile.id;
  const avatar = avatarUrl(profile.avatar_path);
  const name = profile.display_name || profile.username || "guest";

  // 保存したStyle・Welcome Mission（本人のみ）
  let saved: Awaited<ReturnType<typeof getStylesByIds>> | null = null;
  let welcomeMission: MissionGroupStatus | null = null;
  if (isOwner) {
    const [{ data: allBm }, mission] = await Promise.all([
      supabase
        .from("post_bookmarks")
        .select("post_id")
        .eq("user_id", profile.id)
        .returns<{ post_id: string }[]>(),
      getMissionGroupStatus(profile.id, "welcome"),
    ]);
    saved = await getStylesByIds((allBm ?? []).map((b) => b.post_id));
    welcomeMission = mission.completedCount < mission.totalCount ? mission : null;
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* ヘッダー */}
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-2xl font-semibold text-white">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={name} className="h-full w-full object-cover" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold">{name}</h1>
              {profile.username && (
                <p className="text-sm text-black/45">@{profile.username}</p>
              )}
            </div>
            {isOwner && (
              <Link
                href="/settings"
                className="shrink-0 rounded-full border border-black/15 px-4 py-1.5 text-sm font-medium hover:bg-black/5"
              >
                編集
              </Link>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            <Stat label="Style" value={stats.styleCount} />
            <Stat label="獲得Like" value={stats.totalLikes} />
            <Stat label="Editor's Pick" value={stats.featuredCount} />
            <Stat label="Style Points" value={points.balance} />
          </div>
        </div>
      </div>

      {profile.bio && (
        <p className="mt-4 whitespace-pre-wrap text-sm text-black/80">{profile.bio}</p>
      )}
      {profile.favorite_watch && (
        <p className="mt-2 text-sm text-black/55">
          <span className="text-black/40">Favorite：</span>
          {profile.favorite_watch}
        </p>
      )}

      {/* Welcome Mission（本人のみ・未完了の間だけ表示） */}
      {isOwner && welcomeMission && (
        <div className="mt-6">
          <MissionCard title="Welcome Mission" emoji="🎉" status={welcomeMission} />
        </div>
      )}

      {/* Collection */}
      <div className="mt-6 grid grid-cols-3 gap-4 rounded-2xl border border-black/10 bg-white p-4">
        <CollectionList
          title="WATCH"
          items={collections.watches.map((w) => [w.model, w.color].filter(Boolean).join(" "))}
        />
        <CollectionList
          title="BAND"
          items={collections.bands.map((b) =>
            [b.brand, b.name, b.color].filter(Boolean).join(" ")
          )}
        />
        <CollectionList title="FACE" items={collections.faces.map((f) => f.name)} />
      </div>

      {/* Styles */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold">Styles</h2>
        <div className="mt-3">
          <StyleGrid posts={styles} signedUrls={styleUrls} />
        </div>
      </div>

      {/* 保存したStyle（本人のみ） */}
      {isOwner && saved && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold">保存したStyle</h2>
          <p className="text-xs text-black/40">あなただけに表示されます</p>
          <div className="mt-3">
            <StyleGrid
              posts={saved.posts}
              signedUrls={saved.signedUrls}
              emptyText="まだ保存したStyleはありません。"
            />
          </div>
        </div>
      )}
    </div>
  );
}
