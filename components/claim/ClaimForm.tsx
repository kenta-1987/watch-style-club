"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * トークン単体ではログインさせない。文脈情報のみとして扱い、
 * target_email 宛のマジックリンクで必ず本人確認を通す（HANDOVER.md §16）。
 */
export function ClaimForm({ token, targetEmail }: { token: string; targetEmail: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleClick() {
    setStatus("sending");
    setMessage("");

    const supabase = createClient();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const callbackUrl = new URL("/auth/callback", baseUrl);
    callbackUrl.searchParams.set("redirect", `/claim/${token}`);

    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
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
      <p className="mt-6 text-sm text-black/60">
        確認メールを送りました。メール内のリンクから戻ってきてください。
      </p>
    );
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "sending"}
        className="w-full rounded-full bg-ink py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
      >
        {status === "sending" ? "送信中…" : "確認メールを送る"}
      </button>
      {status === "error" && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{message}</p>
      )}
    </div>
  );
}
