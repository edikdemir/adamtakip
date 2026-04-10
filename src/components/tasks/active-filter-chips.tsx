"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TaskFilterChip } from "@/lib/tasks/task-filters"

interface ActiveFilterChipsProps {
  chips: TaskFilterChip[]
  onRemove: (key: TaskFilterChip["key"]) => void
  onClear: () => void
}

export function ActiveFilterChips({ chips, onRemove, onClear }: ActiveFilterChipsProps) {
  if (chips.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={`${chip.key}-${chip.value}`}
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
          onClick={() => onRemove(chip.key)}
        >
          <span className="text-blue-500">{chip.label}</span>
          <span className="max-w-[180px] truncate text-blue-800">{chip.value}</span>
          <X className="h-3.5 w-3.5" />
        </button>
      ))}
      <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={onClear}>
        Tümünü temizle
      </Button>
    </div>
  )
}
