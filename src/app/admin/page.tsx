"use client"
import { useTasks } from "@/hooks/use-tasks"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ADMIN_STATUS } from "@/lib/constants"
import { ClipboardList, UserCheck, CheckSquare, Clock } from "lucide-react"

export default function AdminDashboardPage() {
  const { data: tasks = [], isLoading } = useTasks()

  const stats = {
    havuzda: tasks.filter((t) => t.admin_status === ADMIN_STATUS.HAVUZDA).length,
    atandi: tasks.filter((t) => t.admin_status === ADMIN_STATUS.ATANDI).length,
    devam_ediyor: tasks.filter((t) => t.admin_status === ADMIN_STATUS.DEVAM_EDIYOR).length,
    tamamlandi: tasks.filter((t) => t.admin_status === ADMIN_STATUS.TAMAMLANDI).length,
    onaylandi: tasks.filter((t) => t.admin_status === ADMIN_STATUS.ONAYLANDI).length,
    toplam: tasks.length,
  }

  const cards = [
    { label: "İş Havuzunda", value: stats.havuzda, icon: ClipboardList, color: "text-zinc-600 bg-zinc-100" },
    { label: "Atandı", value: stats.atandi, icon: UserCheck, color: "text-blue-600 bg-blue-100" },
    { label: "Devam Ediyor", value: stats.devam_ediyor, icon: Clock, color: "text-indigo-600 bg-indigo-100" },
    { label: "Onay Bekliyor", value: stats.tamamlandi, icon: CheckSquare, color: "text-orange-600 bg-orange-100" },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Yönetim Paneli</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border-zinc-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500 font-medium">{card.label}</p>
                    <p className="text-3xl font-bold text-zinc-900 mt-1">
                      {isLoading ? "—" : card.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Genel Durum</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Toplam Görev", value: stats.toplam },
              { label: "Onaylandı", value: stats.onaylandi },
              { label: "Tamamlanma Oranı", value: stats.toplam > 0 ? `%${Math.round((stats.onaylandi / stats.toplam) * 100)}` : "—" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
                <span className="text-sm text-zinc-600">{row.label}</span>
                <span className="text-sm font-semibold text-zinc-900">{row.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
