"use client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ManualTimeEntry } from "@/types/task"
import { toast } from "sonner"

export function useAddManualTime(taskId: number, onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ hours, reason }: { hours: number; reason: string }) => {
      const res = await fetch(`/api/tasks/${taskId}/manual-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours, reason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Manuel süre eklenemedi")
      return json.data as ManualTimeEntry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["manual-time", taskId] })
      toast.success("Manuel süre eklendi")
      onSuccess?.()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

export function useManualTimeEntries(taskId: number, enabled = false) {
  return useQuery({
    queryKey: ["manual-time", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/manual-time`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json.data as ManualTimeEntry[]
    },
    enabled,
  })
}
