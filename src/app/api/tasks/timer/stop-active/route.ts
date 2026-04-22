import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"

// Called via sendBeacon when the user closes the browser tab.
// Stops the currently running timer for the authenticated user (no task ID required).
export async function POST(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) return new NextResponse(null, { status: 401 })

  const supabase = createServerClient()

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("id, timer_started_at, total_elapsed_seconds, last_heartbeat_at")
    .eq("assigned_to", user.id)
    .not("timer_started_at", "is", null)
    .limit(1)
    .single()

  if (fetchError || !task) {
    return new NextResponse(null, { status: 204 })
  }

  const startTime = new Date(task.timer_started_at!).getTime()
  let additionalSeconds = Math.max(0, (Date.now() - startTime) / 1000)

  // Güvenlik kontrolü: Eğer süre 15 dakikadan uzunsa (bilgisayar uykuya geçmiş veya saat sıçramış olabilir)
  if (additionalSeconds > 900) {
    const lastHeartbeat = task.last_heartbeat_at ? new Date(task.last_heartbeat_at).getTime() : startTime;
    additionalSeconds = Math.max(0, (lastHeartbeat - startTime) / 1000);
  }

  const newTotal = task.total_elapsed_seconds + additionalSeconds

  await supabase
    .from("tasks")
    .update({
      total_elapsed_seconds: newTotal,
      timer_started_at: null,
      last_heartbeat_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", task.id)

  await supabase.from("timer_logs").insert({
    task_id: task.id,
    user_id: user.id,
    action: "stop",
    elapsed_at_action: newTotal,
  })

  return new NextResponse(null, { status: 200 })
}
