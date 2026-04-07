import { NextRequest, NextResponse } from "next/server"
import { verifySession } from "@/lib/auth/session"
import { SESSION_COOKIE_NAME, USER_ROLES } from "@/lib/constants"

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/callback"]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  let user
  try {
    user = await verifySession(token)
  } catch (err) {
    console.error("Middleware session error:", err)
    const response = NextResponse.redirect(new URL("/login", req.url))
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  if (!user) {
    const response = NextResponse.redirect(new URL("/login", req.url))
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  // Protect /admin/* routes — only super_admin
  if (pathname.startsWith("/admin") && user.role !== USER_ROLES.SUPER_ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Sliding session: refresh cookie on every request
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
