import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"
import { USER_ROLES } from "@/lib/constants"
import { notifyTaskNote } from "@/lib/notifications/create-notification"
import { sendTaskNoteEmail } from "@/lib/email/graph-mailer"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from("task_notes")
    .select("id, content, created_at, user:users!user_id(id, display_name, photo_url)")
    .eq("task_id", parseInt(id))
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const content: string = (body.content || "").trim()
  if (!content) return NextResponse.json({ error: "Not boş olamaz" }, { status: 400 })

  const supabase = createServerClient()

  // Verify access: user must be assigned to task or be admin
  const { data: task } = await supabase
    .from("tasks")
    .select(`
      id, drawing_no, assigned_to, assigned_by,
      project:projects(id, code, name),
      job_type:job_types(id, name),
      job_sub_type:job_sub_types(id, name),
      assigned_user:users!assigned_to(id, email, display_name)
    `)
    .eq("id", parseInt(id))
    .single()

  if (!task) return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })

  if (user.role === USER_ROLES.USER && task.assigned_to !== user.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const { data: note, error } = await supabase
    .from("task_notes")
    .insert({ task_id: parseInt(id), user_id: user.id, content })
    .select("id, content, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the other party
  const assignedUser = task.assigned_user as unknown as { id: string; email: string; display_name: string } | null

  if (user.role === USER_ROLES.USER) {
    // Worker added note → notify all admins
    const { data: admins } = await supabase
      .from("users")
      .select("id, email, display_name")
      .eq("role", USER_ROLES.SUPER_ADMIN)
      .eq("is_active", true)

    if (admins) {
      for (const admin of admins) {
        notifyTaskNote(admin.id, parseInt(id), task.drawing_no, user.display_name).catch(console.error)
        sendTaskNoteEmail(admin.email, admin.display_name, task as unknown as import("@/types/task").Task, user.display_name, content).catch(console.error)
      }
    }
  } else {
    // Admin added note → notify worker
    if (assignedUser) {
      notifyTaskNote(assignedUser.id, parseInt(id), task.drawing_no, user.display_name).catch(console.error)
      sendTaskNoteEmail(assignedUser.email, assignedUser.display_name, task as unknown as import("@/types/task").Task, user.display_name, content).catch(console.error)
    }
  }

  return NextResponse.json({ data: note }, { status: 201 })
}
