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
