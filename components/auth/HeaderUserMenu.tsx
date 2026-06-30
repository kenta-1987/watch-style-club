"use client";

import { useState } from "react";
import Link from "next/link";

export function HeaderUserMenu({
  username,
  name,
  avatar,
  points,
}: {
  username: string | null;
  name: string;
  avatar: string | null;
  /** 保有 Style Points（SP）。購入ポイントではなく貢献ポイント */
  points?: number;
}) {
  const [open, setOpen] = useState(false);
  const profileHref = username ? `/u/${username}` : "/settings";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center hover:opacity-70"
        title="マイメニュー"
      >
        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-ink text-xs font-semibold text-white">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={name} className="h-full w-full object-cover" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </span>
      </button>

      {open && (
        <>
          {/* 外側クリックで閉じる */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-black/10 bg-white py-1 shadow-lg">
            <div className="border-b border-black/5 px-3 py-2">
              <p className="truncate text-sm font-medium">{name}</p>
              {username && (
                <p className="truncate text-xs text-black/45">@{username}</p>
              )}
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-ink/[0.06] px-2 py-0.5 text-xs font-semibold tabular-nums text-ink">
                {(points ?? 0).toLocaleString("ja-JP")} SP
              </p>
            </div>
            <Link
              href={profileHref}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm hover:bg-black/[0.04]"
            >
              マイページ
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm hover:bg-black/[0.04]"
            >
              設定
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="block w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
              >
                ログアウト
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
