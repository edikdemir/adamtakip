import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest, requireAdmin } from "@/lib/auth/middleware-auth"

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase.from("system_settings").select("*")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const settings = Object.fromEntries(data.map((row) => [row.key, row.value]))
  return NextResponse.json({ data: settings })
}

export async function PUT(req: NextRequest) {
  const result = await requireAdmin(req)
  if (result instanceof NextResponse) return result

  const body = await req.json()
  const { key, value } = body

  if (!key || value === undefined) {
    return NextResponse.json({ error: "key ve value gerekli" }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("system_settings")
    .upsert({ key, value, updated_by: result.id, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
