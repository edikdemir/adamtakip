import { AdminStatus, Priority, WorkerStatus } from "@/lib/constants"

export interface Project {
  id: string
  code: string
  name: string | null
  is_archived: boolean
  created_at: string
}

export interface JobType {
  id: string
  name: string
  job_sub_types?: JobSubType[]
}

export interface JobSubType {
  id: string
  job_type_id: string
  name: string
  job_type?: JobType
}

export interface Zone {
  id: string
  project_id: string
  name: string
}

export interface Task {
  id: number
  project_id: string
  job_type_id: string
  job_sub_type_id: string
  zone_id: string | null
  location: string | null
  drawing_no: string
  description: string
  planned_start: string | null
  planned_end: string | null
  assigned_to: string | null
  assigned_by: string | null
  total_elapsed_seconds: number
  timer_started_at: string | null
  manual_hours: number | null
  worker_status: WorkerStatus
  admin_status: AdminStatus
  completion_date: string | null
  admin_notes: string | null
  priority: Priority
  linked_to_task_id: number | null
  created_at: string
  updated_at: string
  // Joins
  project?: Project
  job_type?: JobType
  job_sub_type?: JobSubType
  zone?: Zone
  assigned_user?: { id: string; display_name: string; email: string }
  assigned_by_user?: { id: string; display_name: string; email: string }
  linked_to_task?: { id: number; drawing_no: string; description: string; admin_status: AdminStatus } | null
  linked_tasks?: Array<{ id: number; drawing_no: string; description: string; admin_status: AdminStatus; assigned_to: string | null }>
}

export interface TaskComment {
  id: string
  task_id: number
  user_id: string
  body: string
  created_at: string
  user?: { display_name: string; email: string }
}

export interface CreateTaskInput {
  project_id: string
  job_type_id: string
  job_sub_type_id: string
  zone_id?: string
  location?: string
  drawing_no: string
  description: string
  planned_start?: string
  planned_end?: string
  priority?: Priority
  admin_notes?: string
}

export interface AssignTaskInput {
  assigned_to: string
}
