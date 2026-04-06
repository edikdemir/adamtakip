"use client"
import { useState } from "react"
import { useTasks, useUpdateTask } from "@/hooks/use-tasks"
import { useCurrentUser } from "@/hooks/use-current-user"
import { Task } from "@/types/task"
import { TaskRowTimer } from "@/components/tasks/task-row-timer"
import { WorkerStatusBadge, PriorityBadge, AdminStatusBadge } from "@/components/tasks/task-status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { formatDate, formatHours, getDeadlineStatus, cn } from "@/lib/utils"
import { WORKER_STATUS, WORKER_STATUS_LABELS } from "@/lib/constants"
import { Search, AlertTriangle, Link2 } from "lucide-react"
import { toast } from "sonner"
import { useTimerGuard } from "@/hooks/use-timer-guard"
import { TaskLinkBadge } from "@/components/tasks/task-link-badge"
import { LinkTasksDialog } from "@/components/tasks/link-tasks-dialog"

export default function DashboardPage() {
  const { data: tasks = [], isLoading, refetch } = useTasks()
  const updateTask = useUpdateTask()
  const { user: currentUser } = useCurrentUser()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [completionTask, setCompletionTask] = useState<Task | null>(null)
  const [linkPrimary, setLinkPrimary] = useState<Task | null>(null)

  const filtered = tasks.filter((t) => {
    const matchSearch =
      !search ||
      t.drawing_no.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.project?.code?.toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      statusFilter === "all" || t.worker_status === statusFilter
    return matchSearch && matchStatus
  })

  // Tasks with running timers — only for current user's own tasks
  const runningTimers = tasks.filter((t) => t.timer_started_at !== null && t.assigned_to === currentUser?.id)

  useTimerGuard(runningTimers.length > 0)

  const handleStatusChange = async (task: Task, newStatus: string) => {
    if (newStatus === WORKER_STATUS.BITTI) {
      setCompletionTask(task)
      return
    }
    await updateTask.mutateAsync({ taskId: task.id, updates: { worker_status: newStatus as Task["worker_status"] } })
  }

  const confirmCompletion = async () => {
    if (!completionTask) return
    await updateTask.mutateAsync({
      taskId: completionTask.id,
      updates: { worker_status: WORKER_STATUS.BITTI },
    })
    toast.success("Görev tamamlandı olarak işaretlendi. Onay bekleniyor.")
    setCompletionTask(null)
    refetch()
  }

  return (
    <div className="space-y-4">
      {/* Running timer banner */}
      {runningTimers.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-sm text-emerald-800 font-medium">
          <span className="relative flex h-3 w-3 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
          <span>
            {runningTimers.length === 1
              ? `Aktif kronometre: "${runningTimers[0].drawing_no}"`
              : `${runningTimers.length} aktif kronometre çalışıyor`}
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Çizim no, açıklama, proje..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            {Object.entries(WORKER_STATUS_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-zinc-500">{filtered.length} görev</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/80">
              <TableHead className="w-24">Proje</TableHead>
              <TableHead>İş Tipi</TableHead>
              <TableHead>Çizim No</TableHead>
              <TableHead className="max-w-[200px]">Açıklama</TableHead>
              <TableHead className="w-24">Başlama</TableHead>
              <TableHead className="w-24">Hedef Bitiş</TableHead>
              <TableHead className="w-36">Kronometre</TableHead>
              <TableHead className="w-20">Süre (sa)</TableHead>
              <TableHead className="w-28">Durum</TableHead>
              <TableHead className="w-24">Öncelik</TableHead>
              <TableHead className="w-32">Bağlı Görevler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12 text-zinc-400">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12 text-zinc-400">
                  Görev bulunamadı
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((task) => {
                const deadlineStatus = getDeadlineStatus(task.planned_end)
                return (
                  <TableRow
                    key={task.id}
                    className={cn(
                      "hover:bg-zinc-50/50",
                      task.admin_status === "iptal" && "bg-zinc-50 opacity-60",
                      task.timer_started_at && task.assigned_to === currentUser?.id
                        ? "bg-emerald-50/60"
                        : ""
                    )}
                  >
                    <TableCell>
                      <span className="font-medium text-zinc-900">{task.project?.code}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-zinc-600">
                        <p className="font-medium">{task.job_type?.name}</p>
                        <p className="text-zinc-400">{task.job_sub_type?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm font-medium">{task.drawing_no}</span>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm text-zinc-700 truncate" title={task.description}>
                        {task.description}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-500">{formatDate(task.planned_start)}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-sm",
                        deadlineStatus === "overdue" && "text-red-600 font-medium",
                        deadlineStatus === "warning" && "text-yellow-600 font-medium",
                        deadlineStatus === "ok" && "text-zinc-500"
                      )}>
                        {formatDate(task.planned_end)}
                        {deadlineStatus === "overdue" && (
                          <AlertTriangle className="inline ml-1 h-3 w-3" />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {task.worker_status !== WORKER_STATUS.BITTI && task.admin_status !== "iptal" && task.admin_status !== "onaylandi" && task.assigned_to === currentUser?.id ? (
                        <TaskRowTimer
                          task={task}
                          onUpdate={() => refetch()}
                        />
                      ) : (
                        <span className="font-mono text-sm text-zinc-500">
                          {formatHours(task.total_elapsed_seconds)} sa
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-zinc-700">
                      {formatHours(task.total_elapsed_seconds)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={task.worker_status}
                        onValueChange={(val) => handleStatusChange(task, val)}
                        disabled={task.admin_status === "onaylandi" || task.admin_status === "iptal"}
                      >
                        <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 shadow-none hover:bg-zinc-100 rounded px-2">
                          <SelectValue>
                            <WorkerStatusBadge status={task.worker_status} />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(WORKER_STATUS_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={task.priority} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TaskLinkBadge
                          parent={task.linked_to_task}
                          dependents={task.linked_tasks}
                        />
                        {task.linked_to_task_id == null && task.assigned_to === currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => setLinkPrimary(task)}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            {task.linked_tasks && task.linked_tasks.length > 0 ? "Düzenle" : "Linkle"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Completion confirmation dialog */}
      <Dialog open={!!completionTask} onOpenChange={(open) => !open && setCompletionTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görevi Tamamla</DialogTitle>
            <DialogDescription>
              <strong>{completionTask?.drawing_no}</strong> görevini tamamlandı olarak işaretlemek istiyor musunuz?
              <br /><br />
              Timer otomatik olarak durdurulacak ve yöneticinize bildirim gönderilecek.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletionTask(null)}>İptal</Button>
            <Button onClick={confirmCompletion} disabled={updateTask.isPending}>
              {updateTask.isPending ? "Kaydediliyor..." : "Evet, Tamamlandı"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LinkTasksDialog
        open={!!linkPrimary}
        onOpenChange={(open) => !open && setLinkPrimary(null)}
        primary={linkPrimary}
        allUserTasks={tasks.filter((t) => t.assigned_to === currentUser?.id)}
      />
    </div>
  )
}
