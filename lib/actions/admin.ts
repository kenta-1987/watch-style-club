"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const BUCKET = "post-images";

/** 呼び出し元が admin であることをサーバー側で検証（middleware頼みにしない） */
async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (data?.role !== "admin") {
    throw new Error("forbidden");
  }
  return supabase;
}

export async function approvePost(formData: FormData) {
  const supabase = await assertAdmin();
  const postId = String(formData.get("postId") ?? "");
  if (!postId) return;

  await supabase
    .from("posts")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", postId);

  revalidatePath("/admin");
  revalidatePath("/gallery");
}

export async function rejectPost(formData: FormData) {
  const supabase = await assertAdmin();
  const postId = String(formData.get("postId") ?? "");
  if (!postId) return;

  await supabase
    .from("posts")
    .update({ status: "rejected", approved_at: null })
    .eq("id", postId);

  revalidatePath("/admin");
  revalidatePath("/gallery");
}

export async function featurePost(formData: FormData) {
  const supabase = await assertAdmin();
  const postId = String(formData.get("postId") ?? "");
  if (!postId) return;

  // 承認済みのみ Pick 可能
  await supabase
    .from("posts")
    .update({ featured_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("status", "approved");

  revalidatePath("/admin");
  revalidatePath("/timeline");
}

export async function unfeaturePost(formData: FormData) {
  const supabase = await assertAdmin();
  const postId = String(formData.get("postId") ?? "");
  if (!postId) return;

  await supabase.from("posts").update({ featured_at: null }).eq("id", postId);

  revalidatePath("/admin");
  revalidatePath("/timeline");
}

/** 投稿に SKU を紐付け（運営がレビュー時に設定。Face は SKU から導出される） */
export async function setPostSku(formData: FormData) {
  const supabase = await assertAdmin();
  const postId = String(formData.get("postId") ?? "");
  if (!postId) return;
  const skuId = String(formData.get("skuId") ?? "");

  await supabase
    .from("posts")
    .update({ sku_id: skuId || null })
    .eq("id", postId);

  revalidatePath("/admin");
  revalidatePath("/timeline");
}

export async function deletePost(formData: FormData) {
  await assertAdmin();
  const postId = String(formData.get("postId") ?? "");
  const imagePath = String(formData.get("imagePath") ?? "");
  if (!postId) return;

  // admin 権限でDB削除＆Storageファイル削除（他人フォルダの画像を消すため service_role）
  const admin = createAdminClient();
  await admin.from("posts").delete().eq("id", postId);
  if (imagePath) {
    await admin.storage.from(BUCKET).remove([imagePath]);
  }

  revalidatePath("/admin");
  revalidatePath("/gallery");
}
