import { UserRole } from "@/lib/constants"

export interface User {
  id: string
  azure_oid: string
  email: string
  display_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SessionUser {
  id: string
  email: string
  display_name: string
  role: UserRole
}
