"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, ClipboardList, Users, Settings,
  FolderKanban, BarChart3, Building2, Wrench
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/hooks/use-current-user"
import { USER_ROLES } from "@/lib/constants"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: string[]
}

const userNavItems: NavItem[] = [
  { href: "/dashboard", label: "Görevlerim", icon: LayoutDashboard },
]

const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/admin/job-pool", label: "İş Havuzu", icon: ClipboardList },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users, roles: [USER_ROLES.SUPER_ADMIN] },
  { href: "/admin/projects", label: "Projeler", icon: FolderKanban, roles: [USER_ROLES.SUPER_ADMIN] },
  { href: "/admin/job-types", label: "İş Tipleri", icon: Wrench, roles: [USER_ROLES.SUPER_ADMIN] },
  { href: "/admin/reports", label: "Raporlar", icon: BarChart3 },
  { href: "/admin/settings", label: "Ayarlar", icon: Settings, roles: [USER_ROLES.SUPER_ADMIN] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, canAssign } = useCurrentUser()

  const isAdminArea = pathname.startsWith("/admin")
  const navItems = isAdminArea ? adminNavItems : userNavItems

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true
    return user && item.roles.includes(user.role)
  })

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-white border-r border-zinc-200 fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-zinc-200">
        <div className="flex items-center justify-center w-8 h-8 bg-zinc-900 rounded-lg">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-900 leading-none">Adam Takip</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">Cemre Tersanesi</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== "/admin" && item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Switch view for super_admin */}
      {canAssign && (
        <div className="px-3 py-3 border-t border-zinc-100">
          {isAdminArea ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Görev Görünümüne Geç
            </Link>
          ) : (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Yönetim Paneline Geç
            </Link>
          )}
        </div>
      )}
    </aside>
  )
}
