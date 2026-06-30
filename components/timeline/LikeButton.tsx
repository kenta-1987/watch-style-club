"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LikeButton({
  postId,
  initialCount,
  initialLiked,
  isAuthed,
}: {
  postId: string;
  initialCount: number;
  initialLiked: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  async function toggle() {
    if (!isAuthed) {
      router.push("/login?redirect=/timeline");
      return;
    }
    // 楽観的更新
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));

    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("toggle_like", {
        p_post_id: postId,
      });
      if (error) {
        // 失敗したら戻す
        setLiked(!nextLiked);
        setCount((c) => c + (nextLiked ? -1 : 1));
        return;
      }
      if (typeof data === "number") setCount(data);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "いいねを取り消す" : "いいね"}
      className="group inline-flex items-center gap-1.5 text-sm disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-6 w-6 transition ${
          liked ? "fill-red-500 stroke-red-500" : "fill-none stroke-black/70 group-hover:stroke-black"
        }`}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span className="tabular-nums text-black/70">{count}</span>
    </button>
  );
}
