"use client"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 p-4">
      <div className="text-center max-w-md">
        <h2 className="text-lg font-semibold text-zinc-900 mb-2">Sayfa yüklenemedi</h2>
        <p className="text-sm text-zinc-500 mb-4">{error.message}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} size="sm">Tekrar Dene</Button>
          <Button variant="outline" size="sm" onClick={() => window.location.href = "/login"}>
            Giriş Sayfasına Dön
          </Button>
        </div>
      </div>
    </div>
  )
}
