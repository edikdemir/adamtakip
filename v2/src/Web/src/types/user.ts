import { UserRole } from "@/lib/constants"

export interface User {
  id: string
  azure_oid: string
  email: string
  display_name: string
  job_title?: string | null
  photo_url?: string | null
  role: UserRole
  is_active: boolean
  last_seen_at?: string | null
  created_at: string
  updated_at: string
}

export interface SessionUser {
  id: string
  email: string
  display_name: string
  job_title?: string | null
  photo_url?: string | null
  role: UserRole
}
