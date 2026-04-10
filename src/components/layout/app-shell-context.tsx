"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

interface AppShellContextValue {
  collapsed: boolean
  mobileOpen: boolean
  isDesktop: boolean
  toggleSidebar: () => void
  toggleDesktopCollapse: () => void
  openMobileSidebar: () => void
  closeMobileSidebar: () => void
}

const AppShellContext = createContext<AppShellContextValue | null>(null)

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const syncViewport = () => {
      const desktop = window.innerWidth >= 1024
      setIsDesktop(desktop)

      if (desktop) {
        setMobileOpen(false)
      }
    }

    syncViewport()
    window.addEventListener("resize", syncViewport)
    return () => window.removeEventListener("resize", syncViewport)
  }, [])

  const value = useMemo<AppShellContextValue>(
    () => ({
      collapsed,
      mobileOpen,
      isDesktop,
      toggleSidebar: () => {
        if (!isDesktop) {
          setMobileOpen((current) => !current)
          return
        }

        setCollapsed((current) => !current)
      },
      toggleDesktopCollapse: () => setCollapsed((current) => !current),
      openMobileSidebar: () => setMobileOpen(true),
      closeMobileSidebar: () => setMobileOpen(false),
    }),
    [collapsed, mobileOpen, isDesktop]
  )

  return <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
}

export function useAppShell() {
  const context = useContext(AppShellContext)

  if (!context) {
    throw new Error("useAppShell must be used within AppShellProvider")
  }

  return context
}
