"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressToWebp } from "@/lib/image";
import { createPost } from "@/lib/actions/posts";

const BUCKET = "post-images";

export function PostForm({
  nickname,
  defaultWatchModel,
  models,
  brands,
}: {
  nickname: string;
  defaultWatchModel: string;
  models: string[];
  brands: string[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [watchModel, setWatchModel] = useState(defaultWatchModel);
  const [bandBrand, setBandBrand] = useState("");
  const [bandName, setBandName] = useState("");
  const [color, setColor] = useState("");
  const [comment, setComment] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productHandle, setProductHandle] = useState("");

  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("画像を選択してください。");
      return;
    }
    if (productUrl && productHandle) {
      // 両方OKだが片方で十分。バリデーションは緩く。
    }

    setStatus("working");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login?redirect=/post/new";
        return;
      }

      // 1) 圧縮
      const compressed = await compressToWebp(file);

      // 2) 自分のフォルダへアップロード
      const path = `${user.id}/${crypto.randomUUID()}.webp`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, compressed, {
          contentType: "image/webp",
          upsert: false,
        });
      if (upErr) {
        setStatus("idle");
        setError(`画像アップロードに失敗しました：${upErr.message}`);
        return;
      }

      // 3) 投稿レコードを pending 保存（成功時 createPost が /post/thanks へ redirect）
      const result = await createPost({
        image_path: path,
        watch_model: watchModel,
        band_brand: bandBrand || undefined,
        band_name: bandName || undefined,
        color: color || undefined,
        comment: comment || undefined,
        product_url: productUrl || undefined,
        product_handle: productHandle || undefined,
      });

      if (result?.error) {
        // 投稿失敗時、アップ済み画像を後始末
        await supabase.storage.from(BUCKET).remove([path]);
        setStatus("idle");
        setError(result.error);
      }
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "予期せぬエラーが発生しました。");
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ink";

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      {/* 画像 */}
      <div>
        <label className="block text-sm font-medium">写真</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-1 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-black/15 bg-white hover:bg-black/5"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="プレビュー" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm text-black/40">タップして写真を選択</span>
          )}
        </button>
      </div>

      <p className="text-sm text-black/50">
        投稿者：<span className="font-medium text-ink">{nickname}</span>
      </p>

      {/* Watchモデル */}
      <div>
        <label className="block text-sm font-medium">Apple Watch モデル</label>
        <select
          value={watchModel}
          onChange={(e) => setWatchModel(e.target.value)}
          className={inputClass}
        >
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* バンドブランド */}
      <div>
        <label className="block text-sm font-medium">
          バンドブランド <span className="text-black/40">（任意）</span>
        </label>
        <select
          value={bandBrand}
          onChange={(e) => setBandBrand(e.target.value)}
          className={inputClass}
        >
          <option value="">選択しない</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {/* バンド名・カラー */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">
            バンド名 <span className="text-black/40">（任意）</span>
          </label>
          <input
            type="text"
            value={bandName}
            onChange={(e) => setBandName(e.target.value)}
            maxLength={60}
            placeholder="例：ナイロンバンド"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">
            カラー <span className="text-black/40">（任意）</span>
          </label>
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            maxLength={30}
            placeholder="例：ミッドナイト"
            className={inputClass}
          />
        </div>
      </div>

      {/* コメント */}
      <div>
        <label className="block text-sm font-medium">
          コメント <span className="text-black/40">（任意）</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="コーデのこだわりや感想など"
          className={inputClass}
        />
      </div>

      {/* 商品リンク */}
      <div className="rounded-xl bg-black/[0.03] p-4">
        <p className="text-sm font-medium">商品リンク（任意）</p>
        <p className="mt-1 text-xs text-black/50">
          このバンドの商品ページを紐付けると、ギャラリーから購入ページへ誘導できます。
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-black/60">商品URL</label>
            <input
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-black/60">
              または 商品handle
            </label>
            <input
              type="text"
              value={productHandle}
              onChange={(e) => setProductHandle(e.target.value)}
              placeholder="例：nylon-band-midnight"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "working"}
        className="w-full rounded-full bg-ink py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
      >
        {status === "working" ? "投稿中…" : "投稿する（承認後に公開）"}
      </button>
    </form>
  );
}
