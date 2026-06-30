import imageCompression from "browser-image-compression";

/**
 * 投稿画像をクライアント側で圧縮・WebP化する。
 * 長辺1600px / 目標1MB。Storageの肥大化とギャラリー表示の重さを防ぐ。
 */
export async function compressToWebp(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 1,
    fileType: "image/webp",
    useWebWorker: true,
    initialQuality: 0.8,
  });
  // 拡張子を webp に揃える
  return new File([compressed], "upload.webp", { type: "image/webp" });
}

export type MediaMeta = {
  type: "image" | "video";
  width: number | null;
  height: number | null;
  duration: number | null;
};

/** 画像/動画のサイズ・長さをクライアントで読み取る（Masonry/時間表示用） */
export async function readMediaMeta(file: File): Promise<MediaMeta> {
  const isVideo = file.type.startsWith("video/");
  const url = URL.createObjectURL(file);
  try {
    if (isVideo) {
      return await new Promise<MediaMeta>((resolve) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () =>
          resolve({
            type: "video",
            width: v.videoWidth || null,
            height: v.videoHeight || null,
            duration: isFinite(v.duration) ? v.duration : null,
          });
        v.onerror = () => resolve({ type: "video", width: null, height: null, duration: null });
        v.src = url;
      });
    }
    return await new Promise<MediaMeta>((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve({ type: "image", width: img.naturalWidth || null, height: img.naturalHeight || null, duration: null });
      img.onerror = () => resolve({ type: "image", width: null, height: null, duration: null });
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
