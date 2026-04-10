"use client"

import { ReactNode } from "react"
import { UserAvatar } from "@/components/ui/user-avatar"
import { cn } from "@/lib/utils"

interface UserIdentityProps {
  displayName: string
  email: string
  jobTitle?: string | null
  photoUrl?: string | null
  size?: "sm" | "md" | "lg" | "xl"
  align?: "left" | "center"
  className?: string
  avatarClassName?: string
  titleSuffix?: ReactNode
  emailClassName?: string
}

export function UserIdentity({
  displayName,
  email,
  jobTitle,
  photoUrl,
  size = "lg",
  align = "left",
  className,
  avatarClassName,
  titleSuffix,
  emailClassName,
}: UserIdentityProps) {
  const centered = align === "center"

  return (
    <div
      className={cn(
        "flex gap-3 min-w-0",
        centered ? "flex-col items-center text-center" : "items-start",
        className
      )}
    >
      <UserAvatar
        displayName={displayName}
        photoUrl={photoUrl}
        size={size}
        className={cn("ring-2 ring-zinc-100", avatarClassName)}
      />

      <div className={cn("min-w-0", centered && "flex flex-col items-center")}>
        <div className={cn("flex gap-2 min-w-0", centered ? "flex-col items-center" : "flex-wrap items-center")}>
          <p className="text-sm font-semibold leading-tight text-zinc-900">{displayName}</p>
          {titleSuffix}
        </div>

        {jobTitle ? <p className="mt-0.5 text-xs leading-tight text-zinc-500">{jobTitle}</p> : null}

        <p
          className={cn(
            "mt-1 text-xs leading-4 text-zinc-400 whitespace-normal break-all",
            centered && "max-w-[220px]",
            emailClassName
          )}
        >
          {email}
        </p>
      </div>
    </div>
  )
}
