import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HeaderAuth } from "@/components/auth/HeaderAuth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Watch Style Club",
  description: "Apple Watch ユーザーの着画コミュニティ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen font-sans">
        <header className="border-b border-black/10">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Watch Style Club
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/timeline" className="hover:opacity-60">
                タイムライン
              </Link>
              <Link href="/ranking" className="hover:opacity-60">
                ランキング
              </Link>
              <Link href="/gallery" className="hover:opacity-60">
                ギャラリー
              </Link>
              <Suspense fallback={null}>
                <HeaderAuth />
              </Suspense>
              <Link
                href="/post/new"
                className="rounded-full bg-ink px-4 py-1.5 text-white hover:opacity-80"
              >
                Styleを投稿
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t border-black/10 py-8 text-center text-xs text-black/40">
          Watch Style Club — Apple Watch Journal
        </footer>
      </body>
    </html>
  );
}
