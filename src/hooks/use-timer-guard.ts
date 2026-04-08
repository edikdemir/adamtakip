"use client"
import { useEffect } from "react"

// beforeunload → sadece diyalog göster (sendBeacon YOK — kullanıcı henüz karar vermedi)
// pagehide    → sendBeacon (sayfa gerçekten kapandığında tetiklenir;
//               "Sayfada Kal" seçilirse tetiklenmez → UI desenkronizasyonu yok)
export function useTimerGuard(hasRunningTimer: boolean) {
  useEffect(() => {
    if (!hasRunningTimer) return

    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }

    const pageHideHandler = () => {
      navigator.sendBeacon("/api/tasks/timer/stop-active")
    }

    window.addEventListener("beforeunload", beforeUnloadHandler)
    window.addEventListener("pagehide", pageHideHandler)
    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler)
      window.removeEventListener("pagehide", pageHideHandler)
    }
  }, [hasRunningTimer])
}
