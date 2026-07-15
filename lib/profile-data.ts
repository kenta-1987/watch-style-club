import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ProfileView = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_path: string | null;
  bio: string | null;
  favorite_watch: string | null;
  created_at: string;
};

export type ProfileStats = {
  styleCount: number;
  totalLikes: number;
  featuredCount: number;
};

export type OwnedWatch = {
  id: string;
  model: string;
  color: string | null;
  case_color: string | null;
  case_size: number | null;
  nickname: string | null;
  is_primary: boolean;
};
export type OwnedBand = { id: string; brand: string | null; name: string; color: string | null };
export type OwnedFace = { id: string; name: string; share_url: string | null };

export type Collections = {
  watches: OwnedWatch[];
  bands: OwnedBand[];
  faces: OwnedFace[];
};

/** username（大文字小文字無視）でプロフィールを取得 */
export async function getProfileByUsername(
  username: string
): Promise<ProfileView | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_path, bio, favorite_watch, created_at")
    .ilike("username", username)
    .maybeSingle<ProfileView>();
  return data ?? null;
}

/** 自分のプロフィール（設定画面用） */
export async function getMyProfile(): Promise<ProfileView | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_path, bio, favorite_watch, created_at")
    .eq("id", user.id)
    .maybeSingle<ProfileView>();
  return data ?? null;
}

/** Stats：Style数 / 獲得Like数 / Editor's Pick数（承認済みのみ） */
export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const supabase = createClient();
  const { data } = await supabase
    .from("posts")
    .select("like_count, featured_at")
    .eq("user_id", userId)
    .eq("status", "approved")
    .returns<{ like_count: number; featured_at: string | null }[]>();

  const rows = data ?? [];
  return {
    styleCount: rows.length,
    totalLikes: rows.reduce((s, r) => s + (r.like_count ?? 0), 0),
    featuredCount: rows.filter((r) => r.featured_at).length,
  };
}

/** 所有 Collection（Watch / Band / Face） */
export async function getCollections(userId: string): Promise<Collections> {
  const supabase = createClient();
  const [w, b, f] = await Promise.all([
    supabase
      .from("owned_watches")
      .select("id, model, color, case_color, case_size, nickname, is_primary")
      .eq("user_id", userId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .returns<OwnedWatch[]>(),
    supabase
      .from("owned_bands")
      .select("id, brand, name, color")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .returns<OwnedBand[]>(),
    supabase
      .from("owned_faces")
      .select("id, name, share_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .returns<OwnedFace[]>(),
  ]);
  return { watches: w.data ?? [], bands: b.data ?? [], faces: f.data ?? [] };
}
