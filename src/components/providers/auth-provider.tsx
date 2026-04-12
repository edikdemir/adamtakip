"use client"
import React, { createContext, useContext, useEffect, useState } from "react"
import { SessionUser } from "@/types/user"
import { readApiData } from "@/lib/api-client"

interface AuthContextValue {
  user: SessionUser | null
  isLoading: boolean
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  refetch: async () => {},
})

const PRESENCE_HEARTBEAT_INTERVAL_MS = 60_000

async function sendPresenceHeartbeat() {
  try {
    await fetch("/api/auth/heartbeat", { method: "POST", cache: "no-store" })
  } catch {
    // Presence is best-effort and must never interrupt the user flow.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me")
      const data = await readApiData<SessionUser>(res, "Oturum bilgisi alınamadı")
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    if (!user?.id) {
      return
    }

    const heartbeat = () => {
      if (document.visibilityState === "hidden") {
        return
      }

      void sendPresenceHeartbeat()
    }

    heartbeat()
    const intervalId = window.setInterval(heartbeat, PRESENCE_HEARTBEAT_INTERVAL_MS)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        heartbeat()
      }
    }

    window.addEventListener("focus", heartbeat)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", heartbeat)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [user?.id])

  return (
    <AuthContext.Provider value={{ user, isLoading, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
