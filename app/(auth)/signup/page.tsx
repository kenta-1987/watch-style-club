"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpWithUsername } from "@/lib/actions/auth";
import { GoogleButton } from "@/components/auth/GoogleButton";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [error, setError] = useState("");
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const usernameOk = /^[a-z0-9_]{3,20}$/.test(username);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await signUpWithUsername({
        username,
        email,
        password,
        displayName,
        marketingOptIn: optIn,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.needsConfirm) {
        setSentEmail(email.trim());
      } else {
        router.push("/onboarding");
      }
    });
  }

  if (sentEmail) {
    return (
      <div className="mx-auto max-w-sm rounded-2xl border border-black/10 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold">確認メールを送りました</h1>
        <p className="mt-3 text-sm text-black/60">
          <span className="font-medium text-ink">{sentEmail}</span> に確認メールを送りました。
          メール内のリンクを開くと登録が完了します。
        </p>
      </div>
    );
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ink";

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">新規登録</h1>
      <p className="mt-2 text-sm text-black/60">
        ユーザーIDとパスワードでアカウントを作成します。
      </p>

      <div className="mt-6">
        <GoogleButton redirect="/onboarding" />
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-black/35">
        <span className="h-px flex-1 bg-black/10" />
        またはメールで登録
        <span className="h-px flex-1 bg-black/10" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">
            ユーザーID <span className="text-black/40">（変更できません）</span>
          </label>
          <div className="mt-1 flex items-center rounded-lg border border-black/15 px-3 focus-within:border-ink">
            <span className="text-sm text-black/40">@</span>
            <input
              type="text"
              required
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="kenta1987"
              className="w-full bg-transparent px-1.5 py-2 text-sm outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-black/40">
            半角英小文字・数字・_ の3〜20文字。あとから変更できません。
            {username && !usernameOk && (
              <span className="ml-1 text-red-500">形式が正しくありません</span>
            )}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">
            表示名 <span className="text-black/40">（任意・後から変更可）</span>
          </label>
          <input
            type="text"
            maxLength={30}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例：Kenta"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">メールアドレス</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-black/40">
            本人確認・通知・パスワード再設定にのみ使用します（外部に表示されません）。
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">パスワード</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8文字以上"
            className={inputClass}
          />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-black/70">新商品・キャンペーン情報のメールを受け取る</span>
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending || !usernameOk}
          className="w-full rounded-full bg-ink py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
        >
          {pending ? "登録中…" : "アカウントを作成"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-black/60">
        すでにアカウントをお持ち？{" "}
        <Link href="/login" className="font-medium text-ink hover:underline">
          ログイン
        </Link>
      </p>
    </div>
  );
}
