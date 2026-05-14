export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      cars: {
        Row: {
          created_at: string;
          id: string;
          make: string;
          model: string;
          owner_id: string;
          plate_number: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          make: string;
          model: string;
          owner_id: string;
          plate_number: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          make?: string;
          model?: string;
          owner_id?: string;
          plate_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cars_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          request_id: string;
          sender_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          request_id: string;
          sender_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          request_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "ride_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          bio: string | null;
          created_at: string;
          full_name: string;
          id: string;
          phone: string | null;
          photo_url: string | null;
          updated_at: string;
          verified: boolean;
          work_email: string | null;
        };
        Insert: {
          bio?: string | null;
          created_at?: string;
          full_name?: string;
          id: string;
          phone?: string | null;
          photo_url?: string | null;
          updated_at?: string;
          verified?: boolean;
          work_email?: string | null;
        };
        Update: {
          bio?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          phone?: string | null;
          photo_url?: string | null;
          updated_at?: string;
          verified?: boolean;
          work_email?: string | null;
        };
        Relationships: [];
      };
      ratings: {
        Row: {
          comment: string | null;
          created_at: string;
          id: string;
          ratee_id: string;
          rater_id: string;
          request_id: string;
          stars: number;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          ratee_id: string;
          rater_id: string;
          request_id: string;
          stars: number;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          id?: string;
          ratee_id?: string;
          rater_id?: string;
          request_id?: string;
          stars?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ratings_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "ride_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          reason: string;
          reported_user_id: string;
          reporter_id: string;
          resolved: boolean;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason: string;
          reported_user_id: string;
          reporter_id: string;
          resolved?: boolean;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason?: string;
          reported_user_id?: string;
          reporter_id?: string;
          resolved?: boolean;
        };
        Relationships: [];
      };
      ride_requests: {
        Row: {
          created_at: string;
          driver_id: string;
          id: string;
          passenger_id: string;
          pickup_note: string | null;
          route_id: string;
          seats_requested: number;
          status: Database["public"]["Enums"]["request_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          driver_id: string;
          id?: string;
          passenger_id: string;
          pickup_note?: string | null;
          route_id: string;
          seats_requested?: number;
          status?: Database["public"]["Enums"]["request_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          driver_id?: string;
          id?: string;
          passenger_id?: string;
          pickup_note?: string | null;
          route_id?: string;
          seats_requested?: number;
          status?: Database["public"]["Enums"]["request_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ride_requests_route_id_fkey";
            columns: ["route_id"];
            isOneToOne: false;
            referencedRelation: "routes";
            referencedColumns: ["id"];
          },
        ];
      };
      routes: {
        Row: {
          available_seats: number;
          created_at: string;
          days_of_week: string[];
          departure_time: string;
          description: string | null;
          driver_id: string;
          end_location: string;
          id: string;
          is_active: boolean;
          price_per_seat: number;
          start_location: string;
          updated_at: string;
        };
        Insert: {
          available_seats: number;
          created_at?: string;
          days_of_week?: string[];
          departure_time: string;
          description?: string | null;
          driver_id: string;
          end_location: string;
          id?: string;
          is_active?: boolean;
          price_per_seat: number;
          start_location: string;
          updated_at?: string;
        };
        Update: {
          available_seats?: number;
          created_at?: string;
          days_of_week?: string[];
          departure_time?: string;
          description?: string | null;
          driver_id?: string;
          end_location?: string;
          id?: string;
          is_active?: boolean;
          price_per_seat?: number;
          start_location?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "driver" | "passenger";
      request_status:
        | "pending"
        | "accepted"
        | "declined"
        | "cancelled"
        | "completed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "driver", "passenger"],
      request_status: [
        "pending",
        "accepted",
        "declined",
        "cancelled",
        "completed",
      ],
    },
  },
} as const;
