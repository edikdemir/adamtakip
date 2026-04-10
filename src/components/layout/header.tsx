"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { NotificationBell } from "@/components/layout/notification-bell"
import { SidebarToggle } from "@/components/layout/sidebar-toggle"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCurrentUser } from "@/hooks/use-current-user"
import { ROLE_LABELS } from "@/lib/constants"
import { toast } from "sonner"

interface HeaderProps {
  title?: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter()
  const { user } = useCurrentUser()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    toast.success("Çıkış yapıldı")
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[1680px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarToggle />
          <div className="min-w-0">
            {title ? <p className="truncate text-base font-semibold text-zinc-950">{title}</p> : null}
            {subtitle ? <p className="truncate text-xs text-zinc-500">{subtitle}</p> : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 rounded-xl px-2 hover:bg-zinc-100/80">
                <UserAvatar
                  displayName={user?.display_name || "?"}
                  photoUrl={user?.photo_url}
                  size="sm"
                  className="border border-zinc-200 shadow-sm"
                />
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="max-w-32 truncate text-sm font-medium text-zinc-700">{user?.display_name}</p>
                  <p className="max-w-32 truncate text-[11px] text-zinc-400">{user?.job_title || user?.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl border-zinc-200">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.display_name}</p>
                  {user?.job_title ? <p className="text-xs leading-none text-zinc-600">{user.job_title}</p> : null}
                  <p className="break-all text-xs leading-none text-zinc-500">{user?.email}</p>
                  <p className="text-xs text-zinc-400">{user?.role ? ROLE_LABELS[user.role] : ""}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
