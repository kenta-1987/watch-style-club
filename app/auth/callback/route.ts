import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardMission } from "@/lib/missions";

export const dynamic = "force-dynamic";

/**
 * マジックリンクのリダイレクト先。
 * Supabase が付与する ?code= をセッションに交換し、
 * プロフィール未完了なら /onboarding へ送る。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("redirect") ?? "/";
  const safeNext = next.startsWith("/") ? next : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 初回判定：username（公開ID）または watch_model 未設定ならオンボーディングへ。
  // Google 初回ログインは username が無いので必ずオンボーディングを通る。
  let needsOnboarding = true;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, watch_model")
      .eq("id", user.id)
      .single<{ username: string | null; watch_model: string | null }>();
    needsOnboarding = !profile?.username || !profile?.watch_model;

    // Welcome Mission「会員登録」：Google OAuth / マジックリンクの初回ログインもここを通る
    await awardMission(user.id, "welcome_signup");
  }

  if (needsOnboarding) {
    const onboardingUrl = new URL("/onboarding", origin);
    onboardingUrl.searchParams.set("redirect", safeNext);
    return NextResponse.redirect(onboardingUrl);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
