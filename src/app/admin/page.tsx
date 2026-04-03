"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useTasks } from "@/hooks/use-tasks"
import { Task } from "@/types/task"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminStatusBadge, PriorityBadge } from "@/components/tasks/task-status-badge"
import { ADMIN_STATUS, ADMIN_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants"
import { getEffectiveElapsedSeconds } from "@/lib/timer-utils"
import { formatDuration, formatDate, formatHours, getDeadlineStatus, cn } from "@/lib/utils"
import {
  ClipboardList, UserCheck, CheckSquare, Clock, Timer,
  Search, AlertTriangle, Layers, BadgeCheck,
} from "lucide-react"

function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then(r => r.json()).then(r => r.data || []),
  })
}
function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then(r => r.json()).then(r => r.data || []),
  })
}

function LiveElapsed({ task }: { task: Task }) {
  const calc = useCallback(
    () => formatDuration(getEffectiveElapsedSeconds(task.total_elapsed_seconds, task.timer_started_at)),
    [task.total_elapsed_seconds, task.timer_started_at]
  )
  const [display, setDisplay] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setDisplay(calc()), 1000)
    return () => clearInterval(id)
  }, [calc])
  return <span className="font-mono text-sm font-semibold text-indigo-700 tabular-nums">{display}</span>
}

export default function AdminDashboardPage() {
  const { data: tasks = [], isLoading } = useTasks()
  const { data: users = [] } = useUsers()
  const { data: projects = [] } = useProjects()

  const [search, setSearch] = useState("")
  const [filterProject, setFilterProject] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [filterUser, setFilterUser] = useState("all")
  const [onlyActiveTimers, setOnlyActiveTimers] = useState(false)

  const stats = {
    havuzda: tasks.filter(t => t.admin_status === ADMIN_STATUS.HAVUZDA).length,
    atandi: tasks.filter(t => t.admin_status === ADMIN_STATUS.ATANDI).length,
    devam_ediyor: tasks.filter(t => t.admin_status === ADMIN_STATUS.DEVAM_EDIYOR).length,
    tamamlandi: tasks.filter(t => t.admin_status === ADMIN_STATUS.TAMAMLANDI).length,
    onaylandi: tasks.filter(t => t.admin_status === ADMIN_STATUS.ONAYLANDI).length,
    aktifTimer: tasks.filter(t => t.timer_started_at !== null).length,
    toplam: tasks.length,
  }

  const statCards = [
    { label: "İş Havuzunda", value: stats.havuzda, icon: ClipboardList, color: "text-zinc-600 bg-zinc-100" },
    { label: "Atandı", value: stats.atandi, icon: UserCheck, color: "text-blue-600 bg-blue-100" },
    { label: "Devam Ediyor", value: stats.devam_ediyor, icon: Layers, color: "text-indigo-600 bg-indigo-100" },
    { label: "Onay Bekliyor", value: stats.tamamlandi, icon: CheckSquare, color: "text-orange-600 bg-orange-100" },
    { label: "Onaylandı", value: stats.onaylandi, icon: BadgeCheck, color: "text-green-600 bg-green-100" },
    { label: "Aktif Timer", value: stats.aktifTimer, icon: Timer, color: "text-rose-600 bg-rose-100" },
  ]

  const activeTimerTasks = tasks.filter(t => t.timer_started_at !== null)
  const pendingApproval = tasks.filter(t => t.admin_status === ADMIN_STATUS.TAMAMLANDI)

  const filtered = tasks.filter(t => {
    if (onlyActiveTimers && !t.timer_started_at) return false
    if (filterProject !== "all" && t.project_id !== filterProject) return false
    if (filterStatus !== "all" && t.admin_status !== filterStatus) return false
    if (filterPriority !== "all" && t.priority !== filterPriority) return false
    if (filterUser !== "all" && t.assigned_to !== filterUser) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        t.drawing_no.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.project?.code?.toLowerCase().includes(q) ?? false) ||
        (t.assigned_user?.display_name?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  const hasActiveFilters = !!(search || filterProject !== "all" || filterStatus !== "all" ||
    filterPriority !== "all" || filterUser !== "all" || onlyActiveTimers)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Yönetim Paneli</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border-zinc-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500 font-medium truncate">{card.label}</p>
                    <p className="text-2xl font-bold text-zinc-900 mt-0.5">
                      {isLoading ? "—" : card.value}
                    </p>
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

      {/* Active timers */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            Aktif Kronometreler
            {activeTimerTasks.length > 0 && (
              <span className="ml-1 text-xs font-normal text-zinc-400">({activeTimerTasks.length})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {activeTimerTasks.length === 0 ? (
            <p className="text-sm text-zinc-400 py-2">Şu anda aktif kronometre çalışmıyor.</p>
          ) : (
            <div className="rounded-lg border border-zinc-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/80">
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead className="w-24">Proje</TableHead>
                    <TableHead className="w-28">Resim No</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead className="w-20">Öncelik</TableHead>
                    <TableHead className="w-32 text-right">Geçen Süre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTimerTasks.map(task => (
                    <TableRow key={task.id} className="bg-indigo-50/30 hover:bg-indigo-50/60">
                      <TableCell>
                        {task.assigned_user ? (
                          <Link
                            href={`/admin/users/${task.assigned_user.id}`}
                            className="text-sm font-bold text-indigo-700 hover:text-indigo-900 hover:underline underline-offset-2 transition-colors"
                          >
                            {task.assigned_user.display_name}
                          </Link>
                        ) : <span className="text-zinc-400">—</span>}
                      </TableCell>
                      <TableCell className="font-medium text-zinc-700">{task.project?.code}</TableCell>
                      <TableCell className="font-mono text-sm">{task.drawing_no}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm truncate text-zinc-600" title={task.description}>
                          {task.description}
                        </p>
                      </TableCell>
                      <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                      <TableCell className="text-right">
                        <LiveElapsed task={task} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending approval */}
      {pendingApproval.length > 0 && (
        <Card className="border-orange-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-orange-700">
              <Clock className="h-4 w-4" />
              Onay Bekleyen Görevler
              <span className="text-xs font-normal text-orange-500">({pendingApproval.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border border-orange-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-orange-50/60">
                    <TableHead>Proje</TableHead>
                    <TableHead>Resim No</TableHead>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>Bitiş Tarihi</TableHead>
                    <TableHead className="text-right">Süre (sa)</TableHead>
                    <TableHead>Öncelik</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApproval.map(task => {
                    const dl = getDeadlineStatus(task.planned_end)
                    return (
                      <TableRow key={task.id} className="hover:bg-orange-50/30">
                        <TableCell className="font-medium">{task.project?.code}</TableCell>
                        <TableCell className="font-mono text-sm">{task.drawing_no}</TableCell>
                        <TableCell>
                          {task.assigned_user ? (
                            <Link
                              href={`/admin/users/${task.assigned_user.id}`}
                              className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 hover:underline underline-offset-2 transition-colors"
                            >
                              {task.assigned_user.display_name}
                            </Link>
                          ) : <span className="text-zinc-400 text-sm">—</span>}
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
                        <TableCell className="text-right text-sm font-medium">
                          {formatHours(task.total_elapsed_seconds)}
                        </TableCell>
                        <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtered task table */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Tüm Görevler</span>
            <span className="text-xs font-normal text-zinc-400">
              {hasActiveFilters ? `${filtered.length} / ${stats.toplam}` : stats.toplam} görev
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Filters row */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative min-w-[180px] flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <Input
                placeholder="Çizim no, kullanıcı, proje..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Proje" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Projeler</SelectItem>
                {projects.map((p: { id: string; code: string; name: string | null }) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code}{p.name ? ` — ${p.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                {Object.entries(ADMIN_STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue placeholder="Öncelik" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Öncelikler</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="Kullanıcı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kullanıcılar</SelectItem>
                {users.map((u: { id: string; display_name: string }) => (
                  <SelectItem key={u.id} value={u.id}>{u.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <Switch
                id="timer-only"
                checked={onlyActiveTimers}
                onCheckedChange={setOnlyActiveTimers}
                className="scale-90"
              />
              <Label htmlFor="timer-only" className="text-xs text-zinc-600 cursor-pointer whitespace-nowrap">
                Aktif timer
              </Label>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearch(""); setFilterProject("all"); setFilterStatus("all")
                  setFilterPriority("all"); setFilterUser("all"); setOnlyActiveTimers(false)
                }}
                className="text-xs text-zinc-400 hover:text-zinc-600 underline whitespace-nowrap"
              >
                Temizle
              </button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-lg border border-zinc-100 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/80">
                  <TableHead className="w-14">ID</TableHead>
                  <TableHead className="w-20">Proje</TableHead>
                  <TableHead className="w-24">İş Tipi</TableHead>
                  <TableHead className="w-24">İş Alt Tipi</TableHead>
                  <TableHead className="w-20">Zone</TableHead>
                  <TableHead className="w-20">Mahal</TableHead>
                  <TableHead className="w-24">Resim No</TableHead>
                  <TableHead>Yapılacak İş</TableHead>
                  <TableHead className="w-32">Kullanıcı</TableHead>
                  <TableHead className="w-28">Durum</TableHead>
                  <TableHead className="w-20">Öncelik</TableHead>
                  <TableHead className="w-20 text-right">Süre (sa)</TableHead>
                  <TableHead className="w-24">Hedef Bitiş</TableHead>
                  <TableHead className="w-24">Tamamlanma</TableHead>
                  <TableHead className="w-10 text-center">⏱</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-12 text-zinc-400">
                      Yükleniyor...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-12 text-zinc-400">
                      {hasActiveFilters ? "Filtreyle eşleşen görev yok." : "Henüz görev oluşturulmadı."}
                    </TableCell>
                  </TableRow>
                ) : filtered.map(task => {
                  const dl = getDeadlineStatus(task.planned_end)
                  const isRunning = task.timer_started_at !== null
                  return (
                    <TableRow
                      key={task.id}
                      className={cn("hover:bg-zinc-50/50", isRunning && "bg-indigo-50/20")}
                    >
                      <TableCell className="font-mono text-xs text-zinc-400">#{task.id}</TableCell>
                      <TableCell className="font-medium text-zinc-800">{task.project?.code}</TableCell>
                      <TableCell className="text-xs text-zinc-700">{task.job_type?.name}</TableCell>
                      <TableCell className="text-xs text-zinc-500">{task.job_sub_type?.name}</TableCell>
                      <TableCell className="text-xs text-zinc-600">{task.zone?.name || <span className="text-zinc-300">—</span>}</TableCell>
                      <TableCell className="text-xs text-zinc-600">{task.location || <span className="text-zinc-300">—</span>}</TableCell>
                      <TableCell className="font-mono text-xs font-medium">{task.drawing_no}</TableCell>
                      <TableCell className="max-w-[140px]">
                        <p className="text-sm truncate text-zinc-600" title={task.description}>
                          {task.description}
                        </p>
                      </TableCell>
                      <TableCell>
                        {task.assigned_user ? (
                          <Link
                            href={`/admin/users/${task.assigned_user.id}`}
                            className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 hover:underline underline-offset-2 transition-colors"
                          >
                            {task.assigned_user.display_name}
                          </Link>
                        ) : <span className="text-zinc-400">—</span>}
                      </TableCell>
                      <TableCell><AdminStatusBadge status={task.admin_status} /></TableCell>
                      <TableCell><PriorityBadge priority={task.priority} /></TableCell>
                      <TableCell className="text-right text-sm font-medium text-zinc-700">
                        {formatHours(task.total_elapsed_seconds)}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-xs",
                          dl === "overdue" && "text-red-600 font-medium",
                          dl === "warning" && "text-yellow-600 font-medium",
                          dl === "ok" && "text-zinc-500",
                          dl === "none" && "text-zinc-400",
                        )}>
                          {formatDate(task.planned_end)}
                          {dl === "overdue" && <AlertTriangle className="inline ml-1 h-3 w-3" />}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-500">
                        {formatDate(task.completion_date)}
                      </TableCell>
                      <TableCell className="text-center">
                        {isRunning ? (
                          <span className="relative flex h-2 w-2 mx-auto">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                          </span>
                        ) : (
                          <span className="text-zinc-200 text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
