import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest, requireAdmin } from "@/lib/auth/middleware-auth"
import { z } from "zod"

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("job_types")
    .select("*, job_sub_types(*)")
    .order("sort_order")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const result = await requireAdmin(req)
  if (result instanceof NextResponse) return result

  const body = await req.json()
  const parsed = z.object({ name: z.string().min(1), sort_order: z.number().optional() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 })

  const supabase = createServerClient()
  const { data, error } = await supabase.from("job_types").insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}
