import { formatDuration } from "@/lib/utils"

/**
 * Calculate current elapsed seconds for a task.
 * If timer is running (timer_started_at is set), adds the elapsed since start.
 */
export function getEffectiveElapsedSeconds(
  totalElapsedSeconds: number,
  timerStartedAt: string | null
): number {
  if (!timerStartedAt) return totalElapsedSeconds
  const startTime = new Date(timerStartedAt).getTime()
  const now = Date.now()
  const additionalSeconds = Math.max(0, (now - startTime) / 1000)
  return totalElapsedSeconds + additionalSeconds
}

export function getEffectiveElapsedFormatted(
  totalElapsedSeconds: number,
  timerStartedAt: string | null
): string {
  return formatDuration(getEffectiveElapsedSeconds(totalElapsedSeconds, timerStartedAt))
}

export function isTimerRunning(timerStartedAt: string | null): boolean {
  return timerStartedAt !== null
}
