"use client"
import { use, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminStatusBadge, PriorityBadge } from "@/components/tasks/task-status-badge"
import { ADMIN_STATUS_LABELS } from "@/lib/constants"
import { formatDate, formatHours, formatDuration, getDeadlineStatus, cn } from "@/lib/utils"
import { getEffectiveElapsedSeconds } from "@/lib/timer-utils"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import {
  ArrowLeft, Clock, CheckCircle, Layers, Timer, AlertTriangle,
  Play, Square, User, Mail, Briefcase,
} from "lucide-react"

interface TimerLog {
  id: number
  task_id: number
  action: "start" | "stop" | "reset" | "sync"
  elapsed_at_action: number
  created_at: string
  task: { id: number; drawing_no: string; description: string; project: { code: string } } | null
}

interface TaskData {
  id: number
  drawing_no: string
  description: string
  priority: string
  admin_status: string
  worker_status: string
  total_elapsed_seconds: number
  timer_started_at: string | null
  manual_hours: number | null
  planned_start: string | null
  planned_end: string | null
  completion_date: string | null
  created_at: string
  project: { id: string; code: string; name: string | null } | null
  job_type: { id: string; name: string } | null
  job_sub_type: { id: string; name: string } | null
}

interface UserData {
  id: string
  email: string
  display_name: string
  job_title?: string | null
  role: string
  is_active: boolean
  created_at: string
}

// Build daily stats from timer logs
function buildDailyStats(timerLogs: TimerLog[]) {
  // For each task, track the last start time encountered (going forward in time)
  const taskLastStart: Record<number, { elapsed: number; date: string }> = {}
  const dayMap: Record<string, { date: string; seconds: number; starts: number; stops: number; tasks: Set<number> }> = {}

  // Process in chronological order
  const sorted = [...timerLogs].reverse()
  for (const log of sorted) {
    const day = log.created_at.slice(0, 10)
    if (!dayMap[day]) dayMap[day] = { date: day, seconds: 0, starts: 0, stops: 0, tasks: new Set() }
    const d = dayMap[day]
    d.tasks.add(log.task_id)

    if (log.action === "start") {
      d.starts++
      taskLastStart[log.task_id] = { elapsed: log.elapsed_at_action, date: day }
    } else if (log.action === "stop" || log.action === "sync") {
      if (log.action === "stop") d.stops++
      const prev = taskLastStart[log.task_id]
      if (prev) {
        const delta = log.elapsed_at_action - prev.elapsed
        if (delta > 0) d.seconds += delta
      }
      delete taskLastStart[log.task_id]
    }
  }

  return Object.values(dayMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      date: d.date,
      label: new Date(d.date + "T00:00:00").toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
      hours: parseFloat((d.seconds / 3600).toFixed(2)),
      starts: d.starts,
      stops: d.stops,
      taskCount: d.tasks.size,
    }))
}

function useUserDetail(id: string) {
  return useQuery({
    queryKey: ["admin-user-detail", id],
    queryFn: () =>
      fetch(`/api/admin/users/${id}`)
        .then(r => r.json())
        .then(r => r.data as { user: UserData; tasks: TaskData[]; timer_logs: TimerLog[] }),
  })
}

const ROLE_LABELS: Record<string, string> = {
  user: "Kullanıcı",
  super_admin: "Süper Admin",
}
const ROLE_COLORS: Record<string, string> = {
  user: "bg-zinc-100 text-zinc-600",
  super_admin: "bg-purple-100 text-purple-700",
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { isSuperAdmin, isLoading: authLoading } = useCurrentUser()
  const { data, isLoading } = useUserDetail(id)

  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "timer">("overview")
  const [taskFilter, setTaskFilter] = useState("all")

  const dailyStats = useMemo(
    () => (data?.timer_logs ? buildDailyStats(data.timer_logs) : []),
    [data?.timer_logs]
  )

  if (authLoading) return null
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-500">Bu sayfaya erişim yetkiniz yok.</p>
      </div>
    )
  }

  if (isLoading || !data) {
    return <div className="text-zinc-400 py-10 text-center">Yükleniyor...</div>
  }

  const { user, tasks, timer_logs } = data

  // Summary stats
  const totalSeconds = tasks.reduce(
    (sum, t) => sum + getEffectiveElapsedSeconds(t.total_elapsed_seconds, t.timer_started_at),
    0
  )
  const activeTasks = tasks.filter(t =>
    t.admin_status === "atandi" || t.admin_status === "devam_ediyor"
  ).length
  const completedTasks = tasks.filter(t => t.admin_status === "onaylandi").length
  const runningTimers = tasks.filter(t => t.timer_started_at !== null).length

  // Last 30 days chart data
  const last30 = dailyStats.slice(-30)

  // Filtered tasks
  const filteredTasks = taskFilter === "all" ? tasks : tasks.filter(t => t.admin_status === taskFilter)

  // Timer log display (most recent first, already ordered)
  const recentLogs = timer_logs.slice(0, 100)

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-1 p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-700 text-xl font-bold uppercase flex-shrink-0 shadow-sm">
              {user.display_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-zinc-900">{user.display_name}</h1>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ROLE_COLORS[user.role] || "bg-zinc-100 text-zinc-600")}>
                  {ROLE_LABELS[user.role] || user.role}
                </span>
                {!user.is_active && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                    Pasif
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />{user.email}
                </span>
                {user.job_title && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />{user.job_title}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Toplam Görev", value: tasks.length, icon: Layers, color: "text-zinc-600 bg-zinc-100" },
          { label: "Aktif Görev", value: activeTasks, icon: Clock, color: "text-blue-600 bg-blue-100" },
          { label: "Onaylandı", value: completedTasks, icon: CheckCircle, color: "text-green-600 bg-green-100" },
          { label: "Toplam Süre", value: formatDuration(Math.floor(totalSeconds)), icon: Timer, color: "text-indigo-600 bg-indigo-100" },
        ].map(card => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border-zinc-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-zinc-500 font-medium">{card.label}</p>
                    <p className="text-xl font-bold text-zinc-900 mt-0.5">{card.value}</p>
                  </div>
                  <div className={cn("p-2.5 rounded-xl flex-shrink-0", card.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 w-fit">
        {([
          { key: "overview", label: "Günlük İstatistikler" },
          { key: "tasks", label: `Görevler (${tasks.length})` },
          { key: "timer", label: `Kronometre Geçmişi (${timer_logs.length})` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Daily hours bar chart */}
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-700">
                Günlük Çalışma Saatleri (Son 30 Gün)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {last30.length === 0 ? (
                <p className="text-sm text-zinc-400 py-6 text-center">Henüz kayıt yok.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={last30} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#a1a1aa" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#a1a1aa" }}
                      tickLine={false}
                      axisLine={false}
                      unit="sa"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e4e4e7",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(val) => [`${val ?? 0} sa`, "Çalışma"]}
                      labelStyle={{ fontWeight: 600, color: "#18181b" }}
                    />
                    <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Daily stats table */}
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-zinc-700">
                Günlük Detay Tablosu
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {dailyStats.length === 0 ? (
                <p className="text-sm text-zinc-400 py-6 text-center">Kayıt bulunamadı.</p>
              ) : (
                <div className="rounded-lg border border-zinc-100 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-50/80">
                        <TableHead>Tarih</TableHead>
                        <TableHead className="text-right">Çalışma Süresi</TableHead>
                        <TableHead className="text-right">Görev Sayısı</TableHead>
                        <TableHead className="text-right">Başlatma</TableHead>
                        <TableHead className="text-right">Durdurma</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...dailyStats].reverse().map(row => (
                        <TableRow key={row.date} className="hover:bg-zinc-50/50">
                          <TableCell className="font-medium text-zinc-700">
                            {new Date(row.date + "T00:00:00").toLocaleDateString("tr-TR", {
                              weekday: "long", day: "2-digit", month: "long", year: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn(
                              "font-mono font-semibold text-sm",
                              row.hours >= 8 ? "text-green-600" : row.hours >= 4 ? "text-indigo-600" : "text-zinc-600"
                            )}>
                              {row.hours} sa
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm text-zinc-600">{row.taskCount}</TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <Play className="h-3 w-3" />{row.starts}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center gap-1 text-xs text-orange-600">
                              <Square className="h-3 w-3" />{row.stops}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tasks tab */}
      {activeTab === "tasks" && (
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-zinc-700">Atanan Görevler</CardTitle>
              <select
                value={taskFilter}
                onChange={e => setTaskFilter(e.target.value)}
                className="text-xs border border-zinc-200 rounded-lg px-2 py-1 text-zinc-600 bg-white"
              >
                <option value="all">Tüm Durumlar</option>
                {Object.entries(ADMIN_STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border border-zinc-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/80">
                    <TableHead className="w-24">Proje</TableHead>
                    <TableHead>İş Tipi</TableHead>
                    <TableHead className="w-28">Çizim No</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead className="w-28">Durum</TableHead>
                    <TableHead className="w-20">Öncelik</TableHead>
                    <TableHead className="w-24 text-right">Süre</TableHead>
                    <TableHead className="w-24">Hedef Bitiş</TableHead>
                    <TableHead className="w-24">Kesin Bitiş</TableHead>
                    <TableHead className="w-24">Onay Tarihi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10 text-zinc-400">
                        Bu filtrede görev yok.
                      </TableCell>
                    </TableRow>
                  ) : filteredTasks.map(task => {
                    const dl = getDeadlineStatus(task.planned_end)
                    const isRunning = task.timer_started_at !== null
                    const seconds = getEffectiveElapsedSeconds(task.total_elapsed_seconds, task.timer_started_at)
                    return (
                      <TableRow key={task.id} className={cn("hover:bg-zinc-50/50", isRunning && "bg-indigo-50/20")}>
                        <TableCell className="font-medium text-zinc-800">{task.project?.code}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <p className="font-medium text-zinc-700">{task.job_type?.name}</p>
                            <p className="text-zinc-400">{task.job_sub_type?.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">{task.drawing_no}</TableCell>
                        <TableCell className="max-w-[160px]">
                          <p className="text-sm truncate text-zinc-600" title={task.description}>
                            {task.description}
                          </p>
                        </TableCell>
                        <TableCell><AdminStatusBadge status={task.admin_status as never} /></TableCell>
                        <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-mono text-xs font-semibold", isRunning && "text-indigo-600")}>
                            {formatDuration(Math.floor(seconds))}
                            {isRunning && <span className="ml-1 animate-pulse">●</span>}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-sm",
                            dl === "overdue" && "text-red-600 font-medium",
                            dl === "warning" && "text-yellow-600 font-medium",
                            dl === "ok" && "text-zinc-500",
                            dl === "none" && "text-zinc-400",
                          )}>
                            {formatDate(task.planned_end)}
                            {dl === "overdue" && <AlertTriangle className="inline ml-1 h-3 w-3" />}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-500">
                          {formatDate(task.completion_date)}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-500">
                          {formatDate(task.approved_at)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timer log tab */}
      {activeTab === "timer" && (
        <Card className="border-zinc-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-700">
              Kronometre Başlatma / Durdurma Geçmişi
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-zinc-400 py-6 text-center">Henüz kronometre kaydı yok.</p>
            ) : (
              <div className="rounded-lg border border-zinc-100 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/80">
                      <TableHead className="w-40">Tarih / Saat</TableHead>
                      <TableHead className="w-24">İşlem</TableHead>
                      <TableHead className="w-24">Proje</TableHead>
                      <TableHead className="w-28">Çizim No</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead className="w-28 text-right">O Andaki Süre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLogs.map(log => (
                      <TableRow
                        key={log.id}
                        className={cn(
                          "hover:bg-zinc-50/50",
                          log.action === "start" && "bg-emerald-50/20",
                          log.action === "stop" && "bg-orange-50/20",
                          log.action === "reset" && "bg-red-50/20",
                        )}
                      >
                        <TableCell className="text-xs text-zinc-500 font-mono whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("tr-TR", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit", second: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          {log.action === "start" && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <Play className="h-3 w-3" /> Başlat
                            </span>
                          )}
                          {log.action === "stop" && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                              <Square className="h-3 w-3" /> Durdur
                            </span>
                          )}
                          {log.action === "sync" && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                              ↻ Sync
                            </span>
                          )}
                          {log.action === "reset" && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                              ✕ Sıfırla
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-zinc-700 text-sm">
                          {log.task?.project?.code ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.task?.drawing_no ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm truncate text-zinc-600" title={log.task?.description}>
                            {log.task?.description ?? "—"}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold text-zinc-700">
                          {formatDuration(Math.floor(log.elapsed_at_action))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
