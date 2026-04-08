import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest, requireAdmin } from "@/lib/auth/middleware-auth"
import { z } from "zod"

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("project_id")
  const zoneId = searchParams.get("zone_id")

  const supabase = createServerClient()
  let query = supabase.from("locations").select("id, project_id, name").order("name")
  if (projectId) query = query.eq("project_id", projectId)
  if (zoneId) query = query.eq("zone_id", zoneId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

const createSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
})

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("locations")
    .insert(parsed.data)
    .select("id, project_id, name")
    .single()

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Bu mahal zaten var" }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
