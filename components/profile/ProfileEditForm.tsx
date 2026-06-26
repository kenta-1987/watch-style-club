"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { compressToWebp } from "@/lib/image";
import { avatarUrl } from "@/lib/avatar";
import { updateMyProfile } from "@/lib/actions/profile";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
    >
      {pending ? "保存中…" : "保存する"}
    </button>
  );
}

export function ProfileEditForm({
  userId,
  username,
  displayName,
  bio,
  favoriteWatch,
  avatarPath,
}: {
  userId: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  favoriteWatch: string | null;
  avatarPath: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(avatarUrl(avatarPath));
  const [uploadedPath, setUploadedPath] = useState<string>(avatarPath ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const compressed = await compressToWebp(file);
      const supabase = createClient();
      const path = `${userId}/avatar-${Date.now()}.webp`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { contentType: "image/webp", upsert: true });
      if (error) {
        setUploadError(`アップロード失敗：${error.message}`);
        return;
      }
      setUploadedPath(path);
      setPreview(avatarUrl(path));
    } finally {
      setUploading(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ink";

  return (
    <form action={updateMyProfile} className="space-y-5">
      <input type="hidden" name="avatar_path" value={uploadedPath} />

      {/* アバター */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-xl font-semibold text-white">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            (displayName || username || "U").charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPickAvatar}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-full border border-black/15 px-4 py-1.5 text-sm font-medium hover:bg-black/5 disabled:opacity-50"
          >
            {uploading ? "アップロード中…" : "アバターを変更"}
          </button>
          {uploadError && <p className="mt-1 text-xs text-red-500">{uploadError}</p>}
        </div>
      </div>

      {/* username（変更不可） */}
      <div>
        <label className="block text-sm font-medium">
          ユーザーID <span className="text-black/40">（変更できません）</span>
        </label>
        <div className="mt-1 flex items-center rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-sm text-black/50">
          @{username ?? "（未設定）"}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">表示名</label>
        <input
          type="text"
          name="display_name"
          maxLength={30}
          defaultValue={displayName ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">自己紹介</label>
        <textarea
          name="bio"
          rows={3}
          maxLength={160}
          defaultValue={bio ?? ""}
          placeholder="Apple Watch の好きなところなど"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">お気に入りのWatch</label>
        <input
          type="text"
          name="favorite_watch"
          maxLength={60}
          defaultValue={favoriteWatch ?? ""}
          placeholder="例：Apple Watch Ultra 2"
          className={inputClass}
        />
      </div>

      <SaveButton />
    </form>
  );
}
