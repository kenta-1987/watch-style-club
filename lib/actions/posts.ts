"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyNewPost } from "@/lib/notify";

export type CreatePostInput = {
  image_path: string;
  watch_model: string;
  band_brand?: string;
  band_name?: string;
  color?: string;
  comment?: string;
  product_url?: string;
  product_handle?: string;
};

export type CreatePostResult = { error: string };

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 着画投稿を pending で保存。
 * 画像は事前にクライアントが Storage（自分のフォルダ）へアップロード済みで、
 * その path を受け取る。nickname はプロフィールからスナップショットする。
 */
export async function createPost(
  input: CreatePostInput
): Promise<CreatePostResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // image_path が本人フォルダ配下か検証（他人のパス指定を防ぐ）
  if (!input.image_path || !input.image_path.startsWith(`${user.id}/`)) {
    return { error: "画像が正しくアップロードされていません。" };
  }
  if (!input.watch_model?.trim()) {
    return { error: "Apple Watch のモデルを選択してください。" };
  }
  if (input.product_url && !isValidHttpUrl(input.product_url)) {
    return { error: "商品URLは http(s):// で始まる正しいURLを入力してください。" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single<{ nickname: string }>();

  const nickname = profile?.nickname ?? "guest";

  const { data: inserted, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      image_path: input.image_path,
      nickname,
      watch_model: input.watch_model.trim(),
      band_brand: input.band_brand?.trim() || null,
      band_name: input.band_name?.trim() || null,
      color: input.color?.trim() || null,
      comment: input.comment?.trim() || null,
      product_url: input.product_url?.trim() || null,
      product_handle: input.product_handle?.trim() || null,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !inserted) {
    return { error: `投稿に失敗しました：${error?.message ?? "unknown"}` };
  }

  // --- ここからベストエフォート（失敗しても投稿は成立させる） ---

  // キャンペーン応募の紐付け：is_active なキャンペーンに1ユーザー1応募で登録
  try {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("is_active", true)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (campaign) {
      await supabase
        .from("campaign_entries")
        .upsert(
          { campaign_id: campaign.id, user_id: user.id, post_id: inserted.id },
          { onConflict: "campaign_id,user_id", ignoreDuplicates: true }
        );
    }
  } catch {
    // 応募紐付け失敗は無視
  }

  // Slack 通知（SLACK_WEBHOOK_URL が空なら no-op）
  await notifyNewPost({
    nickname,
    watchModel: input.watch_model.trim(),
    bandBrand: input.band_brand?.trim() || null,
    bandName: input.band_name?.trim() || null,
    color: input.color?.trim() || null,
    comment: input.comment?.trim() || null,
  });

  revalidatePath("/gallery");
  revalidatePath("/timeline");
  redirect("/post/thanks");
}
