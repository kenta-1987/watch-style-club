import Link from "next/link";

export default function ThanksPage() {
  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-black/10 bg-white p-8 text-center">
      <h1 className="text-xl font-semibold">Styleを投稿しました！</h1>
      <p className="mt-3 text-sm text-black/60">
        運営が内容を確認し、承認されると公開されます。
        公開まで少しお待ちください。
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/post/new"
          className="rounded-full bg-ink py-2.5 text-sm font-medium text-white hover:opacity-80"
        >
          続けて投稿する
        </Link>
        <Link
          href="/gallery"
          className="rounded-full border border-black/15 py-2.5 text-sm font-medium hover:bg-black/5"
        >
          ギャラリーを見る
        </Link>
      </div>
    </div>
  );
}
