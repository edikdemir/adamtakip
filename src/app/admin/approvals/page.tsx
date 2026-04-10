"use client"

import { useMemo, useState } from "react"
import { Check, CheckCircle2, Clock, RotateCcw } from "lucide-react"
import { CompactTaskTable } from "@/components/tasks/compact-task-table"
import { MetricCardStrip } from "@/components/layout/metric-card-strip"
import { PageHeader } from "@/components/layout/page-header"
import { TaskFilterPanel } from "@/components/tasks/task-filter-panel"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useApproveTask, useRejectTask, useTasks } from "@/hooks/use-tasks"
import { useJobTypes, useProjects, useUsers, useZones } from "@/hooks/use-reference-data"
import { useLocations } from "@/hooks/use-locations"
import { createTaskFilters, TaskFilterState } from "@/lib/tasks/task-filters"
import { ADMIN_STATUS } from "@/lib/constants"
import { Task } from "@/types/task"

function normalizeFilters(filters: TaskFilterState) {
  return {
    include_links: true,
    status: ADMIN_STATUS.TAMAMLANDI,
    project_id: filters.project_id !== "all" ? filters.project_id : undefined,
    assigned_to: filters.assigned_to !== "all" ? filters.assigned_to : undefined,
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

export default function ApprovalsPage() {
  const [filters, setFilters] = useState<TaskFilterState>(() => createTaskFilters({ status: ADMIN_STATUS.TAMAMLANDI }))
  const [rejectTask, setRejectTask] = useState<Task | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const { data: tasks = [], isLoading } = useTasks(normalizeFilters(filters))
  const { data: projects = [] } = useProjects()
  const { data: jobTypes = [] } = useJobTypes()
  const { data: users = [] } = useUsers()
  const { data: zones = [] } = useZones(filters.project_id !== "all" ? filters.project_id : "")
  const { data: locations = [] } = useLocations(filters.project_id !== "all" ? filters.project_id : undefined)
  const approveTask = useApproveTask()
  const rejectTaskMutation = useRejectTask()

  const totalPendingHours = useMemo(
    () => tasks.reduce((total, task) => total + task.total_elapsed_seconds / 3600 + (task.manual_hours ?? 0), 0),
    [tasks]
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

  const handleReject = async () => {
    if (!rejectTask) {
      return
    }

    await rejectTaskMutation.mutateAsync({ taskId: rejectTask.id, reason: rejectReason })
    setRejectTask(null)
    setRejectReason("")
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Onay Operasyonu"
        title="Onay Kuyruğu"
        description="Tamamlanan görevleri daraltılmış tablo üzerinden inceleyin, detay panelini açın ve onay / revize akışlarını yönetin."
      />

      <MetricCardStrip
        items={[
          { label: "Bekleyen görev", value: tasks.length, icon: Clock, tone: "amber" },
          { label: "Toplam saat", value: `${totalPendingHours.toFixed(1)} sa`, icon: CheckCircle2, tone: "blue" },
        ]}
      />

      <TaskFilterPanel
        filters={filters}
        onChange={handleFilterChange}
        onReset={() => setFilters(createTaskFilters({ status: ADMIN_STATUS.TAMAMLANDI }))}
        projects={projects}
        users={users}
        jobTypes={jobTypes}
        zones={zones}
        locations={locations}
        resultCount={tasks.length}
        statusOptions={[{ value: ADMIN_STATUS.TAMAMLANDI, label: "Onay bekleyen" }]}
      />

      <CompactTaskTable
        tasks={tasks}
        isLoading={isLoading}
        rowClassName={() => "bg-amber-50/40"}
        emptyTitle="Onay bekleyen görev yok"
        emptyDescription="Yeni tamamlanan görevler burada listelenecek."
        renderActions={(task) => (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-full px-3 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
              onClick={() => approveTask.mutate(task.id)}
              disabled={approveTask.isPending}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Onayla
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 rounded-full px-3 text-xs text-amber-700 hover:bg-amber-50 hover:text-amber-800"
              onClick={() => {
                setRejectTask(task)
                setRejectReason("")
              }}
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Revize
            </Button>
          </div>
        )}
      />

      <Dialog open={!!rejectTask} onOpenChange={(open) => !open && setRejectTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revizeye Gönder</DialogTitle>
            <DialogDescription>
              <strong>{rejectTask?.drawing_no}</strong> görevi revizeye gönderilecek. Çalışana e-posta bildirimi
              iletilecek.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-medium text-zinc-700">Revize Sebebi</label>
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Düzeltilmesi gereken noktaları yazın..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTask(null)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || rejectTaskMutation.isPending}>
              {rejectTaskMutation.isPending ? "Gönderiliyor..." : "Revizeye Gönder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
