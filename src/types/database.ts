import type {
  ActivityType,
  FollowUpStatus,
  LeadPriority,
  LeadSource,
  LeadStage,
  LeadType,
  ProductInterest,
  ShowroomVisitStatus,
  UserRole,
} from "@/types/crm";

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
      profiles: {
        Row: {
          id: string;
          email: string | null;
          login_uid: string | null;
          full_name: string | null;
          role: UserRole;
          is_active: boolean;
          avatar_url: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          login_uid?: string | null;
          full_name?: string | null;
          role?: UserRole;
          is_active?: boolean;
          avatar_url?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string | null;
          login_uid?: string | null;
          full_name?: string | null;
          role?: UserRole;
          is_active?: boolean;
          avatar_url?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string;
          alternate_phone: string | null;
          company_name: string | null;
          lead_type: LeadType;
          source: LeadSource;
          source_detail: string | null;
          stage: LeadStage;
          assigned_to: string | null;
          project_location: string | null;
          city: string | null;
          requirement_summary: string | null;
          product_interest: string | null;
          showroom_visit_status: ShowroomVisitStatus;
          showroom_visit_date: string | null;
          quotation_required: boolean;
          quotation_value: number | null;
          budget: number | null;
          priority: LeadPriority;
          notes_summary: string | null;
          next_follow_up_at: string | null;
          last_contacted_at: string | null;
          lost_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email?: string | null;
          phone: string;
          alternate_phone?: string | null;
          company_name?: string | null;
          lead_type?: LeadType;
          source?: LeadSource;
          source_detail?: string | null;
          stage?: LeadStage;
          assigned_to?: string | null;
          project_location?: string | null;
          city?: string | null;
          requirement_summary?: string | null;
          product_interest?: string | null;
          showroom_visit_status?: ShowroomVisitStatus;
          showroom_visit_date?: string | null;
          quotation_required?: boolean;
          quotation_value?: number | null;
          budget?: number | null;
          priority?: LeadPriority;
          notes_summary?: string | null;
          next_follow_up_at?: string | null;
          last_contacted_at?: string | null;
          lost_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          email?: string | null;
          phone?: string;
          alternate_phone?: string | null;
          company_name?: string | null;
          lead_type?: LeadType;
          source?: LeadSource;
          source_detail?: string | null;
          stage?: LeadStage;
          assigned_to?: string | null;
          project_location?: string | null;
          city?: string | null;
          requirement_summary?: string | null;
          product_interest?: string | null;
          showroom_visit_status?: ShowroomVisitStatus;
          showroom_visit_date?: string | null;
          quotation_required?: boolean;
          quotation_value?: number | null;
          budget?: number | null;
          priority?: LeadPriority;
          notes_summary?: string | null;
          next_follow_up_at?: string | null;
          last_contacted_at?: string | null;
          lost_reason?: string | null;
          updated_at?: string;
        };
      };
      lead_activities: {
        Row: {
          id: string;
          lead_id: string;
          type: ActivityType;
          description: string;
          metadata: Json | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          type: ActivityType;
          description: string;
          metadata?: Json | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          type?: ActivityType;
          description?: string;
          metadata?: Json | null;
          created_by?: string | null;
        };
      };
      follow_ups: {
        Row: {
          id: string;
          lead_id: string;
          assigned_to: string | null;
          due_at: string;
          completed_at: string | null;
          status: FollowUpStatus;
          note: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          assigned_to?: string | null;
          due_at: string;
          completed_at?: string | null;
          status?: FollowUpStatus;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          due_at?: string;
          completed_at?: string | null;
          status?: FollowUpStatus;
          note?: string | null;
          updated_at?: string;
        };
      };
      lead_assignments: {
        Row: {
          id: string;
          lead_id: string;
          assigned_to: string | null;
          assigned_by: string | null;
          assigned_at: string;
          note: string | null;
        };
        Insert: {
          id?: string;
          lead_id: string;
          assigned_to?: string | null;
          assigned_by?: string | null;
          assigned_at?: string;
          note?: string | null;
        };
        Update: {
          assigned_to?: string | null;
          assigned_by?: string | null;
          assigned_at?: string;
          note?: string | null;
        };
      };
    };
  };
}
