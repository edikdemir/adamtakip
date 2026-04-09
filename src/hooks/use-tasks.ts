"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Task, CreateTaskInput } from "@/types/task"
import { toast } from "sonner"

export function useTasks(params?: { status?: string; project_id?: string; my_tasks?: boolean }) {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set("status", params.status)
  if (params?.project_id) searchParams.set("project_id", params.project_id)
  if (params?.my_tasks) searchParams.set("my_tasks", "true")

  return useQuery<Task[]>({
    queryKey: ["tasks", params],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?${searchParams.toString()}`)
      if (!res.ok) throw new Error("Görevler yüklenemedi")
      const { data } = await res.json()
      return data
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      const { data } = await res.json()
      return data as Task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast.success("Görev oluşturuldu")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAssignTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: number; userId: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: userId }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast.success("Görev atandı")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useApproveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`/api/tasks/${taskId}/approve`, { method: "POST" })
      if (!res.ok) throw new Error("Onaylama başarısız")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast.success("Görev onaylandı")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRejectTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: number; reason?: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error("Revizeye gönderme başarısız")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast.success("Görev revizeye gönderildi")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCancelTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: number; reason?: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || "İptal başarısız")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast.success("Görev iptal edildi")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useReopenTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(`/api/tasks/${taskId}/reopen`, { method: "POST" })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || "Tekrar açma başarısız")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast.success("Görev tekrar açıldı")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useLinkTasks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ primaryId, dependentIds }: { primaryId: number; dependentIds: number[] }) => {
      const res = await fetch(`/api/tasks/${primaryId}/link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dependent_task_ids: dependentIds }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      toast.success("Bağlı görevler güncellendi")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

interface BulkImportInput {
  tasks: Array<Record<string, unknown>>
}

interface BulkImportResult {
  inserted: number
  skipped_duplicates: number
  errors: Array<{ index: number; message: string }>
}

export function useBulkImportTasks() {
  const queryClient = useQueryClient()
  return useMutation<BulkImportResult, Error, BulkImportInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || "İçe aktarma başarısız")
      }
      return res.json()
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      if (result.inserted > 0 && result.skipped_duplicates > 0) {
        toast.success(`${result.inserted} görev içe aktarıldı, ${result.skipped_duplicates} duplicate atlandı`)
      } else if (result.inserted > 0) {
        toast.success(`${result.inserted} görev içe aktarıldı`)
      } else if (result.skipped_duplicates > 0) {
        toast.info(`Hiçbir görev eklenmedi (${result.skipped_duplicates} duplicate atlandı)`)
      }
    },
    onError: (err) => toast.error(err.message),
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: number; updates: Partial<Task> }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      const { data } = await res.json()
      return data as Task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
