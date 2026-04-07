"use client"
import { GitBranch } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface LinkedTaskRef {
  id: number
  drawing_no: string
  description: string
}

export function TaskLinkBadge({
  parent,
  dependents,
}: {
  parent?: LinkedTaskRef | null
  dependents?: LinkedTaskRef[]
}) {
  // Bu görev bir ana göreve BAĞIMLI → amber
  if (parent?.id) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 cursor-default">
              <GitBranch className="h-3 w-3" />
              ↳ Bağımlı · #{parent.id}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-xs space-y-1">
              <div className="font-semibold text-amber-400">Bağımlı Görev</div>
              <div className="text-zinc-300">
                Bu görev, ana göreve bağımlı olarak yürütülüyor.
              </div>
              <div className="mt-1 font-mono text-zinc-200">
                #{parent.id} — {parent.drawing_no}
              </div>
              <div className="text-zinc-400 truncate">{parent.description}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Bu görev ANA GÖREV, bağımlıları var → violet
  if (dependents && dependents.length > 0) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 cursor-default">
              <GitBranch className="h-3 w-3" />
              ⎇ {dependents.length} bağımlı
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-xs space-y-1">
              <div className="font-semibold text-violet-400">
                Ana Görev — {dependents.length} Bağımlı
              </div>
              <ul className="mt-1 space-y-1">
                {dependents.map((d) => (
                  <li key={d.id} className="text-zinc-300">
                    <span className="font-mono">#{d.id}</span> — {d.drawing_no}
                  </li>
                ))}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return null
}
