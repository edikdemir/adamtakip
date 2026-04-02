"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { Task } from "@/types/task"
import { getEffectiveElapsedSeconds } from "@/lib/timer-utils"
import { formatDuration } from "@/lib/utils"
import { TIMER_SYNC_INTERVAL_MS, TIMER_WARNING_HOURS } from "@/lib/constants"

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
  const [elapsedSeconds, setElapsedSeconds] = useState(() =>
    getEffectiveElapsedSeconds(task.total_elapsed_seconds, task.timer_started_at)
  )
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(task.timer_started_at)
  const [totalElapsed, setTotalElapsed] = useState(task.total_elapsed_seconds)
  const [isLoading, setIsLoading] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const isRunning = timerStartedAt !== null

  // Tick every second while running
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(getEffectiveElapsedSeconds(totalElapsed, timerStartedAt))
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, timerStartedAt, totalElapsed])

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

  // Sync state when task prop changes
  useEffect(() => {
    setTimerStartedAt(task.timer_started_at)
    setTotalElapsed(task.total_elapsed_seconds)
    setElapsedSeconds(getEffectiveElapsedSeconds(task.total_elapsed_seconds, task.timer_started_at))
  }, [task.timer_started_at, task.total_elapsed_seconds])

  const start = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/timer/start`, { method: "POST" })
      if (res.ok) {
        const { data } = await res.json()
        setTimerStartedAt(data.timer_started_at)
        setTotalElapsed(data.total_elapsed_seconds)
        onUpdate?.(data)
      }
    } finally {
      setIsLoading(false)
    }
  }, [task.id, onUpdate])

  const stop = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/timer/stop`, { method: "POST" })
      if (res.ok) {
        const { data } = await res.json()
        setTimerStartedAt(null)
        setTotalElapsed(data.total_elapsed_seconds)
        setElapsedSeconds(data.total_elapsed_seconds)
        onUpdate?.(data)
      }
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
