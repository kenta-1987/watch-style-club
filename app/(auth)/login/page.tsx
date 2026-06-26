"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    const supabase = createClient();
    // 本番(Vercel)では NEXT_PUBLIC_SITE_URL を、未設定のローカル等では現在のoriginを使う。
    // これで localhost と Vercel の両方で正しいコールバックURLになる。
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const callbackUrl = new URL("/auth/callback", baseUrl);
    callbackUrl.searchParams.set("redirect", redirect);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: callbackUrl.toString(),
        data: {
          nickname: nickname.trim(),
          marketing_opt_in: optIn,
        },
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="mx-auto max-w-sm rounded-2xl border border-black/10 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold">メールを確認してください</h1>
        <p className="mt-3 text-sm text-black/60">
          <span className="font-medium text-ink">{email}</span> にログインリンクを送りました。
          メール内のリンクを開くとログインが完了します。
        </p>
        <p className="mt-4 text-xs text-black/40">
          数分待っても届かない場合は迷惑メールフォルダをご確認ください。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">ログイン / 新規登録</h1>
      <p className="mt-2 text-sm text-black/60">
        メールアドレスにログインリンクを送ります。パスワードは不要です。
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">メールアドレス</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            ニックネーム <span className="text-black/40">（新規登録の方）</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="例：watch_lover"
            maxLength={30}
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ink"
          />
          <p className="mt-1 text-xs text-black/40">
            ギャラリーに表示される名前です。後から変更できます。
          </p>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-black/70">
            新商品・キャンペーン情報のメールを受け取る
          </span>
        </label>

        {status === "error" && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{message}</p>
        )}

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-full bg-ink py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
        >
          {status === "sending" ? "送信中…" : "ログインリンクを送る"}
        </button>
      </form>
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
