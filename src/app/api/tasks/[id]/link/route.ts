import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"
import { z } from "zod"

const linkSchema = z.object({
  dependent_task_ids: z.array(z.number().int().positive()),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromRequest(req)
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { id } = await params
  const primaryId = parseInt(id, 10)
  if (Number.isNaN(primaryId)) {
    return NextResponse.json({ error: "Geçersiz görev ID" }, { status: 400 })
  }

  const body = await req.json()
  const parsed = linkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 })
  }

  const dependentIds = parsed.data.dependent_task_ids.filter((d) => d !== primaryId)
  const supabase = createServerClient()

  // 1) Primary'yi çek, sahibi mi kontrol et
  const { data: primary, error: primaryErr } = await supabase
    .from("tasks")
    .select("id, assigned_to, linked_to_task_id")
    .eq("id", primaryId)
    .single()

  if (primaryErr || !primary) {
    return NextResponse.json({ error: "Görev bulunamadı" }, { status: 404 })
  }
  if (primary.assigned_to !== user.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }
  if (primary.linked_to_task_id !== null) {
    return NextResponse.json(
      { error: "Bu görev başka bir göreve bağlı; primary olamaz" },
      { status: 400 }
    )
  }

  // 2) Tüm dependent'ler aynı user'a ait ve henüz başka primary'ye bağlı olmamalı
  if (dependentIds.length > 0) {
    const { data: dependents, error: depErr } = await supabase
      .from("tasks")
      .select("id, assigned_to, linked_to_task_id")
      .in("id", dependentIds)

    if (depErr) {
      return NextResponse.json({ error: depErr.message }, { status: 500 })
    }
    if (!dependents || dependents.length !== dependentIds.length) {
      return NextResponse.json({ error: "Bazı görevler bulunamadı" }, { status: 400 })
    }
    for (const d of dependents) {
      if (d.assigned_to !== user.id) {
        return NextResponse.json(
          { error: "Yalnızca kendi görevlerinizi linkleyebilirsiniz" },
          { status: 403 }
        )
      }
      if (d.linked_to_task_id !== null && d.linked_to_task_id !== primaryId) {
        return NextResponse.json(
          { error: `Görev #${d.id} zaten başka bir göreve bağlı` },
          { status: 400 }
        )
      }
    }
  }

  // 3) Eski bağları temizle (replace semantik)
  const { error: clearErr } = await supabase
    .from("tasks")
    .update({ linked_to_task_id: null, updated_at: new Date().toISOString() })
    .eq("linked_to_task_id", primaryId)

  if (clearErr) {
    return NextResponse.json({ error: clearErr.message }, { status: 500 })
  }

  // 4) Yenileri set et
  if (dependentIds.length > 0) {
    const { error: linkErr } = await supabase
      .from("tasks")
      .update({ linked_to_task_id: primaryId, updated_at: new Date().toISOString() })
      .in("id", dependentIds)

    if (linkErr) {
      return NextResponse.json({ error: linkErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, primary_id: primaryId, dependent_ids: dependentIds })
}
