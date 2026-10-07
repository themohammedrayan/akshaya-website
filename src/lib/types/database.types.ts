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
      day_closings: {
        Row: {
          actual_bank: number
          actual_cash: number
          actual_csc: number
          actual_wallet: number
          breakdown: Json
          close_date: string
          closed_at: string
          closed_by: string | null
          expected_bank: number
          expected_cash: number
          expected_csc: number
          expected_wallet: number
          id: string
          is_opening: boolean
          note: string | null
          reopened_at: string | null
          reopened_by: string | null
          status: string
          upi_pending: number
        }
        Insert: {
          actual_bank: number
          actual_cash: number
          actual_csc?: number
          actual_wallet: number
          breakdown?: Json
          close_date: string
          closed_at?: string
          closed_by?: string | null
          expected_bank: number
          expected_cash: number
          expected_csc?: number
          expected_wallet: number
          id?: string
          is_opening?: boolean
          note?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          status?: string
          upi_pending?: number
        }
        Update: {
          actual_bank?: number
          actual_cash?: number
          actual_csc?: number
          actual_wallet?: number
          breakdown?: Json
          close_date?: string
          closed_at?: string
          closed_by?: string | null
          expected_bank?: number
          expected_cash?: number
          expected_csc?: number
          expected_wallet?: number
          id?: string
          is_opening?: boolean
          note?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          status?: string
          upi_pending?: number
        }
        Relationships: [
          {
            foreignKeyName: "day_closings_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_closings_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_counters: {
        Row: {
          fy: string
          last_no: number
        }
        Insert: {
          fy: string
          last_no?: number
        }
        Update: {
          fy?: string
          last_no?: number
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          charge_overridden: boolean
          description: string
          govt_fee: number
          id: string
          invoice_id: string
          line_total: number | null
          override_reason: string | null
          qty: number
          service_charge: number
          service_id: string | null
          sort_order: number
          standard_charge: number | null
        }
        Insert: {
          charge_overridden?: boolean
          description: string
          govt_fee?: number
          id?: string
          invoice_id: string
          line_total?: number | null
          override_reason?: string | null
          qty?: number
          service_charge?: number
          service_id?: string | null
          sort_order?: number
          standard_charge?: number | null
        }
        Update: {
          charge_overridden?: boolean
          description?: string
          govt_fee?: number
          id?: string
          invoice_id?: string
          line_total?: number | null
          override_reason?: string | null
          qty?: number
          service_charge?: number
          service_id?: string | null
          sort_order?: number
          standard_charge?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          id: string
          invoice_id: string
          mode: string
          received_at: string
          received_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          id?: string
          invoice_id: string
          mode: string
          received_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          id?: string
          invoice_id?: string
          mode?: string
          received_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          adjustment_reason: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string | null
          discount_amount: number
          extra_amount: number
          govt_total: number
          grand_total: number | null
          id: string
          invoice_no: string
          notes: string | null
          paid_total: number
          request_id: string | null
          service_total: number
          status: string
        }
        Insert: {
          adjustment_reason?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number
          extra_amount?: number
          govt_total?: number
          grand_total?: number | null
          id?: string
          invoice_no: string
          notes?: string | null
          paid_total?: number
          request_id?: string | null
          service_total?: number
          status?: string
        }
        Update: {
          adjustment_reason?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number
          extra_amount?: number
          govt_total?: number
          grand_total?: number | null
          id?: string
          invoice_no?: string
          notes?: string | null
          paid_total?: number
          request_id?: string | null
          service_total?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      money_movements: {
        Row: {
          amount: number
          cancel_reason: string | null
          cancelled_by: string | null
          created_by: string | null
          from_account: string
          id: string
          kind: string
          moved_at: string
          note: string | null
          status: string
          to_account: string | null
        }
        Insert: {
          amount: number
          cancel_reason?: string | null
          cancelled_by?: string | null
          created_by?: string | null
          from_account: string
          id?: string
          kind: string
          moved_at?: string
          note?: string | null
          status?: string
          to_account?: string | null
        }
        Update: {
          amount?: number
          cancel_reason?: string | null
          cancelled_by?: string | null
          created_by?: string | null
          from_account?: string
          id?: string
          kind?: string
          moved_at?: string
          note?: string | null
          status?: string
          to_account?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "money_movements_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "money_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          role: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      request_documents: {
        Row: {
          doc_label: string
          id: string
          request_id: string
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          doc_label: string
          id?: string
          request_id: string
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          doc_label?: string
          id?: string
          request_id?: string
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_documents_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          service_id: string
          status: string
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          service_id: string
          status?: string
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          service_id?: string
          status?: string
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_charge_slabs: {
        Row: {
          charge: number
          created_at: string
          id: string
          service_id: string | null
          up_to: number | null
        }
        Insert: {
          charge: number
          created_at?: string
          id?: string
          service_id?: string | null
          up_to?: number | null
        }
        Update: {
          charge?: number
          created_at?: string
          id?: string
          service_id?: string | null
          up_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_charge_slabs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category: string
          created_at: string
          default_govt_fee: number
          default_service_charge: number
          description_en: string
          description_ml: string
          fee: number
          govt_paid_from: string
          id: string
          name_en: string
          name_ml: string
          processing_time: string
          required_docs: Json
          show_on_website: boolean
          slug: string
          sort_order: number
          updated_at: string
          variable_govt_fee: boolean
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          default_govt_fee?: number
          default_service_charge?: number
          description_en?: string
          description_ml?: string
          fee?: number
          govt_paid_from?: string
          id?: string
          name_en: string
          name_ml: string
          processing_time: string
          required_docs?: Json
          show_on_website?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
          variable_govt_fee?: boolean
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          default_govt_fee?: number
          default_service_charge?: number
          description_en?: string
          description_ml?: string
          fee?: number
          govt_paid_from?: string
          id?: string
          name_en?: string
          name_ml?: string
          processing_time?: string
          required_docs?: Json
          show_on_website?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
          variable_govt_fee?: boolean
        }
        Relationships: []
      }
      status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          is_internal: boolean
          note: string | null
          request_id: string
          status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          is_internal?: boolean
          note?: string | null
          request_id: string
          status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          is_internal?: boolean
          note?: string | null
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      uidai_printed_forms: {
        Row: {
          aadhaar_number: string | null
          applicant_name: string | null
          form_type: string
          id: string
          printed_at: string
          record: Json
        }
        Insert: {
          aadhaar_number?: string | null
          applicant_name?: string | null
          form_type: string
          id?: string
          printed_at?: string
          record: Json
        }
        Update: {
          aadhaar_number?: string | null
          applicant_name?: string | null
          form_type?: string
          id?: string
          printed_at?: string
          record?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_money_movement: {
        Args: {
          p_amount: number
          p_from: string
          p_kind: string
          p_note: string
          p_to: string | null
        }
        Returns: string
      }
      add_invoice_payment: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_mode: string
          p_reference: string
        }
        Returns: undefined
      }
      cancel_invoice: {
        Args: { p_invoice_id: string; p_reason: string }
        Returns: undefined
      }
      cancel_money_movement: {
        Args: { p_id: string; p_reason: string }
        Returns: undefined
      }
      close_day: {
        Args: {
          p_bank: number
          p_cash: number
          p_csc: number
          p_date: string
          p_wallet: number
        }
        Returns: Json
      }
      create_invoice: { Args: { p_invoice: Json }; Returns: string }
      day_close_result: { Args: { p_date: string }; Returns: Json }
      day_close_status: { Args: never; Returns: Json }
      financial_summary: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      generate_tracking_code: { Args: never; Returns: string }
      get_request_status: {
        Args: { p_phone: string; p_tracking_code: string }
        Returns: Json
      }
      is_owner: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      log_printed_form: {
        Args: { p_form_type: string; p_record: Json }
        Returns: string
      }
      next_invoice_no: { Args: never; Returns: string }
      record_uploaded_document: {
        Args: {
          p_doc_label: string
          p_request_id: string
          p_storage_path: string
        }
        Returns: undefined
      }
      reopen_day: { Args: { p_date: string }; Returns: undefined }
      save_charge_slabs: {
        Args: { p_service_id: string | null; p_slabs: Json }
        Returns: undefined
      }
      service_charge_for: {
        Args: { p_govt_amount: number; p_service_id: string }
        Returns: number
      }
      set_closing_note: {
        Args: { p_date: string; p_note: string }
        Returns: undefined
      }
      set_opening_balances: {
        Args: {
          p_bank: number
          p_cash: number
          p_csc: number
          p_date: string
          p_wallet: number
        }
        Returns: undefined
      }
      submit_request: {
        Args: {
          p_customer_name: string
          p_customer_phone: string
          p_service_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
