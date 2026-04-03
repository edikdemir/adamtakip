import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get("project_id")

  const supabase = createServerClient()
  let query = supabase.from("zones").select("id, project_id, name").order("name")
  if (projectId) query = query.eq("project_id", projectId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
