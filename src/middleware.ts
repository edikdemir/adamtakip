import { NextRequest, NextResponse } from "next/server"
import { verifySession } from "@/lib/auth/session"
import { SESSION_COOKIE_NAME, USER_ROLES } from "@/lib/constants"

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/callback", "/api/cron"]
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/")
}

function unauthorizedResponse(req: NextRequest) {
  const response = isApiPath(req.nextUrl.pathname)
    ? NextResponse.json({ error: "Oturum süresi doldu" }, { status: 401 })
    : NextResponse.redirect(new URL("/login", req.url))

  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}

function isAllowedOrigin(req: NextRequest) {
  if (!MUTATING_METHODS.has(req.method)) {
    return true
  }

  const origin = req.headers.get("origin")
  if (!origin) {
    return true
  }

  const allowedOrigins = new Set([req.nextUrl.origin])
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (appUrl) {
    try {
      allowedOrigins.add(new URL(appUrl).origin)
    } catch {
      // Ignore invalid env values; request origin remains allowed.
    }
  }

  return allowedOrigins.has(origin)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: "Geçersiz istek kaynağı" }, { status: 403 })
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    return unauthorizedResponse(req)
  }

  let user
  try {
    user = await verifySession(token)
  } catch (err) {
    console.error("Middleware session error:", err)
    return unauthorizedResponse(req)
  }

  if (!user) {
    return unauthorizedResponse(req)
  }

  // Protect /admin/* routes — only super_admin
  if (pathname.startsWith("/admin") && user.role !== USER_ROLES.SUPER_ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Keep the existing fixed 12-hour session behavior.
  const response = NextResponse.next()

  // Add user info to request headers for server components
  response.headers.set("x-user-id", user.id)
  response.headers.set("x-user-role", user.role)
  response.headers.set("x-user-email", user.email)

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
