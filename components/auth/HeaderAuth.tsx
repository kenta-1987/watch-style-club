import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { avatarUrl } from "@/lib/avatar";
import { HeaderUserMenu } from "@/components/auth/HeaderUserMenu";
import { getMyBalance } from "@/lib/points";
import { getMyMissionGroup } from "@/lib/missions";

/** ヘッダー右側の認証状態（サーバーで user を判定して出し分け） */
export async function HeaderAuth() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link href="/login" className="hover:opacity-60">
        ログイン
      </Link>
    );
  }

  const [{ data: profile }, balance, welcomeMission] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_path")
      .eq("id", user.id)
      .maybeSingle<{
        username: string | null;
        display_name: string | null;
        avatar_path: string | null;
      }>(),
    getMyBalance(),
    getMyMissionGroup("welcome"),
  ]);

  const avatar = avatarUrl(profile?.avatar_path);
  const name = profile?.display_name || profile?.username || "U";

  return (
    <HeaderUserMenu
      username={profile?.username ?? null}
      name={name}
      avatar={avatar}
      points={balance}
      missionProgress={
        welcomeMission && welcomeMission.completedCount < welcomeMission.totalCount
          ? { completed: welcomeMission.completedCount, total: welcomeMission.totalCount }
          : null
      }
    />
  );
}
