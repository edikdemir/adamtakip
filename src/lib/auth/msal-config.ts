import { Configuration, LogLevel } from "@azure/msal-browser"

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID}`,
    redirectUri: typeof window !== "undefined" ? `${window.location.origin}/api/auth/callback` : "",
    postLogoutRedirectUri: typeof window !== "undefined" ? `${window.location.origin}/login` : "",
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return
        if (process.env.NODE_ENV === "development") {
          switch (level) {
            case LogLevel.Error: console.error(message); break
            case LogLevel.Warning: console.warn(message); break
          }
        }
      },
    },
  },
}

export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
}
