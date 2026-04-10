"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { Task } from "@/types/task"
import { getEffectiveElapsedSeconds } from "@/lib/timer-utils"
import { formatDuration } from "@/lib/utils"
import { TIMER_SYNC_INTERVAL_MS, TIMER_WARNING_HOURS } from "@/lib/constants"
import { toast } from "sonner"
import { useSharedSecond } from "@/hooks/use-shared-second"

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

export function useTaskTimer(
  task: Task,
  onUpdate?: (updatedTask: Partial<Task>) => void
): UseTaskTimerReturn {
  const currentSecond = useSharedSecond()
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    getEffectiveElapsedSeconds(task.total_elapsed_seconds, task.timer_started_at)
  )
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(task.timer_started_at)
  const [totalElapsed, setTotalElapsed] = useState(task.total_elapsed_seconds)
  const [isLoading, setIsLoading] = useState(false)

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const isRunning = timerStartedAt !== null

  // Shared second ticker updates all visible timers from one source.
  useEffect(() => {
    if (isRunning) {
      setElapsedSeconds(getEffectiveElapsedSeconds(totalElapsed, timerStartedAt))
    }
  }, [currentSecond, isRunning, timerStartedAt, totalElapsed])

  // Periodic sync every 60s while running
  useEffect(() => {
    if (isRunning) {
      syncIntervalRef.current = setInterval(async () => {
        try {
          await fetch(`/api/tasks/${task.id}/timer/sync`, { method: "POST" })
        } catch {
          // Silently ignore sync failures
        }
      }, TIMER_SYNC_INTERVAL_MS)
    }
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    }
  }, [isRunning, task.id])

  // Heartbeat every 5 minutes while running — server uses this to detect stale timers
  useEffect(() => {
    if (!isRunning) return
    const heartbeatInterval = setInterval(async () => {
      try {
        await fetch(`/api/tasks/${task.id}/timer/heartbeat`, { method: "POST" })
      } catch {
        // Silently ignore — pg_cron will auto-stop after 30 min without heartbeat
      }
    }, 5 * 60 * 1000)
    return () => clearInterval(heartbeatInterval)
  }, [isRunning, task.id])

  // Sync state when task prop changes
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
      const res = await fetch(`/api/tasks/${task.id}/timer/start`, { method: "POST" })
      const json = await res.json()
      if (res.ok) {
        setTimerStartedAt(json.data.timer_started_at)
        setTotalElapsed(json.data.total_elapsed_seconds)
        onUpdate?.(json.data)
      } else {
        toast.error(json.error || "Timer başlatılamadı")
      }
    } catch {
      toast.error("Timer başlatılamadı")
    } finally {
      setIsLoading(false)
    }
  }, [task.id, onUpdate])

  const stop = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/timer/stop`, { method: "POST" })
      const json = await res.json()
      if (res.ok) {
        setTimerStartedAt(null)
        setTotalElapsed(json.data.total_elapsed_seconds)
        setElapsedSeconds(json.data.total_elapsed_seconds)
        onUpdate?.(json.data)
      } else {
        toast.error(json.error || "Timer durdurulamadı")
      }
    } catch {
      toast.error("Timer durdurulamadı")
    } finally {
      setIsLoading(false)
    }
  }, [task.id, onUpdate])

  const toggle = useCallback(async () => {
    if (isRunning) {
      await stop()
    } else {
      await start()
    }
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
