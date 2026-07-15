import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAwjPickerTree } from "@/lib/catalog";
import { getMyVerifiedSkus } from "@/lib/verified-purchases";
import { getAppleWatchModels, getMyWatches } from "@/lib/watches";
import { PostForm } from "@/components/post/PostForm";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/post/new");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, watch_model")
    .eq("id", user.id)
    .single<{ nickname: string; watch_model: string | null }>();

  // プロフィール未完了なら先にオンボーディング
  if (!profile?.watch_model) {
    redirect("/onboarding?redirect=/post/new");
  }

  const [myWatches, watchModels, pickerTree, verifiedSkus] = await Promise.all([
    getMyWatches(),
    getAppleWatchModels(),
    getAwjPickerTree(),
    getMyVerifiedSkus(),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold">あなたのStyleを投稿</h1>
      <p className="mt-2 text-sm text-black/60">
        Apple Watch 本体・バンド・文字盤の組み合わせ（Style）を共有しましょう。
        投稿は運営の承認後に公開されます。
      </p>

      <PostForm
        nickname={profile.nickname}
        myWatches={myWatches}
        watchModels={watchModels}
        pickerTree={pickerTree}
        verifiedSkus={verifiedSkus}
      />
    </div>
  );
}
