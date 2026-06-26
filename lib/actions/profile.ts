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
