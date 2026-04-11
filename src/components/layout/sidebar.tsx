"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, FolderKanban, LayoutDashboard, Settings, Users, Wrench } from "lucide-react"
import { useAppShell } from "@/components/layout/app-shell-context"
import { useCurrentUser } from "@/hooks/use-current-user"
import { USER_ROLES } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: string[]
}

const userNavItems: NavItem[] = [{ href: "/dashboard", label: "Görevlerim", icon: LayoutDashboard }]

const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users, roles: [USER_ROLES.SUPER_ADMIN] },
  { href: "/admin/projects", label: "Projeler", icon: FolderKanban, roles: [USER_ROLES.SUPER_ADMIN] },
  { href: "/admin/job-types", label: "İş Tipleri", icon: Wrench, roles: [USER_ROLES.SUPER_ADMIN] },
  { href: "/admin/reports", label: "Raporlar", icon: BarChart3 },
  { href: "/admin/settings", label: "Ayarlar", icon: Settings, roles: [USER_ROLES.SUPER_ADMIN] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, canAssign } = useCurrentUser()
  const { collapsed, mobileOpen, closeMobileSidebar } = useAppShell()

  const isAdminArea = pathname.startsWith("/admin")
  const navItems = isAdminArea ? adminNavItems : userNavItems
  const filteredItems = navItems.filter((item) => !item.roles || (user ? item.roles.includes(user.role) : false))

  const widthClass = collapsed ? "lg:w-24" : "lg:w-72"

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-zinc-950/35 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeMobileSidebar}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-zinc-200 bg-white transition-transform duration-300 lg:translate-x-0 lg:shadow-none",
          widthClass,
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div
          className={cn(
            "flex h-[5.25rem] items-center border-b border-zinc-200/80 px-4",
            collapsed ? "justify-center lg:px-3" : "gap-3"
          )}
        >
          <Link
            href={isAdminArea ? "/admin" : "/dashboard"}
            onClick={closeMobileSidebar}
            className={cn(
              "flex min-w-0 items-center overflow-hidden px-1 py-2 transition-opacity hover:opacity-90",
              collapsed ? "justify-center lg:h-14 lg:w-14 lg:px-0" : "w-full justify-center"
            )}
            title="Cemre Tersanesi"
          >
            <Image
              src="/brand/cemre-login-logo.png"
              alt="Cemre Tersanesi"
              width={180}
              height={58}
              priority
              className={cn("h-11 w-auto max-w-full object-contain", collapsed && "lg:h-10 lg:w-auto lg:max-w-none")}
            />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/admin" && item.href !== "/dashboard" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center rounded-2xl px-3 py-3 text-sm font-medium transition-all",
                  collapsed ? "justify-center" : "gap-3",
                  isActive
                    ? "bg-[linear-gradient(135deg,rgba(20,118,207,0.12),rgba(99,201,61,0.10))] text-zinc-950 shadow-sm ring-1 ring-blue-100"
                    : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-950"
                )}
                onClick={closeMobileSidebar}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors",
                    isActive ? "bg-white text-blue-700 shadow-sm" : "bg-zinc-100 text-zinc-500 group-hover:bg-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className={cn("min-w-0", collapsed && "lg:hidden")}>
                  <p className="truncate">{item.label}</p>
                  {isActive ? <p className="truncate text-[11px] text-zinc-500">Şu an açık</p> : null}
                </div>
              </Link>
            )
          })}
        </nav>

        {canAssign ? (
          <div className="border-t border-zinc-100/90 p-3">
            <Link
              href={isAdminArea ? "/dashboard" : "/admin"}
              onClick={closeMobileSidebar}
              className={cn(
                "flex items-center rounded-2xl bg-zinc-100/80 px-3 py-3 text-sm text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-white",
                collapsed ? "justify-center" : "gap-3"
              )}
              title={isAdminArea ? "Görev görünümüne geç" : "Yönetim paneline geç"}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-700">
                <LayoutDashboard className="h-4 w-4" />
              </span>
              <div className={cn("min-w-0", collapsed && "lg:hidden")}>
                <p className="truncate">{isAdminArea ? "Görev Görünümü" : "Yönetim Paneli"}</p>
                <p className="truncate text-[11px] opacity-70">Hızlı görünüm değiştir</p>
              </div>
            </Link>
          </div>
        ) : null}
      </aside>
    </>
  )
}
