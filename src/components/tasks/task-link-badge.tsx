"use client"
import { Link2 } from "lucide-react"
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
  if (parent) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              <Link2 className="h-3 w-3" /> #{parent.id} üzerinde
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-xs">
              <div className="font-semibold">Çizim ana görevde yapılıyor</div>
              <div className="mt-1 text-zinc-300">
                #{parent.id} — {parent.drawing_no}
              </div>
              <div className="text-zinc-400 truncate">{parent.description}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (dependents && dependents.length > 0) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
              <Link2 className="h-3 w-3" /> {dependents.length} bağımlı
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-xs">
              <div className="font-semibold mb-1">Bağımlı görevler</div>
              <ul className="space-y-1">
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
