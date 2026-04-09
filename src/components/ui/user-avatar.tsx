import { cn } from "@/lib/utils"

interface UserAvatarProps {
  displayName: string
  photoUrl?: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "w-7 h-7 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
}

export function UserAvatar({ displayName, photoUrl, size = "md", className }: UserAvatarProps) {
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const sizeClass = sizeClasses[size]

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={displayName}
        className={cn("rounded-full object-cover flex-shrink-0", sizeClass, className)}
      />
    )
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold bg-zinc-200 text-zinc-700 flex-shrink-0",
        sizeClass,
        className
      )}
    >
      {initials}
    </div>
  )
}
