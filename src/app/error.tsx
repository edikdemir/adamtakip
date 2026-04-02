"use client"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="tr">
      <body className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">Bir hata oluştu</h2>
          <p className="text-sm text-zinc-500 mb-1">{error.message}</p>
          {error.digest && <p className="text-xs text-zinc-400 mb-4">Hata kodu: {error.digest}</p>}
          <div className="flex gap-3 justify-center">
            <Button onClick={reset} size="sm">Tekrar Dene</Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/login"}>
              Giriş Sayfasına Dön
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
