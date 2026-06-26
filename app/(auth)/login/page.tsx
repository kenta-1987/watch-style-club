"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginWithUsername } from "@/lib/actions/auth";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await loginWithUsername({ username, password, redirect });
      // 成功時はサーバー側で redirect されるためここには来ない
      if (res?.error) setError(res.error);
    });
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ink";

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">ログイン</h1>
      <p className="mt-2 text-sm text-black/60">
        ユーザーIDとパスワードでログインします。
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">ユーザーID</label>
          <div className="mt-1 flex items-center rounded-lg border border-black/15 px-3 focus-within:border-ink">
            <span className="text-sm text-black/40">@</span>
            <input
              type="text"
              required
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="kenta1987"
              className="w-full bg-transparent px-1.5 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">パスワード</label>
            <Link href="/forgot-password" className="text-xs text-black/45 hover:text-ink">
              お忘れですか？
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-ink py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
        >
          {pending ? "ログイン中…" : "ログイン"}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm">
        <p className="text-black/60">
          アカウントがない？{" "}
          <Link href="/signup" className="font-medium text-ink hover:underline">
            新規登録
          </Link>
        </p>
        <p>
          <Link href="/login/magic" className="text-black/45 hover:text-ink">
            メールリンクでログイン
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
