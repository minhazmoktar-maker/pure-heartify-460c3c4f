export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          properties: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          properties?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      approved_channels: {
        Row: {
          approved_by: string | null
          category: string | null
          consistency_score: number | null
          created_at: string
          handle: string | null
          id: string
          last_rechecked_at: string | null
          owner_key: string
          status: string
          title: string
          updated_at: string
          youtube_channel_id: string
        }
        Insert: {
          approved_by?: string | null
          category?: string | null
          consistency_score?: number | null
          created_at?: string
          handle?: string | null
          id?: string
          last_rechecked_at?: string | null
          owner_key: string
          status?: string
          title: string
          updated_at?: string
          youtube_channel_id: string
        }
        Update: {
          approved_by?: string | null
          category?: string | null
          consistency_score?: number | null
          created_at?: string
          handle?: string | null
          id?: string
          last_rechecked_at?: string | null
          owner_key?: string
          status?: string
          title?: string
          updated_at?: string
          youtube_channel_id?: string
        }
        Relationships: []
      }
      blocked_creators: {
        Row: {
          created_at: string
          id: string
          pattern: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          pattern: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          pattern?: string
          reason?: string | null
        }
        Relationships: []
      }
      channel_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          candidate_id: string | null
          channel_ref: string | null
          confidence: number | null
          created_at: string
          duplicate_risk: string | null
          evidence: Json
          id: string
          reason: string | null
          youtube_channel_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          candidate_id?: string | null
          channel_ref?: string | null
          confidence?: number | null
          created_at?: string
          duplicate_risk?: string | null
          evidence?: Json
          id?: string
          reason?: string | null
          youtube_channel_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          candidate_id?: string | null
          channel_ref?: string | null
          confidence?: number | null
          created_at?: string
          duplicate_risk?: string | null
          evidence?: Json
          id?: string
          reason?: string | null
          youtube_channel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_audit_log_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "channel_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_audit_log_channel_ref_fkey"
            columns: ["channel_ref"]
            isOneToOne: false
            referencedRelation: "approved_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_candidates: {
        Row: {
          category: string | null
          confidence: number | null
          country: string | null
          created_at: string
          description: string | null
          duplicate_risk: string | null
          evidence: Json
          handle: string | null
          id: string
          language: string | null
          source: string
          status: string
          submitted_by: string | null
          subscriber_count: number | null
          title: string
          updated_at: string
          youtube_channel_id: string
        }
        Insert: {
          category?: string | null
          confidence?: number | null
          country?: string | null
          created_at?: string
          description?: string | null
          duplicate_risk?: string | null
          evidence?: Json
          handle?: string | null
          id?: string
          language?: string | null
          source?: string
          status?: string
          submitted_by?: string | null
          subscriber_count?: number | null
          title: string
          updated_at?: string
          youtube_channel_id: string
        }
        Update: {
          category?: string | null
          confidence?: number | null
          country?: string | null
          created_at?: string
          description?: string | null
          duplicate_risk?: string | null
          evidence?: Json
          handle?: string | null
          id?: string
          language?: string | null
          source?: string
          status?: string
          submitted_by?: string | null
          subscriber_count?: number | null
          title?: string
          updated_at?: string
          youtube_channel_id?: string
        }
        Relationships: []
      }
      channels_state: {
        Row: {
          category: string | null
          channel_id: string | null
          channel_name: string
          created_at: string
          id: string
          last_pulled_at: string | null
          next_page_token: string | null
          resolved_at: string | null
          total_pulled: number
          updated_at: string
          uploads_playlist_id: string | null
        }
        Insert: {
          category?: string | null
          channel_id?: string | null
          channel_name: string
          created_at?: string
          id?: string
          last_pulled_at?: string | null
          next_page_token?: string | null
          resolved_at?: string | null
          total_pulled?: number
          updated_at?: string
          uploads_playlist_id?: string | null
        }
        Update: {
          category?: string | null
          channel_id?: string | null
          channel_name?: string
          created_at?: string
          id?: string
          last_pulled_at?: string | null
          next_page_token?: string | null
          resolved_at?: string | null
          total_pulled?: number
          updated_at?: string
          uploads_playlist_id?: string | null
        }
        Relationships: []
      }
      curated_videos: {
        Row: {
          category: string
          channel_title: string
          halal_score: number
          id: string
          ingested_at: string
          is_trusted_channel: boolean
          published_at: string | null
          section_id: string | null
          thumbnail_url: string
          title: string
          video_id: string
          view_count: number
        }
        Insert: {
          category?: string
          channel_title: string
          halal_score?: number
          id?: string
          ingested_at?: string
          is_trusted_channel?: boolean
          published_at?: string | null
          section_id?: string | null
          thumbnail_url?: string
          title: string
          video_id: string
          view_count?: number
        }
        Update: {
          category?: string
          channel_title?: string
          halal_score?: number
          id?: string
          ingested_at?: string
          is_trusted_channel?: boolean
          published_at?: string | null
          section_id?: string | null
          thumbnail_url?: string
          title?: string
          video_id?: string
          view_count?: number
        }
        Relationships: []
      }
      daily_dose: {
        Row: {
          completed_at: string | null
          completed_count: number
          created_at: string
          dose_date: string
          id: string
          total_minutes: number
          updated_at: string
          user_id: string
          video_ids: string[]
        }
        Insert: {
          completed_at?: string | null
          completed_count?: number
          created_at?: string
          dose_date?: string
          id?: string
          total_minutes?: number
          updated_at?: string
          user_id: string
          video_ids?: string[]
        }
        Update: {
          completed_at?: string | null
          completed_count?: number
          created_at?: string
          dose_date?: string
          id?: string
          total_minutes?: number
          updated_at?: string
          user_id?: string
          video_ids?: string[]
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      dose_completions: {
        Row: {
          completed_at: string
          dose_id: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          completed_at?: string
          dose_id: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          completed_at?: string
          dose_id?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dose_completions_dose_id_fkey"
            columns: ["dose_id"]
            isOneToOne: false
            referencedRelation: "daily_dose"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          features: Json
          id: string
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          features?: Json
          id?: string
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          features?: Json
          id?: string
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_categories: {
        Row: {
          created_at: string
          id: string
          section_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          section_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          section_id?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          channel_title: string | null
          created_at: string
          id: string
          thumbnail_url: string | null
          user_id: string
          video_id: string
          video_title: string | null
        }
        Insert: {
          channel_title?: string | null
          created_at?: string
          id?: string
          thumbnail_url?: string | null
          user_id: string
          video_id: string
          video_title?: string | null
        }
        Update: {
          channel_title?: string | null
          created_at?: string
          id?: string
          thumbnail_url?: string | null
          user_id?: string
          video_id?: string
          video_title?: string | null
        }
        Relationships: []
      }
      ingestion_log: {
        Row: {
          created_at: string
          id: string
          query: string
          quota_used: number
          section_id: string | null
          videos_added: number
          videos_found: number
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          quota_used?: number
          section_id?: string | null
          videos_added?: number
          videos_found?: number
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          quota_used?: number
          section_id?: string | null
          videos_added?: number
          videos_found?: number
        }
        Relationships: []
      }
      moderation_log: {
        Row: {
          channel_title: string
          created_at: string
          halal_score: number | null
          id: string
          matched_rule: string | null
          reject_reason: string
          source: string | null
          thumbnail_url: string | null
          title: string
          video_id: string
        }
        Insert: {
          channel_title: string
          created_at?: string
          halal_score?: number | null
          id?: string
          matched_rule?: string | null
          reject_reason: string
          source?: string | null
          thumbnail_url?: string | null
          title: string
          video_id: string
        }
        Update: {
          channel_title?: string
          created_at?: string
          halal_score?: number | null
          id?: string
          matched_rule?: string | null
          reject_reason?: string
          source?: string | null
          thumbnail_url?: string | null
          title?: string
          video_id?: string
        }
        Relationships: []
      }
      moderation_overrides: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          reason: string | null
          target: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          target: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          target?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          invitee_id: string | null
          inviter_id: string
          redeemed_at: string | null
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          invitee_id?: string | null
          inviter_id: string
          redeemed_at?: string | null
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          invitee_id?: string | null
          inviter_id?: string
          redeemed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          created_at: string
          current_streak: number
          last_completed_date: string | null
          longest_streak: number
          total_doses_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          last_completed_date?: string | null
          longest_streak?: number
          total_doses_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          last_completed_date?: string | null
          longest_streak?: number
          total_doses_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          created_at: string
          exploration_interest: string | null
          primary_interest: string
          secondary_interest: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exploration_interest?: string | null
          primary_interest: string
          secondary_interest?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exploration_interest?: string | null
          primary_interest?: string
          secondary_interest?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          candidate_id: string | null
          confidence: number | null
          created_at: string
          evidence: Json
          id: string
          reason: string | null
          youtube_video_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          candidate_id?: string | null
          confidence?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          reason?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          candidate_id?: string | null
          confidence?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          reason?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_audit_log_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "video_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      video_candidates: {
        Row: {
          channel_title: string | null
          confidence: number | null
          created_at: string
          description: string | null
          evidence: Json
          id: string
          status: string
          submitted_by: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          youtube_channel_id: string | null
          youtube_video_id: string
        }
        Insert: {
          channel_title?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          evidence?: Json
          id?: string
          status?: string
          submitted_by?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          youtube_channel_id?: string | null
          youtube_video_id: string
        }
        Update: {
          channel_title?: string | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          evidence?: Json
          id?: string
          status?: string
          submitted_by?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          youtube_channel_id?: string | null
          youtube_video_id?: string
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          completed: boolean
          duration_seconds: number
          id: string
          progress_seconds: number
          thumbnail_url: string | null
          user_id: string
          video_id: string
          video_title: string | null
          watched_at: string
        }
        Insert: {
          completed?: boolean
          duration_seconds?: number
          id?: string
          progress_seconds?: number
          thumbnail_url?: string | null
          user_id: string
          video_id: string
          video_title?: string | null
          watched_at?: string
        }
        Update: {
          completed?: boolean
          duration_seconds?: number
          id?: string
          progress_seconds?: number
          thumbnail_url?: string | null
          user_id?: string
          video_id?: string
          video_title?: string | null
          watched_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_channel_duplicate: {
        Args: { _handle: string; _title: string; _yt_id: string }
        Returns: {
          match_type: string
          matched_channel_id: string
          matched_title: string
          score: number
        }[]
      }
      compute_owner_key: { Args: { _name: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      nightly_reaudit_sweep: { Args: never; Returns: Json }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
