"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { TIMER_SYNC_INTERVAL_MS, TIMER_WARNING_HOURS } from "@/lib/constants"
import { formatDuration } from "@/lib/utils"
import { getEffectiveElapsedSeconds } from "@/lib/timer-utils"
import { useSharedSecond } from "@/hooks/use-shared-second"
import { Task } from "@/types/task"
import { ApiSessionExpiredError, readApiData } from "@/lib/api-client"

interface UseTaskTimerReturn {
  elapsedSeconds: number
  isRunning: boolean
  formattedTime: string
  isWarning: boolean
  start: () => Promise<void>
  stop: () => Promise<void>
  toggle: () => Promise<void>
  isLoading: boolean
}

export function useTaskTimer(task: Task, onUpdate?: (updatedTask: Partial<Task>) => void): UseTaskTimerReturn {
  const queryClient = useQueryClient()
  const currentSecond = useSharedSecond()
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    getEffectiveElapsedSeconds(task.total_elapsed_seconds, task.timer_started_at)
  )
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(task.timer_started_at)
  const [totalElapsed, setTotalElapsed] = useState(task.total_elapsed_seconds)
  const [isLoading, setIsLoading] = useState(false)

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRunning = timerStartedAt !== null

  useEffect(() => {
    if (isRunning) {
      setElapsedSeconds(getEffectiveElapsedSeconds(totalElapsed, timerStartedAt))
    }
  }, [currentSecond, isRunning, timerStartedAt, totalElapsed])

  useEffect(() => {
    if (isRunning) {
      syncIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/tasks/${task.id}/timer/sync`, { method: "POST" })
          await readApiData(response, "Kronometre senkronize edilemedi")
        } catch {
          // Sync failures are non-blocking for the UI.
        }
      }, TIMER_SYNC_INTERVAL_MS)
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [isRunning, task.id])

  useEffect(() => {
    if (!isRunning) {
      return
    }

    const heartbeatInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/tasks/${task.id}/timer/heartbeat`, { method: "POST" })
        await readApiData(response, "Kronometre heartbeat güncellenemedi")
      } catch {
        // pg_cron handles stale timers if heartbeat fails.
      }
    }, 5 * 60 * 1000)

    return () => clearInterval(heartbeatInterval)
  }, [isRunning, task.id])

  useEffect(() => {
    setTimerStartedAt(task.timer_started_at)
    setTotalElapsed(task.total_elapsed_seconds)
    setElapsedSeconds(getEffectiveElapsedSeconds(task.total_elapsed_seconds, task.timer_started_at))
  }, [task.timer_started_at, task.total_elapsed_seconds])

  const start = useCallback(async () => {
    if (task.linked_to_task_id) {
      toast.error("Bağımlı görevde kronometre başlatılamaz")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/tasks/${task.id}/timer/start`, { method: "POST" })
      const updatedTask = await readApiData<Partial<Task>>(response, "Kronometre başlatılamadı")

      setTimerStartedAt(updatedTask.timer_started_at ?? null)
      setTotalElapsed(updatedTask.total_elapsed_seconds ?? 0)
      onUpdate?.(updatedTask)
      await queryClient.invalidateQueries({ queryKey: ["tasks"], refetchType: "active" })
    } catch (error) {
      if (!(error instanceof ApiSessionExpiredError)) {
        toast.error("Kronometre başlatılamadı")
      }
    } finally {
      setIsLoading(false)
    }
  }, [onUpdate, queryClient, task.id, task.linked_to_task_id])

  const stop = useCallback(async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/tasks/${task.id}/timer/stop`, { method: "POST" })
      const updatedTask = await readApiData<Partial<Task>>(response, "Kronometre durdurulamadı")
      const nextElapsed = updatedTask.total_elapsed_seconds ?? 0

      setTimerStartedAt(null)
      setTotalElapsed(nextElapsed)
      setElapsedSeconds(nextElapsed)
      onUpdate?.(updatedTask)
      await queryClient.invalidateQueries({ queryKey: ["tasks"], refetchType: "active" })
    } catch (error) {
      if (!(error instanceof ApiSessionExpiredError)) {
        toast.error("Kronometre durdurulamadı")
      }
    } finally {
      setIsLoading(false)
    }
  }, [onUpdate, queryClient, task.id])

  const toggle = useCallback(async () => {
    if (isRunning) {
      await stop()
      return
    }

    await start()
  }, [isRunning, start, stop])

  const isWarning = elapsedSeconds / 3600 >= TIMER_WARNING_HOURS

  return {
    elapsedSeconds,
    isRunning,
    formattedTime: formatDuration(elapsedSeconds),
    isWarning,
    start,
    stop,
    toggle,
    isLoading,
  }
}
