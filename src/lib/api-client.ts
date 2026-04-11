"use client"

import { toast } from "sonner"

export class ApiSessionExpiredError extends Error {
  constructor() {
    super("Oturum süresi doldu")
    this.name = "ApiSessionExpiredError"
  }
}

type ApiEnvelope<T> = {
  data?: T
  error?: string
  [key: string]: unknown
}

let sessionRedirectStarted = false

function redirectToLogin() {
  if (typeof window === "undefined" || window.location.pathname === "/login" || sessionRedirectStarted) {
    return
  }

  sessionRedirectStarted = true

  toast.error("Oturum süreniz doldu. Lütfen tekrar giriş yapın.")
  window.location.assign("/login?error=session_expired")
}

function isJsonResponse(response: Response) {
  return response.headers.get("content-type")?.toLowerCase().includes("application/json") ?? false
}

async function parseJsonEnvelope<T>(response: Response, fallbackMessage: string): Promise<ApiEnvelope<T>> {
  const redirectedToLogin = response.redirected && response.url.includes("/login")

  if (response.status === 401 || redirectedToLogin) {
    redirectToLogin()
    throw new ApiSessionExpiredError()
  }

  if (!isJsonResponse(response)) {
    throw new Error(fallbackMessage)
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null

  if (!response.ok) {
    throw new Error(payload?.error || fallbackMessage)
  }

  return payload ?? {}
}

export async function readApiEnvelope<T>(response: Response, fallbackMessage: string): Promise<ApiEnvelope<T>> {
  return parseJsonEnvelope<T>(response, fallbackMessage)
}

export async function readApiData<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await parseJsonEnvelope<T>(response, fallbackMessage)
  return (payload.data ?? payload) as T
}

export async function readApiArray<T>(response: Response, fallbackMessage: string): Promise<T[]> {
  const data = await readApiData<unknown>(response, fallbackMessage)
  return Array.isArray(data) ? (data as T[]) : []
}
