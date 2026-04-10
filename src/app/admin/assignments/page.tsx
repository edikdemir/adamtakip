"use client"

import { useMemo, useState } from "react"
import { ClipboardList, UserPlus, Users } from "lucide-react"
import { CompactTaskTable } from "@/components/tasks/compact-task-table"
import { MetricCardStrip } from "@/components/layout/metric-card-strip"
import { PageHeader } from "@/components/layout/page-header"
import { TaskFilterPanel } from "@/components/tasks/task-filter-panel"
import { UserAvatar } from "@/components/ui/user-avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAssignTask, useTasks } from "@/hooks/use-tasks"
import { useJobTypes, useProjects, useUsers, useZones } from "@/hooks/use-reference-data"
import { useLocations } from "@/hooks/use-locations"
import { createTaskFilters, TaskFilterState } from "@/lib/tasks/task-filters"
import { ADMIN_STATUS } from "@/lib/constants"
import { Task } from "@/types/task"

function normalizeFilters(filters: TaskFilterState) {
  return {
    include_links: true,
    status: filters.status !== "all" ? filters.status : undefined,
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
    search: filters.search || undefined,
    sort: filters.sort,
  }
}

export default function AssignmentsPage() {
  const [filters, setFilters] = useState<TaskFilterState>(() =>
    createTaskFilters({ status: "all", assignment_state: "all" })
  )
  const [assignTask, setAssignTask] = useState<Task | null>(null)
  const [selectedUserId, setSelectedUserId] = useState("")

  const { data: tasks = [], isLoading } = useTasks(normalizeFilters(filters))
  const { data: users = [] } = useUsers()
  const { data: projects = [] } = useProjects()
  const { data: jobTypes = [] } = useJobTypes()
  const { data: zones = [] } = useZones(filters.project_id !== "all" ? filters.project_id : "")
  const { data: locations = [] } = useLocations(filters.project_id !== "all" ? filters.project_id : undefined)
  const assignTaskMutation = useAssignTask()

  const assignableTasks = useMemo(
    () => tasks.filter((task) => task.admin_status === ADMIN_STATUS.HAVUZDA || task.admin_status === ADMIN_STATUS.ATANDI),
    [tasks]
  )

  const workload = useMemo(
    () =>
      users
        .map((user) => ({
          ...user,
          activeTasks: tasks.filter(
            (task) =>
              task.assigned_to === user.id &&
              task.admin_status !== ADMIN_STATUS.ONAYLANDI &&
              task.admin_status !== ADMIN_STATUS.IPTAL
          ).length,
          activeHours: tasks
            .filter(
              (task) =>
                task.assigned_to === user.id &&
                task.admin_status !== ADMIN_STATUS.ONAYLANDI &&
                task.admin_status !== ADMIN_STATUS.IPTAL
            )
            .reduce((total, task) => total + task.total_elapsed_seconds / 3600 + (task.manual_hours ?? 0), 0),
        }))
        .sort((first, second) => second.activeTasks - first.activeTasks)
        .slice(0, 8),
    [tasks, users]
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

  const handleAssign = async () => {
    if (!assignTask || !selectedUserId) {
      return
    }

    await assignTaskMutation.mutateAsync({ taskId: assignTask.id, userId: selectedUserId })
    setAssignTask(null)
    setSelectedUserId("")
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Atama Akışı"
        title="Görev Atamaları"
        description="Havuzdaki veya yeniden dağıtılacak görevleri filtreleyin, çalışan yükünü görün ve aynı tablodan atama yapın."
      />

      <MetricCardStrip
        items={[
          { label: "Atanabilir görev", value: assignableTasks.length, icon: ClipboardList, tone: "blue" },
          { label: "Aktif çalışan özeti", value: workload.length, icon: Users, tone: "green" },
        ]}
      />

      <TaskFilterPanel
        filters={filters}
        onChange={handleFilterChange}
        onReset={() => setFilters(createTaskFilters())}
        projects={projects}
        users={users}
        jobTypes={jobTypes}
        zones={zones}
        locations={locations}
        resultCount={assignableTasks.length}
      />

      <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Users className="h-4 w-4" />
          </div>
          Çalışan yük dengesi
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {workload.map((user) => (
            <div key={user.id} className="rounded-[22px] border border-zinc-200 bg-zinc-50/80 p-4">
              <div className="flex items-center gap-3">
                <UserAvatar displayName={user.display_name} photoUrl={user.photo_url} size="md" className="ring-2 ring-white" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">{user.display_name}</p>
                  <p className="truncate text-xs text-zinc-500">{user.job_title || user.email}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-[11px] text-zinc-400">Aktif görev</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-950">{user.activeTasks}</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-[11px] text-zinc-400">Aktif saat</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-950">{user.activeHours.toFixed(1)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CompactTaskTable
        tasks={assignableTasks}
        isLoading={isLoading}
        emptyTitle="Atanabilir görev yok"
        emptyDescription="Havuzdaki veya yeniden dağıtılacak görevler burada görünecek."
        renderActions={(task) => (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-full px-3 text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-800"
            onClick={() => {
              setAssignTask(task)
              setSelectedUserId(task.assigned_to || "")
            }}
          >
            <UserPlus className="mr-1 h-3.5 w-3.5" />
            {task.assigned_to ? "Yeniden ata" : "Ata"}
          </Button>
        )}
      />

      <Dialog open={!!assignTask} onOpenChange={(open) => !open && setAssignTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görev Ata</DialogTitle>
            <DialogDescription>
              <strong>{assignTask?.drawing_no}</strong> ({assignTask?.project?.code}) görevini bir çalışana atayın.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm font-medium text-zinc-700">Çalışan seçin</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Çalışan seçin..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTask(null)}>
              İptal
            </Button>
            <Button onClick={handleAssign} disabled={!selectedUserId || assignTaskMutation.isPending}>
              {assignTaskMutation.isPending ? "Atanıyor..." : "Ata"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
