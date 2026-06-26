"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function MagicForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    const supabase = createClient();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const callbackUrl = new URL("/auth/callback", baseUrl);
    callbackUrl.searchParams.set("redirect", redirect);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl.toString() },
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
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">メールリンクでログイン</h1>
      <p className="mt-2 text-sm text-black/60">
        登録済みのメールアドレスにログインリンクを送ります（パスワード不要）。
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

      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-black/45 hover:text-ink">
          ← ユーザーID・パスワードでログイン
        </Link>
      </p>
    </div>
  );
}

export default function MagicLoginPage() {
  return (
    <Suspense fallback={null}>
      <MagicForm />
    </Suspense>
  );
}
