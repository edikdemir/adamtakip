"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ManualTimeEntry } from "@/types/task"
import { ApiSessionExpiredError, readApiArray, readApiData } from "@/lib/api-client"

export function useAddManualTime(taskId: number, onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ hours, reason }: { hours: number; reason: string }) => {
      const response = await fetch(`/api/tasks/${taskId}/manual-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours, reason }),
      })
      return readApiData<ManualTimeEntry>(response, "Manuel süre eklenemedi")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["manual-time", taskId] })
      toast.success("Manuel süre eklendi")
      onSuccess?.()
    },
    onError: (error: Error) => {
      if (!(error instanceof ApiSessionExpiredError)) {
        toast.error(error.message)
      }
    },
  })
}

export function useManualTimeEntries(taskId: number, enabled = false) {
  return useQuery({
    queryKey: ["manual-time", taskId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/manual-time`)
      return readApiArray<ManualTimeEntry>(response, "Manuel süreler yüklenemedi")
    },
    enabled,
  })
}
