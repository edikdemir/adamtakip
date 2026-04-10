"use client"

import { CheckCircle, Clock, Layers, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface ReportSummaryCardsProps {
  isLoading: boolean
  totalHours: number
  totalTasks: number
  completedTasks: number
  completionRate: number | null
}

export function ReportSummaryCards({
  isLoading,
  totalHours,
  totalTasks,
  completedTasks,
  completionRate,
}: ReportSummaryCardsProps) {
  const cards = [
    { label: "Toplam AdamxSaat", value: `${totalHours.toFixed(1)} sa`, icon: Clock, color: "text-blue-600 bg-blue-100" },
    { label: "Toplam Görev", value: totalTasks, icon: Layers, color: "text-zinc-600 bg-zinc-100" },
    { label: "Onaylanan", value: completedTasks, icon: CheckCircle, color: "text-emerald-600 bg-emerald-100" },
    {
      label: "Tamamlanma",
      value: completionRate == null ? "—" : `%${completionRate}`,
      icon: TrendingUp,
      color: "text-purple-600 bg-purple-100",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <Card key={card.label} className="border-zinc-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">{card.label}</p>
                  <p className="text-2xl font-bold text-zinc-900 mt-1">{isLoading ? "—" : card.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
