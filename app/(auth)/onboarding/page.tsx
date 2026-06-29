import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/auth/OnboardingForm";

export const dynamic = "force-dynamic";

function suggestUsername(seed: string): string {
  const base = seed.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return base.slice(0, 20);
}

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
    .select("username, nickname, display_name, watch_model, current_band")
    .eq("id", user.id)
    .single<{
      username: string | null;
      nickname: string;
      display_name: string | null;
      watch_model: string | null;
      current_band: string | null;
    }>();

  const next = searchParams.redirect ?? "/";

  // username も watch_model も揃っていれば完了
  if (profile?.username && profile?.watch_model) {
    redirect(next.startsWith("/") ? next : "/");
  }

  const needsUsername = !profile?.username;

  // Google など OAuth のメタデータから初期値を拾う
  const meta = (user.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    email?: string;
  };
  const googleName = meta.full_name || meta.name || "";
  const defaultDisplayName =
    (profile?.display_name && profile.display_name) ||
    (profile?.nickname && profile.nickname !== "guest" ? profile.nickname : "") ||
    googleName;
  const suggestedUsername = needsUsername
    ? suggestUsername((meta.email ?? googleName ?? "user").split("@")[0])
    : "";

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
        needsUsername={needsUsername}
        suggestedUsername={suggestedUsername}
        defaultDisplayName={defaultDisplayName}
        models={(models ?? []).map((m) => m.label)}
        redirect={next}
      />
    </div>
  );
}
