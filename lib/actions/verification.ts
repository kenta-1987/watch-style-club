"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type TokenRow = {
  id: string;
  purpose: string;
  target_email: string;
  payload: Record<string, unknown>;
  dedupe_key: string | null;
  expires_at: string;
  consumed_at: string | null;
};

export type ConsumeResult = { error: string };

/**
 * verification_tokens を確定させる（purpose で分岐する構造。現状は purchase_claim のみ実装）。
 * 必ず本人確認（現在ログイン中のメール = target_email）を経てから呼ぶこと。
 * 二重consumeは consumed_at チェックで防ぐ。
 */
export async function consumeVerificationToken(token: string): Promise<ConsumeResult | void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { error: "ログインが必要です。" };
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("verification_tokens")
    .select("id, purpose, target_email, payload, dedupe_key, expires_at, consumed_at")
    .eq("token", token)
    .maybeSingle<TokenRow>();

  if (!row) return { error: "このリンクは無効です。" };
  if (row.consumed_at) return { error: "このリンクは既に使用されています。" };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { error: "このリンクの有効期限が切れています。" };
  }
  if (row.target_email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "別のアカウントでログイン中です。" };
  }

  if (row.purpose === "purchase_claim") {
    const payload = row.payload as {
      sku_id: string;
      channel: string;
      shop_domain: string | null;
      purchased_at: string;
    };
    await admin.rpc("record_verified_purchase", {
      p_profile_id: user.id,
      p_sku_id: payload.sku_id,
      p_channel: payload.channel,
      p_shop_domain: payload.shop_domain ?? null,
      p_purchased_at: payload.purchased_at,
      p_verification_source: "purchase_claim",
      p_dedupe_key: row.dedupe_key,
    });
  }
  // 将来 purpose を追加する場合はここに case を足す（invitation / event_checkin 等）。

  await admin
    .from("verification_tokens")
    .update({ consumed_at: new Date().toISOString(), consumed_by: user.id })
    .eq("id", row.id);

  redirect("/post/new");
}
