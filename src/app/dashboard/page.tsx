"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Link2, SendHorizonal } from "lucide-react"
import { toast } from "sonner"
import { CompactTaskTable } from "@/components/tasks/compact-task-table"
import { LinkTasksDialog } from "@/components/tasks/link-tasks-dialog"
import { TaskFilterPanel } from "@/components/tasks/task-filter-panel"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaskRowTimer } from "@/components/tasks/task-row-timer"
import { TimeDurationCell } from "@/components/tasks/time-duration-cell"
import { useTaskList, useTasks, useTaskSummary, useUpdateTask } from "@/hooks/use-tasks"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useJobTypes, useProjects, useZones } from "@/hooks/use-reference-data"
import { useLocations } from "@/hooks/use-locations"
import { createTaskFilters, STATUS_FILTER_OPTIONS, TaskFilterState } from "@/lib/tasks/task-filters"
import { ADMIN_STATUS, WORKER_STATUS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useTimerGuard } from "@/hooks/use-timer-guard"
import { Task } from "@/types/task"

const TASK_PAGE_SIZE = 100

function normalizeDashboardFilters(filters: TaskFilterState, offset: number) {
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
    limit: TASK_PAGE_SIZE,
    offset,
  }
}

export default function DashboardPage() {
  const { user: currentUser } = useCurrentUser()
  const [filters, setFilters] = useState<TaskFilterState>(() => createTaskFilters())
  const [completionTask, setCompletionTask] = useState<Task | null>(null)
  const [linkPrimary, setLinkPrimary] = useState<Task | null>(null)
  const [activeOffset, setActiveOffset] = useState(0)
  const [approvalOffset, setApprovalOffset] = useState(0)
  const [allOffset, setAllOffset] = useState(0)

  const { data: dashboardSummary } = useTaskSummary({
    my_tasks: true,
  })
  const { data: activeList, isLoading: isActiveLoading, refetch: refetchActiveTasks } = useTaskList({
    my_tasks: true,
    include_links: true,
    status: "active_work",
    limit: TASK_PAGE_SIZE,
    offset: activeOffset,
  })
  const { data: approvalList, isLoading: isApprovalLoading, refetch: refetchApprovalTasks } = useTaskList({
    my_tasks: true,
    include_links: true,
    status: ADMIN_STATUS.TAMAMLANDI,
    limit: TASK_PAGE_SIZE,
    offset: approvalOffset,
  })
  const { data: filteredList, isLoading: isFilteredLoading, refetch: refetchFilteredTasks } = useTaskList(
    normalizeDashboardFilters(filters, allOffset)
  )
  const { data: filteredSummary } = useTaskSummary(normalizeDashboardFilters(filters, 0))
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
  const activeWorkTasks = activeList?.data ?? []
  const waitingApprovalTasks = approvalList?.data ?? []
  const filteredTasks = filteredList?.data ?? []
  const allUserTasksForLink = [...activeWorkTasks, ...waitingApprovalTasks, ...filteredTasks]

  const runningTimers = useMemo(
    () => activeTimers.filter((task) => task.assigned_to === currentUser?.id),
    [activeTimers, currentUser?.id]
  )

  const updatedTodayCount = dashboardSummary?.updated_today_count ?? 0
  const waitingApprovalCount = dashboardSummary?.by_status?.[ADMIN_STATUS.TAMAMLANDI] ?? 0
  const activeWorkCount =
    (dashboardSummary?.by_status?.[ADMIN_STATUS.ATANDI] ?? 0) +
    (dashboardSummary?.by_status?.[ADMIN_STATUS.DEVAM_EDIYOR] ?? 0)
  const filteredTotal = filteredList?.meta.total ?? 0
  const overdueFilteredCount = filteredSummary?.overdue_count ?? 0

  useTimerGuard(runningTimers.length > 0)

  const handleFilterChange = (key: keyof TaskFilterState, value: string) => {
    setAllOffset(0)
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

  const refetchDashboardTasks = () => {
    void refetchActiveTasks()
    void refetchApprovalTasks()
    void refetchFilteredTasks()
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
    refetchDashboardTasks()
  }

  const statusOptions = STATUS_FILTER_OPTIONS.filter((option) => option.value !== ADMIN_STATUS.HAVUZDA)

  const renderDuration = (task: Task) =>
    task.admin_status !== ADMIN_STATUS.TAMAMLANDI &&
    task.admin_status !== ADMIN_STATUS.ONAYLANDI &&
    task.admin_status !== ADMIN_STATUS.IPTAL &&
    task.assigned_to === currentUser?.id ? (
      <TaskRowTimer
        task={task}
        onUpdate={refetchDashboardTasks}
        hasOtherActiveTimer={runningTimers.length > 0 && task.timer_started_at === null}
      />
    ) : (
      <TimeDurationCell task={task} />
    )

  const renderActions = (task: Task) => {
    const canSubmit = task.admin_status === ADMIN_STATUS.DEVAM_EDIYOR && task.assigned_to === currentUser?.id
    const canLink =
      task.linked_to_task_id == null && task.assigned_to === currentUser?.id && task.admin_status !== ADMIN_STATUS.ONAYLANDI

    return (
      <div className="flex items-center gap-1">
        {canLink ? (
          <Button variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => setLinkPrimary(task)}>
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
  }

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

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Kronometre Durumu</p>
          <p className={cn("mt-2 text-sm font-semibold", runningTimers.length > 0 ? "text-red-700" : "text-emerald-700")}>
            {runningTimers.length > 0 ? "Aktif kronometre var" : "Aktif kronometre yok"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Çalışma sırasında süreyi durdurmadan sayfadan ayrılmayın.</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Onay Akışı</p>
          <p className="mt-2 text-sm font-semibold text-amber-700">{waitingApprovalCount} görev onay bekliyor</p>
          <p className="mt-1 text-xs text-zinc-500">Tamamlayıp gönderdiğiniz işler bu sekmede izlenir.</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Bugünkü Hareket</p>
          <p className="mt-2 text-sm font-semibold text-blue-700">{updatedTodayCount} görev bugün güncellendi</p>
          <p className="mt-1 text-xs text-zinc-500">Bugün işlem gören görevleri hızlıca takip edin.</p>
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="active" className="rounded-full px-4 py-2">
              Aktif İşler ({activeWorkCount})
            </TabsTrigger>
            <TabsTrigger value="approval" className="rounded-full px-4 py-2">
              Onay Bekliyor ({waitingApprovalCount})
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-full px-4 py-2">
              Tüm Görevler ({filteredTotal})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active" className="space-y-4">
          <CompactTaskTable
            tasks={activeWorkTasks}
            isLoading={isActiveLoading}
            showAssignedUser={false}
            pagination={{
              total: activeList?.meta.total ?? 0,
              offset: activeList?.meta.offset ?? activeOffset,
              limit: activeList?.meta.limit ?? TASK_PAGE_SIZE,
              hasMore: activeList?.meta.has_more ?? false,
              onOffsetChange: setActiveOffset,
            }}
            emptyTitle="Aktif iş bulunamadı"
            emptyDescription="Atanan veya devam eden görevleriniz burada görünecek."
            rowClassName={(task) =>
              cn(
                task.admin_status === ADMIN_STATUS.IPTAL && "bg-zinc-50 opacity-70",
                task.timer_started_at && task.assigned_to === currentUser?.id && "bg-emerald-50/60"
              )
            }
            renderDuration={renderDuration}
            renderActions={renderActions}
          />
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          <CompactTaskTable
            tasks={waitingApprovalTasks}
            isLoading={isApprovalLoading}
            showAssignedUser={false}
            pagination={{
              total: approvalList?.meta.total ?? 0,
              offset: approvalList?.meta.offset ?? approvalOffset,
              limit: approvalList?.meta.limit ?? TASK_PAGE_SIZE,
              hasMore: approvalList?.meta.has_more ?? false,
              onOffsetChange: setApprovalOffset,
            }}
            emptyTitle="Onay bekleyen görev bulunmuyor"
            emptyDescription="Tamamlayıp onaya gönderdiğiniz görevler burada listelenecek."
            rowClassName={() => "bg-amber-50/40"}
          />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <TaskFilterPanel
            filters={filters}
            onChange={handleFilterChange}
            onReset={() => {
              setAllOffset(0)
              setFilters(createTaskFilters())
            }}
            projects={projects}
            users={[]}
            jobTypes={jobTypes}
            zones={zones}
            locations={locations}
            resultCount={filteredTotal}
            statusOptions={statusOptions}
            hideAssignedFilter
          />

          <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{filteredTotal} görev bulundu</p>
              <p className="text-xs text-zinc-500">Filtreler yalnızca bu sekmedeki görev listesini etkiler.</p>
            </div>
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
              {overdueFilteredCount} gecikmiş görev
            </span>
          </div>

          <CompactTaskTable
            tasks={filteredTasks}
            isLoading={isFilteredLoading}
            showAssignedUser={false}
            pagination={{
              total: filteredList?.meta.total ?? 0,
              offset: filteredList?.meta.offset ?? allOffset,
              limit: filteredList?.meta.limit ?? TASK_PAGE_SIZE,
              hasMore: filteredList?.meta.has_more ?? false,
              onOffsetChange: setAllOffset,
            }}
            emptyTitle="Görev bulunamadı"
            emptyDescription="Filtreleri değiştirerek farklı görevleri görebilirsiniz."
            rowClassName={(task) =>
              cn(
                task.admin_status === ADMIN_STATUS.IPTAL && "bg-zinc-50 opacity-70",
                task.timer_started_at && task.assigned_to === currentUser?.id && "bg-emerald-50/60"
              )
            }
            renderDuration={renderDuration}
            renderActions={renderActions}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!completionTask} onOpenChange={(open) => !open && setCompletionTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onaya Gönder</DialogTitle>
            <DialogDescription>
              <strong>{completionTask?.drawing_no}</strong> görevini tamamlandı olarak işaretleyip yöneticinize onaya
              göndermek istiyor musunuz? Aktif bir timer varsa otomatik olarak durdurulacaktır.
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
        allUserTasks={allUserTasksForLink.filter((task) => task.assigned_to === currentUser?.id)}
      />
    </div>
  )
}
