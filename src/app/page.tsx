import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { USER_ROLES } from "@/lib/constants"

export default async function Home() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role === USER_ROLES.SUPER_ADMIN) redirect("/admin")
  redirect("/dashboard")
}
