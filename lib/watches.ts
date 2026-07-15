// ============================================================================
// My Watch — ユーザーが所有する Apple Watch（owned_watches の構造化ビュー）
//
// 【設計】docs/product-catalog-redesign.md ⑤ 参照。
//   - apple_watch_models = Appleの製品ライン（Family/世代/素材/サイズ）のマスタ（編集部管理）
//   - owned_watches = ユーザーの個体（モデル × 色 × サイズ × ニックネーム、is_primary）
//   - 投稿時は My Watch から選ぶだけ。初期値はメインWatch（is_primary）。
// 型・表示ラベル関数はクライアント共用のため lib/watches-shared.ts にある。
// ============================================================================
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AppleWatchModel, MyWatch } from "@/lib/watches-shared";

export type { AppleWatchModel, MyWatch } from "@/lib/watches-shared";
export { watchLabel, watchModelText } from "@/lib/watches-shared";

/** Apple Watch モデルマスタ（選択UI用・is_activeのみ） */
export async function getAppleWatchModels(): Promise<AppleWatchModel[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("apple_watch_models")
    .select("id, family, generation, display_name, case_materials, case_colors, case_sizes, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .returns<AppleWatchModel[]>();
  return data ?? [];
}

type OwnedWatchRow = {
  id: string;
  model: string;
  apple_watch_model_id: string | null;
  case_material: string | null;
  case_color: string | null;
  case_size: number | null;
  nickname: string | null;
  is_primary: boolean;
  apple_watch_models: { display_name: string } | null;
};

/** ログイン中ユーザーの My Watch 一覧（メイン→登録順）。未ログインは空配列 */
export async function getMyWatches(): Promise<MyWatch[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("owned_watches")
    .select(
      "id, model, apple_watch_model_id, case_material, case_color, case_size, nickname, is_primary, apple_watch_models(display_name)"
    )
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .returns<OwnedWatchRow[]>();

  return (data ?? []).map((r) => ({
    id: r.id,
    appleWatchModelId: r.apple_watch_model_id,
    modelDisplayName: r.apple_watch_models?.display_name ?? r.model,
    caseMaterial: r.case_material,
    caseColor: r.case_color,
    caseSize: r.case_size,
    nickname: r.nickname,
    isPrimary: r.is_primary,
  }));
}
