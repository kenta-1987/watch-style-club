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
      // ===== Phase 5: Point Engine（Style Points / カテゴリ非依存）=====
      // 注: Style Points と将来の「Style Score（信用スコア）」は別概念。Score は未実装。
      point_accounts: {
        Row: {
          user_id: string;
          balance: number;
          lifetime_earned: number;
          lifetime_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          balance?: number;
          lifetime_earned?: number;
          lifetime_spent?: number;
        };
        Update: Partial<Database["public"]["Tables"]["point_accounts"]["Insert"]>;
        Relationships: [];
      };
      point_ledger: {
        Row: {
          id: string;
          user_id: string;
          delta: number;
          reason: string;
          source_type: string;
          source_id: string | null;
          campaign_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          user_id: string;
          delta: number;
          reason: string;
          source_type: string;
          source_id?: string | null;
          campaign_id?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<Database["public"]["Tables"]["point_ledger"]["Insert"]>;
        Relationships: [];
      };
      point_rules: {
        Row: {
          id: string;
          code: string;
          name: string;
          points: number;
          is_active: boolean;
          description: string | null;
          created_at: string;
        };
        Insert: {
          code: string;
          name: string;
          points: number;
          is_active?: boolean;
          description?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["point_rules"]["Insert"]>;
        Relationships: [];
      };
      // ===== Phase 5.1: Mission Engine（Welcome Mission が最初の mission_group）=====
      // 達成状態は別テーブルで持たず、point_ledger の (reason, source_type='mission', source_id=userId) から導出する。
      mission_definitions: {
        Row: {
          id: string;
          code: string;
          mission_group: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          // 'always' | 'logged_in' | 'purchased' | 'campaign_only' ...（CHECK制約なし・将来値を自由に追加できる）
          visibility: string;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          code: string;
          mission_group: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          visibility?: string;
          icon?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["mission_definitions"]["Insert"]>;
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
      award_points: {
        Args: {
          p_user_id: string;
          p_reason: string;
          p_source_type: string;
          p_source_id?: string | null;
          p_metadata?: Record<string, unknown>;
          p_campaign_id?: string | null;
        };
        Returns: { awarded: boolean; delta: number; new_balance: number }[];
      };
      public_points: {
        Args: { p_user_id: string };
        Returns: { balance: number; lifetime_earned: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
