"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, ClipboardList, Link2, SendHorizonal, Timer } from "lucide-react"
import { toast } from "sonner"
import { CompactTaskTable } from "@/components/tasks/compact-task-table"
import { LinkTasksDialog } from "@/components/tasks/link-tasks-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { MetricCardStrip } from "@/components/layout/metric-card-strip"
import { TaskFilterPanel } from "@/components/tasks/task-filter-panel"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TaskRowTimer } from "@/components/tasks/task-row-timer"
import { TimeDurationCell } from "@/components/tasks/time-duration-cell"
import { useTasks, useUpdateTask } from "@/hooks/use-tasks"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useJobTypes, useProjects, useZones } from "@/hooks/use-reference-data"
import { useLocations } from "@/hooks/use-locations"
import { createTaskFilters, STATUS_FILTER_OPTIONS, TaskFilterState } from "@/lib/tasks/task-filters"
import { ADMIN_STATUS, WORKER_STATUS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useTimerGuard } from "@/hooks/use-timer-guard"
import { Task } from "@/types/task"

function normalizeDashboardFilters(filters: TaskFilterState) {
  return {
    my_tasks: true,
    include_links: true,
    status: filters.status !== "all" ? filters.status : undefined,
    project_id: filters.project_id !== "all" ? filters.project_id : undefined,
    job_type_id: filters.job_type_id !== "all" ? filters.job_type_id : undefined,
    job_sub_type_id: filters.job_sub_type_id !== "all" ? filters.job_sub_type_id : undefined,
    zone_id: filters.zone_id !== "all" ? filters.zone_id : undefined,
    location: filters.location !== "all" ? filters.location : undefined,
    priority: filters.priority !== "all" ? filters.priority : undefined,
    timer_state: filters.timer_state !== "all" ? filters.timer_state : undefined,
    link_state: filters.link_state !== "all" ? filters.link_state : undefined,
    deadline_state: filters.deadline_state !== "all" ? filters.deadline_state : undefined,
    planned_start_from: filters.planned_start_from || undefined,
    planned_start_to: filters.planned_start_to || undefined,
    planned_end_from: filters.planned_end_from || undefined,
    planned_end_to: filters.planned_end_to || undefined,
    search: filters.search || undefined,
    sort: filters.sort,
  }
}

export default function DashboardPage() {
  const { user: currentUser } = useCurrentUser()
  const [filters, setFilters] = useState<TaskFilterState>(() => createTaskFilters())
  const [completionTask, setCompletionTask] = useState<Task | null>(null)
  const [linkPrimary, setLinkPrimary] = useState<Task | null>(null)

  const { data: tasks = [], isLoading, refetch } = useTasks(normalizeDashboardFilters(filters))
  const { data: activeTimers = [] } = useTasks({
    my_tasks: true,
    timer_state: "running",
    include_links: true,
    limit: 10,
  })
  const { data: projects = [] } = useProjects()
  const { data: jobTypes = [] } = useJobTypes()
  const { data: zones = [] } = useZones(filters.project_id !== "all" ? filters.project_id : "")
  const { data: locations = [] } = useLocations(filters.project_id !== "all" ? filters.project_id : undefined)
  const updateTask = useUpdateTask()

  const runningTimers = useMemo(
    () => activeTimers.filter((task) => task.assigned_to === currentUser?.id),
    [activeTimers, currentUser?.id]
  )

  useTimerGuard(runningTimers.length > 0)

  const summary = useMemo(
    () => ({
      total: tasks.length,
      running: runningTimers.length,
      waitingApproval: tasks.filter((task) => task.admin_status === ADMIN_STATUS.TAMAMLANDI).length,
    }),
    [runningTimers.length, tasks]
  )

  const handleFilterChange = (key: keyof TaskFilterState, value: string) => {
    setFilters((current) => {
      const next = { ...current, [key]: value }

      if (key === "project_id") {
        next.zone_id = "all"
        next.location = "all"
      }

      if (key === "job_type_id") {
        next.job_sub_type_id = "all"
      }

      return next
    })
  }

  const confirmCompletion = async () => {
    if (!completionTask) {
      return
    }

    await updateTask.mutateAsync({
      taskId: completionTask.id,
      updates: { worker_status: WORKER_STATUS.BITTI },
    })
    toast.success("Görev onaya gönderildi.")
    setCompletionTask(null)
    refetch()
  }

  const statusOptions = STATUS_FILTER_OPTIONS.filter((option) => option.value !== ADMIN_STATUS.HAVUZDA)

  return (
    <div className="space-y-5">
      {runningTimers.length > 0 ? (
        <div className="sticky top-0 z-30 -mx-1 rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
              <div className="space-y-1 text-sm text-red-900">
                <p className="font-semibold">Aktif kronometre çalışıyor.</p>
                <p>
                  {runningTimers.length === 1
                    ? `"${runningTimers[0].drawing_no}" görevinin süresi devam ediyor. Tarayıcıyı kapatmadan veya sayfadan ayrılmadan önce kontrol edin.`
                    : `${runningTimers.length} görevde aktif kronometre var. Tarayıcıyı kapatmadan veya sayfadan ayrılmadan önce sürelerinizi kontrol edin.`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {runningTimers.map((task) => (
                <span
                  key={task.id}
                  className="rounded-full border border-red-200 bg-white/90 px-3 py-1 text-xs font-medium text-red-700"
                >
                  {task.drawing_no || `Görev #${task.id}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <PageHeader
        eyebrow="Çalışan Görünümü"
        title="Görevlerim"
        description="Kendi iş listenizi filtreleyin, kronometrelerinizi yönetin ve görevleri onaya hazırlayın."
      />

      <MetricCardStrip
        items={[
          { label: "Toplam görev", value: summary.total, icon: ClipboardList, tone: "slate" },
          { label: "Aktif kronometre", value: summary.running, icon: Timer, tone: "green" },
          { label: "Onay bekleyen", value: summary.waitingApproval, icon: CheckCircle2, tone: "amber" },
        ]}
      />

      <TaskFilterPanel
        filters={filters}
        onChange={handleFilterChange}
        onReset={() => setFilters(createTaskFilters())}
        projects={projects}
        users={[]}
        jobTypes={jobTypes}
        zones={zones}
        locations={locations}
        resultCount={tasks.length}
        statusOptions={statusOptions}
        hideAssignedFilter
      />

      <CompactTaskTable
        tasks={tasks}
        isLoading={isLoading}
        showAssignedUser={false}
        rowClassName={(task) =>
          cn(
            task.admin_status === ADMIN_STATUS.IPTAL && "bg-zinc-50 opacity-70",
            task.timer_started_at && task.assigned_to === currentUser?.id && "bg-emerald-50/60"
          )
        }
        renderDuration={(task) =>
          task.admin_status !== ADMIN_STATUS.TAMAMLANDI &&
          task.admin_status !== ADMIN_STATUS.ONAYLANDI &&
          task.admin_status !== ADMIN_STATUS.IPTAL &&
          task.assigned_to === currentUser?.id ? (
            <TaskRowTimer
              task={task}
              onUpdate={() => refetch()}
              hasOtherActiveTimer={runningTimers.length > 0 && task.timer_started_at === null}
            />
          ) : (
            <TimeDurationCell task={task} />
          )
        }
        renderActions={(task) => {
          const canSubmit = task.admin_status === ADMIN_STATUS.DEVAM_EDIYOR && task.assigned_to === currentUser?.id
          const canLink =
            task.linked_to_task_id == null &&
            task.assigned_to === currentUser?.id &&
            task.admin_status !== ADMIN_STATUS.ONAYLANDI

          return (
            <div className="flex items-center gap-1">
              {canLink ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => setLinkPrimary(task)}
                >
                  <Link2 className="mr-1 h-3.5 w-3.5" />
                  {task.linked_tasks && task.linked_tasks.length > 0 ? "Bağlar" : "Linkle"}
                </Button>
              ) : null}

              {canSubmit ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  onClick={() => setCompletionTask(task)}
                >
                  <SendHorizonal className="mr-1 h-3.5 w-3.5" />
                  Onaya Gönder
                </Button>
              ) : null}
            </div>
          )
        }}
      />

      <Dialog open={!!completionTask} onOpenChange={(open) => !open && setCompletionTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onaya Gönder</DialogTitle>
            <DialogDescription>
              <strong>{completionTask?.drawing_no}</strong> görevini tamamlandı olarak işaretleyip yöneticinize
              onaya göndermek istiyor musunuz? Aktif bir timer varsa otomatik olarak durdurulacaktır.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletionTask(null)}>
              İptal
            </Button>
            <Button onClick={confirmCompletion} disabled={updateTask.isPending}>
              {updateTask.isPending ? "Gönderiliyor..." : "Evet, Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LinkTasksDialog
        open={!!linkPrimary}
        onOpenChange={(open) => !open && setLinkPrimary(null)}
        primary={linkPrimary}
        allUserTasks={tasks.filter((task) => task.assigned_to === currentUser?.id)}
      />
    </div>
  )
}
