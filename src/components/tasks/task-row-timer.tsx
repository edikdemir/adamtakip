"use client"

import { Play, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTaskTimer } from "@/hooks/use-task-timer"
import { ManualTimeButton, ManualHoursBadge } from "@/components/tasks/manual-time-button"
import { Task } from "@/types/task"
import { cn } from "@/lib/utils"

interface TaskRowTimerProps {
  task: Task
  onUpdate?: (updatedTask: Partial<Task>) => void
  hasOtherActiveTimer?: boolean
}

export function TaskRowTimer({ task, onUpdate, hasOtherActiveTimer }: TaskRowTimerProps) {
  const { formattedTime, isRunning, isWarning, toggle, isLoading } = useTaskTimer(task, onUpdate)
  const manualHours = task.manual_hours ?? 0
  const isDependentTask = !!task.linked_to_task_id

  return (
    <div className="flex flex-col gap-0.5">
      <div className="group flex items-center gap-1.5">
        <span className="flex items-center gap-1.5">
          {isRunning ? (
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          ) : null}
          <span
            className={cn(
              "min-w-[5.5rem] font-mono text-sm tabular-nums",
              isWarning ? "font-semibold text-orange-600"
              : isRunning ? "font-semibold text-emerald-700"
              : "font-medium text-zinc-700"
            )}
          >
            {formattedTime}
          </span>
        </span>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 flex-shrink-0",
            isRunning
              ? "text-red-500 hover:bg-red-50 hover:text-red-600"
              : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
          )}
          onClick={(event) => {
            event.stopPropagation()
            void toggle()
          }}
          disabled={isLoading || (!isRunning && !!hasOtherActiveTimer) || (!isRunning && isDependentTask)}
          title={
            isRunning ? "Durdur"
            : isDependentTask ? "Bağımlı görevde kronometre başlatılamaz"
            : hasOtherActiveTimer ? "Önce aktif kronometreyi durdurun"
            : "Başlat"
          }
        >
          {isRunning ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
        </Button>

        <ManualTimeButton task={task} onAdded={onUpdate ? () => onUpdate({}) : undefined} />
      </div>

      {manualHours > 0 ? <ManualHoursBadge taskId={task.id} manualHours={manualHours} /> : null}
    </div>
  )
}
