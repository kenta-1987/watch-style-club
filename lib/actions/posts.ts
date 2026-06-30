"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyNewPost } from "@/lib/notify";

export type MediaInput = {
  storage_path: string;
  media_type: "image" | "video";
  sort_order: number;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
};

export type CreatePostInput = {
  watch_model: string;
  /** AWJ取扱バンド：SKU。指定時は未登録バンドの自由入力は使わない */
  sku_id?: string | null;
  /** 未登録バンド：自由入力 */
  band_brand?: string;
  band_name?: string;
  color?: string;
  product_url?: string;
  comment?: string;
  /** アップロード済みメディア（sort_order=0 がカバー）。最大5・動画最大1 */
  media: MediaInput[];
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
 * Style投稿を pending で保存。複数メディア（画像/動画）対応。
 * メディアは事前にクライアントが Storage（自分のフォルダ）へアップロード済みで path を受け取る。
 * カバー（sort_order=0）の path を posts.image_path にコピーして旧表示と互換を保つ。
 */
export async function createPost(input: CreatePostInput): Promise<CreatePostResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const media = input.media ?? [];
  if (media.length === 0) return { error: "写真または動画を1つ以上選択してください。" };
  if (media.length > 5) return { error: "メディアは最大5つまでです。" };
  if (media.filter((m) => m.media_type === "video").length > 1) {
    return { error: "動画は1本までです。" };
  }
  // 全メディアが本人フォルダ配下か検証
  if (!media.every((m) => m.storage_path.startsWith(`${user.id}/`))) {
    return { error: "メディアが正しくアップロードされていません。" };
  }
  if (!input.watch_model?.trim()) {
    return { error: "Apple Watch のモデルを選択してください。" };
  }

  const isAwj = !!input.sku_id;
  const productUrl = isAwj ? null : input.product_url?.trim() || null;
  if (productUrl && !isValidHttpUrl(productUrl)) {
    return { error: "商品URLは http(s):// で始まる正しいURLを入力してください。" };
  }

  const cover =
    media.find((m) => m.sort_order === 0) ??
    [...media].sort((a, b) => a.sort_order - b.sort_order)[0];

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
      image_path: cover.storage_path, // カバーをコピー（旧表示互換）
      nickname,
      watch_model: input.watch_model.trim(),
      sku_id: input.sku_id || null,
      band_brand: isAwj ? null : input.band_brand?.trim() || null,
      band_name: isAwj ? null : input.band_name?.trim() || null,
      color: isAwj ? null : input.color?.trim() || null,
      comment: input.comment?.trim() || null,
      product_url: productUrl,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !inserted) {
    return { error: `投稿に失敗しました：${error?.message ?? "unknown"}` };
  }

  // メディアを post_media に保存
  const { error: mediaErr } = await supabase.from("post_media").insert(
    media.map((m) => ({
      post_id: inserted.id,
      media_type: m.media_type,
      storage_path: m.storage_path,
      width: m.width ?? null,
      height: m.height ?? null,
      duration_seconds: m.duration_seconds ?? null,
      sort_order: m.sort_order,
    }))
  );
  if (mediaErr) {
    // post は残るが致命的でないため、ログ用途のエラー返却はしない（image_path で最低限表示可能）
  }

  // --- ベストエフォート ---
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
