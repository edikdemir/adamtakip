import { NotificationType } from "@/lib/constants"

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  task_id: number | null
  is_read: boolean
  created_at: string
}
