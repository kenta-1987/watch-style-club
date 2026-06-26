"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function BookmarkButton({
  postId,
  initialSaved,
  isAuthed,
}: {
  postId: string;
  initialSaved: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  async function toggle() {
    if (!isAuthed) {
      router.push("/login?redirect=/timeline");
      return;
    }
    const next = !saved;
    setSaved(next); // 楽観的更新

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirect=/timeline");
        return;
      }

      const { error } = next
        ? await supabase
            .from("post_bookmarks")
            .insert({ post_id: postId, user_id: user.id })
        : await supabase
            .from("post_bookmarks")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", user.id);

      if (error) setSaved(!next); // 失敗したら戻す
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "保存を解除" : "保存"}
      title={saved ? "保存済み" : "保存"}
      className="text-black/70 transition hover:text-black disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-6 w-6 ${saved ? "fill-ink stroke-ink" : "fill-none stroke-current"}`}
        strokeWidth="1.8"
      >
        <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
      </svg>
    </button>
  );
}
