import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"
import { clearSessionCookie } from "@/lib/auth/session"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Oturum açılmamış" }, { status: 401 })
  }

  // Keep JWT lightweight, but trust DB for current role/activity/profile state.
  const supabase = createServerClient()
  const { data: dbUser } = await supabase
    .from("users")
    .select("id, email, display_name, job_title, role, is_active, photo_url")
    .eq("id", user.id)
    .single()

  if (!dbUser || !dbUser.is_active) {
    await clearSessionCookie()
    return NextResponse.json({ error: "Oturum süresi doldu" }, { status: 401 })
  }

  return NextResponse.json({
    data: {
      id: dbUser.id,
      email: dbUser.email,
      display_name: dbUser.display_name,
      job_title: dbUser.job_title,
      role: dbUser.role,
      photo_url: dbUser.photo_url ?? null,
    },
  })
}
