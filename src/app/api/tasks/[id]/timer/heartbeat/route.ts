import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  const { error } = await supabase
    .from("tasks")
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq("id", id)
    .eq("assigned_to", user.id)
    .not("timer_started_at", "is", null)

  if (error) {
    return NextResponse.json({ error: "Heartbeat güncellenemedi" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
