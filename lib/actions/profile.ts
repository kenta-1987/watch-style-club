"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { awardPoints } from "@/lib/points";

export type ProfileFormState = { error: string };

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

/**
 * プロフィール完成ボーナス（初回1回）。
 * 完成条件: username / display_name / favorite_watch / bio すべて入力済み。
 * source_type='profile', source_id=userId で一意 → 何度保存しても1回だけ付与。
 * ※ favorite_watch は現状 Apple Watch 文脈の項目だが、ルールコード自体はカテゴリ非依存。
 *   多カテゴリ展開時は「完成条件」だけ調整すればよい（Point Engine は汎用）。
 */
async function maybeAwardProfileCompleted(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, favorite_watch, bio")
    .eq("id", userId)
    .maybeSingle<{
      username: string | null;
      display_name: string | null;
      favorite_watch: string | null;
      bio: string | null;
    }>();
  if (!data) return;
  const complete =
    !!data.username?.trim() &&
    !!data.display_name?.trim() &&
    !!data.favorite_watch?.trim() &&
    !!data.bio?.trim();
  if (!complete) return;
  await awardPoints(userId, "profile_completed", {
    sourceType: "profile",
    sourceId: userId,
  });
}

/** オンボーディング：username（初回のみ）・表示名・Watchモデル・バンドを保存 */
export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const display_name = String(formData.get("display_name") ?? "").trim();
  const watch_model = String(formData.get("watch_model") ?? "").trim();
  const current_band = String(formData.get("current_band") ?? "").trim();
  const next = String(formData.get("redirect") ?? "/") || "/";

  if (!display_name) return { error: "表示名を入力してください。" };
  if (display_name.length > 30) return { error: "表示名は30文字以内で入力してください。" };
  if (!watch_model) return { error: "Apple Watch のモデルを選択してください。" };

  // 現在の username を確認（Google初回などで未設定なら設定する。既存は変更不可）
  const { data: prof } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single<{ username: string | null }>();

  const patch: {
    display_name: string;
    nickname: string;
    watch_model: string;
    current_band: string | null;
    username?: string;
  } = {
    display_name,
    nickname: display_name,
    watch_model,
    current_band: current_band || null,
  };

  if (!prof?.username) {
    const username = String(formData.get("username") ?? "")
      .trim()
      .toLowerCase();
    if (!USERNAME_RE.test(username)) {
      return { error: "ユーザーIDは半角英小文字・数字・_ の3〜20文字で入力してください。" };
    }
    // 一意チェック（profiles は公開readのため通常クライアントで確認可。unique index が最終担保）
    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle<{ id: string }>();
    if (taken && taken.id !== user.id) {
      return { error: "このユーザーIDは既に使われています。" };
    }
    patch.username = username;
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { error: `保存に失敗しました：${error.message}` };

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/");
}

// ===== Settings（プロフィール編集・Collection管理）=====

/** ログイン中ユーザーを返す（未ログインは /login へ） */
async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function revalidateProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single<{ username: string | null }>();
  revalidatePath("/settings");
  if (data?.username) revalidatePath(`/u/${data.username}`);
  revalidatePath("/", "layout");
}

/** プロフィール編集（display_name / bio / favorite_watch / avatar_path） */
export async function updateMyProfile(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();

  const display_name = String(formData.get("display_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const favorite_watch = String(formData.get("favorite_watch") ?? "").trim();
  const avatar_path = String(formData.get("avatar_path") ?? "").trim();

  const patch: {
    display_name: string | null;
    bio: string | null;
    favorite_watch: string | null;
    avatar_path?: string;
  } = {
    display_name: display_name || null,
    bio: bio || null,
    favorite_watch: favorite_watch || null,
  };
  // アバターはアップロード済みのときだけ更新（本人フォルダ配下のみ許可）
  if (avatar_path && avatar_path.startsWith(`${user.id}/`)) {
    patch.avatar_path = avatar_path;
  }

  await supabase.from("profiles").update(patch).eq("id", user.id);
  await maybeAwardProfileCompleted(supabase, user.id);
  await revalidateProfile(supabase, user.id);
}

export async function addOwnedWatch(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const model = String(formData.get("model") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  if (!model) return;
  await supabase
    .from("owned_watches")
    .insert({ user_id: user.id, model, color: color || null });
  await revalidateProfile(supabase, user.id);
}

export async function addOwnedBand(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  if (!name) return;
  await supabase
    .from("owned_bands")
    .insert({ user_id: user.id, name, brand: brand || null, color: color || null });
  await revalidateProfile(supabase, user.id);
}

export async function addOwnedFace(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const share_url = String(formData.get("share_url") ?? "").trim();
  if (!name) return;
  await supabase
    .from("owned_faces")
    .insert({ user_id: user.id, name, share_url: share_url || null });
  await revalidateProfile(supabase, user.id);
}

/** Collection から1件削除（RLSで本人のみ） */
export async function deleteOwned(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const table =
    kind === "watch" ? "owned_watches" : kind === "band" ? "owned_bands" : kind === "face" ? "owned_faces" : null;
  if (!table) return;

  await supabase.from(table).delete().eq("id", id).eq("user_id", user.id);
  await revalidateProfile(supabase, user.id);
}
