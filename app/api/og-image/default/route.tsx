import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * OGP用の共通フォールバック画像（動画カバー投稿・画像未解決時）。
 * Supabaseには触れない（edge runtime・ブランドカードのみ生成）。
 */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>Watch Style Club</div>
        <div style={{ fontSize: 28, marginTop: 20, color: "#a0a0a0" }}>
          Apple Watch ユーザーの着画コミュニティ
        </div>
      </div>
    ),
    { width: 1200, height: 1200 }
  );
}
