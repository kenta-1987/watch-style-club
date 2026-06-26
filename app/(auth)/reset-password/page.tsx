"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  // 再設定リンク（/auth/callback 経由）でセッションが確立しているか確認
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setHasSession(!!data.user));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setMessage("パスワードは8文字以上で設定してください。");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("done");
    setTimeout(() => router.push("/"), 1500);
  }

  if (hasSession === false) {
    return (
      <div className="mx-auto max-w-sm rounded-2xl border border-black/10 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold">リンクが無効です</h1>
        <p className="mt-3 text-sm text-black/60">
          パスワード再設定リンクの有効期限が切れているか、無効です。もう一度お試しください。
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white hover:opacity-80"
        >
          再設定リンクを送り直す
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="mx-auto max-w-sm rounded-2xl border border-black/10 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold">パスワードを変更しました</h1>
        <p className="mt-3 text-sm text-black/60">ホームに移動します…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">新しいパスワード</h1>
      <p className="mt-2 text-sm text-black/60">新しいパスワードを設定してください。</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">新しいパスワード</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8文字以上"
            className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ink"
          />
        </div>

        {status === "error" && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{message}</p>
        )}

        <button
          type="submit"
          disabled={status === "saving" || hasSession === null}
          className="w-full rounded-full bg-ink py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
        >
          {status === "saving" ? "保存中…" : "パスワードを変更"}
        </button>
      </form>
    </div>
  );
}
