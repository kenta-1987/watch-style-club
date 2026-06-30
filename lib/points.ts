// ============================================================================
// Style Points (SP) — Phase 5 Point Engine
//
// 【重要】Point と Score は別概念
//   - Style Points (SP)  … このファイルが扱う「コミュニティ貢献ポイント」。獲得/消費する通貨。
//   - Style Score        … 将来導入する「信用スコア」。SP から交換され、ランキング/おすすめユーザー/
//                           Editor's Pick アルゴリズム等に使う別物。本ファイルは扱わない。
//
// 【カテゴリ非依存】Apple Watch 専用ではない。reason / source_type は汎用文字列で、
//   将来 アパレル / スニーカー / ガジェット / フード でも同一エンジンを使う。
//
// 【不変条件】残高は award_points() のみが更新する（balance を直接 update しない）。
//   付与は service_role 限定のため、必ず createAdminClient() 経由で呼ぶ（サーバー専用）。
// ============================================================================
import "server-only";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/** reason コード → 表示ラベル（履歴UI用）。未知コードはそのまま表示。 */
export const REASON_LABELS: Record<string, string> = {
  profile_completed: "プロフィール完成",
  style_approved: "Style承認",
  editors_pick: "Editor's Pick",
  first_style: "初投稿ボーナス",
  campaign_entry: "キャンペーン参加",
  weekly_ranking_top10: "週間ランキングTOP10",
  monthly_ranking_top10: "月間ランキングTOP10",
  manual: "運営調整",
};

export function reasonLabel(code: string): string {
  return REASON_LABELS[code] ?? code;
}

/** SP 表記（例: 1200 → "1,200 SP"） */
export function formatSP(n: number): string {
  return `${(n ?? 0).toLocaleString("ja-JP")} SP`;
}

export type LedgerEntry = {
  id: string;
  delta: number;
  reason: string;
  source_type: string;
  source_id: string | null;
  campaign_id: string | null;
  created_at: string;
};

type AwardOpts = {
  sourceType: string;
  sourceId?: string | null;
  campaignId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * ポイント付与（冪等）。reason は point_rules.code。
 * 重複付与は (user_id, reason, source_type, source_id) の一意制約で no-op になる。
 * 失敗は握りつぶす（付与失敗で本処理＝承認/Pick/プロフィール保存 を止めないため）。
 * @returns 付与されたら true（既付与・無効ルールは false）
 */
export async function awardPoints(
  userId: string,
  reason: string,
  opts: AwardOpts
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("award_points", {
      p_user_id: userId,
      p_reason: reason,
      p_source_type: opts.sourceType,
      p_source_id: opts.sourceId ?? null,
      p_metadata: opts.metadata ?? {},
      p_campaign_id: opts.campaignId ?? null,
    });
    if (error) {
      console.error(`[points] award_points failed: ${reason}`, error.message);
      return false;
    }
    return Boolean(data?.[0]?.awarded);
  } catch (e) {
    console.error(`[points] award_points threw: ${reason}`, e);
    return false;
  }
}

/** ログイン中ユーザーの残高（RLSで本人のみ）。未作成なら 0。 */
export async function getMyBalance(): Promise<number> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data } = await supabase
    .from("point_accounts")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle<{ balance: number }>();
  return data?.balance ?? 0;
}

/** 公開プロフィール用（balance / lifetime_earned のみ・他人でも取得可）。 */
export async function getPublicPoints(
  userId: string
): Promise<{ balance: number; lifetimeEarned: number }> {
  const supabase = createClient();
  const { data } = await supabase
    .rpc("public_points", { p_user_id: userId })
    .returns<{ balance: number; lifetime_earned: number }[]>();
  const row = data?.[0];
  return { balance: row?.balance ?? 0, lifetimeEarned: row?.lifetime_earned ?? 0 };
}

/** ログイン中ユーザーのポイント履歴（直近 limit 件）。 */
export async function getMyLedger(limit = 20): Promise<LedgerEntry[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("point_ledger")
    .select("id, delta, reason, source_type, source_id, campaign_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<LedgerEntry[]>();
  return data ?? [];
}
