import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"
import { createServerClient } from "@/lib/supabase/server"
import { mapTaskSummaryRow, parseTaskQuery, type TaskSummaryRpcRow } from "@/lib/tasks/task-api"

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  }

  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const parsedQuery = parseTaskQuery(searchParams, user)

  const { data, error } = await supabase.rpc("task_summary", {
    ...parsedQuery.args,
    p_limit: null,
    p_offset: 0,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: mapTaskSummaryRow(((data ?? []) as TaskSummaryRpcRow[])[0]) })
}
