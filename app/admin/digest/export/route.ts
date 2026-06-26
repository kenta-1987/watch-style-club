import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDigest, type DigestItem } from "@/lib/digest";

export const dynamic = "force-dynamic";

function csvEscape(value: string | number | null): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function buildCsv(digest: Awaited<ReturnType<typeof getDigest>>): string {
  const header = [
    "セクション",
    "順位",
    "ニックネーム",
    "Watchモデル",
    "ブランド",
    "コメント",
    "投稿ID",
    "投稿URL",
    "商品URL",
    "画像URL(7日署名)",
  ];
  const lines = [header.map(csvEscape).join(",")];

  const push = (section: string, items: DigestItem[]) => {
    items.forEach((it, i) => {
      lines.push(
        [
          section,
          i + 1,
          it.nickname,
          it.watchModel,
          it.brand,
          it.comment,
          it.postId,
          it.postUrl,
          it.productUrl,
          it.imageUrl,
        ]
          .map((v) => csvEscape(v))
          .join(",")
      );
    });
  };

  push("Editor's Pick", digest.editorsPick);
  push("今週人気", digest.weekly);
  push("新着", digest.recent);

  // 日本語Excel向け：BOM付きUTF-8 + CRLF
  return "﻿" + lines.join("\r\n");
}

export async function GET(_request: NextRequest) {
  // 管理者検証
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  if (profile?.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const digest = await getDigest();
  const csv = buildCsv(digest);
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wsc-digest-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
