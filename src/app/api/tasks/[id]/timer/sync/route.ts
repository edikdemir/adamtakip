import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"

// Periodic sync — updates total_elapsed_seconds and resets timer_started_at to now
// Limits data loss to 60s on crash
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  const { data: task } = await supabase
    .from("tasks")
    .select("id, assigned_to, timer_started_at, total_elapsed_seconds, last_heartbeat_at")
    .eq("id", id)
    .single()

  if (!task || task.assigned_to !== user.id || !task.timer_started_at) {
    return NextResponse.json({ ok: false })
  }

  const startTime = new Date(task.timer_started_at).getTime()
  const now = Date.now()
  let additionalSeconds = Math.max(0, (now - startTime) / 1000)

  // Uyku modu veya devasa sıçrama kontrolü (15 dakikadan fazla fark varsa)
  if (additionalSeconds > 900) {
    const lastHeartbeat = task.last_heartbeat_at ? new Date(task.last_heartbeat_at).getTime() : startTime;
    additionalSeconds = Math.max(0, (lastHeartbeat - startTime) / 1000);
  }

  const newTotal = task.total_elapsed_seconds + additionalSeconds

  await supabase
    .from("tasks")
    .update({
      total_elapsed_seconds: newTotal,
      timer_started_at: new Date().toISOString(),
    })
    .eq("id", id)

  return NextResponse.json({ ok: true })
}
