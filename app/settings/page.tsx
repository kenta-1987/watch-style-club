import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getCollections } from "@/lib/profile-data";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { CollectionManager } from "@/components/profile/CollectionManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/settings");

  const profile = await getMyProfile();
  if (!profile) redirect("/onboarding");
  const collections = await getCollections(user.id);

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
