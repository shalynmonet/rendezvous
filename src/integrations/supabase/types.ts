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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_room_links: {
        Row: {
          invitation_key: string | null
          participant_key: string
          room_id: string
          user_id: string
        }
        Insert: {
          invitation_key?: string | null
          participant_key: string
          room_id: string
          user_id: string
        }
        Update: {
          invitation_key?: string | null
          participant_key?: string
          room_id?: string
          user_id?: string
        }
        Relationships: []
      }
      account_workspaces: {
        Row: {
          data: Json
          revision: number
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          revision?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          revision?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      concierge_requests: {
        Row: {
          budget: string
          city_or_destination: string
          created_at: string
          dates: string
          draft_plan: Json | null
          format: string
          id: string
          loved_one_name: string
          loved_one_tastes: Json
          notes: string
          occasion: string
          planner_email: string
          planner_name: string
          shalyn_notes: string
          status: string
          taste_portrait: Json | null
        }
        Insert: {
          budget?: string
          city_or_destination?: string
          created_at?: string
          dates?: string
          draft_plan?: Json | null
          format?: string
          id?: string
          loved_one_name: string
          loved_one_tastes?: Json
          notes?: string
          occasion?: string
          planner_email: string
          planner_name: string
          shalyn_notes?: string
          status?: string
          taste_portrait?: Json | null
        }
        Update: {
          budget?: string
          city_or_destination?: string
          created_at?: string
          dates?: string
          draft_plan?: Json | null
          format?: string
          id?: string
          loved_one_name?: string
          loved_one_tastes?: Json
          notes?: string
          occasion?: string
          planner_email?: string
          planner_name?: string
          shalyn_notes?: string
          status?: string
          taste_portrait?: Json | null
        }
        Relationships: []
      }
      guest_chats: {
        Row: {
          a_hash: string
          b_hash: string | null
          claim: string | null
          claimed_at: string | null
          expires_at: string
          game: Json | null
          id: string
          invite_hash: string
          last_rue_index: number
          messages: Json
          mood: string | null
          profile_a: Json
          profile_b: Json | null
          ru_muted: boolean
          rue_error: string | null
          ruelette: Json
          scores: Json
          tools: Json
        }
        Insert: {
          a_hash: string
          b_hash?: string | null
          claim?: string | null
          claimed_at?: string | null
          expires_at?: string
          game?: Json | null
          id?: string
          invite_hash: string
          last_rue_index?: number
          messages?: Json
          mood?: string | null
          profile_a: Json
          profile_b?: Json | null
          ru_muted?: boolean
          rue_error?: string | null
          ruelette?: Json
          scores?: Json
          tools?: Json
        }
        Update: {
          a_hash?: string
          b_hash?: string | null
          claim?: string | null
          claimed_at?: string | null
          expires_at?: string
          game?: Json | null
          id?: string
          invite_hash?: string
          last_rue_index?: number
          messages?: Json
          mood?: string | null
          profile_a?: Json
          profile_b?: Json | null
          ru_muted?: boolean
          rue_error?: string | null
          ruelette?: Json
          scores?: Json
          tools?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          taste_profile: Json | null
          updated_at: string
        }
        Insert: {
          id: string
          taste_profile?: Json | null
          updated_at?: string
        }
        Update: {
          id?: string
          taste_profile?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_chats: {
        Row: {
          id: string
          snapshot: Json
          source_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          snapshot: Json
          source_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          snapshot?: Json
          source_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      finish_guest_chat: {
        Args: {
          p_claim: string
          p_error?: string
          p_room: string
          p_tools: Json
          p_turn: Json
        }
        Returns: boolean
      }
      guest_chat_access: {
        Args: {
          p_action: string
          p_invite?: string
          p_message_id?: string
          p_mood?: string
          p_profile?: Json
          p_room?: string
          p_text?: string
          p_token?: string
        }
        Returns: Json
      }
      guest_chat_access_base: {
        Args: {
          p_action: string
          p_invite?: string
          p_message_id?: string
          p_mood?: string
          p_profile?: Json
          p_room?: string
          p_text?: string
          p_token?: string
        }
        Returns: Json
      }
      guest_ruelette: {
        Args: {
          p_action: string
          p_payload?: Json
          p_room: string
          p_token: string
        }
        Returns: Json
      }
      guest_ruelette_base: {
        Args: {
          p_action: string
          p_payload?: Json
          p_room: string
          p_token: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      save_account_workspace: {
        Args: { p_data: Json; p_revision: number }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin"],
    },
  },
} as const
