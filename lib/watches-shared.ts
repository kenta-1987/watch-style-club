// My Watch の型と純粋関数（クライアント/サーバー共用。server-only にしない）。
// データ取得は lib/watches.ts（server-only）側にある。

export type AppleWatchModel = {
  id: string;
  family: string;
  generation: number;
  display_name: string;
  case_materials: string[];
  case_colors: string[];
  case_sizes: number[];
  sort_order: number;
};

export type MyWatch = {
  id: string;
  /** 構造化参照（旧データはnullの場合あり） */
  appleWatchModelId: string | null;
  /** 表示名（例 'Apple Watch Ultra 2'。構造化参照が無い旧データは model 文字列） */
  modelDisplayName: string;
  caseMaterial: string | null;
  caseColor: string | null;
  caseSize: number | null;
  nickname: string | null;
  isPrimary: boolean;
};

/** チップ表示用ラベル（例 'Ultra 2 Black Titanium 49mm' / ニックネーム優先） */
export function watchLabel(w: MyWatch): string {
  if (w.nickname) return w.nickname;
  const short = w.modelDisplayName.replace(/^Apple Watch\s*/, "");
  return [short, w.caseColor, w.caseMaterial, w.caseSize ? `${w.caseSize}mm` : null]
    .filter(Boolean)
    .join(" ");
}

/** 投稿の watch_model 列（互換文字列）に入れる値。ギャラリーフィルタと一致させる */
export function watchModelText(w: MyWatch): string {
  return w.modelDisplayName;
}
