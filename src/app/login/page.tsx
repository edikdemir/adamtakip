"use client"

import Image from "next/image"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import cemreLoginLogo from "./cemre-login-logo.png"

const ERROR_MESSAGES: Record<string, string> = {
  no_code: "Yetkilendirme kodu alınamadı.",
  no_account: "Hesap bilgisi alınamadı.",
  account_disabled: "Hesabınız devre dışı bırakılmış. Yöneticinizle iletişime geçin.",
  user_creation_failed: "Hesap oluşturulamadı. Lütfen tekrar deneyin.",
  invalid_state: "Oturum doğrulaması geçersiz. Lütfen tekrar deneyin.",
  session_expired: "Oturum süreniz doldu. Lütfen tekrar giriş yapın.",
  internal: "Bir hata oluştu. Lütfen tekrar deneyin.",
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)

  const error = searchParams.get("error")
  const errorMessage = error ? (ERROR_MESSAGES[error] || "Giriş sırasında bir hata oluştu.") : null

  useEffect(() => {
    fetch("/api/auth/me").then((response) => {
      if (response.ok) {
        router.replace("/dashboard")
      }
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
        <CardDescription>Kurumsal Microsoft hesabınızla giriş yapın.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <Button onClick={handleLogin} disabled={isLoading} className="h-11 w-full text-sm font-medium" size="lg">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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

        <p className="text-center text-xs text-zinc-500">
          Kurumsal @cemreshipyard.com hesabınızla giriş yapınız.
          <br />
          Sorun yaşıyorsanız Bilgi İşlem Birimiyle iletişime geçin.
        </p>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center rounded-[28px] border border-zinc-200 bg-white px-4 py-4 shadow-md">
            <Image
              src={cemreLoginLogo}
              alt="Cemre Shipyard"
              priority
              className="h-auto w-[260px] max-w-full rounded-xl object-contain"
            />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-zinc-900">Adam Takip</h1>
          <p className="mt-1 text-sm text-zinc-500">Cemre Tersanesi | Dizayn Departmanı İş Takip Sistemi</p>
        </div>

        <Suspense
          fallback={
            <Card className="border-zinc-200 shadow-sm">
              <CardContent className="p-6">
                <div className="h-10 animate-pulse rounded bg-zinc-100" />
              </CardContent>
            </Card>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-zinc-400">
          © 2026 Cemre Tersanesi Bilgi İşlem Birimi. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  )
}
