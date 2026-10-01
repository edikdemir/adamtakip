import { useState, useEffect, useCallback } from "react"
import { Notification } from "@/types/notification"
import { useCurrentUser } from "@/hooks/use-current-user"
import { readApiData, readApiEnvelope } from "@/lib/api-client"

// P0: polling. P1'de SignalR (/hubs/board) ile anlık bildirime geçilecek.
const POLL_INTERVAL_MS = 30_000

export function useNotifications() {
  const { user } = useCurrentUser()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      const payload = await readApiEnvelope<Notification[]>(res, "Bildirimler yüklenemedi")
      setNotifications(Array.isArray(payload.data) ? payload.data : [])
      setUnreadCount(Number(payload.unreadCount ?? 0))
    } catch {
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (!user) return

    const tick = () => {
      if (document.visibilityState === "hidden") return
      void fetchNotifications()
    }

    const intervalId = window.setInterval(tick, POLL_INTERVAL_MS)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") tick()
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [user, fetchNotifications])

  const markAsRead = useCallback(async (id: string) => {
    const response = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
    await readApiData(response, "Bildirim okundu olarak işaretlenemedi")
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(async () => {
    const response = await fetch("/api/notifications/read-all", { method: "POST" })
    await readApiData(response, "Bildirimler okundu olarak işaretlenemedi")
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead }
}
