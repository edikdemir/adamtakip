"use client"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { Notification } from "@/types/notification"
import { useCurrentUser } from "@/hooks/use-current-user"

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function useNotifications() {
  const { user } = useCurrentUser()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const { data, unreadCount } = await res.json()
        setNotifications(data || [])
        setUnreadCount(unreadCount || 0)
      }
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
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(async () => {
    await fetch("/api/notifications/read-all", { method: "POST" })
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead }
}
