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
      <span
        className={cn(
          "font-mono text-sm font-medium tabular-nums min-w-[6rem]",
          isRunning ? "text-indigo-600" : "text-zinc-700",
          isWarning && "text-orange-600"
        )}
      >
        {formattedTime}
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
