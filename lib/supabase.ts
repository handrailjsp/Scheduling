import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Create a `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or set them in your environment.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Professor {
  id: number
  name: string
  title: string
  department: string
  created_at?: string
}

export interface TimetableSlot {
  id: number
  professor_id: number
  day_of_week: number
  hour: number
  end_hour: number
  subject: string
  room: string
  needs_ac?: boolean
  created_at?: string
}
