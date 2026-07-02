"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { awardPoints } from "@/lib/points";
import { awardMission } from "@/lib/missions";

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

  const { data: updated } = await supabase
    .from("posts")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", postId)
    .select("id, user_id")
    .maybeSingle<{ id: string; user_id: string }>();

  // Style承認ポイント（冪等：同じ post は1回だけ。source_type='post' でカテゴリ非依存）
  if (updated?.user_id) {
    await awardPoints(updated.user_id, "style_approved", {
      sourceType: "post",
      sourceId: updated.id,
    });
    // Welcome Mission「初回Style投稿」：source_id=userId固定のため、2件目以降の承認では no-op になる
    await awardMission(updated.user_id, "welcome_first_style");
  }

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
  const { data: picked } = await supabase
    .from("posts")
    .update({ featured_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("status", "approved")
    .select("id, user_id")
    .maybeSingle<{ id: string; user_id: string }>();

  // Editor's Pick ポイント（冪等：1投稿1回。unfeature→再feature でも再付与しない仕様）
  if (picked?.user_id) {
    await awardPoints(picked.user_id, "editors_pick", {
      sourceType: "post",
      sourceId: picked.id,
    });
  }

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

// ===== Phase 5: Point Rules 管理（/admin/points/rules）=====
// コードを書かずに付与pt・ON/OFF・説明を変更／新規追加／未使用ルール削除を可能にする。
// ルールは point_rules（RLS: 書き込みは admin）。reason/source 体系はカテゴリ非依存。

const RULE_CODE_RE = /^[a-z0-9_]{2,40}$/;

/** 既存ルールの points / description / is_active を更新 */
export async function updatePointRule(formData: FormData) {
  const supabase = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const pointsRaw = String(formData.get("points") ?? "").trim();
  const points = Number(pointsRaw);
  if (!Number.isInteger(points)) return;
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const is_active = formData.get("is_active") === "on";

  await supabase
    .from("point_rules")
    .update({
      points,
      name: name || undefined,
      description: description || null,
      is_active,
    })
    .eq("id", id);

  revalidatePath("/admin/points/rules");
}

/** ON/OFF だけを即時トグル */
export async function togglePointRule(formData: FormData) {
  const supabase = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const next = formData.get("is_active") === "true";
  if (!id) return;
  await supabase.from("point_rules").update({ is_active: next }).eq("id", id);
  revalidatePath("/admin/points/rules");
}

/** 新規ルール追加 */
export async function createPointRule(formData: FormData) {
  const supabase = await assertAdmin();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const points = Number(String(formData.get("points") ?? "").trim());
  const description = String(formData.get("description") ?? "").trim();
  const is_active = formData.get("is_active") === "on";

  if (!RULE_CODE_RE.test(code) || !name || !Number.isInteger(points)) return;

  await supabase.from("point_rules").insert({
    code,
    name,
    points,
    description: description || null,
    is_active,
  });

  revalidatePath("/admin/points/rules");
}

/** ルール削除（元帳で未使用のもののみ。使用済みは履歴整合のため削除不可） */
export async function deletePointRule(formData: FormData) {
  const supabase = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: rule } = await supabase
    .from("point_rules")
    .select("code")
    .eq("id", id)
    .maybeSingle<{ code: string }>();
  if (!rule) return;

  // 元帳に1件でも参照があれば削除させない（admin は RLS で全件 count 可）
  const { count } = await supabase
    .from("point_ledger")
    .select("id", { count: "exact", head: true })
    .eq("reason", rule.code);
  if ((count ?? 0) > 0) {
    throw new Error("このルールは既に付与履歴があるため削除できません（OFFにしてください）");
  }

  // ミッション定義（Welcome Mission等）から参照されていれば削除させない（ミッションが壊れるため）
  const { count: missionCount } = await supabase
    .from("mission_definitions")
    .select("id", { count: "exact", head: true })
    .eq("code", rule.code);
  if ((missionCount ?? 0) > 0) {
    throw new Error("このルールはミッションで使用中のため削除できません（OFFにしてください）");
  }

  await supabase.from("point_rules").delete().eq("id", id);
  revalidatePath("/admin/points/rules");
}
