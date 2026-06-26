import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/auth/OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, watch_model, current_band")
    .eq("id", user.id)
    .single<{ nickname: string; watch_model: string | null; current_band: string | null }>();

  const next = searchParams.redirect ?? "/";

  // すでに登録済みならスキップ
  if (profile?.watch_model) {
    redirect(next.startsWith("/") ? next : "/");
  }

  const { data: models } = await supabase
    .from("watch_models")
    .select("label")
    .order("sort_order");

  return (
    <div className="mx-auto max-w-sm">
      <p className="text-xs tracking-widest text-black/40">WELCOME</p>
      <h1 className="mt-1 text-2xl font-semibold">プロフィール登録</h1>
      <p className="mt-2 text-sm text-black/60">
        ギャラリーやキャンペーンで使うプロフィールを設定しましょう。
      </p>

      <OnboardingForm
        defaultNickname={
          profile?.nickname && profile.nickname !== "guest" ? profile.nickname : ""
        }
        models={(models ?? []).map((m) => m.label)}
        redirect={next}
      />
    </div>
  );
}
