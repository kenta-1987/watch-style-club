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
          username: string | null;
          display_name: string | null;
          avatar_path: string | null;
          bio: string | null;
          favorite_watch: string | null;
          watch_model: string | null;
          current_band: string | null;
          marketing_opt_in: boolean;
          role: string;
          created_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          username?: string | null;
          display_name?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          favorite_watch?: string | null;
          watch_model?: string | null;
          current_band?: string | null;
          marketing_opt_in?: boolean;
          role?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      owned_watches: {
        Row: {
          id: string;
          user_id: string;
          model: string;
          color: string | null;
          created_at: string;
        };
        Insert: { user_id: string; model: string; color?: string | null };
        Update: Partial<{ model: string; color: string | null }>;
        Relationships: [];
      };
      owned_bands: {
        Row: {
          id: string;
          user_id: string;
          brand: string | null;
          name: string;
          color: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          brand?: string | null;
          color?: string | null;
        };
        Update: Partial<{ brand: string | null; name: string; color: string | null }>;
        Relationships: [];
      };
      owned_faces: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          share_url: string | null;
          recipe: unknown | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          share_url?: string | null;
          recipe?: unknown | null;
        };
        Update: Partial<{ name: string; share_url: string | null; recipe: unknown | null }>;
        Relationships: [];
      };
      follows: {
        Row: { follower_id: string; followee_id: string; created_at: string };
        Insert: { follower_id: string; followee_id: string };
        Update: { follower_id?: string; followee_id?: string };
        Relationships: [];
      };
      brands: {
        Row: { id: string; slug: string; name: string; logo_path: string | null; created_at: string };
        Insert: { slug: string; name: string; logo_path?: string | null };
        Update: Partial<{ slug: string; name: string; logo_path: string | null }>;
        Relationships: [];
      };
      series: {
        Row: { id: string; brand_id: string; slug: string | null; name: string; created_at: string };
        Insert: { brand_id: string; name: string; slug?: string | null };
        Update: Partial<{ brand_id: string; slug: string | null; name: string }>;
        Relationships: [];
      };
      skus: {
        Row: {
          id: string;
          series_id: string;
          color_name: string;
          color_hex: string | null;
          shopify_product_handle: string | null;
          shopify_variant_id: string | null;
          image_path: string | null;
          is_active: boolean;
          is_awj: boolean;
          created_at: string;
        };
        Insert: {
          series_id: string;
          color_name: string;
          color_hex?: string | null;
          shopify_product_handle?: string | null;
          shopify_variant_id?: string | null;
          image_path?: string | null;
          is_active?: boolean;
          is_awj?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["skus"]["Insert"]>;
        Relationships: [];
      };
      face_recommendations: {
        Row: {
          id: string;
          sku_id: string;
          watch_model: string | null;
          name: string;
          category: string | null;
          apple_share_url: string | null;
          editor_comment: string | null;
          rating: number | null;
          priority: number;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          sku_id: string;
          name: string;
          watch_model?: string | null;
          category?: string | null;
          apple_share_url?: string | null;
          editor_comment?: string | null;
          rating?: number | null;
          priority?: number;
          is_published?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["face_recommendations"]["Insert"]>;
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
          sku_id: string | null;
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
          sku_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]> & {
          status?: PostStatus;
          approved_at?: string | null;
          featured_at?: string | null;
          sku_id?: string | null;
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
      post_media: {
        Row: {
          id: string;
          post_id: string;
          media_type: "image" | "video";
          storage_path: string;
          width: number | null;
          height: number | null;
          duration_seconds: number | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          post_id: string;
          media_type?: "image" | "video";
          storage_path: string;
          width?: number | null;
          height?: number | null;
          duration_seconds?: number | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["post_media"]["Insert"]>;
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
