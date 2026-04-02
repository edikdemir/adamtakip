"use client"
import { useAuth } from "@/components/providers/auth-provider"
import { USER_ROLES } from "@/lib/constants"

export function useCurrentUser() {
  const { user, isLoading } = useAuth()
  return {
    user,
    isLoading,
    isSuperAdmin: user?.role === USER_ROLES.SUPER_ADMIN,
    isKoordinator: user?.role === USER_ROLES.KOORDINATOR,
    isUser: user?.role === USER_ROLES.USER,
    canAssign: user?.role === USER_ROLES.SUPER_ADMIN || user?.role === USER_ROLES.KOORDINATOR,
  }
}
