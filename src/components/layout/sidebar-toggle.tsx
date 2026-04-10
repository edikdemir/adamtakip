"use client"

import { PanelLeft, PanelLeftClose } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAppShell } from "@/components/layout/app-shell-context"

interface SidebarToggleProps {
  className?: string
}

export function SidebarToggle({ className }: SidebarToggleProps) {
  const { collapsed, isDesktop, mobileOpen, toggleSidebar } = useAppShell()
  const isOpen = isDesktop ? !collapsed : mobileOpen

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("h-9 w-9 rounded-xl border-zinc-200 bg-white shadow-sm", className)}
      onClick={toggleSidebar}
      aria-label="Menüyü aç veya kapat"
    >
      {isOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
    </Button>
  )
}
