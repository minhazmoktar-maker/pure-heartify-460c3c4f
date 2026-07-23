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
      _channel_id_backfill_progress: {
        Row: {
          processed_at: string
          rows_updated: number
          youtube_channel_id: string
        }
        Insert: {
          processed_at?: string
          rows_updated?: number
          youtube_channel_id: string
        }
        Update: {
          processed_at?: string
          rows_updated?: number
          youtube_channel_id?: string
        }
        Relationships: []
      }
      _internal_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      admin_review_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          last_used_at: string | null
          last_used_ip: string | null
          purpose: string
          revoked_at: string | null
          token_hash: string
          uses: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          last_used_at?: string | null
          last_used_ip?: string | null
          purpose?: string
          revoked_at?: string | null
          token_hash: string
          uses?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          last_used_at?: string | null
          last_used_ip?: string | null
          purpose?: string
          revoked_at?: string | null
          token_hash?: string
          uses?: number
        }
        Relationships: []
      }
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
      appeals: {
        Row: {
          created_at: string
          decision_id: string | null
          id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject_kind: string
          subject_ref: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decision_id?: string | null
          id?: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject_kind: string
          subject_ref: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decision_id?: string | null
          id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject_kind?: string
          subject_ref?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "moderation_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_channels: {
        Row: {
          approved_by: string | null
          auto_approve_uploads: boolean
          category: string | null
          consistency_score: number | null
          created_at: string
          handle: string | null
          id: string
          last_rechecked_at: string | null
          owner_key: string
          status: string
          title: string
          trust_tier: Database["public"]["Enums"]["channel_trust_tier"]
          updated_at: string
          youtube_channel_id: string
        }
        Insert: {
          approved_by?: string | null
          auto_approve_uploads?: boolean
          category?: string | null
          consistency_score?: number | null
          created_at?: string
          handle?: string | null
          id?: string
          last_rechecked_at?: string | null
          owner_key: string
          status?: string
          title: string
          trust_tier?: Database["public"]["Enums"]["channel_trust_tier"]
          updated_at?: string
          youtube_channel_id: string
        }
        Update: {
          approved_by?: string | null
          auto_approve_uploads?: boolean
          category?: string | null
          consistency_score?: number | null
          created_at?: string
          handle?: string | null
          id?: string
          last_rechecked_at?: string | null
          owner_key?: string
          status?: string
          title?: string
          trust_tier?: Database["public"]["Enums"]["channel_trust_tier"]
          updated_at?: string
          youtube_channel_id?: string
        }
        Relationships: []
      }
      attributions: {
        Row: {
          created_at: string
          id: string
          landing_url: string | null
          ref_code: string | null
          referrer: string | null
          session_id: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          landing_url?: string | null
          ref_code?: string | null
          referrer?: string | null
          session_id: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          landing_url?: string | null
          ref_code?: string | null
          referrer?: string | null
          session_id?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      audio_integrity_reports: {
        Row: {
          checked_at: string
          content_length: number | null
          content_type: string | null
          error: string | null
          http_status: number | null
          id: string
          latency_ms: number | null
          run_id: string
          status: string
          track_id: string
          track_title: string | null
          url: string | null
        }
        Insert: {
          checked_at?: string
          content_length?: number | null
          content_type?: string | null
          error?: string | null
          http_status?: number | null
          id?: string
          latency_ms?: number | null
          run_id: string
          status: string
          track_id: string
          track_title?: string | null
          url?: string | null
        }
        Update: {
          checked_at?: string
          content_length?: number | null
          content_type?: string | null
          error?: string | null
          http_status?: number | null
          id?: string
          latency_ms?: number | null
          run_id?: string
          status?: string
          track_id?: string
          track_title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      audio_playback_positions: {
        Row: {
          created_at: string
          device: string | null
          duration_seconds: number | null
          id: string
          position_seconds: number
          track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device?: string | null
          duration_seconds?: number | null
          id?: string
          position_seconds?: number
          track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device?: string | null
          duration_seconds?: number | null
          id?: string
          position_seconds?: number
          track_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audio_reports: {
        Row: {
          created_at: string
          details: string | null
          error_code: string | null
          id: string
          platform: string | null
          reason: string
          status: string
          track_id: string
          track_title: string | null
          track_url: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          error_code?: string | null
          id?: string
          platform?: string | null
          reason: string
          status?: string
          track_id: string
          track_title?: string | null
          track_url?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          error_code?: string | null
          id?: string
          platform?: string | null
          reason?: string
          status?: string
          track_id?: string
          track_title?: string | null
          track_url?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          created_at: string
          criteria: Json
          description: string
          icon: string
          key: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          criteria?: Json
          description: string
          icon?: string
          key: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          criteria?: Json
          description?: string
          icon?: string
          key?: string
          name?: string
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
          auto_action: string | null
          category: string | null
          clean_samples: number
          cluster_id: string | null
          confidence: number | null
          confidence_breakdown: Json
          country: string | null
          crawl_depth: number
          created_at: string
          description: string | null
          discovery_method: string | null
          duplicate_risk: string | null
          educational_quality: number | null
          evidence: Json
          failed_samples: number
          halal_topic_hint: string | null
          handle: string | null
          id: string
          language: string | null
          language_detected: string | null
          last_sampled_at: string | null
          last_verified_at: string | null
          learned_weight_version: number | null
          moderation_summary: Json | null
          organization_type: string | null
          pre_approved_at: string | null
          priority_score: number
          promoted_at: string | null
          required_samples: number
          risk_score: number | null
          source: string
          source_channel_id: string | null
          status: string
          submitted_by: string | null
          subscriber_count: number | null
          summary_generated_at: string | null
          suspended_at: string | null
          tier: string | null
          tier_reason: string[] | null
          title: string
          updated_at: string
          youtube_channel_id: string
        }
        Insert: {
          auto_action?: string | null
          category?: string | null
          clean_samples?: number
          cluster_id?: string | null
          confidence?: number | null
          confidence_breakdown?: Json
          country?: string | null
          crawl_depth?: number
          created_at?: string
          description?: string | null
          discovery_method?: string | null
          duplicate_risk?: string | null
          educational_quality?: number | null
          evidence?: Json
          failed_samples?: number
          halal_topic_hint?: string | null
          handle?: string | null
          id?: string
          language?: string | null
          language_detected?: string | null
          last_sampled_at?: string | null
          last_verified_at?: string | null
          learned_weight_version?: number | null
          moderation_summary?: Json | null
          organization_type?: string | null
          pre_approved_at?: string | null
          priority_score?: number
          promoted_at?: string | null
          required_samples?: number
          risk_score?: number | null
          source?: string
          source_channel_id?: string | null
          status?: string
          submitted_by?: string | null
          subscriber_count?: number | null
          summary_generated_at?: string | null
          suspended_at?: string | null
          tier?: string | null
          tier_reason?: string[] | null
          title: string
          updated_at?: string
          youtube_channel_id: string
        }
        Update: {
          auto_action?: string | null
          category?: string | null
          clean_samples?: number
          cluster_id?: string | null
          confidence?: number | null
          confidence_breakdown?: Json
          country?: string | null
          crawl_depth?: number
          created_at?: string
          description?: string | null
          discovery_method?: string | null
          duplicate_risk?: string | null
          educational_quality?: number | null
          evidence?: Json
          failed_samples?: number
          halal_topic_hint?: string | null
          handle?: string | null
          id?: string
          language?: string | null
          language_detected?: string | null
          last_sampled_at?: string | null
          last_verified_at?: string | null
          learned_weight_version?: number | null
          moderation_summary?: Json | null
          organization_type?: string | null
          pre_approved_at?: string | null
          priority_score?: number
          promoted_at?: string | null
          required_samples?: number
          risk_score?: number | null
          source?: string
          source_channel_id?: string | null
          status?: string
          submitted_by?: string | null
          subscriber_count?: number | null
          summary_generated_at?: string | null
          suspended_at?: string | null
          tier?: string | null
          tier_reason?: string[] | null
          title?: string
          updated_at?: string
          youtube_channel_id?: string
        }
        Relationships: []
      }
      channel_follows: {
        Row: {
          channel_id: string
          created_at: string
          follower_id: string
          id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          follower_id: string
          id?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_follows_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "approved_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_moderation_decisions: {
        Row: {
          action: string
          actor: string | null
          candidate_id: string
          cluster_id: string | null
          created_at: string
          evidence: Json | null
          id: string
          is_bulk: boolean
          new_status: string | null
          previous_status: string | null
          reason: string | null
          reversible: boolean
          tier: string | null
          youtube_channel_id: string
        }
        Insert: {
          action: string
          actor?: string | null
          candidate_id: string
          cluster_id?: string | null
          created_at?: string
          evidence?: Json | null
          id?: string
          is_bulk?: boolean
          new_status?: string | null
          previous_status?: string | null
          reason?: string | null
          reversible?: boolean
          tier?: string | null
          youtube_channel_id: string
        }
        Update: {
          action?: string
          actor?: string | null
          candidate_id?: string
          cluster_id?: string | null
          created_at?: string
          evidence?: Json | null
          id?: string
          is_bulk?: boolean
          new_status?: string | null
          previous_status?: string | null
          reason?: string | null
          reversible?: boolean
          tier?: string | null
          youtube_channel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_moderation_decisions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "channel_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_trust_events: {
        Row: {
          actor_id: string | null
          channel_id: string
          created_at: string
          delta: number
          id: string
          metadata: Json
          reason: string | null
          score_after: number | null
          score_before: number | null
          source: Database["public"]["Enums"]["trust_event_source"]
        }
        Insert: {
          actor_id?: string | null
          channel_id: string
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json
          reason?: string | null
          score_after?: number | null
          score_before?: number | null
          source: Database["public"]["Enums"]["trust_event_source"]
        }
        Update: {
          actor_id?: string | null
          channel_id?: string
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json
          reason?: string | null
          score_after?: number | null
          score_before?: number | null
          source?: Database["public"]["Enums"]["trust_event_source"]
        }
        Relationships: [
          {
            foreignKeyName: "channel_trust_events_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "approved_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_trust_profiles: {
        Row: {
          approved_videos: number
          avg_ai_confidence: number | null
          category_consistency: number | null
          channel_id: string
          created_at: string
          false_negative_count: number
          false_positive_count: number
          historical_quality: number | null
          id: string
          last_recomputed_at: string | null
          manual_approval_count: number
          manual_rejection_count: number
          notes: string | null
          rejected_videos: number
          review_frequency_days: number | null
          risk_level: Database["public"]["Enums"]["channel_risk_level"]
          strike_count: number
          total_videos: number
          trust_score: number
          updated_at: string
          upload_frequency_per_week: number | null
          user_report_count: number
          youtube_channel_id: string | null
        }
        Insert: {
          approved_videos?: number
          avg_ai_confidence?: number | null
          category_consistency?: number | null
          channel_id: string
          created_at?: string
          false_negative_count?: number
          false_positive_count?: number
          historical_quality?: number | null
          id?: string
          last_recomputed_at?: string | null
          manual_approval_count?: number
          manual_rejection_count?: number
          notes?: string | null
          rejected_videos?: number
          review_frequency_days?: number | null
          risk_level?: Database["public"]["Enums"]["channel_risk_level"]
          strike_count?: number
          total_videos?: number
          trust_score?: number
          updated_at?: string
          upload_frequency_per_week?: number | null
          user_report_count?: number
          youtube_channel_id?: string | null
        }
        Update: {
          approved_videos?: number
          avg_ai_confidence?: number | null
          category_consistency?: number | null
          channel_id?: string
          created_at?: string
          false_negative_count?: number
          false_positive_count?: number
          historical_quality?: number | null
          id?: string
          last_recomputed_at?: string | null
          manual_approval_count?: number
          manual_rejection_count?: number
          notes?: string | null
          rejected_videos?: number
          review_frequency_days?: number | null
          risk_level?: Database["public"]["Enums"]["channel_risk_level"]
          strike_count?: number
          total_videos?: number
          trust_score?: number
          updated_at?: string
          upload_frequency_per_week?: number | null
          user_report_count?: number
          youtube_channel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_trust_profiles_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "approved_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_trust_weights: {
        Row: {
          baseline_score: number
          created_at: string
          created_by: string | null
          decay_half_life_days: number
          id: string
          is_active: boolean
          max_score: number
          min_score: number
          notes: string | null
          updated_at: string
          version: number
          w_ai_confidence: number
          w_category_consistency: number
          w_false_negative: number
          w_false_positive: number
          w_historical_quality: number
          w_manual_approval: number
          w_manual_rejection: number
          w_strike: number
          w_upload_frequency: number
          w_user_report: number
        }
        Insert: {
          baseline_score?: number
          created_at?: string
          created_by?: string | null
          decay_half_life_days?: number
          id?: string
          is_active?: boolean
          max_score?: number
          min_score?: number
          notes?: string | null
          updated_at?: string
          version: number
          w_ai_confidence?: number
          w_category_consistency?: number
          w_false_negative?: number
          w_false_positive?: number
          w_historical_quality?: number
          w_manual_approval?: number
          w_manual_rejection?: number
          w_strike?: number
          w_upload_frequency?: number
          w_user_report?: number
        }
        Update: {
          baseline_score?: number
          created_at?: string
          created_by?: string | null
          decay_half_life_days?: number
          id?: string
          is_active?: boolean
          max_score?: number
          min_score?: number
          notes?: string | null
          updated_at?: string
          version?: number
          w_ai_confidence?: number
          w_category_consistency?: number
          w_false_negative?: number
          w_false_positive?: number
          w_historical_quality?: number
          w_manual_approval?: number
          w_manual_rejection?: number
          w_strike?: number
          w_upload_frequency?: number
          w_user_report?: number
        }
        Relationships: []
      }
      channel_video_samples: {
        Row: {
          candidate_id: string
          evidence: Json | null
          id: string
          reasons: string[] | null
          sample_kind: string
          sampled_at: string
          verdict: string
          video_id: string
          youtube_channel_id: string
        }
        Insert: {
          candidate_id: string
          evidence?: Json | null
          id?: string
          reasons?: string[] | null
          sample_kind: string
          sampled_at?: string
          verdict: string
          video_id: string
          youtube_channel_id: string
        }
        Update: {
          candidate_id?: string
          evidence?: Json | null
          id?: string
          reasons?: string[] | null
          sample_kind?: string
          sampled_at?: string
          verdict?: string
          video_id?: string
          youtube_channel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_video_samples_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "channel_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      channels_state: {
        Row: {
          approved_channel_id: string | null
          category: string | null
          channel_id: string | null
          channel_name: string
          consecutive_failures: number
          created_at: string
          id: string
          last_error: string | null
          last_pulled_at: string | null
          last_success_at: string | null
          next_attempt_at: string
          next_page_token: string | null
          priority: number
          resolved_at: string | null
          status: string
          total_pulled: number
          updated_at: string
          uploads_playlist_id: string | null
        }
        Insert: {
          approved_channel_id?: string | null
          category?: string | null
          channel_id?: string | null
          channel_name: string
          consecutive_failures?: number
          created_at?: string
          id?: string
          last_error?: string | null
          last_pulled_at?: string | null
          last_success_at?: string | null
          next_attempt_at?: string
          next_page_token?: string | null
          priority?: number
          resolved_at?: string | null
          status?: string
          total_pulled?: number
          updated_at?: string
          uploads_playlist_id?: string | null
        }
        Update: {
          approved_channel_id?: string | null
          category?: string | null
          channel_id?: string | null
          channel_name?: string
          consecutive_failures?: number
          created_at?: string
          id?: string
          last_error?: string | null
          last_pulled_at?: string | null
          last_success_at?: string | null
          next_attempt_at?: string
          next_page_token?: string | null
          priority?: number
          resolved_at?: string | null
          status?: string
          total_pulled?: number
          updated_at?: string
          uploads_playlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channels_state_approved_channel_id_fkey"
            columns: ["approved_channel_id"]
            isOneToOne: false
            referencedRelation: "approved_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          kind?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "video_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          resolved: boolean
          topic: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          resolved?: boolean
          topic: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          resolved?: boolean
          topic?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      curated_videos: {
        Row: {
          category: string
          channel_id: string | null
          channel_title: string
          content_language: string | null
          embedding: string | null
          embedding_model: string | null
          embedding_updated_at: string | null
          halal_score: number
          id: string
          ingested_at: string
          is_archived: boolean
          is_featured: boolean
          is_hidden: boolean
          is_pinned: boolean
          is_premium_only: boolean
          is_trusted_channel: boolean
          last_decision_id: string | null
          moderation_confidence: number | null
          moderation_provider: string | null
          moderation_reasoning: string | null
          moderation_risk: number | null
          moderation_signals: Json
          moderation_stage:
            | Database["public"]["Enums"]["moderation_stage"]
            | null
          moderation_state: Database["public"]["Enums"]["moderation_state"]
          moderation_updated_at: string | null
          pinned_at: string | null
          published_at: string | null
          search_tsv: unknown
          section_id: string | null
          thumbnail_url: string
          title: string
          video_id: string
          view_count: number
        }
        Insert: {
          category?: string
          channel_id?: string | null
          channel_title: string
          content_language?: string | null
          embedding?: string | null
          embedding_model?: string | null
          embedding_updated_at?: string | null
          halal_score?: number
          id?: string
          ingested_at?: string
          is_archived?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          is_pinned?: boolean
          is_premium_only?: boolean
          is_trusted_channel?: boolean
          last_decision_id?: string | null
          moderation_confidence?: number | null
          moderation_provider?: string | null
          moderation_reasoning?: string | null
          moderation_risk?: number | null
          moderation_signals?: Json
          moderation_stage?:
            | Database["public"]["Enums"]["moderation_stage"]
            | null
          moderation_state?: Database["public"]["Enums"]["moderation_state"]
          moderation_updated_at?: string | null
          pinned_at?: string | null
          published_at?: string | null
          search_tsv?: unknown
          section_id?: string | null
          thumbnail_url?: string
          title: string
          video_id: string
          view_count?: number
        }
        Update: {
          category?: string
          channel_id?: string | null
          channel_title?: string
          content_language?: string | null
          embedding?: string | null
          embedding_model?: string | null
          embedding_updated_at?: string | null
          halal_score?: number
          id?: string
          ingested_at?: string
          is_archived?: boolean
          is_featured?: boolean
          is_hidden?: boolean
          is_pinned?: boolean
          is_premium_only?: boolean
          is_trusted_channel?: boolean
          last_decision_id?: string | null
          moderation_confidence?: number | null
          moderation_provider?: string | null
          moderation_reasoning?: string | null
          moderation_risk?: number | null
          moderation_signals?: Json
          moderation_stage?:
            | Database["public"]["Enums"]["moderation_stage"]
            | null
          moderation_state?: Database["public"]["Enums"]["moderation_state"]
          moderation_updated_at?: string | null
          pinned_at?: string | null
          published_at?: string | null
          search_tsv?: unknown
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
      dead_letter_queue: {
        Row: {
          attempts: number
          created_at: string
          error: string
          id: string
          job_type: string
          next_retry_at: string | null
          payload: Json
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error: string
          id?: string
          job_type: string
          next_retry_at?: string | null
          payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string
          id?: string
          job_type?: string
          next_retry_at?: string | null
          payload?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      device_registrations: {
        Row: {
          app_version: string | null
          capabilities: Json
          created_at: string
          device_id: string
          id: string
          last_seen_at: string
          os_version: string | null
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          capabilities?: Json
          created_at?: string
          device_id: string
          id?: string
          last_seen_at?: string
          os_version?: string | null
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          capabilities?: Json
          created_at?: string
          device_id?: string
          id?: string
          last_seen_at?: string
          os_version?: string | null
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          last_seen_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          last_seen_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      dhikr_circle_members: {
        Row: {
          circle_id: string
          contribution: number
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          circle_id: string
          contribution?: number
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          circle_id?: string
          contribution?: number
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dhikr_circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "dhikr_circles"
            referencedColumns: ["id"]
          },
        ]
      }
      dhikr_circles: {
        Row: {
          created_at: string
          current_count: number
          ends_at: string | null
          host_user_id: string
          id: string
          is_active: boolean
          phrase: string
          target_count: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_count?: number
          ends_at?: string | null
          host_user_id: string
          id?: string
          is_active?: boolean
          phrase: string
          target_count: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_count?: number
          ends_at?: string | null
          host_user_id?: string
          id?: string
          is_active?: boolean
          phrase?: string
          target_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      dhikr_sessions: {
        Row: {
          completed_at: string | null
          count: number
          created_at: string
          dhikr_key: string
          id: string
          source: string | null
          target: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          count?: number
          created_at?: string
          dhikr_key: string
          id?: string
          source?: string | null
          target?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          count?: number
          created_at?: string
          dhikr_key?: string
          id?: string
          source?: string | null
          target?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discovery_jobs: {
        Row: {
          api_failures: number
          cancel_requested: boolean
          created_at: string
          enqueued_count: number
          error: string | null
          finished_at: string | null
          heartbeat_at: string | null
          id: string
          mode: string
          quota_used: number
          requested_by: string | null
          seeds_processed: number
          skipped_count: number
          started_at: string | null
          stats: Json
          status: string
          updated_at: string
        }
        Insert: {
          api_failures?: number
          cancel_requested?: boolean
          created_at?: string
          enqueued_count?: number
          error?: string | null
          finished_at?: string | null
          heartbeat_at?: string | null
          id?: string
          mode?: string
          quota_used?: number
          requested_by?: string | null
          seeds_processed?: number
          skipped_count?: number
          started_at?: string | null
          stats?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          api_failures?: number
          cancel_requested?: boolean
          created_at?: string
          enqueued_count?: number
          error?: string | null
          finished_at?: string | null
          heartbeat_at?: string | null
          id?: string
          mode?: string
          quota_used?: number
          requested_by?: string | null
          seeds_processed?: number
          skipped_count?: number
          started_at?: string | null
          stats?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      discovery_quota_allocations: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          notes: string | null
          share_percent: number
          source: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          notes?: string | null
          share_percent: number
          source: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          notes?: string | null
          share_percent?: number
          source?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      discovery_quota_ledger: {
        Row: {
          api_name: string
          day: string
          id: string
          units_used: number
          updated_at: string
        }
        Insert: {
          api_name: string
          day: string
          id?: string
          units_used?: number
          updated_at?: string
        }
        Update: {
          api_name?: string
          day?: string
          id?: string
          units_used?: number
          updated_at?: string
        }
        Relationships: []
      }
      discovery_seeds: {
        Row: {
          attempts: number
          created_at: string
          depth: number
          exhausted: boolean
          id: string
          last_error: string | null
          last_processed_at: string | null
          metadata: Json
          method: string
          next_page_token: string | null
          seed_channel_id: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          depth?: number
          exhausted?: boolean
          id?: string
          last_error?: string | null
          last_processed_at?: string | null
          metadata?: Json
          method: string
          next_page_token?: string | null
          seed_channel_id?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          depth?: number
          exhausted?: boolean
          id?: string
          last_error?: string | null
          last_processed_at?: string | null
          metadata?: Json
          method?: string
          next_page_token?: string | null
          seed_channel_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      discovery_topic_queries: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          language: string
          last_run_at: string | null
          priority: number
          query: string
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          language: string
          last_run_at?: string | null
          priority?: number
          query: string
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          language?: string
          last_run_at?: string | null
          priority?: number
          query?: string
          topic?: string
          updated_at?: string
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
      dua_ameens: {
        Row: {
          created_at: string
          dua_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dua_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          dua_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dua_ameens_dua_id_fkey"
            columns: ["dua_id"]
            isOneToOne: false
            referencedRelation: "dua_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      dua_anon_ameens: {
        Row: {
          created_at: string
          dua_id: string
          fp: string
          id: string
        }
        Insert: {
          created_at?: string
          dua_id: string
          fp: string
          id?: string
        }
        Update: {
          created_at?: string
          dua_id?: string
          fp?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dua_anon_ameens_dua_id_fkey"
            columns: ["dua_id"]
            isOneToOne: false
            referencedRelation: "dua_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      dua_requests: {
        Row: {
          ameen_count: number
          body: string
          created_at: string
          id: string
          is_anonymous: boolean
          user_id: string
        }
        Insert: {
          ameen_count?: number
          body: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          user_id: string
        }
        Update: {
          ameen_count?: number
          body?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          user_id?: string
        }
        Relationships: []
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
      event_schemas: {
        Row: {
          created_at: string
          description: string | null
          event_name: string
          is_active: boolean
          property_types: Json
          required_properties: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_name: string
          is_active?: boolean
          property_types?: Json
          required_properties?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_name?: string
          is_active?: boolean
          property_types?: Json
          required_properties?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      experiment_exposures: {
        Row: {
          anon_key: string | null
          context: Json
          created_at: string
          experiment_id: string
          id: number
          user_id: string | null
          variant_key: string
        }
        Insert: {
          anon_key?: string | null
          context?: Json
          created_at?: string
          experiment_id: string
          id?: number
          user_id?: string | null
          variant_key: string
        }
        Update: {
          anon_key?: string | null
          context?: Json
          created_at?: string
          experiment_id?: string
          id?: number
          user_id?: string | null
          variant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_exposures_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "admin_experiment_results"
            referencedColumns: ["experiment_id"]
          },
          {
            foreignKeyName: "experiment_exposures_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_guardrails: {
        Row: {
          created_at: string
          direction: string
          experiment_id: string
          id: string
          metric: string
          threshold: number
          triggered: boolean
          triggered_at: string | null
        }
        Insert: {
          created_at?: string
          direction: string
          experiment_id: string
          id?: string
          metric: string
          threshold: number
          triggered?: boolean
          triggered_at?: string | null
        }
        Update: {
          created_at?: string
          direction?: string
          experiment_id?: string
          id?: string
          metric?: string
          threshold?: number
          triggered?: boolean
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "experiment_guardrails_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "admin_experiment_results"
            referencedColumns: ["experiment_id"]
          },
          {
            foreignKeyName: "experiment_guardrails_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_variants: {
        Row: {
          created_at: string
          experiment_id: string
          id: string
          is_control: boolean
          key: string
          payload: Json
          weight: number
        }
        Insert: {
          created_at?: string
          experiment_id: string
          id?: string
          is_control?: boolean
          key: string
          payload?: Json
          weight?: number
        }
        Update: {
          created_at?: string
          experiment_id?: string
          id?: string
          is_control?: boolean
          key?: string
          payload?: Json
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "experiment_variants_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "admin_experiment_results"
            referencedColumns: ["experiment_id"]
          },
          {
            foreignKeyName: "experiment_variants_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          audience_rules: Json
          created_at: string
          created_by: string | null
          description: string | null
          ended_at: string | null
          id: string
          key: string
          name: string
          primary_metric: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["experiment_status"]
          traffic_allocation: number
          updated_at: string
        }
        Insert: {
          audience_rules?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          key: string
          name: string
          primary_metric?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["experiment_status"]
          traffic_allocation?: number
          updated_at?: string
        }
        Update: {
          audience_rules?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          key?: string
          name?: string
          primary_metric?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["experiment_status"]
          traffic_allocation?: number
          updated_at?: string
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
      feature_flags: {
        Row: {
          cohort_id: string | null
          created_at: string
          description: string | null
          enabled: boolean
          key: string
          kill_switch: boolean
          rollout_percent: number
          targeting_rules: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cohort_id?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          key: string
          kill_switch?: boolean
          rollout_percent?: number
          targeting_rules?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cohort_id?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          key?: string
          kill_switch?: boolean
          rollout_percent?: number
          targeting_rules?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_impressions: {
        Row: {
          first_seen_at: string
          last_action: string | null
          last_action_at: string | null
          last_seen_at: string
          seen_count: number
          user_id: string
          video_id: string
        }
        Insert: {
          first_seen_at?: string
          last_action?: string | null
          last_action_at?: string | null
          last_seen_at?: string
          seen_count?: number
          user_id: string
          video_id: string
        }
        Update: {
          first_seen_at?: string
          last_action?: string | null
          last_action_at?: string | null
          last_seen_at?: string
          seen_count?: number
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      gift_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          issued_by: string | null
          months: number
          note: string | null
          redeemed_at: string | null
          redeemed_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_by?: string | null
          months?: number
          note?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          issued_by?: string | null
          months?: number
          note?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Relationships: []
      }
      gifts: {
        Row: {
          created_at: string
          id: string
          kind: string
          months: number | null
          note: string | null
          recipient_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          months?: number | null
          note?: string | null
          recipient_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          months?: number | null
          note?: string | null
          recipient_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      gsc_sync_snapshots: {
        Row: {
          created_at: string
          data: Json
          error: string | null
          id: string
          kind: string
          ok: boolean
          site_url: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          error?: string | null
          id?: string
          kind: string
          ok?: boolean
          site_url?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          error?: string | null
          id?: string
          kind?: string
          ok?: boolean
          site_url?: string | null
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
      khatm_events: {
        Row: {
          created_at: string
          data: Json
          group_id: string
          id: string
          kind: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          group_id: string
          id?: string
          kind: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          group_id?: string
          id?: string
          kind?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "khatm_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "khatm_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      khatm_group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khatm_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "khatm_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      khatm_groups: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          intention: string | null
          invite_code: string
          is_public: boolean
          name: string
          owner_id: string
          target_completion_at: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          intention?: string | null
          invite_code?: string
          is_public?: boolean
          name: string
          owner_id: string
          target_completion_at?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          intention?: string | null
          invite_code?: string
          is_public?: boolean
          name?: string
          owner_id?: string
          target_completion_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      khatm_juz_claims: {
        Row: {
          claimed_at: string
          completed_at: string | null
          group_id: string
          id: string
          juz_number: number
          user_id: string
        }
        Insert: {
          claimed_at?: string
          completed_at?: string | null
          group_id: string
          id?: string
          juz_number: number
          user_id: string
        }
        Update: {
          claimed_at?: string
          completed_at?: string | null
          group_id?: string
          id?: string
          juz_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "khatm_juz_claims_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "khatm_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_snapshots: {
        Row: {
          computed_at: string
          display_name: string | null
          group_id: string | null
          id: string
          metric: string
          period: string
          rank: number
          scope: string
          score: number
          user_id: string
        }
        Insert: {
          computed_at?: string
          display_name?: string | null
          group_id?: string | null
          id?: string
          metric: string
          period: string
          rank: number
          scope: string
          score?: number
          user_id: string
        }
        Update: {
          computed_at?: string
          display_name?: string | null
          group_id?: string | null
          id?: string
          metric?: string
          period?: string
          rank?: number
          scope?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "khatm_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_clusters: {
        Row: {
          candidate_count: number
          cluster_key: string
          created_at: string
          dominant_tier: string | null
          id: string
          label: string
          language: string | null
          organization_type: string | null
          primary_topic: string | null
          updated_at: string
        }
        Insert: {
          candidate_count?: number
          cluster_key: string
          created_at?: string
          dominant_tier?: string | null
          id?: string
          label: string
          language?: string | null
          organization_type?: string | null
          primary_topic?: string | null
          updated_at?: string
        }
        Update: {
          candidate_count?: number
          cluster_key?: string
          created_at?: string
          dominant_tier?: string | null
          id?: string
          label?: string
          language?: string | null
          organization_type?: string | null
          primary_topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      moderation_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      moderation_decisions: {
        Row: {
          actor_id: string | null
          actor_kind: string
          confidence: number | null
          created_at: string
          id: string
          previous_state: Database["public"]["Enums"]["moderation_state"] | null
          provider: string | null
          reasoning: string | null
          risk: number | null
          rule_hits: Json
          signals: Json
          stage: Database["public"]["Enums"]["moderation_stage"]
          state: Database["public"]["Enums"]["moderation_state"]
          video_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_kind?: string
          confidence?: number | null
          created_at?: string
          id?: string
          previous_state?:
            | Database["public"]["Enums"]["moderation_state"]
            | null
          provider?: string | null
          reasoning?: string | null
          risk?: number | null
          rule_hits?: Json
          signals?: Json
          stage: Database["public"]["Enums"]["moderation_stage"]
          state: Database["public"]["Enums"]["moderation_state"]
          video_id: string
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          confidence?: number | null
          created_at?: string
          id?: string
          previous_state?:
            | Database["public"]["Enums"]["moderation_state"]
            | null
          provider?: string | null
          reasoning?: string | null
          risk?: number | null
          rule_hits?: Json
          signals?: Json
          stage?: Database["public"]["Enums"]["moderation_stage"]
          state?: Database["public"]["Enums"]["moderation_state"]
          video_id?: string
        }
        Relationships: []
      }
      moderation_learned_signals: {
        Row: {
          approvals: number
          feature_type: string
          feature_value: string
          id: string
          rejections: number
          reverts: number
          updated_at: string
          version: number
          weight: number
        }
        Insert: {
          approvals?: number
          feature_type: string
          feature_value: string
          id?: string
          rejections?: number
          reverts?: number
          updated_at?: string
          version?: number
          weight?: number
        }
        Update: {
          approvals?: number
          feature_type?: string
          feature_value?: string
          id?: string
          rejections?: number
          reverts?: number
          updated_at?: string
          version?: number
          weight?: number
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
      moderation_rules: {
        Row: {
          applies_to: string
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          kind: string
          name: string
          pattern: string
          reason: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          applies_to?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          kind: string
          name: string
          pattern: string
          reason?: string | null
          severity?: string
          updated_at?: string
        }
        Update: {
          applies_to?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          kind?: string
          name?: string
          pattern?: string
          reason?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      moderation_thresholds: {
        Row: {
          ai_review_min_confidence: number
          auto_approve_max_risk: number
          auto_approve_min_confidence: number
          created_at: string
          fallback_ai_provider: string
          human_review_min_confidence: number
          id: string
          preferred_ai_provider: string
          reject_below_confidence: number
          singleton: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_review_min_confidence?: number
          auto_approve_max_risk?: number
          auto_approve_min_confidence?: number
          created_at?: string
          fallback_ai_provider?: string
          human_review_min_confidence?: number
          id?: string
          preferred_ai_provider?: string
          reject_below_confidence?: number
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_review_min_confidence?: number
          auto_approve_max_risk?: number
          auto_approve_min_confidence?: number
          created_at?: string
          fallback_ai_provider?: string
          human_review_min_confidence?: number
          id?: string
          preferred_ai_provider?: string
          reject_below_confidence?: number
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          kind: string
          push_enabled: boolean
          quiet_hours_end: number | null
          quiet_hours_start: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          kind: string
          push_enabled?: boolean
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          kind?: string
          push_enabled?: boolean
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nudges: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      ops_metrics: {
        Row: {
          id: number
          metric: string
          tags: Json
          ts: string
          value: number
        }
        Insert: {
          id?: number
          metric: string
          tags?: Json
          ts?: string
          value: number
        }
        Update: {
          id?: number
          metric?: string
          tags?: Json
          ts?: string
          value?: number
        }
        Relationships: []
      }
      platform_owners: {
        Row: {
          created_at: string
          email: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          added_at: string
          id: string
          playlist_id: string
          position: number
          video_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          playlist_id: string
          position?: number
          video_id: string
        }
        Update: {
          added_at?: string
          id?: string
          playlist_id?: string
          position?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          cover_video_id: string | null
          created_at: string
          description: string | null
          id: string
          items_count: number
          owner_id: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          cover_video_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          items_count?: number
          owner_id: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          cover_video_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          items_count?: number
          owner_id?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      plus_household_members: {
        Row: {
          household_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          household_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          household_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plus_household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "plus_households"
            referencedColumns: ["id"]
          },
        ]
      }
      plus_households: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          plan: string
          seat_limit: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          plan?: string
          seat_limit?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: string
          seat_limit?: number
          updated_at?: string
        }
        Relationships: []
      }
      plus_seat_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          expires_at: string
          household_id: string
          id: string
          invited_email: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          expires_at?: string
          household_id: string
          id?: string
          invited_email: string
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_email?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plus_seat_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "plus_households"
            referencedColumns: ["id"]
          },
        ]
      }
      plus_waitlist: {
        Row: {
          country_code: string | null
          created_at: string
          email: string
          id: string
          interested_features: Json
          preferred_tier: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          email: string
          id?: string
          interested_features?: Json
          preferred_tier?: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          email?: string
          id?: string
          interested_features?: Json
          preferred_tier?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      privileged_actions_log: {
        Row: {
          action: string
          actor_role: string
          created_at: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_state: Json | null
          previous_state: Json | null
          session_id: string | null
          success: boolean
          target_id: string | null
          target_type: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_role: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_state?: Json | null
          previous_state?: Json | null
          session_id?: string | null
          success?: boolean
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_role?: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_state?: Json | null
          previous_state?: Json | null
          session_id?: string | null
          success?: boolean
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      production_alerts: {
        Row: {
          context: Json
          created_at: string
          id: string
          kind: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          route: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          kind: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          route?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          kind?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          route?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country_code: string | null
          created_at: string
          daily_reminder_hour: number | null
          display_name: string | null
          handle: string | null
          id: string
          onboarding_completed_at: string | null
          preferences: Json | null
          preferred_locale: string | null
          preferred_reciter: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          daily_reminder_hour?: number | null
          display_name?: string | null
          handle?: string | null
          id?: string
          onboarding_completed_at?: string | null
          preferences?: Json | null
          preferred_locale?: string | null
          preferred_reciter?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country_code?: string | null
          created_at?: string
          daily_reminder_hour?: number | null
          display_name?: string | null
          handle?: string | null
          id?: string
          onboarding_completed_at?: string | null
          preferences?: Json | null
          preferred_locale?: string | null
          preferred_reciter?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_counters: {
        Row: {
          action: string
          bucket_at: string
          count: number
          identity: string
          updated_at: string
        }
        Insert: {
          action: string
          bucket_at: string
          count?: number
          identity: string
          updated_at?: string
        }
        Update: {
          action?: string
          bucket_at?: string
          count?: number
          identity?: string
          updated_at?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          created_at: string
          id: string
          percent: number | null
          position: Json
          resource_id: string
          resource_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          percent?: number | null
          position?: Json
          resource_id: string
          resource_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          percent?: number | null
          position?: Json
          resource_id?: string
          resource_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reciter_aliases: {
        Row: {
          alias: string
          alias_norm: string | null
          alias_type: string
          created_at: string
          id: string
          reciter_id: string
        }
        Insert: {
          alias: string
          alias_norm?: string | null
          alias_type?: string
          created_at?: string
          id?: string
          reciter_id: string
        }
        Update: {
          alias?: string
          alias_norm?: string | null
          alias_type?: string
          created_at?: string
          id?: string
          reciter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reciter_aliases_reciter_id_fkey"
            columns: ["reciter_id"]
            isOneToOne: false
            referencedRelation: "reciters"
            referencedColumns: ["id"]
          },
        ]
      }
      reciter_audio_sources: {
        Row: {
          attribution: string | null
          base_url: string
          bitrate_kbps: number | null
          created_at: string
          id: string
          is_active: boolean
          is_premium: boolean
          license: string | null
          metadata: Json
          quality: string | null
          quality_tier: string
          reciter_id: string
          riwayah: string | null
          source_name: string
          updated_at: string
        }
        Insert: {
          attribution?: string | null
          base_url: string
          bitrate_kbps?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_premium?: boolean
          license?: string | null
          metadata?: Json
          quality?: string | null
          quality_tier?: string
          reciter_id: string
          riwayah?: string | null
          source_name: string
          updated_at?: string
        }
        Update: {
          attribution?: string | null
          base_url?: string
          bitrate_kbps?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_premium?: boolean
          license?: string | null
          metadata?: Json
          quality?: string | null
          quality_tier?: string
          reciter_id?: string
          riwayah?: string | null
          source_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reciter_audio_sources_reciter_id_fkey"
            columns: ["reciter_id"]
            isOneToOne: false
            referencedRelation: "reciters"
            referencedColumns: ["id"]
          },
        ]
      }
      reciters: {
        Row: {
          active_years: string | null
          biography: string | null
          canonical_name_ar: string | null
          canonical_name_en: string
          category: string
          country: string | null
          created_at: string
          download_allowed: boolean
          era: string | null
          gender: string
          id: string
          image_url: string | null
          is_living: boolean | null
          is_premium: boolean
          is_verified: boolean
          min_plan: string
          notes: string | null
          popularity_score: number
          primary_riwayah: string | null
          sample_seconds: number
          search_tsv: unknown
          social_links: Json
          updated_at: string
          voice_style: string | null
        }
        Insert: {
          active_years?: string | null
          biography?: string | null
          canonical_name_ar?: string | null
          canonical_name_en: string
          category?: string
          country?: string | null
          created_at?: string
          download_allowed?: boolean
          era?: string | null
          gender?: string
          id?: string
          image_url?: string | null
          is_living?: boolean | null
          is_premium?: boolean
          is_verified?: boolean
          min_plan?: string
          notes?: string | null
          popularity_score?: number
          primary_riwayah?: string | null
          sample_seconds?: number
          search_tsv?: unknown
          social_links?: Json
          updated_at?: string
          voice_style?: string | null
        }
        Update: {
          active_years?: string | null
          biography?: string | null
          canonical_name_ar?: string | null
          canonical_name_en?: string
          category?: string
          country?: string | null
          created_at?: string
          download_allowed?: boolean
          era?: string | null
          gender?: string
          id?: string
          image_url?: string | null
          is_living?: boolean | null
          is_premium?: boolean
          is_verified?: boolean
          min_plan?: string
          notes?: string | null
          popularity_score?: number
          primary_riwayah?: string | null
          sample_seconds?: number
          search_tsv?: unknown
          social_links?: Json
          updated_at?: string
          voice_style?: string | null
        }
        Relationships: []
      }
      recommendation_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          provider: string | null
          reasons: Json | null
          score: number | null
          session_id: string | null
          signals: Json | null
          surface: string | null
          user_id: string | null
          video_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          provider?: string | null
          reasons?: Json | null
          score?: number | null
          session_id?: string | null
          signals?: Json | null
          surface?: string | null
          user_id?: string | null
          video_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          provider?: string | null
          reasons?: Json | null
          score?: number | null
          session_id?: string | null
          signals?: Json | null
          surface?: string | null
          user_id?: string | null
          video_id?: string
        }
        Relationships: []
      }
      referral_clicks: {
        Row: {
          code: string
          created_at: string
          fingerprint: string | null
          id: string
          ip_hash: string | null
          referrer: string | null
          ua_hash: string | null
        }
        Insert: {
          code: string
          created_at?: string
          fingerprint?: string | null
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          ua_hash?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          fingerprint?: string | null
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          ua_hash?: string | null
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          granted_at: string
          id: string
          referral_id: string
          reward_type: string
          reward_value: Json
          role: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          referral_id: string
          reward_type: string
          reward_value?: Json
          role: string
          user_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          referral_id?: string
          reward_type?: string
          reward_value?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_tiers: {
        Row: {
          created_at: string
          id: string
          label: string
          reward_type: string
          reward_value: Json
          slug: string
          sort_order: number
          threshold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          reward_type: string
          reward_value?: Json
          slug: string
          sort_order?: number
          threshold: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          reward_type?: string
          reward_value?: Json
          slug?: string
          sort_order?: number
          threshold?: number
          updated_at?: string
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
      regional_language_mix: {
        Row: {
          country_code: string
          country_name: string
          created_at: string
          default_ui_language: string
          id: string
          is_active: boolean
          language_mix: Json
          updated_at: string
        }
        Insert: {
          country_code: string
          country_name: string
          created_at?: string
          default_ui_language?: string
          id?: string
          is_active?: boolean
          language_mix: Json
          updated_at?: string
        }
        Update: {
          country_code?: string
          country_name?: string
          created_at?: string
          default_ui_language?: string
          id?: string
          is_active?: boolean
          language_mix?: Json
          updated_at?: string
        }
        Relationships: []
      }
      removed_videos: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          removed_by: string | null
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          removed_by?: string | null
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          removed_by?: string | null
          video_id?: string
        }
        Relationships: []
      }
      report_moderation_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          moderator_id: string
          notes: string | null
          report_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          moderator_id: string
          notes?: string | null
          report_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          moderator_id?: string
          notes?: string | null
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "video_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_policies: {
        Row: {
          retention_days: number
          table_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          retention_days: number
          table_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          retention_days?: number
          table_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      retention_purge_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          purged: Json
          started_at: string
          status: string
          total_rows: number
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          purged?: Json
          started_at?: string
          status: string
          total_rows?: number
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          purged?: Json
          started_at?: string
          status?: string
          total_rows?: number
          triggered_by?: string | null
        }
        Relationships: []
      }
      salah_log: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          on_time: boolean | null
          prayed_at: string | null
          prayer: string
          prayer_date: string
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          on_time?: boolean | null
          prayed_at?: string | null
          prayer: string
          prayer_date: string
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          on_time?: boolean | null
          prayed_at?: string | null
          prayer?: string
          prayer_date?: string
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_queries: {
        Row: {
          clicked_video_id: string | null
          created_at: string
          id: string
          intent: Json | null
          normalized_query: string
          query: string
          result_count: number
          user_id: string | null
        }
        Insert: {
          clicked_video_id?: string | null
          created_at?: string
          id?: string
          intent?: Json | null
          normalized_query: string
          query: string
          result_count?: number
          user_id?: string | null
        }
        Update: {
          clicked_video_id?: string | null
          created_at?: string
          id?: string
          intent?: Json | null
          normalized_query?: string
          query?: string
          result_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      search_synonyms: {
        Row: {
          alternates: string[]
          created_at: string
          created_by: string | null
          id: string
          term: string
          updated_at: string
        }
        Insert: {
          alternates?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          term: string
          updated_at?: string
        }
        Update: {
          alternates?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          term?: string
          updated_at?: string
        }
        Relationships: []
      }
      share_events: {
        Row: {
          channel: string
          created_at: string
          id: string
          kind: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          kind: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          kind?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      streak_freezes: {
        Row: {
          granted_at: string
          id: string
          reason: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          reason?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          reason?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      streak_milestones: {
        Row: {
          id: string
          milestone: number
          reached_at: string
          shared: boolean
          user_id: string
        }
        Insert: {
          id?: string
          milestone: number
          reached_at?: string
          shared?: boolean
          user_id: string
        }
        Update: {
          id?: string
          milestone?: number
          reached_at?: string
          shared?: boolean
          user_id?: string
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
      team_streak_members: {
        Row: {
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_streak_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_streaks"
            referencedColumns: ["id"]
          },
        ]
      }
      team_streaks: {
        Row: {
          created_at: string
          created_by: string
          current_streak: number
          id: string
          invite_code: string
          last_all_completed_date: string | null
          longest_streak: number
          member_limit: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_streak?: number
          id?: string
          invite_code?: string
          last_all_completed_date?: string | null
          longest_streak?: number
          member_limit?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_streak?: number
          id?: string
          invite_code?: string
          last_all_completed_date?: string | null
          longest_streak?: number
          member_limit?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      trusted_institutions: {
        Row: {
          country: string | null
          created_at: string
          created_by: string | null
          id: string
          language: string | null
          match_pattern: string
          min_subs: number | null
          name: string
          notes: string | null
          organization_type: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string | null
          match_pattern: string
          min_subs?: number | null
          name: string
          notes?: string | null
          organization_type: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string | null
          match_pattern?: string
          min_subs?: number | null
          name?: string
          notes?: string | null
          organization_type?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_key: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_key: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_key_fkey"
            columns: ["badge_key"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["key"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_user_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_user_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_cohort_members: {
        Row: {
          added_at: string
          cohort_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          cohort_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          cohort_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cohort_members_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "user_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cohorts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          rules: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          rules?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          rules?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_hidden_videos: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
          video_id?: string
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
      user_locale_preferences: {
        Row: {
          auto_personalize: boolean
          content_languages: string[]
          country_code: string | null
          created_at: string
          detected_country: string | null
          detected_language: string | null
          diversity_level: number
          id: string
          region: string | null
          rtl_override: boolean | null
          ui_language: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_personalize?: boolean
          content_languages?: string[]
          country_code?: string | null
          created_at?: string
          detected_country?: string | null
          detected_language?: string | null
          diversity_level?: number
          id?: string
          region?: string | null
          rtl_override?: boolean | null
          ui_language?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_personalize?: boolean
          content_languages?: string[]
          country_code?: string | null
          created_at?: string
          detected_country?: string | null
          detected_language?: string | null
          diversity_level?: number
          id?: string
          region?: string | null
          rtl_override?: boolean | null
          ui_language?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          kind: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences_v2: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
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
      user_taste_profiles: {
        Row: {
          avg_completion: number
          avg_session_len: number
          creator_affinity: Json
          hour_histogram: Json
          interest_drift: number
          language_affinity: Json
          last_signal_at: string | null
          signal_count: number
          topic_affinity: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_completion?: number
          avg_session_len?: number
          creator_affinity?: Json
          hour_histogram?: Json
          interest_drift?: number
          language_affinity?: Json
          last_signal_at?: string | null
          signal_count?: number
          topic_affinity?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_completion?: number
          avg_session_len?: number
          creator_affinity?: Json
          hour_histogram?: Json
          interest_drift?: number
          language_affinity?: Json
          last_signal_at?: string | null
          signal_count?: number
          topic_affinity?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      variant_assignments: {
        Row: {
          anon_key: string | null
          assigned_at: string
          experiment_id: string
          id: string
          user_id: string | null
          variant_key: string
        }
        Insert: {
          anon_key?: string | null
          assigned_at?: string
          experiment_id: string
          id?: string
          user_id?: string | null
          variant_key: string
        }
        Update: {
          anon_key?: string | null
          assigned_at?: string
          experiment_id?: string
          id?: string
          user_id?: string | null
          variant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_assignments_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "admin_experiment_results"
            referencedColumns: ["experiment_id"]
          },
          {
            foreignKeyName: "variant_assignments_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_scholars: {
        Row: {
          affiliation: string | null
          aliases: string[] | null
          country: string | null
          created_at: string
          created_by: string | null
          display_name: string
          handles: string[] | null
          id: string
          language: string | null
          notes: string | null
          updated_at: string
          weight: number | null
          youtube_channel_ids: string[] | null
        }
        Insert: {
          affiliation?: string | null
          aliases?: string[] | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          display_name: string
          handles?: string[] | null
          id?: string
          language?: string | null
          notes?: string | null
          updated_at?: string
          weight?: number | null
          youtube_channel_ids?: string[] | null
        }
        Update: {
          affiliation?: string | null
          aliases?: string[] | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          handles?: string[] | null
          id?: string
          language?: string | null
          notes?: string | null
          updated_at?: string
          weight?: number | null
          youtube_channel_ids?: string[] | null
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
      video_comments: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          likes_count: number
          parent_id: string | null
          replies_count: number
          status: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          likes_count?: number
          parent_id?: string | null
          replies_count?: number
          status?: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          likes_count?: number
          parent_id?: string | null
          replies_count?: number
          status?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "video_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      video_reports: {
        Row: {
          channel_id: string | null
          channel_title: string | null
          created_at: string
          details: string | null
          id: string
          moderator_id: string | null
          moderator_notes: string | null
          notify_reporter: boolean
          platform: string | null
          reason: string
          reporter_notified_at: string | null
          resolution: string | null
          resolved_at: string | null
          severity: string
          status: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
          video_id: string | null
          video_title: string | null
        }
        Insert: {
          channel_id?: string | null
          channel_title?: string | null
          created_at?: string
          details?: string | null
          id?: string
          moderator_id?: string | null
          moderator_notes?: string | null
          notify_reporter?: boolean
          platform?: string | null
          reason: string
          reporter_notified_at?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
          video_title?: string | null
        }
        Update: {
          channel_id?: string | null
          channel_title?: string | null
          created_at?: string
          details?: string | null
          id?: string
          moderator_id?: string | null
          moderator_notes?: string | null
          notify_reporter?: boolean
          platform?: string | null
          reason?: string
          reporter_notified_at?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          video_id?: string | null
          video_title?: string | null
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
      web_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weekly_recaps: {
        Row: {
          created_at: string
          dhikr_count: number
          favorites_added: number
          highlights: Json
          id: string
          juz_completed: number
          minutes_watched: number
          streak_length: number
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          dhikr_count?: number
          favorites_added?: number
          highlights?: Json
          id?: string
          juz_completed?: number
          minutes_watched?: number
          streak_length?: number
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          dhikr_count?: number
          favorites_added?: number
          highlights?: Json
          id?: string
          juz_completed?: number
          minutes_watched?: number
          streak_length?: number
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_experiment_results: {
        Row: {
          experiment_id: string | null
          experiment_key: string | null
          exposures: number | null
          status: Database["public"]["Enums"]["experiment_status"] | null
          unique_users: number | null
          variant_key: string | null
        }
        Relationships: []
      }
      leaderboard_public: {
        Row: {
          computed_at: string | null
          display_name: string | null
          group_id: string | null
          id: string | null
          metric: string | null
          period: string | null
          rank: number | null
          scope: string | null
          score: number | null
        }
        Insert: {
          computed_at?: string | null
          display_name?: string | null
          group_id?: string | null
          id?: string | null
          metric?: string | null
          period?: string | null
          rank?: number | null
          scope?: string | null
          score?: number | null
        }
        Update: {
          computed_at?: string | null
          display_name?: string | null
          group_id?: string | null
          id?: string | null
          metric?: string | null
          period?: string | null
          rank?: number | null
          scope?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "khatm_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      transparency_appeals: {
        Row: {
          appeals: number | null
          period: string | null
          status: string | null
        }
        Relationships: []
      }
      transparency_report: {
        Row: {
          decisions: number | null
          period: string | null
          stage: string | null
          state: string | null
        }
        Relationships: []
      }
      v_ingestion_health: {
        Row: {
          approved_active: number | null
          approved_with_videos: number | null
          approved_without_videos: number | null
          dead_letter_count: number | null
          failing_count: number | null
          state_rows_linked: number | null
          successful_last_24h: number | null
          videos_ingested_last_24h: number | null
          videos_ingested_last_7d: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _analytics_assert_admin: { Args: never; Returns: undefined }
      _inappropriate_pattern: { Args: never; Returns: string }
      _run_channel_id_backfill: { Args: { _batch?: number }; Returns: number }
      _suggestion_is_blocked: { Args: { _text: string }; Returns: boolean }
      _user_scoped_columns: {
        Args: never
        Returns: {
          column_name: string
          mode: string
          table_name: string
        }[]
      }
      add_anon_ameen: {
        Args: { _dua_id: string; _fp: string }
        Returns: number
      }
      add_reciter_alias: {
        Args: { _alias: string; _alias_type?: string; _reciter_id: string }
        Returns: boolean
      }
      admin_content_freshness: { Args: never; Returns: Json }
      admin_moderation_sla: { Args: never; Returns: Json }
      admin_retention_cohorts: {
        Args: never
        Returns: {
          cohort_size: number
          cohort_week: string
          d1: number
          d30: number
          d7: number
        }[]
      }
      analytics_active_users: {
        Args: { _from: string; _to: string }
        Returns: {
          dau: number
          day: string
          mau: number
          wau: number
        }[]
      }
      analytics_ai_confidence_histogram: {
        Args: { _from: string; _to: string }
        Returns: {
          bucket: number
          count: number
        }[]
      }
      analytics_category_popularity: {
        Args: { _from: string; _to: string }
        Returns: {
          category: string
          searches: number
          watches: number
        }[]
      }
      analytics_channel_growth: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      analytics_device_stats: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      analytics_dose_stats: {
        Args: { _from: string; _to: string }
        Returns: {
          completion_rate: number
          completions: number
          day: string
          dose_users: number
        }[]
      }
      analytics_engagement: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      analytics_favorites_stats: {
        Args: { _from: string; _to: string }
        Returns: {
          cumulative: number
          day: string
          new_favorites: number
        }[]
      }
      analytics_geo_distribution: {
        Args: { _from: string; _to: string }
        Returns: {
          country: string
          sessions: number
          users: number
        }[]
      }
      analytics_moderation_stats: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      analytics_performance: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      analytics_recommendation_stats: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      analytics_retention: {
        Args: { _cohort_from: string; _weeks?: number }
        Returns: {
          cohort_size: number
          cohort_week: string
          retained: number
          retention_pct: number
          week_offset: number
        }[]
      }
      analytics_search_stats: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      analytics_session_stats: {
        Args: { _from: string; _to: string }
        Returns: {
          avg_seconds: number
          day: string
          median_seconds: number
          sessions: number
        }[]
      }
      analytics_watch_stats: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      assign_experiment_variant: {
        Args: { _anon_key: string; _experiment_key: string }
        Returns: string
      }
      backfill_reciter_alias_variants: { Args: never; Returns: number }
      check_channel_duplicate: {
        Args: { _handle: string; _title: string; _yt_id: string }
        Returns: {
          match_type: string
          matched_channel_id: string
          matched_title: string
          score: number
        }[]
      }
      check_channel_duplicates_batch: {
        Args: { _ids: string[] }
        Returns: {
          exists_in: string
          youtube_channel_id: string
        }[]
      }
      check_ops_alerts: { Args: never; Returns: undefined }
      claim_juz: { Args: { _group_id: string; _juz: number }; Returns: Json }
      complete_juz: { Args: { _group_id: string; _juz: number }; Returns: Json }
      compute_candidate_tier: {
        Args: {
          _confidence: number
          _duplicate_risk: string
          _exclusion_hits: number
          _has_female_presenter_signal: boolean
          _has_music_signal: boolean
          _institution_match: boolean
          _subs: number
        }
        Returns: string
      }
      compute_owner_key: { Args: { _name: string }; Returns: string }
      compute_weekly_recap: {
        Args: { _user_id: string; _week_start: string }
        Returns: {
          created_at: string
          dhikr_count: number
          favorites_added: number
          highlights: Json
          id: string
          juz_completed: number
          minutes_watched: number
          streak_length: number
          user_id: string
          week_start: string
        }
        SetofOptions: {
          from: "*"
          to: "weekly_recaps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      contribute_to_dhikr_circle: {
        Args: { _circle_id: string; _count: number }
        Returns: {
          current_count: number
          is_active: boolean
          my_contribution: number
          target_count: number
        }[]
      }
      create_team_streak: {
        Args: { _name: string }
        Returns: {
          created_at: string
          created_by: string
          current_streak: number
          id: string
          invite_code: string
          last_all_completed_date: string | null
          longest_streak: number
          member_limit: number
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "team_streaks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      end_dhikr_circle: { Args: { _circle_id: string }; Returns: undefined }
      enforce_retention_policies: { Args: never; Returns: Json }
      evaluate_feature_flag: {
        Args: { _key: string; _user_id: string }
        Returns: boolean
      }
      export_user_data: { Args: { _uid: string }; Returns: Json }
      f_unaccent: { Args: { "": string }; Returns: string }
      generate_alias_variants: { Args: { _name: string }; Returns: string[] }
      get_channel_trust_history: {
        Args: { _channel_id: string; _limit?: number }
        Returns: {
          actor_id: string
          created_at: string
          delta: number
          metadata: Json
          reason: string
          score_after: number
          score_before: number
          source: Database["public"]["Enums"]["trust_event_source"]
        }[]
      }
      get_feed_candidates_diversified: {
        Args: {
          _category?: string
          _cursor?: string
          _exclude_premium?: boolean
          _limit?: number
          _order?: string
          _per_channel?: number
          _section_aliases?: string[]
          _section_id?: string
        }
        Returns: {
          category: string
          channel_id: string
          channel_title: string
          content_language: string
          halal_score: number
          ingested_at: string
          is_premium_only: boolean
          is_trusted_channel: boolean
          published_at: string
          section_id: string
          thumbnail_url: string
          title: string
          video_id: string
          view_count: number
        }[]
      }
      get_heartify_trending_ids: {
        Args: { _limit?: number; _window_hours?: number }
        Returns: {
          score: number
          video_id: string
        }[]
      }
      get_hidden_gem_ids: {
        Args: { _limit?: number; _max_impressions?: number }
        Returns: {
          video_id: string
        }[]
      }
      get_internal_config: { Args: { _key: string }; Returns: string }
      get_moderation_config: { Args: { _key: string }; Returns: Json }
      get_ops_dashboard: { Args: never; Returns: Json }
      get_or_create_referral_code: { Args: never; Returns: string }
      get_public_dhikr_circle: {
        Args: { _circle_id: string }
        Returns: {
          created_at: string
          current_count: number
          ends_at: string
          id: string
          is_active: boolean
          member_count: number
          phrase: string
          target_count: number
          title: string
          top_contributors: Json
        }[]
      }
      get_public_dua: {
        Args: { _id: string }
        Returns: {
          ameen_count: number
          author_handle: string
          body: string
          created_at: string
          id: string
          is_anonymous: boolean
        }[]
      }
      get_public_khatm_group: {
        Args: { _code?: string; _id: string }
        Returns: Json
      }
      get_public_profile: {
        Args: { _handle: string }
        Returns: {
          avatar_url: string
          badge_count: number
          bio: string
          current_streak: number
          display_name: string
          handle: string
          joined_at: string
          longest_streak: number
          referrals_redeemed: number
        }[]
      }
      get_public_team_streak: { Args: { _id: string }; Returns: Json }
      get_public_weekly_recap: {
        Args: { _handle: string; _week_start: string }
        Returns: Json
      }
      get_recent_impression_ids: {
        Args: { _hours?: number; _limit?: number; _user_id: string }
        Returns: {
          shown_count: number
          video_id: string
        }[]
      }
      get_referral_tier_progress: { Args: never; Returns: Json }
      get_related_searches: {
        Args: { _limit?: number; _query: string }
        Returns: {
          hits: number
          query: string
        }[]
      }
      get_retention_cohorts: {
        Args: never
        Returns: {
          cohort_size: number
          cohort_week: string
          d1: number
          d30: number
          d7: number
        }[]
      }
      get_transparency_appeals: {
        Args: never
        Returns: {
          appeals: number
          period: string
          status: string
        }[]
      }
      get_transparency_report: {
        Args: never
        Returns: {
          decisions: number
          period: string
          stage: string
          state: string
        }[]
      }
      get_trending_searches: {
        Args: { _limit?: number; _window_hours?: number }
        Returns: {
          hits: number
          query: string
        }[]
      }
      get_trending_video_ids: {
        Args: { _limit?: number; _window_hours?: number }
        Returns: {
          hits: number
          video_id: string
        }[]
      }
      get_trust_stats: { Args: never; Returns: Json }
      get_user_dismissed_video_ids: {
        Args: { _limit?: number; _user_id: string }
        Returns: {
          video_id: string
        }[]
      }
      gift_premium_month: {
        Args: { _months?: number; _note?: string; _recipient: string }
        Returns: Json
      }
      gift_streak_freeze: {
        Args: { _note?: string; _recipient: string }
        Returns: Json
      }
      grant_entitlement: {
        Args: {
          _expires_at?: string
          _features?: Json
          _plan?: string
          _reason?: string
          _user_id: string
        }
        Returns: {
          created_at: string
          expires_at: string | null
          features: Json
          id: string
          plan: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "entitlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      grant_referral_tier_rewards: { Args: never; Returns: Json }
      has_active_entitlement: { Args: { _user_id: string }; Returns: boolean }
      has_active_premium: { Args: { _user_id: string }; Returns: boolean }
      has_min_role: {
        Args: { _min_tier: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_dhikr_circle_member: {
        Args: { _circle_id: string; _user_id: string }
        Returns: boolean
      }
      is_household_owner: {
        Args: { _household_id: string; _user_id: string }
        Returns: boolean
      }
      is_in_cohort: {
        Args: { _cohort_id: string; _user_id: string }
        Returns: boolean
      }
      is_khatm_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      is_team_streak_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      join_khatm_group: {
        Args: { _group_id: string; _invite_code?: string }
        Returns: undefined
      }
      join_team_streak: {
        Args: { _code: string }
        Returns: {
          created_at: string
          created_by: string
          current_streak: number
          id: string
          invite_code: string
          last_all_completed_date: string | null
          longest_streak: number
          member_limit: number
          name: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "team_streaks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_dua_wall: {
        Args: { _limit?: number }
        Returns: {
          ameen_count: number
          body: string
          created_at: string
          id: string
          is_anonymous: boolean
          user_id: string
        }[]
      }
      list_my_nudges_sent: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          id: string
          kind: string
          message: string
          recipient_id: string
        }[]
      }
      list_my_team_streaks: {
        Args: never
        Returns: {
          completed_today_count: number
          current_streak: number
          i_completed_today: boolean
          id: string
          invite_code: string
          is_creator: boolean
          last_all_completed_date: string
          longest_streak: number
          member_count: number
          member_limit: number
          name: string
        }[]
      }
      log_admin_review_use: {
        Args: { _id: string; _ip: string }
        Returns: undefined
      }
      log_feed_impressions: { Args: { _video_ids: string[] }; Returns: number }
      log_recommendation_event: {
        Args: {
          _event_type: string
          _provider?: string
          _reasons?: Json
          _score?: number
          _session_id?: string
          _signals?: Json
          _surface?: string
          _user_id?: string
          _video_id: string
        }
        Returns: undefined
      }
      mark_feed_action: {
        Args: { _action: string; _video_id: string }
        Returns: undefined
      }
      match_curated_videos: {
        Args: {
          category_filter?: string
          exclude_premium?: boolean
          match_count?: number
          query_embedding: string
        }
        Returns: {
          category: string
          channel_title: string
          halal_score: number
          published_at: string
          similarity: number
          thumbnail_url: string
          title: string
          video_id: string
        }[]
      }
      mint_admin_review_token: {
        Args: { _purpose?: string; _ttl_hours?: number }
        Returns: {
          expires_at: string
          id: string
          token: string
        }[]
      }
      nightly_reaudit_sweep: { Args: never; Returns: Json }
      pool_because_you_watched: {
        Args: { _exclude_premium?: boolean; _limit?: number; _user_id: string }
        Returns: Database["public"]["CompositeTypes"]["surface_video"][]
        SetofOptions: {
          from: "*"
          to: "surface_video"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      pool_continue_watching: {
        Args: { _limit?: number; _user_id: string }
        Returns: Database["public"]["CompositeTypes"]["surface_video"][]
        SetofOptions: {
          from: "*"
          to: "surface_video"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      pool_for_you_v2: {
        Args: { _exclude_premium?: boolean; _limit?: number; _user_id: string }
        Returns: Database["public"]["CompositeTypes"]["surface_video"][]
        SetofOptions: {
          from: "*"
          to: "surface_video"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      pool_hidden_gems: {
        Args: {
          _exclude_premium?: boolean
          _limit?: number
          _max_views?: number
          _min_halal?: number
        }
        Returns: Database["public"]["CompositeTypes"]["surface_video"][]
        SetofOptions: {
          from: "*"
          to: "surface_video"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      pool_new_channels: {
        Args: {
          _exclude_premium?: boolean
          _limit?: number
          _window_days?: number
        }
        Returns: Database["public"]["CompositeTypes"]["surface_video"][]
        SetofOptions: {
          from: "*"
          to: "surface_video"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      pool_new_videos: {
        Args: {
          _exclude_premium?: boolean
          _limit?: number
          _window_days?: number
        }
        Returns: Database["public"]["CompositeTypes"]["surface_video"][]
        SetofOptions: {
          from: "*"
          to: "surface_video"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      pool_popular_week: {
        Args: { _exclude_premium?: boolean; _limit?: number }
        Returns: Database["public"]["CompositeTypes"]["surface_video"][]
        SetofOptions: {
          from: "*"
          to: "surface_video"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      pool_recently_added: {
        Args: {
          _exclude_premium?: boolean
          _limit?: number
          _window_hours?: number
        }
        Returns: Database["public"]["CompositeTypes"]["surface_video"][]
        SetofOptions: {
          from: "*"
          to: "surface_video"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      pool_trending_7d: {
        Args: { _exclude_premium?: boolean; _limit?: number }
        Returns: Database["public"]["CompositeTypes"]["surface_video"][]
        SetofOptions: {
          from: "*"
          to: "surface_video"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      purge_feed_impressions: { Args: never; Returns: number }
      rate_limit_cleanup: {
        Args: { _older_than_minutes?: number }
        Returns: number
      }
      rate_limit_increment: {
        Args: { _action: string; _bucket: string; _identity: string }
        Returns: number
      }
      reap_stuck_discovery_jobs: { Args: never; Returns: number }
      rec_feed_health: {
        Args: { _hours?: number }
        Returns: {
          channel_entropy_bits: number
          distinct_categories: number
          distinct_channels: number
          distinct_videos: number
          duplicate_rate_pct: number
          pct_fresh_7d: number
          pct_trusted: number
          personalized_ratio_pct: number
          top_category_pct: number
          top_channel_pct: number
          total_impressions: number
        }[]
      }
      rec_retriever_health: {
        Args: never
        Returns: {
          channel_entropy_bits: number
          distinct_categories: number
          distinct_channels: number
          distinct_languages: number
          pct_fresh_7d: number
          pct_trusted: number
          pool_size: number
          retriever: string
          top_channel_pct: number
        }[]
      }
      recent_video_report_count: {
        Args: { _user_id: string; _window_minutes?: number }
        Returns: number
      }
      reciter_is_accessible: {
        Args: { _reciter_id: string; _user_id: string }
        Returns: boolean
      }
      recompute_all_channel_trust: {
        Args: { _limit?: number }
        Returns: number
      }
      recompute_channel_trust: {
        Args: { _channel_id: string }
        Returns: number
      }
      record_learned_signal: {
        Args: {
          _action: string
          _actor: string
          _feature_type: string
          _feature_value: string
        }
        Returns: undefined
      }
      record_streak_activity: { Args: never; Returns: Json }
      redeem_gift_code: { Args: { p_code: string }; Returns: Json }
      redeem_referral: { Args: { _code: string }; Returns: Json }
      refresh_active_taste_profiles: {
        Args: { _max_users?: number }
        Returns: number
      }
      refresh_leaderboards: { Args: never; Returns: undefined }
      refresh_user_taste_profile: {
        Args: { _user_id: string }
        Returns: {
          avg_completion: number
          avg_session_len: number
          creator_affinity: Json
          hour_histogram: Json
          interest_drift: number
          language_affinity: Json
          last_signal_at: string | null
          signal_count: number
          topic_affinity: Json
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_taste_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_auto_approval: {
        Args: { _reason?: string; _video_id: string }
        Returns: undefined
      }
      revoke_entitlement: {
        Args: { _reason?: string; _user_id: string }
        Returns: boolean
      }
      scrub_user_data: { Args: { _uid: string }; Returns: Json }
      search_autocomplete: {
        Args: { _limit?: number; _prefix: string }
        Returns: {
          kind: string
          score: number
          suggestion: string
        }[]
      }
      search_reciters: {
        Args: { _limit?: number; _query: string }
        Returns: {
          canonical_name_ar: string
          canonical_name_en: string
          country: string
          id: string
          image_url: string
          is_living: boolean
          match_type: string
          popularity_score: number
          primary_riwayah: string
          rank: number
        }[]
      }
      search_trending: {
        Args: { _limit?: number }
        Returns: {
          hits: number
          suggestion: string
        }[]
      }
      search_videos: {
        Args: {
          _category?: string
          _channel?: string
          _limit?: number
          _offset?: number
          _query: string
        }
        Returns: {
          category: string
          channel_title: string
          halal_score: number
          is_trusted_channel: boolean
          match_type: string
          published_at: string
          rank: number
          thumbnail_url: string
          title: string
          video_id: string
        }[]
      }
      seed_default_notification_prefs: {
        Args: { _user_id: string }
        Returns: undefined
      }
      send_nudge_by_handle: {
        Args: { _handle: string; _kind: string; _message: string }
        Returns: Json
      }
      set_profile_handle: { Args: { _handle: string }; Returns: string }
      settle_team_streaks: { Args: never; Returns: number }
      sweep_inappropriate_content: { Args: never; Returns: Json }
      unaccent: { Args: { "": string }; Returns: string }
      unread_notification_count: { Args: never; Returns: number }
      upsert_reciter: {
        Args: {
          _active_years?: string
          _biography?: string
          _category?: string
          _country?: string
          _era?: string
          _image_url?: string
          _is_living?: boolean
          _name_ar?: string
          _name_en: string
          _popularity_score?: number
          _primary_riwayah?: string
          _social_links?: Json
          _voice_style?: string
        }
        Returns: string
      }
      user_household_id: { Args: { _user_id: string }; Returns: string }
      verify_admin_review_token: {
        Args: { _token: string }
        Returns: {
          created_by: string
          expires_at: string
          id: string
          purpose: string
        }[]
      }
      video_report_queue_summary: {
        Args: never
        Returns: {
          status: string
          total: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      channel_risk_level: "low" | "medium" | "high" | "critical"
      channel_trust_tier: "S" | "A" | "B" | "C"
      experiment_status:
        | "draft"
        | "running"
        | "paused"
        | "completed"
        | "archived"
      moderation_stage:
        | "ingest"
        | "rule_engine"
        | "channel_reputation"
        | "metadata_analysis"
        | "ai_reasoning"
        | "human_review"
        | "recheck"
        | "manual_override"
      moderation_state:
        | "approved"
        | "auto_approved"
        | "pending_review"
        | "ai_review_required"
        | "human_review_required"
        | "rejected"
        | "blocked"
        | "archived"
      trust_event_source:
        | "moderation"
        | "manual_approval"
        | "manual_rejection"
        | "user_report"
        | "false_positive"
        | "false_negative"
        | "recompute"
        | "strike"
        | "decay"
        | "note"
    }
    CompositeTypes: {
      surface_video: {
        video_id: string | null
        title: string | null
        channel_id: string | null
        channel_title: string | null
        thumbnail_url: string | null
        category: string | null
        section_id: string | null
        published_at: string | null
        ingested_at: string | null
        halal_score: number | null
        view_count: number | null
        is_trusted_channel: boolean | null
        is_premium_only: boolean | null
        content_language: string | null
      }
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
      channel_risk_level: ["low", "medium", "high", "critical"],
      channel_trust_tier: ["S", "A", "B", "C"],
      experiment_status: [
        "draft",
        "running",
        "paused",
        "completed",
        "archived",
      ],
      moderation_stage: [
        "ingest",
        "rule_engine",
        "channel_reputation",
        "metadata_analysis",
        "ai_reasoning",
        "human_review",
        "recheck",
        "manual_override",
      ],
      moderation_state: [
        "approved",
        "auto_approved",
        "pending_review",
        "ai_review_required",
        "human_review_required",
        "rejected",
        "blocked",
        "archived",
      ],
      trust_event_source: [
        "moderation",
        "manual_approval",
        "manual_rejection",
        "user_report",
        "false_positive",
        "false_negative",
        "recompute",
        "strike",
        "decay",
        "note",
      ],
    },
  },
} as const
