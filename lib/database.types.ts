// 手書きの最小型定義。Supabase プロジェクト接続後は
//   npm run types   （supabase gen types）で自動生成に置き換える。
// 各テーブルに Relationships / スキーマに Views を持たせるのは、
// supabase-js の GenericSchema 制約を満たし型推論を効かせるため。

export type PostStatus = "pending" | "approved" | "rejected";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nickname: string;
          watch_model: string | null;
          current_band: string | null;
          marketing_opt_in: boolean;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          watch_model?: string | null;
          current_band?: string | null;
          marketing_opt_in?: boolean;
          role?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          image_path: string;
          nickname: string;
          watch_model: string;
          band_brand: string | null;
          band_name: string | null;
          color: string | null;
          comment: string | null;
          product_url: string | null;
          product_handle: string | null;
          status: PostStatus;
          like_count: number;
          featured_at: string | null;
          created_at: string;
          approved_at: string | null;
        };
        Insert: {
          user_id: string;
          image_path: string;
          nickname: string;
          watch_model: string;
          band_brand?: string | null;
          band_name?: string | null;
          color?: string | null;
          comment?: string | null;
          product_url?: string | null;
          product_handle?: string | null;
          status?: PostStatus;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]> & {
          status?: PostStatus;
          approved_at?: string | null;
          featured_at?: string | null;
        };
        Relationships: [];
      };
      post_likes: {
        Row: { post_id: string; user_id: string; created_at: string };
        Insert: { post_id: string; user_id: string };
        Update: { post_id?: string; user_id?: string };
        Relationships: [];
      };
      post_bookmarks: {
        Row: { post_id: string; user_id: string; created_at: string };
        Insert: { post_id: string; user_id: string };
        Update: { post_id?: string; user_id?: string };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          slug: string;
          title: string;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
        };
        Insert: {
          slug: string;
          title: string;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>;
        Relationships: [];
      };
      campaign_entries: {
        Row: {
          id: string;
          campaign_id: string;
          user_id: string;
          post_id: string | null;
          created_at: string;
        };
        Insert: { campaign_id: string; user_id: string; post_id?: string | null };
        Update: { campaign_id?: string; user_id?: string; post_id?: string | null };
        Relationships: [];
      };
      watch_models: {
        Row: { label: string; sort_order: number };
        Insert: { label: string; sort_order?: number };
        Update: Partial<{ label: string; sort_order: number }>;
        Relationships: [];
      };
      band_brands: {
        Row: { label: string; sort_order: number };
        Insert: { label: string; sort_order?: number };
        Update: Partial<{ label: string; sort_order: number }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      toggle_like: { Args: { p_post_id: string }; Returns: number };
      get_ranking: {
        Args: { p_period: string; p_limit?: number };
        Returns: { post_id: string; score: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
