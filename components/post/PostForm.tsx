"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressToWebp, readMediaMeta } from "@/lib/image";
import { createPost } from "@/lib/actions/posts";
import { formatDuration } from "@/lib/format";
import type { PickerBrand } from "@/lib/catalog";

const MAX_MEDIA = 5;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
const BUCKET = "post-images";

type MediaDraft = {
  localId: string;
  type: "image" | "video";
  previewUrl: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  status: "uploading" | "ready" | "error";
  storagePath?: string;
};

export function PostForm({
  nickname,
  defaultWatchModel,
  models,
  pickerTree,
}: {
  nickname: string;
  defaultWatchModel: string;
  models: string[];
  pickerTree: PickerBrand[];
}) {
  const [watchModel, setWatchModel] = useState(defaultWatchModel);
  const [bandMode, setBandMode] = useState<"awj" | "unregistered">(
    pickerTree.length > 0 ? "awj" : "unregistered"
  );

  // AWJ cascade
  const [brandId, setBrandId] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [skuId, setSkuId] = useState("");

  // 未登録
  const [uBrand, setUBrand] = useState("");
  const [uName, setUName] = useState("");
  const [uColor, setUColor] = useState("");
  const [uUrl, setUUrl] = useState("");

  const [media, setMedia] = useState<MediaDraft[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const seriesList = useMemo(
    () => pickerTree.find((b) => b.id === brandId)?.series ?? [],
    [pickerTree, brandId]
  );
  const skuList = useMemo(
    () => seriesList.find((s) => s.id === seriesId)?.skus ?? [],
    [seriesList, seriesId]
  );

  function setMediaItem(localId: string, patch: Partial<MediaDraft>) {
    setMedia((prev) => prev.map((m) => (m.localId === localId ? { ...m, ...patch } : m)));
  }

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login?redirect=/post/new";
      return;
    }

    let videoCount = media.filter((m) => m.type === "video").length;
    let count = media.length;

    for (const file of files) {
      if (count >= MAX_MEDIA) {
        setError(`メディアは最大${MAX_MEDIA}つまでです。`);
        break;
      }
      const isVideo = file.type.startsWith("video/");
      if (isVideo) {
        if (videoCount >= 1) {
          setError("動画は1本までです。");
          continue;
        }
        if (file.size > MAX_VIDEO_BYTES) {
          setError("動画は50MBまでアップロードできます。");
          continue;
        }
      } else if (!file.type.startsWith("image/")) {
        setError("対応していない形式です（画像 or mp4/mov）。");
        continue;
      }

      const meta = await readMediaMeta(file);
      const localId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      count += 1;
      if (isVideo) videoCount += 1;
      setMedia((prev) => [
        ...prev,
        {
          localId,
          type: meta.type,
          previewUrl,
          width: meta.width,
          height: meta.height,
          duration: meta.duration,
          status: "uploading",
        },
      ]);

      try {
        let uploadFile: File = file;
        let ext = "bin";
        let contentType = file.type;
        if (isVideo) {
          ext = file.type === "video/quicktime" ? "mov" : "mp4";
        } else {
          uploadFile = await compressToWebp(file);
          ext = "webp";
          contentType = "image/webp";
        }
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, uploadFile, { contentType, upsert: false });
        if (upErr) {
          setMediaItem(localId, { status: "error" });
          setError(`アップロード失敗：${upErr.message}`);
        } else {
          setMediaItem(localId, { status: "ready", storagePath: path });
        }
      } catch (err) {
        setMediaItem(localId, { status: "error" });
        setError(err instanceof Error ? err.message : "アップロードに失敗しました。");
      }
    }
  }

  function removeMedia(localId: string) {
    setMedia((prev) => prev.filter((m) => m.localId !== localId));
  }
  function move(localId: string, dir: -1 | 1) {
    setMedia((prev) => {
      const i = prev.findIndex((m) => m.localId === localId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (media.length === 0) return setError("写真または動画を1つ以上追加してください。");
    if (media.some((m) => m.status === "uploading"))
      return setError("アップロードの完了をお待ちください。");
    if (media.some((m) => m.status === "error" || !m.storagePath))
      return setError("失敗したメディアを削除してから投稿してください。");
    if (bandMode === "awj" && !skuId)
      return setError("バンドのカラーを選択してください。");

    setSubmitting(true);
    const result = await createPost({
      watch_model: watchModel,
      sku_id: bandMode === "awj" ? skuId : null,
      band_brand: bandMode === "unregistered" ? uBrand : undefined,
      band_name: bandMode === "unregistered" ? uName : undefined,
      color: bandMode === "unregistered" ? uColor : undefined,
      product_url: bandMode === "unregistered" ? uUrl : undefined,
      comment,
      media: media.map((m, i) => ({
        storage_path: m.storagePath!,
        media_type: m.type,
        sort_order: i,
        width: m.width,
        height: m.height,
        duration_seconds: m.duration,
      })),
    });
    if (result?.error) {
      setSubmitting(false);
      setError(result.error);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ink";

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-6">
      {/* 1. Apple Watch モデル */}
      <div>
        <label className="block text-sm font-medium">Apple Watch モデル</label>
        <select value={watchModel} onChange={(e) => setWatchModel(e.target.value)} className={inputClass}>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* 2. バンド選択 */}
      <div>
        <label className="block text-sm font-medium">バンド</label>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => setBandMode("awj")}
            disabled={pickerTree.length === 0}
            className={`flex-1 rounded-full border px-3 py-2 text-sm ${
              bandMode === "awj" ? "border-ink bg-ink text-white" : "border-black/15"
            } disabled:opacity-40`}
          >
            AWJ取扱から選ぶ
          </button>
          <button
            type="button"
            onClick={() => setBandMode("unregistered")}
            className={`flex-1 rounded-full border px-3 py-2 text-sm ${
              bandMode === "unregistered" ? "border-ink bg-ink text-white" : "border-black/15"
            }`}
          >
            未登録バンド
          </button>
        </div>

        {bandMode === "awj" ? (
          <div className="mt-3 space-y-2">
            <select
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value);
                setSeriesId("");
                setSkuId("");
              }}
              className={inputClass}
            >
              <option value="">ブランドを選択</option>
              {pickerTree.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {brandId && (
              <select
                value={seriesId}
                onChange={(e) => {
                  setSeriesId(e.target.value);
                  setSkuId("");
                }}
                className={inputClass}
              >
                <option value="">シリーズを選択</option>
                {seriesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            {seriesId && (
              <select value={skuId} onChange={(e) => setSkuId(e.target.value)} className={inputClass}>
                <option value="">カラーを選択</option>
                {skuList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.colorName}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-black/40">
              選ぶと商品リンクは自動でセットされます（URL入力は不要）。
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <input value={uBrand} onChange={(e) => setUBrand(e.target.value)} placeholder="ブランド名" className={inputClass} />
            <input value={uName} onChange={(e) => setUName(e.target.value)} placeholder="バンド名" className={inputClass} />
            <input value={uColor} onChange={(e) => setUColor(e.target.value)} placeholder="カラー" className={inputClass} />
            <input value={uUrl} onChange={(e) => setUUrl(e.target.value)} placeholder="商品URL（任意）" className={inputClass} />
          </div>
        )}
      </div>

      {/* 4. 写真・動画 */}
      <div>
        <label className="block text-sm font-medium">写真・動画</label>
        <p className="text-xs text-black/40">最大5つ・動画は1本まで（50MB以内）。1枚目がカバーになります。</p>

        <div className="mt-2 flex flex-wrap gap-2">
          {media.map((m, i) => (
            <div key={m.localId} className="relative h-24 w-24 overflow-hidden rounded-lg border border-black/10 bg-black/5">
              {m.type === "video" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={m.previewUrl} muted className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.previewUrl} alt="" className="h-full w-full object-cover" />
              )}
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-ink px-1.5 py-0.5 text-[9px] font-medium text-white">
                  カバー
                </span>
              )}
              {m.type === "video" && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] text-white">
                  ▶{m.duration != null ? ` ${formatDuration(m.duration)}` : ""}
                </span>
              )}
              {m.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-[10px] text-black/60">
                  ⏳
                </div>
              )}
              {m.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-[10px] text-red-500">
                  失敗
                </div>
              )}
              {/* 操作 */}
              <div className="absolute bottom-0 right-0 flex gap-0.5 bg-white/80 px-0.5">
                {i > 0 && (
                  <button type="button" onClick={() => move(m.localId, -1)} className="text-xs">
                    ←
                  </button>
                )}
                {i < media.length - 1 && (
                  <button type="button" onClick={() => move(m.localId, 1)} className="text-xs">
                    →
                  </button>
                )}
                <button type="button" onClick={() => removeMedia(m.localId)} className="text-xs text-red-500">
                  ×
                </button>
              </div>
            </div>
          ))}

          {media.length < MAX_MEDIA && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-black/15 text-2xl text-black/30 hover:bg-black/5"
            >
              ＋
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/mp4,video/quicktime"
          multiple
          onChange={onPickFiles}
          className="hidden"
        />
      </div>

      {/* 5. コメント */}
      <div>
        <label className="block text-sm font-medium">
          コメント <span className="text-black/40">（任意）</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="このStyleのこだわりなど"
          className={inputClass}
        />
      </div>

      <p className="text-sm text-black/50">
        投稿者：<span className="font-medium text-ink">{nickname}</span>
      </p>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-ink py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
      >
        {submitting ? "投稿中…" : "投稿する（承認後に公開）"}
      </button>
    </form>
  );
}
