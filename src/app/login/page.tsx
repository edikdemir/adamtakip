"use client"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const ERROR_MESSAGES: Record<string, string> = {
  no_code: "Yetkilendirme kodu alınamadı.",
  no_account: "Hesap bilgisi alınamadı.",
  account_disabled: "Hesabınız devre dışı bırakılmış. Yöneticinizle iletişime geçin.",
  user_creation_failed: "Hesap oluşturulamadı. Lütfen tekrar deneyin.",
  internal: "Bir hata oluştu. Lütfen tekrar deneyin.",
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  const error = searchParams.get("error")
  const errorMessage = error ? (ERROR_MESSAGES[error] || "Giriş sırasında bir hata oluştu.") : null

  useEffect(() => {
    fetch("/api/auth/me").then((res) => {
      if (res.ok) router.replace("/dashboard")
    })
  }, [router])

  const handleLogin = () => {
    setIsLoading(true)
    window.location.href = "/api/auth/login"
  }

  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Giriş Yap</CardTitle>
        <CardDescription>
          Kurumsal Microsoft hesabınızla giriş yapın.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <Button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full h-11 text-sm font-medium"
          size="lg"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Yönlendiriliyor...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
              Microsoft ile Giriş Yap
            </span>
          )}
        </Button>

        <p className="text-xs text-zinc-500 text-center">
          Kurumsal @cemreshipyard.com hesabınızla giriş yapınız.
          <br />Sorun yaşıyorsanız Bilgi İşlem Birimiyle iletişime geçin.
        </p>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-900 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Adam Takip</h1>
          <p className="text-zinc-500 text-sm mt-1">Cemre Tersanesi | Dizayn Departmanı İş Takip Sistemi</p>
        </div>

        <Suspense fallback={
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="p-6">
              <div className="h-10 bg-zinc-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-zinc-400 mt-6">
          © 2025 Cemre Tersanesi Bilgi İşlem Birimi. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  )
}
