"use client"

import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MonthlyReportRow, PIE_COLORS, reportTooltipStyle } from "@/lib/reports/report-utils"

interface ReportChartsGridProps {
  monthlyData: MonthlyReportRow[]
  jobTypePieData: Array<{ name: string; hours: number }>
  workerData: Array<{ name: string; hours: number }>
  subTypeData: Array<{ name: string; hours: number }>
}

export function ReportChartsGrid({
  monthlyData,
  jobTypePieData,
  workerData,
  subTypeData,
}: ReportChartsGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border-zinc-200 shadow-sm [contain-intrinsic-size:320px] [content-visibility:auto]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700">Aylık AdamxSaat</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">Tarihlendirilmiş görev yok</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} tickLine={false} axisLine={false} unit="sa" />
                <Tooltip {...reportTooltipStyle} formatter={(value) => [`${value} sa`, "AdamxSaat"]} />
                <Bar dataKey="hours" name="AdamxSaat" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-200 shadow-sm [contain-intrinsic-size:320px] [content-visibility:auto]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700">İşin Tipine Göre AdamxSaat Dağılımı</CardTitle>
        </CardHeader>
        <CardContent>
          {jobTypePieData.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">Veri yok</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={jobTypePieData}
                  dataKey="hours"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ percent }: { percent?: number }) =>
                    (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ""
                  }
                  labelLine={false}
                >
                  {jobTypePieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...reportTooltipStyle} formatter={(value) => [`${value} sa`, "AdamxSaat"]} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-200 shadow-sm [contain-intrinsic-size:360px] [content-visibility:auto]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700">Çalışan Bazlı AdamxSaat</CardTitle>
        </CardHeader>
        <CardContent>
          {workerData.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">Veri yok</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, workerData.length * 32)}>
              <BarChart data={workerData} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} unit="sa" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#52525b" }} tickLine={false} axisLine={false} width={120} />
                <Tooltip {...reportTooltipStyle} formatter={(value) => [`${value} sa`, "AdamxSaat"]} />
                <Bar
                  dataKey="hours"
                  name="AdamxSaat"
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={20}
                  label={{ position: "right", fontSize: 10, fill: "#52525b", formatter: (value: unknown) => value != null ? String(value) : "" }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-zinc-200 shadow-sm [contain-intrinsic-size:360px] [content-visibility:auto]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700">İşin Alt Tipi Bazlı AdamxSaat</CardTitle>
        </CardHeader>
        <CardContent>
          {subTypeData.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">Veri yok</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, subTypeData.length * 32)}>
              <BarChart data={subTypeData} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} unit="sa" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#52525b" }} tickLine={false} axisLine={false} width={140} />
                <Tooltip {...reportTooltipStyle} formatter={(value) => [`${value} sa`, "AdamxSaat"]} />
                <Bar
                  dataKey="hours"
                  name="AdamxSaat"
                  fill="#f59e0b"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={20}
                  label={{ position: "right", fontSize: 10, fill: "#52525b", formatter: (value: unknown) => value != null ? String(value) : "" }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
