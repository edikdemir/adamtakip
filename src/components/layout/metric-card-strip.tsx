"use client"

import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricItem {
  label: string
  value: React.ReactNode
  hint?: string
  icon: LucideIcon
  tone?: "blue" | "green" | "amber" | "rose" | "slate"
}

const toneClasses: Record<NonNullable<MetricItem["tone"]>, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
  slate: "bg-zinc-100 text-zinc-700 ring-zinc-200",
}

export function MetricCardStrip({ items }: { items: MetricItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon
        const tone = item.tone ?? "slate"

        return (
          <div
            key={item.label}
            className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-500">{item.label}</p>
                <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-zinc-950">{item.value}</p>
                {item.hint ? <p className="mt-1 text-xs text-zinc-400">{item.hint}</p> : null}
              </div>
              <div className={cn("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ring-1", toneClasses[tone])}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
