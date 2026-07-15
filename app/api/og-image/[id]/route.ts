import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * OGP用の投稿カバー画像プロキシ。SNSクローラーが常に安定してアクセスできる自ドメインURLを
 * og:image に使うため、署名URL（数分〜数時間で失効）は直接metadataへ埋め込まず、
 * このルートが毎回新しい署名URLを発行してバイトを中継する。
 *
 * - 非承認投稿（pending/rejected）はOGP非公開 → 共通フォールバックへ。
 * - カバーが動画（サムネ画像を持たない）の場合も共通フォールバックへ。
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("image_path, status")
    .eq("id", params.id)
    .eq("status", "approved")
    .maybeSingle<{ image_path: string; status: string }>();

  if (!post) {
    return NextResponse.redirect(new URL("/api/og-image/default", _request.url));
  }

  const { data: coverMedia } = await supabase
    .from("post_media")
    .select("media_type")
    .eq("post_id", params.id)
    .eq("sort_order", 0)
    .maybeSingle<{ media_type: "image" | "video" }>();

  if (coverMedia?.media_type === "video") {
    return NextResponse.redirect(new URL("/api/og-image/default", _request.url));
  }

  const signed = await getSignedUrls([post.image_path], 60);
  const signedUrl = signed[post.image_path];
  if (!signedUrl) {
    return NextResponse.redirect(new URL("/api/og-image/default", _request.url));
  }

  const imageRes = await fetch(signedUrl);
  if (!imageRes.ok || !imageRes.body) {
    return NextResponse.redirect(new URL("/api/og-image/default", _request.url));
  }

  return new NextResponse(imageRes.body, {
    headers: {
      "Content-Type": imageRes.headers.get("content-type") ?? "image/webp",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
