import Link from "next/link";

/** タイトル＋「もっと見る」＋横スクロール本体のセクション枠 */
export function SectionRail({
  title,
  subtitle,
  moreHref,
  children,
}: {
  title: string;
  subtitle?: string;
  moreHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-black/45">{subtitle}</p>}
        </div>
        {moreHref && (
          <Link href={moreHref} className="shrink-0 text-xs text-black/50 hover:text-ink">
            もっと見る →
          </Link>
        )}
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">{children}</div>
    </section>
  );
}
