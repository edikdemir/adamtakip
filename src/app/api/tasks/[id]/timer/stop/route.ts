import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("id, assigned_to, timer_started_at, total_elapsed_seconds")
    .eq("id", id)
    .single()

  if (fetchError || !task) {
    return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })
  }

  if (task.assigned_to !== user.id) {
    return NextResponse.json({ error: "Bu göreve erişim yetkiniz yok" }, { status: 403 })
  }

  if (!task.timer_started_at) {
    return NextResponse.json({ error: "Timer zaten durdurulmuş" }, { status: 400 })
  }

  // Calculate new total elapsed seconds
  const startTime = new Date(task.timer_started_at).getTime()
  const now = Date.now()
  const additionalSeconds = Math.max(0, (now - startTime) / 1000)
  const newTotal = task.total_elapsed_seconds + additionalSeconds

  const { data: updatedTask, error: updateError } = await supabase
    .from("tasks")
    .update({
      total_elapsed_seconds: newTotal,
      timer_started_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (updateError || !updatedTask) {
    return NextResponse.json({ error: "Timer durdurulamadı" }, { status: 500 })
  }

  // Log
  await supabase.from("timer_logs").insert({
    task_id: parseInt(id),
    user_id: user.id,
    action: "stop",
    elapsed_at_action: newTotal,
  })

  return NextResponse.json({ data: updatedTask })
}
