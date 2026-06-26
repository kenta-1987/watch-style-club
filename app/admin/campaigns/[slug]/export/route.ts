import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCampaignEntrants, type EntrantRow } from "@/lib/campaign";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "承認待ち",
  approved: "承認済み",
  rejected: "非承認",
  削除済み: "削除済み",
};

function csvEscape(value: string | null): string {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function buildCsv(rows: EntrantRow[]): string {
  const header = [
    "メールアドレス",
    "ニックネーム",
    "Watchモデル",
    "投稿ID",
    "投稿ステータス",
    "応募日時",
    "投稿日時",
    "商品URL",
    "商品handle",
  ];
  const lines = [header.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.email,
        r.nickname,
        r.watchModel,
        r.postId,
        STATUS_LABEL[r.status] ?? r.status,
        r.entryCreatedAt,
        r.postCreatedAt,
        r.productUrl,
        r.productHandle,
      ]
        .map((v) => csvEscape(v))
        .join(",")
    );
  }
  // 日本語Excel向けに BOM 付き UTF-8、改行は CRLF
  return "﻿" + lines.join("\r\n");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  // 管理者検証（middleware で /admin は保護済みだが、ここでも二重チェック）
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

  const { campaign, rows } = await getCampaignEntrants(params.slug);
  if (!campaign) return new NextResponse("Not found", { status: 404 });

  const csv = buildCsv(rows);
  const filename = `wsc-entries-${campaign.slug}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
