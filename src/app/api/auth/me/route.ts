import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth/middleware-auth"

export async function GET(req: NextRequest) {
  const user = await getSessionFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Oturum açılmamış" }, { status: 401 })
  }
  return NextResponse.json({ data: user })
}
