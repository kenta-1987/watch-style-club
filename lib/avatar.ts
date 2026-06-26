/**
 * avatars は公開バケットなので、パスから公開URLを組み立てるだけ（署名不要）。
 * server / client どちらからも使える（NEXT_PUBLIC_SUPABASE_URL）。
 */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/avatars/${path}`;
}
