"use client"

import { keepPreviousData, QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CreateTaskInput, Task } from "@/types/task"
import { toast } from "sonner"

export interface UseTasksParams {
  status?: string
  project_id?: string
  assigned_to?: string
  job_type_id?: string
  job_sub_type_id?: string
  zone_id?: string
  location?: string
  priority?: string
  assignment_state?: string
  timer_state?: string
  link_state?: string
  deadline_state?: string
  planned_start_from?: string
  planned_start_to?: string
  planned_end_from?: string
  planned_end_to?: string
  sort?: string
  my_tasks?: boolean
  search?: string
  limit?: number
  offset?: number
  include_links?: boolean
}

interface BulkImportInput {
  tasks: Array<Record<string, unknown>>
}

interface BulkImportResult {
  inserted: number
  skipped_duplicates: number
  errors: Array<{ index: number; message: string }>
}

type TaskMutationConfig<TVariables, TResult> = {
  mutationFn: (variables: TVariables) => Promise<TResult>
  successMessage?: string | ((result: TResult) => string | null)
  updateTaskCaches?: (queryClient: QueryClient, result: TResult) => void
  invalidateTasks?: boolean
  invalidateReports?: boolean
}

type TaskListQueryKey = ["tasks", UseTasksParams | undefined]

function buildTaskSearchParams(params?: UseTasksParams) {
  const searchParams = new URLSearchParams()

  if (params?.status) searchParams.set("status", params.status)
  if (params?.project_id) searchParams.set("project_id", params.project_id)
  if (params?.assigned_to) searchParams.set("assigned_to", params.assigned_to)
  if (params?.job_type_id) searchParams.set("job_type_id", params.job_type_id)
  if (params?.job_sub_type_id) searchParams.set("job_sub_type_id", params.job_sub_type_id)
  if (params?.zone_id) searchParams.set("zone_id", params.zone_id)
  if (params?.location) searchParams.set("location", params.location)
  if (params?.priority) searchParams.set("priority", params.priority)
  if (params?.assignment_state) searchParams.set("assignment_state", params.assignment_state)
  if (params?.timer_state) searchParams.set("timer_state", params.timer_state)
  if (params?.link_state) searchParams.set("link_state", params.link_state)
  if (params?.deadline_state) searchParams.set("deadline_state", params.deadline_state)
  if (params?.planned_start_from) searchParams.set("planned_start_from", params.planned_start_from)
  if (params?.planned_start_to) searchParams.set("planned_start_to", params.planned_start_to)
  if (params?.planned_end_from) searchParams.set("planned_end_from", params.planned_end_from)
  if (params?.planned_end_to) searchParams.set("planned_end_to", params.planned_end_to)
  if (params?.sort) searchParams.set("sort", params.sort)
  if (params?.my_tasks) searchParams.set("my_tasks", "true")
  if (params?.search) searchParams.set("search", params.search)
  if (params?.limit != null) searchParams.set("limit", String(params.limit))
  if (params?.offset != null) searchParams.set("offset", String(params.offset))
  if (params?.include_links) searchParams.set("include_links", "true")

  return searchParams
}

function normalizeTaskParams(params?: UseTasksParams): UseTasksParams | undefined {
  if (!params) {
    return undefined
  }

  return {
    status: params.status || undefined,
    project_id: params.project_id || undefined,
    assigned_to: params.assigned_to || undefined,
    job_type_id: params.job_type_id || undefined,
    job_sub_type_id: params.job_sub_type_id || undefined,
    zone_id: params.zone_id || undefined,
    location: params.location || undefined,
    priority: params.priority || undefined,
    assignment_state: params.assignment_state || undefined,
    timer_state: params.timer_state || undefined,
    link_state: params.link_state || undefined,
    deadline_state: params.deadline_state || undefined,
    planned_start_from: params.planned_start_from || undefined,
    planned_start_to: params.planned_start_to || undefined,
    planned_end_from: params.planned_end_from || undefined,
    planned_end_to: params.planned_end_to || undefined,
    sort: params.sort || undefined,
    my_tasks: params.my_tasks || undefined,
    search: params.search || undefined,
    limit: params.limit,
    offset: params.offset,
    include_links: params.include_links || undefined,
  }
}

async function readApiPayload<T>(response: Response, fallbackMessage: string): Promise<T> {
  let payload: { data?: T; error?: string } | null = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage)
  }

  return (payload?.data ?? payload) as T
}

function taskMatchesQuery(task: Task, params?: UseTasksParams) {
  if (params?.status && task.admin_status !== params.status) {
    return false
  }

  if (params?.project_id && task.project_id !== params.project_id) {
    return false
  }

  if (params?.assigned_to && task.assigned_to !== params.assigned_to) {
    return false
  }

  if (params?.job_type_id && task.job_type_id !== params.job_type_id) {
    return false
  }

  if (params?.job_sub_type_id && task.job_sub_type_id !== params.job_sub_type_id) {
    return false
  }

  if (params?.zone_id && task.zone_id !== params.zone_id) {
    return false
  }

  if (params?.location && task.location !== params.location) {
    return false
  }

  if (params?.priority && task.priority !== params.priority) {
    return false
  }

  if (params?.assignment_state === "assigned" && !task.assigned_to) {
    return false
  }

  if (params?.assignment_state === "unassigned" && task.assigned_to) {
    return false
  }

  if (params?.timer_state === "running" && !task.timer_started_at) {
    return false
  }

  if (params?.timer_state === "stopped" && task.timer_started_at) {
    return false
  }

  if (params?.link_state === "linked" && !task.linked_to_task_id && !(task.linked_tasks && task.linked_tasks.length > 0)) {
    return false
  }

  if (params?.link_state === "unlinked" && (task.linked_to_task_id || (task.linked_tasks && task.linked_tasks.length > 0))) {
    return false
  }

  if (params?.search) {
    const query = params.search.toLowerCase()
    const matchesSearch =
      task.drawing_no.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query) ||
      (task.project?.code ?? "").toLowerCase().includes(query) ||
      (task.zone?.name ?? "").toLowerCase().includes(query) ||
      (task.location ?? "").toLowerCase().includes(query) ||
      (task.assigned_user?.display_name ?? "").toLowerCase().includes(query)

    if (!matchesSearch) {
      return false
    }
  }

  return true
}

function mergeTaskIntoCachedLists(queryClient: QueryClient, updatedTask: Task) {
  const taskQueries = queryClient.getQueryCache().findAll({ queryKey: ["tasks"] })

  for (const query of taskQueries) {
    const currentTasks = query.state.data

    if (!Array.isArray(currentTasks)) {
      continue
    }

    const [, params] = query.queryKey as TaskListQueryKey
    const taskIndex = currentTasks.findIndex((task) => task.id === updatedTask.id)

    if (taskIndex === -1) {
      continue
    }

    const mergedTask = { ...currentTasks[taskIndex], ...updatedTask }

    if (!taskMatchesQuery(mergedTask, params)) {
      queryClient.setQueryData<Task[]>(
        query.queryKey,
        currentTasks.filter((task) => task.id !== updatedTask.id)
      )
      continue
    }

    const nextTasks = currentTasks.slice()
    nextTasks[taskIndex] = mergedTask
    queryClient.setQueryData<Task[]>(query.queryKey, nextTasks)
  }
}

function invalidateActiveTaskQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ["tasks"], refetchType: "active" })
}

function invalidateActiveReportQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ["reports"], refetchType: "active" })
}

function useTaskMutation<TVariables, TResult>({
  mutationFn,
  successMessage,
  updateTaskCaches,
  invalidateTasks,
  invalidateReports,
}: TaskMutationConfig<TVariables, TResult>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: async (result) => {
      updateTaskCaches?.(queryClient, result)

      if (invalidateTasks) {
        await invalidateActiveTaskQueries(queryClient)
      }

      if (invalidateReports) {
        await invalidateActiveReportQueries(queryClient)
      }

      if (successMessage) {
        const message = typeof successMessage === "function" ? successMessage(result) : successMessage
        if (message) {
          toast.success(message)
        }
      }
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useTasks(params?: UseTasksParams) {
  const searchParams = buildTaskSearchParams(params)
  const normalizedParams = normalizeTaskParams(params)

  return useQuery<Task[]>({
    queryKey: ["tasks", normalizedParams],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?${searchParams.toString()}`)
      return readApiPayload<Task[]>(response, "Görevler yüklenemedi")
    },
    placeholderData: keepPreviousData,
  })
}

export function useCreateTask() {
  return useTaskMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      return readApiPayload<Task>(response, "Görev oluşturulamadı")
    },
    successMessage: "Görev oluşturuldu",
    invalidateTasks: true,
  })
}

export function useAssignTask() {
  return useTaskMutation({
    mutationFn: async ({ taskId, userId }: { taskId: number; userId: string }) => {
      const response = await fetch(`/api/tasks/${taskId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: userId }),
      })

      return readApiPayload<Task>(response, "Görev atanamadı")
    },
    successMessage: "Görev atandı",
    updateTaskCaches: mergeTaskIntoCachedLists,
    invalidateTasks: true,
  })
}

export function useApproveTask() {
  return useTaskMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/tasks/${taskId}/approve`, { method: "POST" })
      return readApiPayload<Task>(response, "Onaylama başarısız")
    },
    successMessage: "Görev onaylandı",
    updateTaskCaches: mergeTaskIntoCachedLists,
    invalidateTasks: true,
    invalidateReports: true,
  })
}

export function useRejectTask() {
  return useTaskMutation({
    mutationFn: async ({ taskId, reason }: { taskId: number; reason?: string }) => {
      const response = await fetch(`/api/tasks/${taskId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })

      return readApiPayload<Task>(response, "Revizeye gönderme başarısız")
    },
    successMessage: "Görev revizeye gönderildi",
    updateTaskCaches: mergeTaskIntoCachedLists,
    invalidateTasks: true,
    invalidateReports: true,
  })
}

export function useCancelTask() {
  return useTaskMutation({
    mutationFn: async ({ taskId, reason }: { taskId: number; reason?: string }) => {
      const response = await fetch(`/api/tasks/${taskId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })

      return readApiPayload<Task>(response, "İptal başarısız")
    },
    successMessage: "Görev iptal edildi",
    updateTaskCaches: mergeTaskIntoCachedLists,
    invalidateTasks: true,
    invalidateReports: true,
  })
}

export function useReopenTask() {
  return useTaskMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/tasks/${taskId}/reopen`, { method: "POST" })
      return readApiPayload<Task>(response, "Tekrar açma başarısız")
    },
    successMessage: "Görev tekrar açıldı",
    updateTaskCaches: mergeTaskIntoCachedLists,
    invalidateTasks: true,
  })
}

export function useLinkTasks() {
  return useTaskMutation({
    mutationFn: async ({ primaryId, dependentIds }: { primaryId: number; dependentIds: number[] }) => {
      const response = await fetch(`/api/tasks/${primaryId}/link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dependent_task_ids: dependentIds }),
      })

      return readApiPayload<{ success: boolean; primary_id: number; dependent_ids: number[] }>(
        response,
        "Bağlı görevler güncellenemedi"
      )
    },
    successMessage: "Bağlı görevler güncellendi",
    invalidateTasks: true,
  })
}

export function useBulkImportTasks() {
  return useTaskMutation<BulkImportInput, BulkImportResult>({
    mutationFn: async (input) => {
      const response = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "İçe aktarma başarısız")
      }

      return payload as BulkImportResult
    },
    successMessage: (result) => {
      if (result.inserted > 0 && result.skipped_duplicates > 0) {
        return `${result.inserted} görev içe aktarıldı, ${result.skipped_duplicates} duplicate atlandı`
      }

      if (result.inserted > 0) {
        return `${result.inserted} görev içe aktarıldı`
      }

      if (result.skipped_duplicates > 0) {
        return `Hiçbir görev eklenmedi (${result.skipped_duplicates} duplicate atlandı)`
      }

      return null
    },
    invalidateTasks: true,
  })
}

export function useUpdateTask() {
  return useTaskMutation({
    mutationFn: async ({ taskId, updates }: { taskId: number; updates: Partial<Task> }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      return readApiPayload<Task>(response, "Görev güncellenemedi")
    },
    updateTaskCaches: mergeTaskIntoCachedLists,
    invalidateTasks: true,
    invalidateReports: true,
  })
}
