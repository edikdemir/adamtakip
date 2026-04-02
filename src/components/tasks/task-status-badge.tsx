import { Badge } from "@/components/ui/badge"
import { AdminStatus, WorkerStatus, ADMIN_STATUS_LABELS, WORKER_STATUS_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"

const adminStatusColors: Record<AdminStatus, string> = {
  havuzda: "bg-zinc-100 text-zinc-600 border-zinc-200",
  atandi: "bg-blue-50 text-blue-700 border-blue-200",
  devam_ediyor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  tamamlandi: "bg-orange-50 text-orange-700 border-orange-200",
  onaylandi: "bg-green-50 text-green-700 border-green-200",
}

const workerStatusColors: Record<WorkerStatus, string> = {
  hazir: "bg-zinc-100 text-zinc-600 border-zinc-200",
  beklemede: "bg-yellow-50 text-yellow-700 border-yellow-200",
  bitti: "bg-emerald-50 text-emerald-700 border-emerald-200",
}

export function AdminStatusBadge({ status }: { status: AdminStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", adminStatusColors[status])}>
      {ADMIN_STATUS_LABELS[status]}
    </span>
  )
}

export function WorkerStatusBadge({ status }: { status: WorkerStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", workerStatusColors[status])}>
      {WORKER_STATUS_LABELS[status]}
    </span>
  )
}

const priorityColors: Record<string, string> = {
  low: "bg-zinc-50 text-zinc-500 border-zinc-200",
  medium: "bg-blue-50 text-blue-600 border-blue-200",
  high: "bg-orange-50 text-orange-600 border-orange-200",
  urgent: "bg-red-50 text-red-600 border-red-200",
}

const priorityLabels: Record<string, string> = {
  low: "Düşük", medium: "Orta", high: "Yüksek", urgent: "Acil",
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", priorityColors[priority] || priorityColors.medium)}>
      {priorityLabels[priority] || priority}
    </span>
  )
}
