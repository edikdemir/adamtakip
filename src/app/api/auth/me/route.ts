import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Oturum açılmamış" }, { status: 401 })
  }

  // Fetch photo_url from DB (not stored in JWT due to size)
  const supabase = createServerClient()
  const { data: dbUser } = await supabase
    .from("users")
    .select("photo_url")
    .eq("id", user.id)
    .single()

  return NextResponse.json({ data: { ...user, photo_url: dbUser?.photo_url ?? null } })
}
