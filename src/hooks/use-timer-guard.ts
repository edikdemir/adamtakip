"use client"
import { useEffect } from "react"

// Registers a beforeunload handler when a timer is running.
// - Shows the browser's standard "Leave site?" confirmation dialog.
// - Sends a best-effort beacon to stop the timer on the server.
export function useTimerGuard(hasRunningTimer: boolean) {
  useEffect(() => {
    if (!hasRunningTimer) return

    const handler = (e: BeforeUnloadEvent) => {
      // Stop the active timer on the server (fire-and-forget via sendBeacon)
      navigator.sendBeacon("/api/tasks/timer/stop-active")
      // Trigger browser's built-in leave confirmation dialog
      e.preventDefault()
      e.returnValue = ""
    }

    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [hasRunningTimer])
}
