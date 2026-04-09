"use client"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface TaskNote {
  id: number
  content: string
  created_at: string
  user: {
    id: string
    display_name: string
    photo_url: string | null
  } | null
}

export function useTaskNotes(taskId: number, enabled = true) {
  return useQuery<TaskNote[]>({
    queryKey: ["task-notes", taskId],
    queryFn: () =>
      fetch(`/api/tasks/${taskId}/notes`).then(r => r.json()).then(r => r.data || []),
    enabled,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })
}

export function useAddTaskNote(taskId: number, onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/tasks/${taskId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Not eklenemedi")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-notes", taskId] })
      onSuccess?.()
    },
  })
}
