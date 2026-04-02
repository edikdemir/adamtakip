import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"
import { USER_ROLES } from "@/lib/constants"
import { z } from "zod"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  // Verify access
  if (user.role === USER_ROLES.USER) {
    const { data: task } = await supabase.from("tasks").select("assigned_to").eq("id", id).single()
    if (!task || task.assigned_to !== user.id) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from("task_comments")
    .select("*, user:users(display_name, email)")
    .eq("task_id", id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = z.object({ body: z.string().min(1) }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 })

  const supabase = createServerClient()

  // Verify access
  if (user.role === USER_ROLES.USER) {
    const { data: task } = await supabase.from("tasks").select("assigned_to").eq("id", id).single()
    if (!task || task.assigned_to !== user.id) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from("task_comments")
    .insert({ task_id: parseInt(id), user_id: user.id, body: parsed.data.body })
    .select("*, user:users(display_name, email)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
