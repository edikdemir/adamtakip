"use client"
import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Download, Clock, CheckCircle, TrendingUp, Layers } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { ADMIN_STATUS } from "@/lib/constants"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportTask {
  id: number
  drawing_no: string
  total_elapsed_seconds: number
  manual_hours: number | null
  admin_status: string
  completion_date: string | null
  planned_end: string | null
  planned_start: string | null
  assigned_user: { id: string; display_name: string; email: string } | null
  project: { id: string; code: string; name: string | null } | null
  job_type: { id: string; name: string } | null
  job_sub_type: { id: string; name: string } | null
}

function adamSaat(t: ReportTask): number {
  return t.total_elapsed_seconds / 3600 + (t.manual_hours ?? 0)
}

// ─── Chart data builders ───────────────────────────────────────────────────────

function buildMonthlyData(tasks: ReportTask[]) {
  const map: Record<string, number> = {}
  for (const t of tasks) {
    const dateStr = t.completion_date ?? t.planned_end
    if (!dateStr) continue
    const month = dateStr.slice(0, 7)
    map[month] = (map[month] ?? 0) + adamSaat(t)
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, hours]) => ({
      month,
      label: new Date(month + "-01T00:00:00").toLocaleDateString("tr-TR", { year: "numeric", month: "short" }),
      hours: parseFloat(hours.toFixed(2)),
    }))
}

function buildJobTypePieData(tasks: ReportTask[]) {
  const map: Record<string, { name: string; hours: number }> = {}
  for (const t of tasks) {
    const key = t.job_type?.id ?? "unknown"
    const name = t.job_type?.name ?? "Bilinmiyor"
    if (!map[key]) map[key] = { name, hours: 0 }
    map[key].hours += adamSaat(t)
  }
  return Object.values(map)
    .sort((a, b) => b.hours - a.hours)
    .map(d => ({ ...d, hours: parseFloat(d.hours.toFixed(2)) }))
}

function buildWorkerData(tasks: ReportTask[]) {
  const map: Record<string, { name: string; hours: number }> = {}
  for (const t of tasks) {
    const u = t.assigned_user
    if (!u) continue
    if (!map[u.id]) map[u.id] = { name: u.display_name, hours: 0 }
    map[u.id].hours += adamSaat(t)
  }
  return Object.values(map)
    .sort((a, b) => b.hours - a.hours)
    .map(d => ({ ...d, hours: parseFloat(d.hours.toFixed(2)) }))
}

function buildSubTypeData(tasks: ReportTask[]) {
  const map: Record<string, { name: string; hours: number }> = {}
  for (const t of tasks) {
    const key = t.job_sub_type?.name ?? "Bilinmiyor"
    if (!map[key]) map[key] = { name: key, hours: 0 }
    map[key].hours += adamSaat(t)
  }
  return Object.values(map)
    .sort((a, b) => b.hours - a.hours)
    .map(d => ({ ...d, hours: parseFloat(d.hours.toFixed(2)) }))
}

interface UserReport {
  user: { id: string; display_name: string; email: string }
  tasks: ReportTask[]
  totalHours: number
}

function buildUserReports(tasks: ReportTask[]): UserReport[] {
  const map: Record<string, UserReport> = {}
  for (const t of tasks) {
    const u = t.assigned_user
    if (!u) continue
    if (!map[u.id]) map[u.id] = { user: u, tasks: [], totalHours: 0 }
    map[u.id].tasks.push(t)
    map[u.id].totalHours += adamSaat(t)
  }
  return Object.values(map).sort((a, b) => b.totalHours - a.totalHours)
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()).then(r => r.data || []),
  })
}
function useJobTypes() {
  return useQuery({
    queryKey: ["job-types"],
    queryFn: () => fetch("/api/job-types").then(r => r.json()).then(r => r.data || []),
  })
}
function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then(r => r.json()).then(r => r.data || []),
  })
}

interface Filters {
  from: string; to: string
  project_id: string; user_id: string; job_type_id: string; admin_status: string
}

function useReports(f: Filters) {
  const params = new URLSearchParams()
  if (f.from)         params.set("from", f.from)
  if (f.to)           params.set("to", f.to)
  if (f.project_id)   params.set("project_id", f.project_id)
  if (f.user_id)      params.set("user_id", f.user_id)
  if (f.job_type_id)  params.set("job_type_id", f.job_type_id)
  if (f.admin_status && f.admin_status !== "all") params.set("admin_status", f.admin_status)

  return useQuery<ReportTask[]>({
    queryKey: ["reports", f],
    queryFn: () =>
      fetch(`/api/reports?${params.toString()}`).then(r => r.json()).then(r => r.data || []),
  })
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function downloadCSV(tasks: ReportTask[]) {
  const rows: string[] = [
    ["Çalışan", "E-posta", "Proje", "Çizim No", "İş Tipi", "Alt Tip",
     "Kronometrik (sa)", "Manuel (sa)", "Toplam AdamxSaat (sa)", "Durum", "Tamamlanma"].join(","),
  ]
  for (const t of tasks) {
    const u = t.assigned_user
    rows.push([
      `"${u?.display_name ?? ""}"`,
      u?.email ?? "",
      t.project?.code ?? "",
      `"${t.drawing_no}"`,
      `"${t.job_type?.name ?? ""}"`,
      `"${t.job_sub_type?.name ?? ""}"`,
      (t.total_elapsed_seconds / 3600).toFixed(2),
      (t.manual_hours ?? 0).toFixed(2),
      adamSaat(t).toFixed(2),
      t.admin_status,
      t.completion_date ? formatDate(t.completion_date) : "",
    ].join(","))
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `adamsaat-rapor-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#f97316", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"]

const ONAY_OPTIONS = [
  { value: "onaylandi",    label: "Onaylandı" },
  { value: "tamamlandi",   label: "Onay Bekliyor" },
  { value: "devam_ediyor", label: "Devam Ediyor" },
  { value: "atandi",       label: "Atandı" },
  { value: "havuzda",      label: "Havuzda" },
  { value: "all",          label: "Tümü" },
]

const tooltipStyle = {
  contentStyle: { borderRadius: "8px", border: "1px solid #e4e4e7", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" },
  labelStyle: { fontWeight: 600, color: "#18181b" },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const today    = new Date().toISOString().slice(0, 10)
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const [filters, setFilters] = useState<Filters>({
    from: firstDay, to: today,
    project_id: "", user_id: "", job_type_id: "", admin_status: "onaylandi",
  })
  const [applied, setApplied] = useState<Filters>(filters)

  const { data: tasks = [], isLoading } = useReports(applied)
  const { data: projects = [] } = useProjects()
  const { data: jobTypes = [] }  = useJobTypes()
  const { data: users = [] }     = useUsers()

  const { monthlyData, jobTypePieData, workerData, subTypeData, userReports } = useMemo(() => ({
    monthlyData:    buildMonthlyData(tasks),
    jobTypePieData: buildJobTypePieData(tasks),
    workerData:     buildWorkerData(tasks),
    subTypeData:    buildSubTypeData(tasks),
    userReports:    buildUserReports(tasks),
  }), [tasks])

  const totalHours     = tasks.reduce((acc, t) => acc + adamSaat(t), 0)
  const totalTasks     = tasks.length
  const completedTasks = tasks.filter(t => t.admin_status === ADMIN_STATUS.ONAYLANDI).length

  const set = (key: keyof Filters) => (val: string) =>
    setFilters(f => ({ ...f, [key]: val }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" /> Aylık AdamxSaat Raporu
        </h1>
        {tasks.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => downloadCSV(tasks)}>
            <Download className="h-4 w-4" /> CSV İndir
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap bg-zinc-50 border border-zinc-200 rounded-xl p-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-500">Başlangıç</Label>
          <Input type="date" value={filters.from} onChange={e => set("from")(e.target.value)} className="h-8 w-36 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-500">Bitiş</Label>
          <Input type="date" value={filters.to} onChange={e => set("to")(e.target.value)} className="h-8 w-36 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-500">Proje</Label>
          <Select value={filters.project_id} onValueChange={set("project_id")}>
            <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="Tümü" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tüm Projeler</SelectItem>
              {projects.map((p: { id: string; code: string; name: string }) => (
                <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-500">Çalışan</Label>
          <Select value={filters.user_id} onValueChange={set("user_id")}>
            <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Tümü" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tüm Çalışanlar</SelectItem>
              {users.map((u: { id: string; display_name: string }) => (
                <SelectItem key={u.id} value={u.id}>{u.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-500">İşin Tipi</Label>
          <Select value={filters.job_type_id} onValueChange={set("job_type_id")}>
            <SelectTrigger className="h-8 w-40 text-sm"><SelectValue placeholder="Tümü" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tüm İş Tipleri</SelectItem>
              {jobTypes.map((jt: { id: string; name: string }) => (
                <SelectItem key={jt.id} value={jt.id}>{jt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-500">Onay Durumu</Label>
          <Select value={filters.admin_status} onValueChange={set("admin_status")}>
            <SelectTrigger className="h-8 w-44 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ONAY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="h-8" onClick={() => setApplied(filters)}>
          Uygula
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Toplam AdamxSaat", value: `${totalHours.toFixed(1)} sa`, icon: Clock, color: "text-blue-600 bg-blue-100" },
          { label: "Toplam Görev", value: totalTasks, icon: Layers, color: "text-zinc-600 bg-zinc-100" },
          { label: "Onaylanan", value: completedTasks, icon: CheckCircle, color: "text-emerald-600 bg-emerald-100" },
          {
            label: "Tamamlanma",
            value: totalTasks > 0 ? `%${Math.round((completedTasks / totalTasks) * 100)}` : "—",
            icon: TrendingUp,
            color: "text-purple-600 bg-purple-100",
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

      {/* Charts — 2×2 grid */}
      {isLoading ? (
        <p className="text-zinc-400 text-sm py-10 text-center">Yükleniyor...</p>
      ) : tasks.length === 0 ? (
        <p className="text-zinc-400 text-sm py-10 text-center">Bu filtrede veri bulunamadı</p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Chart 1 — Aylık AdamxSaat */}
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-zinc-700">Aylık AdamxSaat</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-8 text-center">Tarihlendirilmiş görev yok</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} tickLine={false} axisLine={false} unit="sa" />
                      <Tooltip {...tooltipStyle} formatter={(val) => [`${val} sa`, "AdamxSaat"]} />
                      <Bar dataKey="hours" name="AdamxSaat" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 2 — İş Tipine Göre Dağılım */}
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-zinc-700">İşin Tipine Göre AdamxSaat Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                {jobTypePieData.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-8 text-center">Veri yok</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={jobTypePieData}
                        dataKey="hours"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ percent }: { percent?: number }) =>
                          (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ""
                        }
                        labelLine={false}
                      >
                        {jobTypePieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} formatter={(val) => [`${val} sa`, "AdamxSaat"]} />
                      <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 3 — Çalışan Bazlı */}
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-zinc-700">Çalışan Bazlı AdamxSaat</CardTitle>
              </CardHeader>
              <CardContent>
                {workerData.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-8 text-center">Veri yok</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(200, workerData.length * 32)}>
                    <BarChart data={workerData} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} unit="sa" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#52525b" }} tickLine={false} axisLine={false} width={120} />
                      <Tooltip {...tooltipStyle} formatter={(val) => [`${val} sa`, "AdamxSaat"]} />
                      <Bar dataKey="hours" name="AdamxSaat" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={20}
                        label={{ position: "right", fontSize: 10, fill: "#52525b", formatter: (v: number) => `${v}` }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Chart 4 — Alt Tip Bazlı */}
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-zinc-700">İşin Alt Tipi Bazlı AdamxSaat</CardTitle>
              </CardHeader>
              <CardContent>
                {subTypeData.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-8 text-center">Veri yok</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(200, subTypeData.length * 32)}>
                    <BarChart data={subTypeData} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} unit="sa" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#52525b" }} tickLine={false} axisLine={false} width={140} />
                      <Tooltip {...tooltipStyle} formatter={(val) => [`${val} sa`, "AdamxSaat"]} />
                      <Bar dataKey="hours" name="AdamxSaat" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={20}
                        label={{ position: "right", fontSize: 10, fill: "#52525b", formatter: (v: number) => `${v}` }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Per-user breakdown table */}
          <div className="space-y-3">
            {userReports.map((ur) => (
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
                  <div className="text-right">
                    <p className="font-bold text-zinc-900">{ur.totalHours.toFixed(2)} sa</p>
                    <p className="text-xs text-zinc-400">{ur.tasks.length} görev</p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white">
                      <TableHead className="w-20">Proje</TableHead>
                      <TableHead>Çizim No</TableHead>
                      <TableHead>İş Tipi</TableHead>
                      <TableHead>Alt Tip</TableHead>
                      <TableHead className="w-24 text-right">AdamxSaat (sa)</TableHead>
                      <TableHead className="w-28">Tamamlanma</TableHead>
                      <TableHead className="w-24">Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ur.tasks.map((task) => (
                      <TableRow key={task.id} className="hover:bg-zinc-50/50">
                        <TableCell className="font-mono text-xs font-medium">{task.project?.code}</TableCell>
                        <TableCell className="font-mono text-sm">{task.drawing_no}</TableCell>
                        <TableCell className="text-sm text-zinc-600">{task.job_type?.name || "—"}</TableCell>
                        <TableCell className="text-sm text-zinc-500">{task.job_sub_type?.name || "—"}</TableCell>
                        <TableCell className="text-right font-semibold font-mono text-sm">
                          {adamSaat(task).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-500">
                          {task.completion_date ? formatDate(task.completion_date) : "—"}
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
            ))}
          </div>
        </>
      )}
    </div>
  )
}
