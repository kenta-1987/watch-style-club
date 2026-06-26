"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    const supabase = createClient();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${baseUrl}/auth/callback?redirect=/reset-password`,
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
          <span className="font-medium text-ink">{email}</span> にパスワード再設定リンクを送りました。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">パスワード再設定</h1>
      <p className="mt-2 text-sm text-black/60">
        登録済みのメールアドレスに再設定リンクを送ります。
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
          {status === "sending" ? "送信中…" : "再設定リンクを送る"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-black/45 hover:text-ink">
          ← ログインに戻る
        </Link>
      </p>
    </div>
  );
}
