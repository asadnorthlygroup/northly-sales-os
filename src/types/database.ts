export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "admin" | "ae" | "sdr" | "campaign_manager" | "finance" | "readonly";
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };

      sub_networks: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sub_networks"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["sub_networks"]["Insert"]>;
      };

      accounts: {
        Row: {
          id: string;
          handle: string;
          sub_network_id: string;
          platform: "instagram" | "tiktok" | "facebook" | "youtube";
          market: string;
          market_label: string;
          region: string;
          categories: string[];
          pricing_status: "active" | "contact_for_pricing" | "na";
          manual_rate_lock: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["accounts"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
      };

      account_metrics: {
        Row: {
          id: string;
          account_id: string;
          recorded_at: string;
          followers: number;
          avg_impressions_30d: number;
          source: "apify" | "youtube_api" | "manual";
          raw_data: Json | null;
        };
        Insert: Omit<Database["public"]["Tables"]["account_metrics"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["account_metrics"]["Insert"]>;
      };

      account_rates: {
        Row: {
          id: string;
          account_id: string;
          effective_from: string;
          ba_feed: number;
          ba_feed_bundle_min: number;
          story: number;
          story_bundle_min: number;
          carousel: number;
          carousel_bundle_min: number;
          ga_feed: number;
          ga_feed_bundle_min: number;
          oc_reel: number;
          oc_reel_bundle_min: number;
          talking_head: number;
          talking_head_bundle_min: number;
          is_manual: boolean;
          computed_from_followers: number | null;
          computed_from_impressions: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["account_rates"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["account_rates"]["Insert"]>;
      };

      pricing_config: {
        Row: {
          id: string;
          key: string;
          value: number;
          label: string;
          description: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pricing_config"]["Row"], "id" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["pricing_config"]["Insert"]>;
      };

      clients: {
        Row: {
          id: string;
          company_name: string;
          primary_contact_name: string | null;
          primary_contact_email: string | null;
          website: string | null;
          industry_category: string | null;
          industry_niche: string | null;
          close_lead_id: string | null;
          is_repeat_client: boolean;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["clients"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
      };

      deals: {
        Row: {
          id: string;
          client_id: string;
          ae_id: string;
          title: string;
          status: "draft" | "proposal_sent" | "negotiating" | "won" | "lost" | "stalled";
          close_opp_id: string | null;
          cities: string[];
          industry_category: string | null;
          goal: string | null;
          budget_min: number | null;
          budget_max: number | null;
          final_amount: number | null;
          markup_mode: "flat" | "percentage";
          markup_value: number;
          display_mode: "itemized" | "package";
          recommended_option: number | null;
          chosen_option: number | null;
          notes: string | null;
          won_at: string | null;
          lost_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["deals"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["deals"]["Insert"]>;
      };

      proposals: {
        Row: {
          id: string;
          deal_id: string;
          version: number;
          status: "draft" | "sent" | "viewed" | "accepted" | "rejected";
          intake_data: Json;
          selected_accounts: Json;
          ladder_data: Json;
          generated_text: string | null;
          google_doc_id: string | null;
          google_doc_url: string | null;
          pdf_url: string | null;
          sent_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["proposals"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["proposals"]["Insert"]>;
      };

      strategy_hooks: {
        Row: {
          id: string;
          category: string;
          hook_text: string;
          is_active: boolean;
          source: "seed" | "learned" | "manual";
          close_rate: number | null;
          usage_count: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["strategy_hooks"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["strategy_hooks"]["Insert"]>;
      };

      proposal_examples: {
        Row: {
          id: string;
          source_file: string;
          source_type: "email_thread" | "close_crm" | "manual";
          client_name: string | null;
          industry_category: string | null;
          industry_niche: string | null;
          deal_size_tier: "lt_2k" | "2k_5k" | "5k_10k" | "10k_25k" | "gt_25k" | null;
          outcome: "won" | "lost" | "stalled" | "unknown";
          geography_tier: "single_city" | "multi_city" | "national" | null;
          cities: string[] | null;
          budget_discussed: number | null;
          final_deal_size: number | null;
          options_presented: number[] | null;
          recommended_option: number | null;
          chosen_option: number | null;
          time_to_close_days: number | null;
          ae_name: string | null;
          objections: string[] | null;
          strategy_framing: string | null;
          closing_cta: string | null;
          raw_text: string | null;
          extraction_status: "ai_generated" | "ae_confirmed" | "rejected";
          embedding: string | null; // pgvector — stored as text, handled by Supabase
          ingested_at: string;
          confirmed_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["proposal_examples"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["proposal_examples"]["Insert"]>;
      };

      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_log"]["Row"], "id" | "created_at">;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
