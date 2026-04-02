import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-60">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
