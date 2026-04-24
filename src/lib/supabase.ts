import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 데이터베이스 테이블 타입 정의 (필요시 확장)
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      partners: {
        Row: {
          id: string
          name: string
          manager: string | null
          phone1: string | null
          phone2: string | null
          email: string | null
          address: string | null
          documents: Json
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          manager?: string | null
          phone1?: string | null
          phone2?: string | null
          email?: string | null
          address?: string | null
          documents?: Json
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          manager?: string | null
          phone1?: string | null
          phone2?: string | null
          email?: string | null
          address?: string | null
          documents?: Json
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          start_date: string | null
          end_date: string | null
          start_time: string | null
          end_time: string | null
          description: string | null
          parent_id: string | null
          level: number
          partner_id: string | null
          quota: number
          participant_count: number
          abbreviation: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          start_date?: string | null
          end_date?: string | null
          start_time?: string | null
          end_time?: string | null
          description?: string | null
          parent_id?: string | null
          level?: number
          partner_id?: string | null
          quota?: number
          participant_count?: number
          abbreviation?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_date?: string | null
          end_date?: string | null
          start_time?: string | null
          end_time?: string | null
          description?: string | null
          parent_id?: string | null
          level?: number
          partner_id?: string | null
          quota?: number
          participant_count?: number
          abbreviation?: string | null
          created_at?: string
        }
      }
    }
  }
}
