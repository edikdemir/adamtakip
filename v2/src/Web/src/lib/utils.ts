import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function formatHours(seconds: number): string {
  return (seconds / 3600).toFixed(2)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-"
  const d = new Date(date)
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-"
  const d = new Date(date)
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
}

export function getDeadlineStatus(plannedEnd: string | null | undefined): "ok" | "warning" | "overdue" | "none" {
  if (!plannedEnd) return "none"
  const end = new Date(plannedEnd)
  const now = new Date()
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return "overdue"
  if (diffDays <= 3) return "warning"
  return "ok"
}
