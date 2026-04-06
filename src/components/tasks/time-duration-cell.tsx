"use client"
import { Task } from "@/types/task"
import { ManualHoursBadge } from "@/components/tasks/manual-time-button"
import { formatHours } from "@/lib/utils"

interface TimeDurationCellProps {
  task: Task
}

// Shows timer hours. If manual_hours > 0, shows breakdown: timer / +manual / total.
export function TimeDurationCell({ task }: TimeDurationCellProps) {
  const manualHours = task.manual_hours ?? 0

  if (!manualHours) {
    return (
      <span className="font-mono text-sm font-medium text-zinc-700">
        {formatHours(task.total_elapsed_seconds)}
      </span>
    )
  }

  const timerHours = formatHours(task.total_elapsed_seconds)
  const totalHours = formatHours(task.total_elapsed_seconds + manualHours * 3600)

  return (
    <div className="space-y-0.5">
      <div className="font-mono text-xs text-zinc-500">{timerHours} sa</div>
      <ManualHoursBadge taskId={task.id} manualHours={manualHours} />
      <div className="font-mono text-xs font-semibold text-zinc-800 border-t border-zinc-200 pt-0.5">
        {totalHours} sa
      </div>
    </div>
  )
}
