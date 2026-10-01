import { useEffect, useState } from "react"
import { Navigate, useSearchParams } from "react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/providers/auth-provider"
import { readApiData } from "@/lib/api-client"
import { USER_ROLES } from "@/lib/constants"
import loginLogo from "./login-logo.png"

const ERROR_MESSAGES: Record<string, string> = {
  no_code: "Yetkilendirme kodu alınamadı.",
  no_account: "Hesap bilgisi alınamadı.",
  account_disabled: "Hesabınız devre dışı bırakılmış. Yöneticinizle iletişime geçin.",
  user_creation_failed: "Hesap oluşturulamadı. Lütfen tekrar deneyin.",
  invalid_state: "Oturum doğrulaması geçersiz. Lütfen tekrar deneyin.",
  session_expired: "Oturum süreniz doldu. Lütfen tekrar giriş yapın.",
  invalid_credentials: "Kullanıcı adı veya şifre hatalı.",
  locked_out: "Çok fazla hatalı deneme. Lütfen birkaç dakika sonra tekrar deneyin.",
  internal: "Bir hata oluştu. Lütfen tekrar deneyin.",
}

type AuthMode = "local" | "windows" | "oidc"

function useAuthModes() {
  const [modes, setModes] = useState<AuthMode[]>(["local"])
  useEffect(() => {
    fetch("/api/auth/modes")
      .then((res) => readApiData<{ modes: AuthMode[] }>(res, "Giriş yöntemleri alınamadı"))
      .then((data) => {
        if (Array.isArray(data.modes) && data.modes.length > 0) setModes(data.modes)
      })
      .catch(() => {})
  }, [])
  return modes
}

function LoginForm() {
  const [searchParams] = useSearchParams()
  const { refetch } = useAuth()
  const modes = useAuthModes()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const error = searchParams.get("error")
  const errorMessage = formError ?? (error ? (ERROR_MESSAGES[error] || "Giriş sırasında bir hata oluştu.") : null)

  const handleLocalLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setFormError(null)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null
        const code = payload?.error ?? "internal"
        setFormError(ERROR_MESSAGES[code] ?? code)
        return
      }
      await refetch()
    } catch {
      setFormError(ERROR_MESSAGES.internal)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Giriş Yap</CardTitle>
        <CardDescription>Hesabınızla giriş yapın.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        {modes.includes("local") ? (
          <form onSubmit={handleLocalLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="username">Kullanıcı adı</Label>
              <Input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={isLoading || !username || !password} className="h-11 w-full text-sm font-medium" size="lg">
              {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>
        ) : null}

        {modes.includes("windows") ? (
          <Button variant="outline" className="h-11 w-full" onClick={() => { window.location.href = "/api/auth/windows" }}>
            Windows hesabımla giriş yap
          </Button>
        ) : null}

        {modes.includes("oidc") ? (
          <Button variant="outline" className="h-11 w-full" onClick={() => { window.location.href = "/api/auth/oidc" }}>
            <span className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
              Microsoft ile Giriş Yap
            </span>
          </Button>
        ) : null}

        <p className="text-center text-xs text-zinc-500">Sorun yaşıyorsanız sistem yöneticinizle iletişime geçin.</p>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  const { user, isLoading } = useAuth()

  if (!isLoading && user) {
    return <Navigate to={user.role === USER_ROLES.SUPER_ADMIN ? "/admin" : "/dashboard"} replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center px-4 py-4">
            <img src={loginLogo} alt="Logo" className="h-auto w-[260px] max-w-full object-contain" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-zinc-900">İş Takip</h1>
          <p className="mt-1 text-sm text-zinc-500">Dizayn Departmanı İş Takip Sistemi</p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
