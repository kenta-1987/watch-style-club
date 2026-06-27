import type { PublicPost } from "@/lib/posts";

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  const n = Math.max(0, Math.min(5, rating));
  return (
    <span className="text-xs text-amber-500" aria-label={`★${n}`}>
      {"★".repeat(n)}
      <span className="text-black/15">{"★".repeat(5 - n)}</span>
    </span>
  );
}

/**
 * 編集部おすすめの文字盤（Recommended Face）。
 * SKU に紐づく face_recommendations から導出した代表1件を表示（投稿者は入力しない）。
 * Share URL があれば「🟢 この文字盤を追加」、無ければ「準備中」。
 */
export function RecommendedFace({ post }: { post: PublicPost }) {
  const face = post.recommendedFace;

  return (
    <div className="rounded-xl border border-black/10 bg-white p-3">
      <div className="flex items-center gap-1.5">
        <span aria-hidden>⭐</span>
        <p className="text-xs font-medium text-black/55">Recommended Face</p>
      </div>

      {face ? (
        <div className="mt-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{face.name}</p>
            <Stars rating={face.rating} />
          </div>
          {face.category && <p className="text-xs text-black/45">{face.category}</p>}
          {face.comment && (
            <p className="mt-1 text-xs leading-relaxed text-black/70">{face.comment}</p>
          )}
        </div>
      ) : (
        <p className="mt-1 text-sm text-black/40">編集部が選定中です</p>
      )}

      {/* 🟢 この文字盤を追加 */}
      {face?.shareUrl ? (
        <a
          href={face.shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <span className="text-base leading-none">🟢</span>
          この文字盤を追加
        </a>
      ) : (
        <div className="mt-3 flex items-center justify-center gap-1.5 rounded-full border border-black/10 py-2.5 text-sm font-medium text-black/35">
          <span className="text-base leading-none">🟢</span>
          この文字盤を追加
          <span className="ml-1 text-xs">（準備中）</span>
        </div>
      )}
    </div>
  );
}
