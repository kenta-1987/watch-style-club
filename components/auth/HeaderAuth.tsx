import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { avatarUrl } from "@/lib/avatar";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_path")
    .eq("id", user.id)
    .maybeSingle<{
      username: string | null;
      display_name: string | null;
      avatar_path: string | null;
    }>();

  const href = profile?.username ? `/u/${profile.username}` : "/settings";
  const avatar = avatarUrl(profile?.avatar_path);
  const name = profile?.display_name || profile?.username || "U";

  return (
    <Link href={href} className="flex items-center gap-1.5 hover:opacity-70" title="マイページ">
      <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-ink text-xs font-semibold text-white">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="h-full w-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </span>
    </Link>
  );
}
