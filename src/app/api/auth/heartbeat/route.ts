import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"
import { clearSessionCookie } from "@/lib/auth/session"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Oturum açılmamış" }, { status: 401 })
  }

  const lastSeenAt = new Date().toISOString()
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("users")
    .update({ last_seen_at: lastSeenAt })
    .eq("id", user.id)
    .eq("is_active", true)
    .select("id")
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    await clearSessionCookie()
    return NextResponse.json({ error: "Oturum süresi doldu" }, { status: 401 })
  }

  return NextResponse.json({ data: { last_seen_at: lastSeenAt } })
}
