"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { AppShellProvider, useAppShell } from "@/components/layout/app-shell-context"
import { cn } from "@/lib/utils"

const TITLE_MAP: Array<{ matcher: RegExp; title: string; subtitle: string }> = [
  { matcher: /^\/admin$/, title: "Genel Bakış", subtitle: "İş havuzu, onaylar ve aktif kronometreler" },
  { matcher: /^\/admin\/users(\/.*)?$/, title: "Kullanıcılar", subtitle: "Kullanıcı hesapları, roller ve detay ekranları." },
  { matcher: /^\/admin\/projects$/, title: "Projeler", subtitle: "Projeler, zone ve mahal yapıları." },
  { matcher: /^\/admin\/job-types$/, title: "İş Tipleri", subtitle: "İş tipi ağacı ve alt iş kalemleri." },
  { matcher: /^\/admin\/reports$/, title: "Raporlar", subtitle: "Adam/saat kırılımları ve dışa aktarımlar." },
  { matcher: /^\/admin\/settings$/, title: "Ayarlar", subtitle: "Sistem davranışı, bildirim ve çalışma saatleri." },
  { matcher: /^\/admin\/assignments$/, title: "Atamalar", subtitle: "Görev ve atama operasyonları." },
  { matcher: /^\/admin\/approvals$/, title: "Onaylar", subtitle: "Onay bekleyen görev kuyruğu." },
  { matcher: /^\/dashboard$/, title: "Görevlerim", subtitle: "Aktif işler, kronometreler ve teslim akışı." },
]

function resolveHeaderContent(pathname: string) {
  return TITLE_MAP.find((entry) => entry.matcher.test(pathname)) ?? {
    title: "Adam Takip",
    subtitle: "Operasyon ekranı",
  }
}

function AppShellFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { collapsed } = useAppShell()
  const headerContent = resolveHeaderContent(pathname)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,118,207,0.10),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(99,201,61,0.10),_transparent_24%),#f5f8fb]">
      <Sidebar />
      <div className={cn("flex min-h-screen flex-col transition-[padding] duration-300 ease-out", collapsed ? "lg:pl-20" : "lg:pl-64")}>
        <Header title={headerContent.title} subtitle={headerContent.subtitle} />
        <main className="flex-1 px-4 pb-8 pt-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1680px]">{children}</div>
        </main>
        <footer className="px-4 pb-5 text-center text-xs text-zinc-500 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1680px] rounded-full border border-white/70 bg-white/70 px-4 py-3 shadow-sm sm:backdrop-blur">
            © 2026 Cemre Tersanesi Bilgi İşlem Birimi
          </div>
        </footer>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShellProvider>
      <AppShellFrame>{children}</AppShellFrame>
    </AppShellProvider>
  )
}
