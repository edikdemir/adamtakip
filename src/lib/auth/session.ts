import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { SESSION_COOKIE_NAME, SESSION_DURATION_HOURS } from "@/lib/constants"
import { SessionUser } from "@/types/user"

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error("SESSION_SECRET env variable is not set")
  return new TextEncoder().encode(secret)
}

export async function createSession(user: SessionUser): Promise<string> {
  const secret = getSecretKey()
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_HOURS}h`)
    .sign(secret)
  return token
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const secret = getSecretKey()
    const { payload } = await jwtVerify(token, secret)
    return {
      id: payload.sub as string,
      email: payload.email as string,
      display_name: payload.display_name as string,
      role: payload.role as SessionUser["role"],
    }
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return verifySession(token)
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_HOURS * 60 * 60,
    path: "/",
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
