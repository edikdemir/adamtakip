"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ManualTimeEntry } from "@/types/task"

export function useAddManualTime(taskId: number, onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ hours, reason }: { hours: number; reason: string }) => {
      const response = await fetch(`/api/tasks/${taskId}/manual-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours, reason }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Manuel süre eklenemedi")
      }

      return payload.data as ManualTimeEntry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["manual-time", taskId] })
      toast.success("Manuel süre eklendi")
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

export function useManualTimeEntries(taskId: number, enabled = false) {
  return useQuery({
    queryKey: ["manual-time", taskId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/manual-time`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error)
      }

      return payload.data as ManualTimeEntry[]
    },
    enabled,
  })
}
