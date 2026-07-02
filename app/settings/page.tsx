import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getCollections } from "@/lib/profile-data";
import { getMyBalance, getMyLedger, reasonLabel } from "@/lib/points";
import { getMyMissionGroup } from "@/lib/missions";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { CollectionManager } from "@/components/profile/CollectionManager";
import { MissionCard } from "@/components/missions/MissionCard";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/settings");

  const profile = await getMyProfile();
  if (!profile) redirect("/onboarding");
  const [collections, balance, ledger, welcomeMission] = await Promise.all([
    getCollections(user.id),
    getMyBalance(),
    getMyLedger(20),
    getMyMissionGroup("welcome"),
  ]);

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">設定</h1>
        {profile.username && (
          <Link
            href={`/u/${profile.username}`}
            className="text-sm text-black/50 hover:text-ink"
          >
            プロフィールを見る →
          </Link>
        )}
      </div>

      {/* Welcome Mission（Mission Engine の 'welcome' グループ） */}
      {welcomeMission && (
        <div className="mt-6">
          <MissionCard title="Welcome Mission" emoji="🎉" status={welcomeMission} />
        </div>
      )}

      {/* プロフィール */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="text-sm font-semibold">プロフィール</h2>
        <div className="mt-4">
          <ProfileEditForm
            userId={user.id}
            username={profile.username}
            displayName={profile.display_name}
            bio={profile.bio}
            favoriteWatch={profile.favorite_watch}
            avatarPath={profile.avatar_path}
          />
        </div>
      </section>

      {/* Collection */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="text-sm font-semibold">Collection</h2>
        <p className="mt-1 text-xs text-black/45">
          所有している Apple Watch / バンド / 文字盤を登録できます。
        </p>
        <div className="mt-4">
          <CollectionManager collections={collections} />
        </div>
      </section>

      {/* Style Points */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Style Points</h2>
          <p className="text-lg font-semibold tabular-nums">
            {balance.toLocaleString("ja-JP")}{" "}
            <span className="text-xs font-normal text-black/45">SP</span>
          </p>
        </div>
        <p className="mt-1 text-xs text-black/45">
          Style投稿・Editor&apos;s Pick・プロフィール完成などコミュニティ貢献で貯まるポイントです。
        </p>

        <p className="mt-4 text-[11px] font-medium tracking-wider text-black/40">
          ポイント履歴（直近20件）
        </p>
        {ledger.length === 0 ? (
          <p className="mt-2 text-sm text-black/30">まだ履歴はありません。</p>
        ) : (
          <ul className="mt-2 divide-y divide-black/5">
            {ledger.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{reasonLabel(e.reason)}</p>
                  <p className="text-[11px] text-black/40">{fmtDate(e.created_at)}</p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    e.delta >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {e.delta >= 0 ? "+" : ""}
                  {e.delta.toLocaleString("ja-JP")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* アカウント */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="text-sm font-semibold">アカウント</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-black/45">ユーザーID</dt>
            <dd>@{profile.username ?? "（未設定）"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-black/45">メール（非公開）</dt>
            <dd className="text-black/70">{user.email}</dd>
          </div>
        </dl>
        <div className="mt-4 flex gap-3">
          <Link href="/forgot-password" className="text-sm text-black/50 hover:text-ink">
            パスワードを変更
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-sm text-red-500 hover:underline">
              ログアウト
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
