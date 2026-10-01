import type { Task } from "@/types/task"

// Görev listesi/özet API sözleşmesi (yalnızca tipler). Sunucu tarafı eşlemesi .NET'te (list_tasks portu).

export interface TaskListMeta {
  total: number
  offset: number
  limit: number | null
  has_more: boolean
}

export interface TaskListResponse {
  data: Task[]
  meta: TaskListMeta
}

export interface TaskSummary {
  total: number
  by_status: Record<string, number>
  active_timer_count: number
  overdue_count: number
  updated_today_count: number
  total_duration_seconds: number
}
