import { NextRequest, NextResponse } from "next/server"
import { ConfidentialClientApplication } from "@azure/msal-node"
import { createServerClient } from "@/lib/supabase/server"
import { createSession, setSessionCookie } from "@/lib/auth/session"
import { SessionUser } from "@/types/user"

function getMsalApp() {
  return new ConfidentialClientApplication({
    auth: {
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    },
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    console.error("Auth error:", error, searchParams.get("error_description"))
    return NextResponse.redirect(new URL(`/login?error=${error}`, req.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", req.url))
  }

  try {
    const msalApp = getMsalApp()
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")

    const tokenResponse = await msalApp.acquireTokenByCode({
      code,
      redirectUri: `${appUrl}/api/auth/callback`,
      scopes: ["openid", "profile", "email", "User.Read"],
    })

    if (!tokenResponse?.account) {
      return NextResponse.redirect(new URL("/login?error=no_account", req.url))
    }

    const account = tokenResponse.account
    const azureOid = account.localAccountId // Object ID
    const email = account.username // UPN / email
    const displayName = account.name || email

    // Fetch jobTitle and profile photo from Microsoft Graph
    let jobTitle: string | null = null
    let photoUrl: string | null = null
    try {
      const graphRes = await fetch(
        "https://graph.microsoft.com/v1.0/me?$select=jobTitle",
        { headers: { Authorization: `Bearer ${tokenResponse.accessToken}` } }
      )
      if (graphRes.ok) {
        const graphUser = await graphRes.json()
        jobTitle = graphUser.jobTitle || null
      }
    } catch {
      // Non-critical — continue without job title
    }
    try {
      const photoRes = await fetch(
        "https://graph.microsoft.com/v1.0/me/photo/$value",
        { headers: { Authorization: `Bearer ${tokenResponse.accessToken}` } }
      )
      if (photoRes.ok) {
        const buffer = await photoRes.arrayBuffer()
        const base64 = Buffer.from(buffer).toString("base64")
        const contentType = photoRes.headers.get("content-type") || "image/jpeg"
        photoUrl = `data:${contentType};base64,${base64}`
      }
    } catch {
      // Non-critical — continue without photo
    }

    // Upsert user in DB
    const supabase = createServerClient()
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, role, is_active")
      .eq("azure_oid", azureOid)
      .single()

    if (existingUser && !existingUser.is_active) {
      return NextResponse.redirect(new URL("/login?error=account_disabled", req.url))
    }

    let userId: string
    let userRole: SessionUser["role"]

    if (existingUser) {
      userId = existingUser.id
      userRole = existingUser.role

      // Update display name, email, job title and photo
      await supabase
        .from("users")
        .update({ email, display_name: displayName, job_title: jobTitle, ...(photoUrl ? { photo_url: photoUrl } : {}), updated_at: new Date().toISOString() })
        .eq("id", userId)
    } else {
      // First login: create user
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({ azure_oid: azureOid, email, display_name: displayName, job_title: jobTitle, photo_url: photoUrl, role: "user" })
        .select("id, role")
        .single()

      if (insertError || !newUser) {
        console.error("Failed to create user:", insertError)
        return NextResponse.redirect(new URL("/login?error=user_creation_failed", req.url))
      }

      userId = newUser.id
      userRole = "user"
    }

    const sessionUser: SessionUser = {
      id: userId,
      email,
      display_name: displayName,
      job_title: jobTitle,
      role: userRole,
    }

    const token = await createSession(sessionUser)
    await setSessionCookie(token)

    // Redirect based on role
    const redirectPath = userRole === "super_admin" ? "/admin" : "/dashboard"
    return NextResponse.redirect(new URL(redirectPath, req.url))
  } catch (err) {
    console.error("Callback error:", err)
    return NextResponse.redirect(new URL("/login?error=internal", req.url))
  }
}
