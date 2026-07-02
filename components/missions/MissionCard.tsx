import type { MissionGroupStatus } from "@/lib/missions";

/**
 * 汎用ミッションカード。'welcome' 専用ではなく、将来 'campaign' / 'referral' 等の
 * mission_group を渡しても同じ見た目で使える（title/emoji で呼び出し側が意味付けする）。
 */
export function MissionCard({
  title,
  emoji = "🎯",
  status,
}: {
  title: string;
  emoji?: string;
  status: MissionGroupStatus;
}) {
  if (status.totalCount === 0) return null;

  const allDone = status.completedCount === status.totalCount;
  const progressPct = status.totalPoints
    ? Math.round((status.earnedPoints / status.totalPoints) * 100)
    : 0;

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {emoji} {title}
        </h2>
        {allDone && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
            完了
          </span>
        )}
      </div>

      <ul className="mt-4 space-y-2.5">
        {status.missions.map((m) => (
          <li key={m.code} className="flex items-center gap-3">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                m.completed
                  ? "border-ink bg-ink text-white"
                  : "border-black/20 bg-black/[0.03]"
              }`}
              aria-hidden
            >
              {m.completed ? "✓" : m.icon ?? ""}
            </span>
            <span
              className={`flex-1 text-sm ${
                m.completed ? "text-black/45 line-through" : "text-black/85"
              }`}
            >
              {m.name}
            </span>
            <span
              className={`shrink-0 text-xs font-semibold tabular-nums ${
                m.completed ? "text-black/30" : "text-black/50"
              }`}
            >
              +{m.points.toLocaleString("ja-JP")} SP
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-black/5 pt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
          <div
            className="h-full rounded-full bg-ink transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-black/45">
          <span>
            {status.completedCount} / {status.totalCount}
          </span>
          <span className="tabular-nums">
            {status.earnedPoints.toLocaleString("ja-JP")} / {status.totalPoints.toLocaleString("ja-JP")} SP
          </span>
        </div>
      </div>
    </section>
  );
}
