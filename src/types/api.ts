export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
}

export interface SystemSettings {
  email_notifications: {
    enabled: boolean
    send_on_assign: boolean
    send_on_approve: boolean
    send_on_reject: boolean
    send_on_complete: boolean
    deadline_warning_days: number
  }
  working_hours: {
    start: string
    end: string
  }
  app_name: string
}
