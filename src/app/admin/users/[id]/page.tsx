"use client"

import { use, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Layers,
  Pencil,
  Play,
  Square,
  Timer,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useCurrentUser } from "@/hooks/use-current-user"
import { UserIdentity } from "@/components/admin/users/user-identity"
import { MetricCardStrip } from "@/components/layout/metric-card-strip"
import { CompactTaskTable } from "@/components/tasks/compact-task-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ADMIN_STATUS, ADMIN_STATUS_LABELS, ROLE_LABELS, UserRole } from "@/lib/constants"
import { cn, formatDate, formatDateTime, formatDuration, formatHours, getDeadlineStatus } from "@/lib/utils"
import { getEffectiveElapsedSeconds } from "@/lib/timer-utils"
import { Task } from "@/types/task"

type DetailTab = "overview" | "tasks" | "timer"

interface TimerLog {
  id: number
  task_id: number
  action: "start" | "stop" | "reset" | "sync"
  elapsed_at_action: number
  created_at: string
  task: {
    id: number
    drawing_no: string
    description: string
    project: { code: string | null } | null
  } | null
}

interface UserData {
  id: string
  email: string
  display_name: string
  photo_url?: string | null
  job_title?: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

interface UserDetailResponse {
  user: UserData
  tasks: Task[]
  timer_logs: TimerLog[]
}

interface DailyStat {
  date: string
  label: string
  hours: number
  starts: number
  stops: number
  taskCount: number
}

interface BreakdownItem {
  label: string
  count: number
  totalSeconds: number
}

function buildDailyStats(timerLogs: TimerLog[]): DailyStat[] {
  const taskLastStart: Record<number, { elapsed: number }> = {}
  const dayMap: Record<string, { date: string; seconds: number; starts: number; stops: number; tasks: Set<number> }> = {}
  const sorted = [...timerLogs].reverse()

  for (const log of sorted) {
    const day = log.created_at.slice(0, 10)
    if (!dayMap[day]) {
      dayMap[day] = { date: day, seconds: 0, starts: 0, stops: 0, tasks: new Set() }
    }

    const dayEntry = dayMap[day]
    dayEntry.tasks.add(log.task_id)

    if (log.action === "start") {
      dayEntry.starts += 1
      taskLastStart[log.task_id] = { elapsed: log.elapsed_at_action }
      continue
    }

    if (log.action === "stop" || log.action === "sync") {
      if (log.action === "stop") {
        dayEntry.stops += 1
      }

      const previousStart = taskLastStart[log.task_id]
      if (previousStart) {
        const delta = log.elapsed_at_action - previousStart.elapsed
        if (delta > 0) {
          dayEntry.seconds += delta
        }
      }

      delete taskLastStart[log.task_id]
    }
  }

  return Object.values(dayMap)
    .sort((first, second) => first.date.localeCompare(second.date))
    .map((entry) => ({
      date: entry.date,
      label: new Date(`${entry.date}T00:00:00`).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "short",
      }),
      hours: Number.parseFloat((entry.seconds / 3600).toFixed(2)),
      starts: entry.starts,
      stops: entry.stops,
      taskCount: entry.tasks.size,
    }))
}

function getTaskTimerSeconds(task: Task) {
  return getEffectiveElapsedSeconds(task.total_elapsed_seconds, task.timer_started_at)
}

function getTaskTotalSeconds(task: Task) {
  return getTaskTimerSeconds(task) + (task.manual_hours ?? 0) * 3600
}

function buildBreakdown(tasks: Task[], labelResolver: (task: Task) => string, limit = 6): BreakdownItem[] {
  const breakdown = new Map<string, BreakdownItem>()

  for (const task of tasks) {
    const label = labelResolver(task)
    const current = breakdown.get(label) ?? { label, count: 0, totalSeconds: 0 }

    current.count += 1
    current.totalSeconds += getTaskTotalSeconds(task)
    breakdown.set(label, current)
  }

  return [...breakdown.values()]
    .sort((first, second) => {
      if (second.count !== first.count) {
        return second.count - first.count
      }

      return second.totalSeconds - first.totalSeconds
    })
    .slice(0, limit)
}

function useUserDetail(id: string) {
  return useQuery<UserDetailResponse>({
    queryKey: ["admin-user-detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users/${id}`)
      if (!response.ok) {
        throw new Error("Kullanıcı detayları yüklenemedi")
      }

      const payload = await response.json()
      return payload.data as UserDetailResponse
    },
  })
}

function HeroMetaCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-zinc-950">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  )
}

function BreakdownCard({
  title,
  description,
  items,
  accentClassName,
  emptyMessage,
}: {
  title: string
  description: string
  items: BreakdownItem[]
  accentClassName: string
  emptyMessage: string
}) {
  const maxCount = Math.max(...items.map((item) => item.count), 1)

  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-zinc-900">{title}</CardTitle>
        <p className="text-sm text-zinc-500">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">{emptyMessage}</p>
        ) : (
          items.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">{item.label}</p>
                  <p className="text-xs text-zinc-500">
                    {item.count} görev · {formatHours(item.totalSeconds)} sa
                  </p>
                </div>
                <span className="text-xs font-semibold text-zinc-500">
                  %{Math.round((item.count / maxCount) * 100)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100">
                <div
                  className={cn("h-2 rounded-full", accentClassName)}
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function TimerActionBadge({ action }: { action: TimerLog["action"] }) {
  if (action === "start") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <Play className="h-3 w-3" />
        Başlat
      </span>
    )
  }

  if (action === "stop") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        <Square className="h-3 w-3" />
        Durdur
      </span>
    )
  }

  if (action === "sync") {
    return (
      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
        Sync
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
      Sıfırla
    </span>
  )
}

function ActivityTimeline({ logs }: { logs: TimerLog[] }) {
  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <Activity className="h-4 w-4 text-blue-700" />
          Son Aktivite
        </CardTitle>
        <p className="text-sm text-zinc-500">Kullanıcının son kronometre hareketleri ve görev bağlamı.</p>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">Henüz zaman kaydı bulunmuyor.</p>
        ) : (
          <div className="space-y-4">
            {logs.map((log, index) => (
              <div key={log.id} className="flex gap-3">
                <div className="flex w-6 flex-col items-center">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                  {index < logs.length - 1 ? <span className="mt-1 h-full w-px bg-zinc-200" /> : null}
                </div>
                <div className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <TimerActionBadge action={log.action} />
                        <span className="font-mono text-xs text-zinc-400">{formatDateTime(log.created_at)}</span>
                      </div>
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {log.task?.drawing_no || `Görev #${log.task_id}`}
                      </p>
                      <p className="truncate text-sm text-zinc-500">{log.task?.description || "Görev açıklaması yok"}</p>
                    </div>
                    <div className="flex flex-col items-start gap-1 sm:items-end">
                      <Badge variant="secondary" className="rounded-full bg-white text-zinc-600">
                        {log.task?.project?.code || "Proje yok"}
                      </Badge>
                      <span className="font-mono text-xs font-semibold text-zinc-700">
                        {formatDuration(Math.floor(log.elapsed_at_action))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { isSuperAdmin, isLoading: authLoading } = useCurrentUser()
  const { data, isLoading } = useUserDetail(id)

  const [activeTab, setActiveTab] = useState<DetailTab>("overview")
  const [taskFilter, setTaskFilter] = useState<string>("all")

  const tasks = data?.tasks ?? []
  const timerLogs = data?.timer_logs ?? []
  const user = data?.user

  const dailyStats = useMemo(() => buildDailyStats(timerLogs), [timerLogs])
  const last30Days = useMemo(() => dailyStats.slice(-30), [dailyStats])

  const totalTimerSeconds = useMemo(() => tasks.reduce((sum, task) => sum + getTaskTimerSeconds(task), 0), [tasks])
  const totalManualHours = useMemo(() => tasks.reduce((sum, task) => sum + (task.manual_hours ?? 0), 0), [tasks])
  const totalWorkSeconds = useMemo(() => tasks.reduce((sum, task) => sum + getTaskTotalSeconds(task), 0), [tasks])

  const activeTasks = useMemo(
    () =>
      tasks.filter(
        (task) => task.admin_status === ADMIN_STATUS.ATANDI || task.admin_status === ADMIN_STATUS.DEVAM_EDIYOR
      ).length,
    [tasks]
  )

  const waitingApprovalCount = useMemo(
    () => tasks.filter((task) => task.admin_status === ADMIN_STATUS.TAMAMLANDI).length,
    [tasks]
  )

  const approvedTasks = useMemo(
    () => tasks.filter((task) => task.admin_status === ADMIN_STATUS.ONAYLANDI).length,
    [tasks]
  )

  const runningTimersCount = useMemo(
    () => tasks.filter((task) => task.timer_started_at !== null).length,
    [tasks]
  )

  const statusSummary = useMemo(
    () =>
      [
        ADMIN_STATUS.HAVUZDA,
        ADMIN_STATUS.ATANDI,
        ADMIN_STATUS.DEVAM_EDIYOR,
        ADMIN_STATUS.TAMAMLANDI,
        ADMIN_STATUS.ONAYLANDI,
        ADMIN_STATUS.IPTAL,
      ].map((status) => ({
        status,
        label: ADMIN_STATUS_LABELS[status],
        count: tasks.filter((task) => task.admin_status === status).length,
      })),
    [tasks]
  )

  const projectBreakdown = useMemo(
    () => buildBreakdown(tasks, (task) => task.project?.code || "Proje tanımsız"),
    [tasks]
  )

  const jobTypeBreakdown = useMemo(
    () => buildBreakdown(tasks, (task) => task.job_type?.name || "İş tipi tanımsız"),
    [tasks]
  )

  const recentActivityLogs = useMemo(() => timerLogs.slice(0, 7), [timerLogs])
  const recentLogs = useMemo(() => timerLogs.slice(0, 100), [timerLogs])

  const filteredTasks = useMemo(
    () => (taskFilter === "all" ? tasks : tasks.filter((task) => task.admin_status === taskFilter)),
    [tasks, taskFilter]
  )

  const filteredOverdueCount = useMemo(
    () =>
      filteredTasks.filter((task) => {
        if (task.admin_status === ADMIN_STATUS.ONAYLANDI || task.admin_status === ADMIN_STATUS.IPTAL) {
          return false
        }

        return getDeadlineStatus(task.planned_end) === "overdue"
      }).length,
    [filteredTasks]
  )

  const timerActionCounts = useMemo(
    () => ({
      starts: timerLogs.filter((log) => log.action === "start").length,
      stops: timerLogs.filter((log) => log.action === "stop").length,
      syncs: timerLogs.filter((log) => log.action === "sync").length,
    }),
    [timerLogs]
  )

  const averageTaskHours = tasks.length > 0 ? totalWorkSeconds / tasks.length : 0

  if (authLoading) {
    return null
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-zinc-500">Bu sayfaya erişim yetkiniz yok.</p>
      </div>
    )
  }

  if (isLoading || !user) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-5 w-40 rounded bg-zinc-100" />
            <div className="h-16 w-64 rounded bg-zinc-100" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 rounded-2xl bg-zinc-100" />
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-zinc-200 bg-white shadow-sm" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-zinc-200 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-zinc-200 bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mt-1 rounded-xl"
                  onClick={() => router.back()}
                  aria-label="Kullanıcı listesine geri dön"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">Kullanıcı Analitiği</p>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">Kullanıcı Detayı</h1>
                    <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                      Görev üretimi, süre kullanımı ve son aktivite akışını tek ekranda izleyin.
                    </p>
                  </div>

                  <UserIdentity
                    displayName={user.display_name}
                    photoUrl={user.photo_url}
                    email={user.email}
                    jobTitle={user.job_title}
                    size="xl"
                    titleSuffix={
                      <>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            user.role === "super_admin"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-zinc-100 text-zinc-600"
                          )}
                        >
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          )}
                        >
                          {user.is_active ? "Aktif" : "Pasif"}
                        </span>
                      </>
                    }
                    emailClassName="max-w-xl"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:w-[430px]">
                <HeroMetaCard label="Sisteme Katılım" value={formatDate(user.created_at)} hint="İlk kayıt tarihi" />
                <HeroMetaCard label="Toplam Görev" value={`${tasks.length} görev`} hint="Kullanıcıya atanmış tüm işler" />
                <HeroMetaCard label="Aktif Görev" value={`${activeTasks} görev`} hint="Atanmış veya devam eden işler" />
                <HeroMetaCard
                  label="Kronometre Durumu"
                  value={runningTimersCount > 0 ? `${runningTimersCount} aktif kronometre` : "Aktif kronometre yok"}
                  hint="Şu anda çalışan süre kayıtları"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <MetricCardStrip
        items={[
          { label: "Toplam görev", value: tasks.length, icon: Layers, tone: "slate" },
          { label: "Aktif görev", value: activeTasks, icon: Clock, tone: "blue" },
          { label: "Onay bekleyen", value: waitingApprovalCount, icon: AlertTriangle, tone: "amber" },
          { label: "Onaylanan", value: approvedTasks, icon: CheckCircle, tone: "green" },
          { label: "Toplam süre", value: `${formatHours(totalWorkSeconds)} sa`, icon: Timer, tone: "blue" },
          { label: "Manuel süre", value: `${totalManualHours.toFixed(1)} sa`, icon: Pencil, tone: "amber" },
        ]}
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DetailTab)} className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="overview" className="rounded-full px-4 py-2">
              Genel Bakış
            </TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-full px-4 py-2">
              Görevler ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="timer" className="rounded-full px-4 py-2">
              Kronometre Geçmişi ({timerLogs.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <Activity className="h-4 w-4 text-blue-700" />
                  Günlük Çalışma Saatleri
                </CardTitle>
                <p className="text-sm text-zinc-500">Son 30 gündeki aktif çalışma süresi ve günlük üretim ritmi.</p>
              </CardHeader>
              <CardContent>
                {last30Days.length === 0 ? (
                  <p className="py-10 text-center text-sm text-zinc-400">Henüz zaman kaydı bulunmuyor.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={last30Days} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#71717a" }} tickLine={false} axisLine={false} unit="sa" />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "14px",
                          border: "1px solid #e4e4e7",
                          boxShadow: "0 12px 28px -12px rgb(0 0 0 / 0.18)",
                        }}
                        formatter={(value) => [`${value} sa`, "Çalışma"]}
                        labelStyle={{ fontWeight: 600, color: "#18181b" }}
                      />
                      <Bar dataKey="hours" fill="#1d4ed8" radius={[8, 8, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Card className="border-zinc-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-zinc-900">Durum Dağılımı</CardTitle>
                  <p className="text-sm text-zinc-500">Görevlerin operasyon içindeki mevcut konumu.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {statusSummary.map((item) => {
                    const share = tasks.length > 0 ? (item.count / tasks.length) * 100 : 0

                    return (
                      <div key={item.status} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-zinc-700">{item.label}</p>
                          <span className="text-xs font-semibold text-zinc-500">
                            {item.count} görev · %{Math.round(share)}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-100">
                          <div
                            className={cn(
                              "h-2 rounded-full",
                              item.status === ADMIN_STATUS.ONAYLANDI && "bg-emerald-500",
                              item.status === ADMIN_STATUS.TAMAMLANDI && "bg-amber-500",
                              item.status === ADMIN_STATUS.DEVAM_EDIYOR && "bg-indigo-500",
                              item.status === ADMIN_STATUS.ATANDI && "bg-blue-500",
                              item.status === ADMIN_STATUS.HAVUZDA && "bg-zinc-400",
                              item.status === ADMIN_STATUS.IPTAL && "bg-rose-500"
                            )}
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card className="border-zinc-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-zinc-900">Süre Dağılımı</CardTitle>
                  <p className="text-sm text-zinc-500">Kronometre süresi, manuel giriş ve görev başı ortalama yük.</p>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-medium text-zinc-500">Timer süresi</p>
                    <p className="mt-2 text-lg font-semibold text-zinc-950">{formatHours(totalTimerSeconds)} sa</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 px-4 py-3">
                    <p className="text-xs font-medium text-amber-700">Manuel süre</p>
                    <p className="mt-2 text-lg font-semibold text-amber-900">{totalManualHours.toFixed(1)} sa</p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 px-4 py-3">
                    <p className="text-xs font-medium text-blue-700">Görev başı ortalama</p>
                    <p className="mt-2 text-lg font-semibold text-blue-900">{formatHours(averageTaskHours)} sa</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <BreakdownCard
              title="Proje Bazlı İş Yoğunluğu"
              description="Kullanıcının en çok çalıştığı proje kümeleri ve toplam harcanan süre."
              items={projectBreakdown}
              accentClassName="bg-blue-600"
              emptyMessage="Henüz proje bazlı görev verisi bulunmuyor."
            />
            <BreakdownCard
              title="İş Tipi Kırılımı"
              description="Görevlerin iş tipi dağılımı ve toplam iş yükü yoğunluğu."
              items={jobTypeBreakdown}
              accentClassName="bg-emerald-600"
              emptyMessage="Henüz iş tipi verisi bulunmuyor."
            />
          </div>

          <ActivityTimeline logs={recentActivityLogs} />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900">Görev Akışı</p>
                <p className="text-sm text-zinc-500">
                  Ortak görev tablosu görünümüyle kullanıcının tüm işlerini durum bazlı inceleyin.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full bg-zinc-100 text-zinc-600">
                    {filteredTasks.length} görev
                  </Badge>
                  <Badge variant="warning" className="rounded-full">
                    {filteredOverdueCount} gecikmiş
                  </Badge>
                </div>
                <Select value={taskFilter} onValueChange={setTaskFilter}>
                  <SelectTrigger className="w-[210px] rounded-full">
                    <SelectValue placeholder="Durum filtresi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm durumlar</SelectItem>
                    {Object.entries(ADMIN_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <CompactTaskTable
            tasks={filteredTasks}
            showAssignedUser={false}
            emptyTitle="Görev bulunamadı"
            emptyDescription="Seçili filtrede bu kullanıcıya ait görev görünmüyor."
            rowClassName={(task) =>
              cn(
                task.timer_started_at && "bg-indigo-50/25",
                !task.timer_started_at &&
                  task.admin_status !== ADMIN_STATUS.ONAYLANDI &&
                  task.admin_status !== ADMIN_STATUS.IPTAL &&
                  getDeadlineStatus(task.planned_end) === "overdue" &&
                  "bg-rose-50/30"
              )
            }
          />
        </TabsContent>

        <TabsContent value="timer" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">Toplam Log</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-950">{timerLogs.length}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">Başlatma</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">{timerActionCounts.starts}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">Durdurma</p>
              <p className="mt-2 text-2xl font-semibold text-amber-700">{timerActionCounts.stops}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-zinc-500">Son Hareket</p>
              <p className="mt-2 text-sm font-semibold text-zinc-900">
                {timerLogs[0] ? formatDateTime(timerLogs[0].created_at) : "-"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{timerActionCounts.syncs} sync kaydı</p>
            </div>
          </div>

          <Card className="border-zinc-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <Timer className="h-4 w-4 text-blue-700" />
                Kronometre Başlatma / Durdurma Geçmişi
              </CardTitle>
              <p className="text-sm text-zinc-500">En son 100 hareket burada zaman sırasına göre listelenir.</p>
            </CardHeader>
            <CardContent className="pt-0">
              {recentLogs.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-400">Henüz kronometre kaydı bulunmuyor.</p>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-100">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-50/90 hover:bg-zinc-50/90">
                        <TableHead className="w-44">Tarih / Saat</TableHead>
                        <TableHead className="w-28">İşlem</TableHead>
                        <TableHead className="w-28">Proje</TableHead>
                        <TableHead className="w-32">Resim No</TableHead>
                        <TableHead>Yapılacak İş</TableHead>
                        <TableHead className="w-28 text-right">O Andaki Süre</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentLogs.map((log) => (
                        <TableRow
                          key={log.id}
                          className={cn(
                            "hover:bg-zinc-50/70",
                            log.action === "start" && "bg-emerald-50/20",
                            log.action === "stop" && "bg-amber-50/20",
                            log.action === "reset" && "bg-rose-50/20"
                          )}
                        >
                          <TableCell className="font-mono text-xs text-zinc-500">{formatDateTime(log.created_at)}</TableCell>
                          <TableCell>
                            <TimerActionBadge action={log.action} />
                          </TableCell>
                          <TableCell className="text-sm font-medium text-zinc-700">
                            {log.task?.project?.code || "-"}
                          </TableCell>
                          <TableCell className="font-mono text-sm font-medium text-zinc-900">
                            {log.task?.drawing_no || "-"}
                          </TableCell>
                          <TableCell className="max-w-[280px]">
                            <p className="truncate text-sm text-zinc-600" title={log.task?.description || "-"}>
                              {log.task?.description || "-"}
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold text-zinc-800">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
