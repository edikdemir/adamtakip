"use client"
import { Play, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTaskTimer } from "@/hooks/use-task-timer"
import { Task } from "@/types/task"
import { cn } from "@/lib/utils"

interface TaskRowTimerProps {
  task: Task
  onUpdate?: (updatedTask: Partial<Task>) => void
}

export function TaskRowTimer({ task, onUpdate }: TaskRowTimerProps) {
  const { formattedTime, isRunning, isWarning, toggle, isLoading } = useTaskTimer(task, onUpdate)

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5">
        {isRunning && (
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        )}
        <span
          className={cn(
            "font-mono text-sm tabular-nums min-w-[6rem]",
            isWarning ? "text-orange-600 font-semibold"
              : isRunning ? "text-emerald-700 font-semibold"
              : "text-zinc-700 font-medium"
          )}
        >
          {formattedTime}
        </span>
      </span>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7",
          isRunning
            ? "text-red-500 hover:text-red-600 hover:bg-red-50"
            : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
        )}
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
        disabled={isLoading}
        title={isRunning ? "Durdur" : "Başlat"}
      >
        {isRunning ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
      </Button>
    </div>
  )
}
