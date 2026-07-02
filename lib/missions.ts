// ============================================================================
// Mission Engine（Phase 5.1） — Welcome Mission はこの中の group='welcome' の1つに過ぎない
//
// 【設計】
//   - ミッション定義（mission_definitions）は point_rules.code と1対1で対応する。
//     付与ポイントは point_rules 側が真実の源（/admin/points/rules の GUI でそのまま変更できる）。
//   - 達成状態は別テーブルで二重管理しない。point_ledger に
//     (user_id, reason=mission.code, source_type='mission', source_id=userId) の行があるかで判定する
//     （0015 Point Engine の「Ledger 中心設計」を踏襲）。
//   - 付与は必ず awardMission() 経由 → 内部で awardPoints()/award_points() を呼ぶ。balance を直接更新しない。
//   - group はカテゴリ非依存の汎用文字列。'welcome' の他に将来 'campaign' / 'referral' / 'review' / 'purchase'
//     などを mission_definitions に行を追加するだけで拡張できる（コード変更不要）。
// ============================================================================
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { awardPoints } from "@/lib/points";

export type MissionStatus = {
  code: string;
  name: string;
  description: string | null;
  points: number;
  completed: boolean;
  icon: string | null;
};

/**
 * 表示条件（mission_definitions.visibility）の判定。
 * - 'always' / 'logged_in': 表示する（呼び出し経路は常にログイン済みユーザー向けのため、現状は同じ扱い）。
 * - 'purchased' / 'campaign_only': 判定コンテキスト（購入履歴・キャンペーン期間）が未実装のため、
 *   誤って見せてしまわないよう安全側で非表示にするプレースホルダー。判定を実装したらここに分岐を足す。
 */
function isMissionVisible(visibility: string): boolean {
  return visibility === "always" || visibility === "logged_in";
}

export type MissionGroupStatus = {
  group: string;
  missions: MissionStatus[];
  completedCount: number;
  totalCount: number;
  earnedPoints: number;
  totalPoints: number;
};

/**
 * 「1ユーザー1回」系のミッション付与。source_type='mission' / source_id=userId 固定で呼ぶことで、
 * point_ledger の一意制約 (user_id, reason, source_type, source_id) により何度呼んでも初回のみ付与される。
 * missionCode は mission_definitions.code = point_rules.code。失敗は握りつぶす（awardPoints の仕様）。
 */
export async function awardMission(userId: string, missionCode: string): Promise<boolean> {
  return awardPoints(userId, missionCode, {
    sourceType: "mission",
    sourceId: userId,
  });
}

/** 指定ユーザー・指定グループのミッション状況（定義＋達成有無＋進捗）。 */
export async function getMissionGroupStatus(
  userId: string,
  group: string
): Promise<MissionGroupStatus> {
  const supabase = createClient();
  const [{ data: defs }, { data: rules }, { data: ledger }] = await Promise.all([
    supabase
      .from("mission_definitions")
      .select("code, name, description, sort_order, is_active, visibility, icon")
      .eq("mission_group", group)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .returns<
        {
          code: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          visibility: string;
          icon: string | null;
        }[]
      >(),
    supabase.from("point_rules").select("code, points").returns<{ code: string; points: number }[]>(),
    supabase
      .from("point_ledger")
      .select("reason")
      .eq("user_id", userId)
      .eq("source_type", "mission")
      .returns<{ reason: string }[]>(),
  ]);

  const pointsByCode = new Map((rules ?? []).map((r) => [r.code, r.points]));
  const completedCodes = new Set((ledger ?? []).map((l) => l.reason));

  const missions: MissionStatus[] = (defs ?? [])
    .filter((d) => isMissionVisible(d.visibility))
    .map((d) => ({
      code: d.code,
      name: d.name,
      description: d.description,
      points: pointsByCode.get(d.code) ?? 0,
      completed: completedCodes.has(d.code),
      icon: d.icon,
    }));

  const completedCount = missions.filter((m) => m.completed).length;
  const earnedPoints = missions.filter((m) => m.completed).reduce((s, m) => s + m.points, 0);
  const totalPoints = missions.reduce((s, m) => s + m.points, 0);

  return { group, missions, completedCount, totalCount: missions.length, earnedPoints, totalPoints };
}

/** ログイン中ユーザーの指定グループのミッション状況。未ログインなら null。 */
export async function getMyMissionGroup(group: string): Promise<MissionGroupStatus | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return getMissionGroupStatus(user.id, group);
}
