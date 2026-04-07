export const USER_ROLES = {
  USER: "user",
  SUPER_ADMIN: "super_admin",
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

export const WORKER_STATUS = {
  HAZIR: "hazir",
  BEKLEMEDE: "beklemede",
  BITTI: "bitti",
} as const

export type WorkerStatus = (typeof WORKER_STATUS)[keyof typeof WORKER_STATUS]

export const ADMIN_STATUS = {
  HAVUZDA: "havuzda",
  ATANDI: "atandi",
  DEVAM_EDIYOR: "devam_ediyor",
  TAMAMLANDI: "tamamlandi",
  ONAYLANDI: "onaylandi",
  IPTAL: "iptal",
} as const

export type AdminStatus = (typeof ADMIN_STATUS)[keyof typeof ADMIN_STATUS]

export const PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
} as const

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY]

export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: "task_assigned",
  TASK_APPROVED: "task_approved",
  TASK_REJECTED: "task_rejected",
  DEADLINE_WARNING: "deadline_warning",
  TIMER_REMINDER: "timer_reminder",
  TASK_COMPLETED: "task_completed",
} as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES]

export const WORKER_STATUS_LABELS: Record<WorkerStatus, string> = {
  hazir: "Hazır",
  beklemede: "Beklemede",
  bitti: "Bitti",
}

export const ADMIN_STATUS_LABELS: Record<AdminStatus, string> = {
  havuzda: "Havuzda",
  atandi: "Atandı",
  devam_ediyor: "Devam Ediyor",
  tamamlandi: "Tamamlandı",
  onaylandi: "Onaylandı",
  iptal: "İptal",
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  urgent: "Acil",
}

export const ROLE_LABELS: Record<UserRole, string> = {
  user: "Kullanıcı",
  super_admin: "Süper Admin",
}

export const TIMER_SYNC_INTERVAL_MS = 60000 // 60 saniye
export const TIMER_WARNING_HOURS = 8
export const SESSION_COOKIE_NAME = "adamtakip-session"
export const SESSION_DURATION_HOURS = 12
