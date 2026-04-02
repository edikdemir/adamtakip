import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest, requireKoordinatorOrAdmin } from "@/lib/auth/middleware-auth"
import { ADMIN_STATUS, USER_ROLES, WORKER_STATUS } from "@/lib/constants"
import { notifyTaskCompleted } from "@/lib/notifications/create-notification"
import { sendTaskCompletedEmail } from "@/lib/email/graph-mailer"
import { z } from "zod"

const updateSchema = z.object({
  worker_status: z.enum(["hazir", "beklemede", "bitti"]).optional(),
  description: z.string().optional(),
  drawing_no: z.string().optional(),
  planned_start: z.string().nullable().optional(),
  planned_end: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  admin_notes: z.string().nullable().optional(),
  manual_hours: z.number().nullable().optional(),
  location: z.string().nullable().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  const { data: task, error } = await supabase
    .from("tasks")
    .select(`
      *,
      project:projects(id, code, name),
      job_type:job_types(id, name),
      job_sub_type:job_sub_types(id, name),
      zone:zones(id, name),
      assigned_user:users!assigned_to(id, display_name, email),
      assigned_by_user:users!assigned_by(id, display_name, email)
    `)
    .eq("id", id)
    .single()

  if (error || !task) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })

  if (user.role === USER_ROLES.USER && task.assigned_to !== user.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  return NextResponse.json({ data: task })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: task } = await supabase
    .from("tasks")
    .select("id, assigned_to, assigned_by, admin_status, drawing_no, timer_started_at, total_elapsed_seconds")
    .eq("id", id)
    .single()

  if (!task) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })

  if (user.role === USER_ROLES.USER && task.assigned_to !== user.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const updates: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }

  // When user marks task as done
  if (parsed.data.worker_status === WORKER_STATUS.BITTI) {
    updates.admin_status = ADMIN_STATUS.TAMAMLANDI
    updates.completion_date = new Date().toISOString().split("T")[0]

    // Auto-stop timer if running
    if (task.timer_started_at) {
      const startTime = new Date(task.timer_started_at).getTime()
      const additionalSeconds = Math.max(0, (Date.now() - startTime) / 1000)
      updates.total_elapsed_seconds = task.total_elapsed_seconds + additionalSeconds
      updates.timer_started_at = null
    }

    // Notify admins/koordinators
    const { data: admins } = await supabase
      .from("users")
      .select("id, email, display_name")
      .in("role", ["super_admin", "koordinator"])

    const assignerName = user.display_name
    if (admins) {
      for (const admin of admins) {
        notifyTaskCompleted(admin.id, parseInt(id), task.drawing_no, assignerName).catch(console.error)
        sendTaskCompletedEmail(admin.email, admin.display_name, task as unknown as import("@/types/task").Task, assignerName).catch(console.error)
      }
    }
  }

  const { data: updatedTask, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: updatedTask })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireKoordinatorOrAdmin(req)
  if (result instanceof NextResponse) return result

  const { id } = await params
  const supabase = createServerClient()

  const { error } = await supabase.from("tasks").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
