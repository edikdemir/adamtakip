"use client"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { Notification } from "@/types/notification"
import { useCurrentUser } from "@/hooks/use-current-user"
import { readApiData, readApiEnvelope } from "@/lib/api-client"

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

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

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Supabase Realtime subscription
  useEffect(() => {
    if (!user) return

    const supabase = getSupabaseClient()
    if (!supabase) return

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const markAsRead = useCallback(async (id: string) => {
    const response = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
    await readApiData(response, "Bildirim okundu olarak işaretlenemedi")
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
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
