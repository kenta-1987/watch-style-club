import Link from "next/link";
import { getPostShareState, getStyleById } from "@/lib/posts";
import { ShareButton } from "@/components/share/ShareButton";

export const dynamic = "force-dynamic";

/**
 * 投稿完了画面。承認前は公開URLがまだ使えないため、pending中はシェア導線を出さず
 * 「公開後にシェアできます」と案内する（管理者の即時承認テスト等、既に approved なら
 * その場でシェアできる＝ getPostShareState は RLS 内で本人/adminの pending も見えるが、
 * approved でなければ共有ボタンは出さない）。
 */
export default async function ThanksPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const postId = searchParams.id;
  const state = postId ? await getPostShareState(postId) : null;

  let shareSection = (
    <p className="mt-3 text-sm text-black/60">
      運営が内容を確認し、承認されると公開されます。
      公開まで少しお待ちください。
    </p>
  );

  if (state?.status === "approved" && postId) {
    const { post, signedUrls } = await getStyleById(postId);
    if (post) {
      shareSection = (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-medium">Styleをシェアしよう</p>
          <p className="text-sm text-black/60">
            公開されました。SNSでもシェアして、あなたのStyleを広げましょう。
          </p>
          <ShareButton post={post} imageUrl={signedUrls[post.image_path]} variant="cta" />
        </div>
      );
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-black/10 bg-white p-8 text-center">
      <h1 className="text-xl font-semibold">Styleを投稿しました！</h1>
      {shareSection}
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
