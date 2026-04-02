import { NextRequest, NextResponse } from "next/server"
import { verifySession } from "@/lib/auth/session"
import { SESSION_COOKIE_NAME, USER_ROLES } from "@/lib/constants"
import { SessionUser } from "@/types/user"

export async function requireAuth(req: NextRequest): Promise<SessionUser | NextResponse> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  const user = await verifySession(token)
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  return user
}

export async function requireAdmin(req: NextRequest): Promise<SessionUser | NextResponse> {
  const result = await requireAuth(req)
  if (result instanceof NextResponse) return result
  if (result.role !== USER_ROLES.SUPER_ADMIN) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }
  return result
}

export async function requireKoordinatorOrAdmin(req: NextRequest): Promise<SessionUser | NextResponse> {
  const result = await requireAuth(req)
  if (result instanceof NextResponse) return result
  if (result.role === USER_ROLES.USER) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 })
  }
  return result
}

export function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) return Promise.resolve(null)
  return verifySession(token)
}
