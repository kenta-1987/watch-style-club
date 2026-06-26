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
      >
        <path d="M12 21s-7.5-4.6-9.7-9.1C.9 8.6 2.3 5.5 5.3 5.1c1.9-.3 3.5.7 4.7 2.1 1.2-1.4 2.8-2.4 4.7-2.1 3 .4 4.4 3.5 3 6.8C19.5 16.4 12 21 12 21z" />
      </svg>
      <span className="tabular-nums text-black/70">{count}</span>
    </button>
  );
}
