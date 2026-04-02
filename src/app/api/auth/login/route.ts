import { NextResponse } from "next/server"

export async function GET() {
  // This route is called by the client-side MSAL login button
  // Actual redirect is done client-side via MSAL.js
  // This endpoint exists for server-side redirect scenarios
  const tenantId = process.env.AZURE_AD_TENANT_ID
  const clientId = process.env.AZURE_AD_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const redirectUri = encodeURIComponent(`${appUrl}/api/auth/callback`)
  const scope = encodeURIComponent("openid profile email User.Read")

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&response_mode=query`

  return NextResponse.redirect(authUrl)
}
