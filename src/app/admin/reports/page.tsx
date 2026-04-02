"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Download, Users, Clock, CheckCircle, TrendingUp } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { ADMIN_STATUS } from "@/lib/constants"

interface UserReport {
  user: { id: string; display_name: string; email: string }
  tasks: Array<{
    id: number
    drawing_no: string
    total_elapsed_seconds: number
    admin_status: string
    completion_date: string | null
    project: { code: string } | null
    job_sub_type: { name: string } | null
  }>
  totalHours: number
}

function useReports(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set("from", from)
  if (to) params.set("to", to)

  return useQuery<UserReport[]>({
    queryKey: ["reports", from, to],
    queryFn: () =>
      fetch(`/api/reports?${params.toString()}`).then(r => r.json()).then(r => r.data || []),
  })
}

function downloadCSV(data: UserReport[]) {
  const rows: string[] = [
    ["Çalışan", "E-posta", "Proje", "Çizim No", "Alt Tip", "Süre (sa)", "Durum", "Tamamlanma"].join(","),
  ]

  for (const ur of data) {
    for (const task of ur.tasks) {
      rows.push([
        `"${ur.user.display_name}"`,
        ur.user.email,
        task.project?.code || "",
        `"${task.drawing_no}"`,
        `"${task.job_sub_type?.name || ""}"`,
        (task.total_elapsed_seconds / 3600).toFixed(2),
        task.admin_status,
        task.completion_date ? formatDate(task.completion_date) : "",
      ].join(","))
    }
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `adam-takip-rapor-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  const [from, setFrom] = useState(firstDay)
  const [to, setTo] = useState(today)
  const [applied, setApplied] = useState({ from: firstDay, to: today })

  const { data: reports = [], isLoading } = useReports(applied.from, applied.to)

  const totalHours = reports.reduce((acc, ur) => acc + ur.totalHours, 0)
  const totalTasks = reports.reduce((acc, ur) => acc + ur.tasks.length, 0)
  const completedTasks = reports.reduce(
    (acc, ur) => acc + ur.tasks.filter(t => t.admin_status === ADMIN_STATUS.ONAYLANDI).length,
    0
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> Raporlar
        </h1>
        {reports.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => downloadCSV(reports)}
          >
            <Download className="h-4 w-4" /> CSV İndir
          </Button>
        )}
      </div>

      {/* Date filter */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5">
          <Label className="text-xs">Başlangıç</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 w-36 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Bitiş</Label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 w-36 text-sm" />
        </div>
        <Button
          size="sm"
          className="h-8"
          onClick={() => setApplied({ from, to })}
        >
          Uygula
        </Button>
        <span className="text-xs text-zinc-400 self-center">
          {applied.from} — {applied.to}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Toplam Süre", value: `${totalHours.toFixed(1)} sa`, icon: Clock, color: "text-blue-600 bg-blue-100" },
          { label: "Toplam Görev", value: totalTasks, icon: BarChart3, color: "text-zinc-600 bg-zinc-100" },
          { label: "Onaylanan", value: completedTasks, icon: CheckCircle, color: "text-emerald-600 bg-emerald-100" },
          {
            label: "Tamamlanma",
            value: totalTasks > 0 ? `%${Math.round((completedTasks / totalTasks) * 100)}` : "—",
            icon: TrendingUp,
            color: "text-purple-600 bg-purple-100"
          },
        ].map(card => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border-zinc-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500">{card.label}</p>
                    <p className="text-2xl font-bold text-zinc-900 mt-1">
                      {isLoading ? "—" : card.value}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${card.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Per user breakdown */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-zinc-400 text-sm py-8 text-center">Yükleniyor...</p>
        ) : reports.length === 0 ? (
          <p className="text-zinc-400 text-sm py-8 text-center">Bu tarih aralığında veri yok</p>
        ) : (
          reports.map((ur) => (
            <div key={ur.user.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-zinc-50/60 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-zinc-900 text-white text-xs font-bold">
                    {ur.user.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{ur.user.display_name}</p>
                    <p className="text-xs text-zinc-400">{ur.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <p className="font-bold text-zinc-900">{ur.totalHours.toFixed(1)} sa</p>
                    <p className="text-xs text-zinc-400">{ur.tasks.length} görev</p>
                  </div>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-white">
                    <TableHead className="w-20">Proje</TableHead>
                    <TableHead>Çizim No</TableHead>
                    <TableHead>Alt Tip</TableHead>
                    <TableHead className="w-24">Süre (sa)</TableHead>
                    <TableHead className="w-28">Tamamlanma</TableHead>
                    <TableHead className="w-24">Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ur.tasks.map((task) => (
                    <TableRow key={task.id} className="hover:bg-zinc-50/50">
                      <TableCell className="font-mono text-xs font-medium">{task.project?.code}</TableCell>
                      <TableCell className="font-mono text-sm">{task.drawing_no}</TableCell>
                      <TableCell className="text-sm text-zinc-600">{task.job_sub_type?.name || "-"}</TableCell>
                      <TableCell className="font-semibold">{(task.total_elapsed_seconds / 3600).toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-zinc-500">
                        {task.completion_date ? formatDate(task.completion_date) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            task.admin_status === ADMIN_STATUS.ONAYLANDI
                              ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                              : task.admin_status === ADMIN_STATUS.TAMAMLANDI
                              ? "border-orange-200 text-orange-700 bg-orange-50"
                              : "border-zinc-200 text-zinc-600"
                          }
                        >
                          {task.admin_status === ADMIN_STATUS.ONAYLANDI
                            ? "Onaylandı"
                            : task.admin_status === ADMIN_STATUS.TAMAMLANDI
                            ? "Onay Bekliyor"
                            : "Devam Ediyor"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
