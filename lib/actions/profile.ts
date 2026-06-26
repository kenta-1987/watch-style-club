"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { error: string };

/** オンボーディング：ニックネーム・Watchモデル・バンドを保存 */
export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nickname = String(formData.get("nickname") ?? "").trim();
  const watch_model = String(formData.get("watch_model") ?? "").trim();
  const current_band = String(formData.get("current_band") ?? "").trim();
  const next = String(formData.get("redirect") ?? "/") || "/";

  if (!nickname) return { error: "ニックネームを入力してください。" };
  if (nickname.length > 30) return { error: "ニックネームは30文字以内で入力してください。" };
  if (!watch_model) return { error: "Apple Watch のモデルを選択してください。" };

  const { error } = await supabase
    .from("profiles")
    .update({
      nickname,
      watch_model,
      current_band: current_band || null,
    })
    .eq("id", user.id);

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
