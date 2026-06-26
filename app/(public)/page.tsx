import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-10 py-10 text-center">
      <div className="space-y-4">
        <p className="text-sm tracking-widest text-black/40">WATCH STYLE CLUB</p>
        <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">
          Apple Watch の
          <br />
          Style を共有しよう。
        </h1>
        <p className="mx-auto max-w-md text-sm text-black/60">
          本体 × バンド × 文字盤。あなたの Apple Watch の完成形（Style）を共有し、
          誰でも同じ Style を再現できるプラットフォーム。
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/post/new"
          className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white hover:opacity-80"
        >
          Styleを投稿する
        </Link>
        <Link
          href="/timeline"
          className="rounded-full border border-black/15 px-6 py-3 text-sm font-medium hover:bg-black/5"
        >
          みんなのStyleを見る
        </Link>
        <Link
          href="/gallery"
          className="rounded-full border border-black/15 px-6 py-3 text-sm font-medium hover:bg-black/5"
        >
          一覧で探す
        </Link>
      </div>

      <div className="mt-8 rounded-2xl border border-black/10 bg-white p-6 text-left">
        <p className="text-xs font-medium tracking-wider text-black/40">
          2026.08 OPENING CAMPAIGN
        </p>
        <p className="mt-2 text-base font-medium">
          オープニングキャンペーン開催予定
        </p>
        <p className="mt-1 text-sm text-black/60">
          会員登録して Style を投稿すると、Campagne Sélection・B&・n max n
          のバンドが当たる。
        </p>
      </div>
    </div>
  );
}
