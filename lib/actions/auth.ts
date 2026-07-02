"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { awardMission } from "@/lib/missions";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export type AuthResult = { error: string };

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * username + password でログイン。
 * username→email の解決はサーバー側（service_role）で行い、email はクライアントに返さない。
 * 失敗理由は伏せて「IDまたはパスワードが違います」に統一（存在判定をさせない）。
 */
export async function loginWithUsername(input: {
  username: string;
  password: string;
  redirect?: string;
}): Promise<AuthResult> {
  const username = normalizeUsername(input.username);
  const generic = "ユーザーIDまたはパスワードが違います。";
  if (!username || !input.password) return { error: generic };

  // username → user_id → email（service_role）
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle<{ id: string }>();
  if (!prof) return { error: generic };

  const { data: userRes } = await admin.auth.admin.getUserById(prof.id);
  const email = userRes?.user?.email;
  if (!email) return { error: generic };

  // cookie 紐付きのサーバークライアントでサインイン（セッション確立）
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });
  if (error) return { error: generic };

  // Welcome Mission「会員登録」：初回ログインのみ付与（2回目以降は ledger の一意制約で no-op）
  await awardMission(prof.id, "welcome_signup");

  // オンボーディング未完了なら誘導
  const { data: p2 } = await supabase
    .from("profiles")
    .select("watch_model")
    .eq("id", prof.id)
    .single<{ watch_model: string | null }>();

  const next = input.redirect && input.redirect.startsWith("/") ? input.redirect : "/";
  redirect(!p2?.watch_model ? `/onboarding?redirect=${encodeURIComponent(next)}` : next);
}

/**
 * username + email + password で新規登録。
 * - username 形式・空き確認
 * - signUp（email確認はSupabase設定に従う）
 * - 確定後に service_role で profiles.username / display_name をセット
 */
export type SignUpResult = { error?: string; ok?: boolean; needsConfirm?: boolean };

export async function signUpWithUsername(input: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  marketingOptIn?: boolean;
}): Promise<SignUpResult> {
  const username = normalizeUsername(input.username);
  const email = input.email.trim();
  const displayName = (input.displayName ?? "").trim() || input.username.trim();

  if (!USERNAME_RE.test(username)) {
    return { error: "ユーザーIDは半角英小文字・数字・_ の3〜20文字で入力してください。" };
  }
  if (!email.includes("@")) return { error: "メールアドレスの形式が正しくありません。" };
  if (input.password.length < 8) {
    return { error: "パスワードは8文字以上で設定してください。" };
  }

  const admin = createAdminClient();

  // 空き確認
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (taken) return { error: "このユーザーIDは既に使われています。" };

  // サインアップ（profiles はトリガーで作成される）
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?redirect=/onboarding`,
      data: {
        display_name: displayName,
        marketing_opt_in: input.marketingOptIn ?? true,
      },
    },
  });
  if (error) return { error: error.message };

  const newId = data.user?.id;
  if (newId) {
    // username / display_name を確定（RLS をバイパスして確実に）
    const { error: upErr } = await admin
      .from("profiles")
      .update({ username, display_name: displayName, nickname: displayName })
      .eq("id", newId);
    if (upErr) {
      return { error: "登録処理でエラーが発生しました。時間をおいて再度お試しください。" };
    }
  }

  // セッションが即確立された（メール確認不要設定）場合はここで初回ログイン扱いにする。
  // メール確認が必要な場合は、確認後の初回ログイン（/auth/callback または loginWithUsername）で付与される。
  if (data.session && newId) {
    await awardMission(newId, "welcome_signup");
  }

  // セッションが無い＝メール確認が必要
  return { ok: true, needsConfirm: !data.session };
}
