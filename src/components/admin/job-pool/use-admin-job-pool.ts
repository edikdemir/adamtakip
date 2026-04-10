"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { useLocations } from "@/hooks/use-locations"
import { useJobTypes, useProjects, useUsers, useZones } from "@/hooks/use-reference-data"
import {
  UseTasksParams,
  useApproveTask,
  useAssignTask,
  useCancelTask,
  useCreateTask,
  useRejectTask,
  useReopenTask,
  useTasks,
} from "@/hooks/use-tasks"
import { ADMIN_STATUS } from "@/lib/constants"
import { createTaskFilters, TaskFilterState } from "@/lib/tasks/task-filters"
import { CreateTaskInput, Task } from "@/types/task"

export interface JobPoolFormState {
  project_id: string
  job_type_id: string
  job_sub_type_id: string
  zone_id: string
  drawing_no: string
  description: string
  planned_start: string
  planned_end: string
  priority: "low" | "medium" | "high" | "urgent"
  location: string
  admin_notes: string
}

export interface JobPoolWorkerSummary {
  id: string
  display_name: string
  photo_url?: string | null
  job_title?: string | null
  count: number
}

function createEmptyForm(today: string): JobPoolFormState {
  return {
    project_id: "",
    job_type_id: "",
    job_sub_type_id: "",
    zone_id: "",
    drawing_no: "",
    description: "",
    planned_start: today,
    planned_end: "",
    priority: "medium",
    location: "",
    admin_notes: "",
  }
}

function normalizeTaskFilters(filters: TaskFilterState, deferredSearch: string): UseTasksParams {
  return {
    status: filters.status !== "all" ? filters.status : undefined,
    project_id: filters.project_id !== "all" ? filters.project_id : undefined,
    assigned_to: filters.assigned_to !== "all" ? filters.assigned_to : undefined,
    job_type_id: filters.job_type_id !== "all" ? filters.job_type_id : undefined,
    job_sub_type_id: filters.job_sub_type_id !== "all" ? filters.job_sub_type_id : undefined,
    zone_id: filters.zone_id !== "all" ? filters.zone_id : undefined,
    location: filters.location !== "all" ? filters.location : undefined,
    priority: filters.priority !== "all" ? filters.priority : undefined,
    assignment_state: filters.assignment_state !== "all" ? filters.assignment_state : undefined,
    timer_state: filters.timer_state !== "all" ? filters.timer_state : undefined,
    link_state: filters.link_state !== "all" ? filters.link_state : undefined,
    deadline_state: filters.deadline_state !== "all" ? filters.deadline_state : undefined,
    planned_start_from: filters.planned_start_from || undefined,
    planned_start_to: filters.planned_start_to || undefined,
    planned_end_from: filters.planned_end_from || undefined,
    planned_end_to: filters.planned_end_to || undefined,
    search: deferredSearch || undefined,
    sort: filters.sort,
    include_links: true,
  }
}

export function useAdminJobPool() {
  const today = new Date().toISOString().slice(0, 10)
  const [filters, setFilters] = useState<TaskFilterState>(() => createTaskFilters())
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [assignTask, setAssignTask] = useState<Task | null>(null)
  const [rejectTask, setRejectTask] = useState<Task | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [cancelTask, setCancelTask] = useState<Task | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [form, setForm] = useState<JobPoolFormState>(() => createEmptyForm(today))

  const deferredSearch = useDeferredValue(filters.search.trim())
  const queryParams = useMemo(() => normalizeTaskFilters(filters, deferredSearch), [deferredSearch, filters])

  const { data: tasks = [], isLoading } = useTasks(queryParams)
  const { data: projects = [] } = useProjects()
  const { data: jobTypes = [] } = useJobTypes()
  const { data: users = [] } = useUsers()
  const { data: zones = [] } = useZones(filters.project_id !== "all" ? filters.project_id : form.project_id)
  const { data: locations = [] } = useLocations(
    filters.project_id !== "all" ? filters.project_id : form.project_id || undefined
  )

  const createTask = useCreateTask()
  const approveTask = useApproveTask()
  const rejectTaskMutation = useRejectTask()
  const assignTaskMutation = useAssignTask()
  const cancelTaskMutation = useCancelTask()
  const reopenTaskMutation = useReopenTask()

  const selectedJobType = useMemo(
    () => jobTypes.find((jobType) => jobType.id === form.job_type_id),
    [form.job_type_id, jobTypes]
  )
  const subTypes = selectedJobType?.job_sub_types || []
  const selectedSubType = useMemo(
    () => subTypes.find((subType) => subType.id === form.job_sub_type_id),
    [form.job_sub_type_id, subTypes]
  )
  const workItemOptions = useMemo(
    () =>
      (selectedSubType?.job_work_items || [])
        .slice()
        .sort((first, second) => first.sort_order - second.sort_order)
        .map((workItem) => workItem.name),
    [selectedSubType]
  )

  const workerHighlights = useMemo(() => {
    const map = new Map<string, JobPoolWorkerSummary>()

    for (const task of tasks) {
      if (!task.assigned_user) {
        continue
      }

      const user = users.find((entry) => entry.id === task.assigned_user?.id)
      const current = map.get(task.assigned_user.id) ?? {
        id: task.assigned_user.id,
        display_name: task.assigned_user.display_name,
        photo_url: user?.photo_url ?? task.assigned_user.photo_url ?? null,
        job_title: user?.job_title ?? null,
        count: 0,
      }

      current.count += 1
      map.set(task.assigned_user.id, current)
    }

    return [...map.values()].sort((first, second) => second.count - first.count).slice(0, 8)
  }, [tasks, users])

  const pendingCount = useMemo(
    () => tasks.filter((task) => task.admin_status === ADMIN_STATUS.TAMAMLANDI).length,
    [tasks]
  )

  const activeTimerCount = useMemo(() => tasks.filter((task) => task.timer_started_at !== null).length, [tasks])

  const resetForm = () => setForm(createEmptyForm(today))

  const updateFilter = (key: keyof TaskFilterState, value: string) => {
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

  const resetFilters = () => setFilters(createTaskFilters())

  const handleCreate = async () => {
    const payload: CreateTaskInput = {
      ...form,
      zone_id: form.zone_id || undefined,
      planned_start: form.planned_start || undefined,
      planned_end: form.planned_end || undefined,
      location: form.location.trim(),
      admin_notes: form.admin_notes || undefined,
    }

    const createdTask = await createTask.mutateAsync(payload)
    if (form.admin_notes && createdTask?.id) {
      await fetch(`/api/tasks/${createdTask.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `Admin Notu: ${form.admin_notes}` }),
      })
    }

    setCreateOpen(false)
    resetForm()
  }

  const handleAssign = async () => {
    if (!assignTask || !selectedUserId) {
      return
    }

    await assignTaskMutation.mutateAsync({ taskId: assignTask.id, userId: selectedUserId })
    setAssignTask(null)
    setSelectedUserId("")
  }

  const handleReject = async () => {
    if (!rejectTask) {
      return
    }

    await rejectTaskMutation.mutateAsync({ taskId: rejectTask.id, reason: rejectReason })
    setRejectTask(null)
    setRejectReason("")
  }

  const handleCancel = async () => {
    if (!cancelTask) {
      return
    }

    await cancelTaskMutation.mutateAsync({ taskId: cancelTask.id, reason: cancelReason })
    setCancelTask(null)
    setCancelReason("")
  }

  return {
    filters,
    createOpen,
    importOpen,
    assignTask,
    rejectTask,
    rejectReason,
    cancelTask,
    cancelReason,
    selectedUserId,
    form,
    tasks,
    projects,
    jobTypes,
    users,
    zones,
    locations,
    subTypes,
    selectedSubType,
    workItemOptions,
    workerHighlights,
    pendingCount,
    activeTimerCount,
    isLoading,
    createTask,
    approveTask,
    rejectTaskMutation,
    assignTaskMutation,
    cancelTaskMutation,
    reopenTaskMutation,
    setCreateOpen,
    setImportOpen,
    setAssignTask,
    setRejectTask,
    setRejectReason,
    setCancelTask,
    setCancelReason,
    setSelectedUserId,
    setForm,
    setFilters,
    setFilter: updateFilter,
    resetFilters,
    handleCreate,
    handleAssign,
    handleReject,
    handleCancel,
  }
}

export type AdminJobPoolState = ReturnType<typeof useAdminJobPool>
