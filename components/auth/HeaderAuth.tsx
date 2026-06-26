import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className="text-black/50 hover:opacity-60">
        ログアウト
      </button>
    </form>
  );
}
