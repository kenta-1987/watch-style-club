import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // 初回ログイン判定：watch_model 未設定ならオンボーディングへ
  let needsOnboarding = true;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("watch_model")
      .eq("id", user.id)
      .single<{ watch_model: string | null }>();
    needsOnboarding = !profile?.watch_model;
  }

  if (needsOnboarding) {
    const onboardingUrl = new URL("/onboarding", origin);
    onboardingUrl.searchParams.set("redirect", safeNext);
    return NextResponse.redirect(onboardingUrl);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
