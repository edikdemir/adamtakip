"use client"

import { Document, Font, Image, Line, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer"

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const FONT_FAMILY = "Effra"

const BRAND = {
  green: "#63c93d",
  blue: "#1476cf",
  navy: "#153456",
  lightBlue: "#eff6fd",
  lightGreen: "#f3faed",
  border: "#d7e4f2",
  text: "#1f3650",
  muted: "#66809b",
  track: "#e6eef7",
  white: "#ffffff",
}

const PIE_COLORS = [
  BRAND.green,
  BRAND.blue,
  BRAND.navy,
  "#5ba2e9",
  "#85d35b",
  "#7dc4ff",
  "#8ab8e6",
  "#3aa3c2",
]

let assetsRegistered = false

export function registerReportPdfAssets(baseUrl: string) {
  if (assetsRegistered) {
    return
  }

  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: `${baseUrl}/fonts/effra-regular.ttf`, fontWeight: 400 },
      { src: `${baseUrl}/fonts/effra-bold.ttf`, fontWeight: 700 },
    ],
  })
  Font.registerHyphenationCallback((word) => [word])

  assetsRegistered = true
}

const s = StyleSheet.create({
  page: {
    position: "relative",
    fontFamily: FONT_FAMILY,
    color: BRAND.text,
    fontSize: 9,
    paddingTop: 68,
    paddingRight: 40,
    paddingBottom: 84,
    paddingLeft: 40,
    backgroundColor: BRAND.white,
  },
  letterhead: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  },
  hero: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  heroLogo: {
    width: 168,
    height: 28,
    objectFit: "contain",
  },
  heroBrandText: {
    marginTop: 10,
    fontSize: 9,
    color: BRAND.muted,
  },
  heroMeta: {
    alignItems: "flex-end",
    gap: 6,
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: BRAND.lightBlue,
    color: BRAND.blue,
    fontSize: 8,
    fontWeight: 700,
  },
  badgeMuted: {
    backgroundColor: BRAND.lightGreen,
    color: BRAND.navy,
  },
  titleCard: {
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 18,
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 8,
    color: BRAND.blue,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: BRAND.navy,
  },
  subtitle: {
    fontSize: 10,
    color: BRAND.muted,
    marginTop: 5,
  },
  dividerRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
  },
  dividerGreen: {
    height: 4,
    width: 76,
    borderRadius: 999,
    backgroundColor: BRAND.green,
  },
  dividerBlue: {
    height: 4,
    flex: 1,
    borderRadius: 999,
    backgroundColor: BRAND.blue,
  },
  sectionCard: {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionAccent: {
    width: 6,
    height: 18,
    borderRadius: 999,
    backgroundColor: BRAND.green,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: BRAND.navy,
  },
  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  filterCard: {
    width: "31.8%",
    marginHorizontal: 4,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.white,
  },
  filterLabel: {
    fontSize: 7,
    color: BRAND.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  filterValue: {
    fontSize: 9,
    color: BRAND.text,
    fontWeight: 700,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.white,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 700,
    color: BRAND.navy,
  },
  summaryLabel: {
    fontSize: 7,
    color: BRAND.muted,
    marginTop: 3,
    textAlign: "center",
  },
  chartRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  chartCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: BRAND.white,
    padding: 12,
    minHeight: 214,
  },
  chartTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: BRAND.navy,
    marginBottom: 8,
  },
  chartEmpty: {
    marginTop: 60,
    textAlign: "center",
    fontSize: 8,
    color: BRAND.muted,
  },
  axisLabelsRow: {
    flexDirection: "row",
    marginTop: 4,
  },
  axisLabel: {
    flex: 1,
    fontSize: 6,
    color: BRAND.muted,
    textAlign: "center",
  },
  pieLayout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pieLegend: {
    flex: 1,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 6,
  },
  legendText: {
    flex: 1,
    fontSize: 7,
    color: BRAND.text,
  },
  legendValue: {
    fontSize: 7,
    color: BRAND.muted,
    marginLeft: 4,
  },
  horizontalChart: {
    gap: 7,
  },
  horizontalRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  horizontalLabel: {
    width: 68,
    marginRight: 6,
    fontSize: 7,
    color: BRAND.text,
  },
  horizontalTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: BRAND.track,
    overflow: "hidden",
  },
  horizontalValue: {
    width: 30,
    marginLeft: 6,
    fontSize: 7,
    color: BRAND.muted,
    textAlign: "right",
  },
  chartNote: {
    marginTop: 6,
    fontSize: 7,
    color: BRAND.muted,
  },
  table: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BRAND.border,
    overflow: "hidden",
  },
  thead: {
    flexDirection: "row",
    backgroundColor: BRAND.navy,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  th: {
    fontSize: 8,
    color: BRAND.white,
    fontWeight: 700,
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    backgroundColor: BRAND.white,
  },
  trAlt: {
    backgroundColor: BRAND.lightBlue,
  },
  td: {
    fontSize: 8,
    color: BRAND.text,
  },
  tdBold: {
    fontSize: 8,
    color: BRAND.navy,
    fontWeight: 700,
  },
  tdMuted: {
    fontSize: 8,
    color: BRAND.muted,
  },
  pageNumber: {
    position: "absolute",
    right: 42,
    bottom: 17,
    fontSize: 8,
    color: BRAND.white,
  },
})

export interface ReportTask {
  id: number
  drawing_no: string
  total_elapsed_seconds: number
  manual_hours: number | null
  admin_status: string
  completion_date: string | null
  planned_end: string | null
  planned_start: string | null
  assigned_user: { id: string; display_name: string; email: string } | null
  project: { id: string; code: string; name: string | null } | null
  job_type: { id: string; name: string } | null
  job_sub_type: { id: string; name: string } | null
}

interface HoursDatum {
  name: string
  hours: number
}

interface MonthlyDatum {
  month: string
  label: string
  hours: number
}

export interface ReportPdfProps {
  tasks: ReportTask[]
  filters: {
    from: string
    to: string
    adminStatusLabel: string
    projectLabel: string
    userLabel: string
    jobTypeLabel: string
  }
  monthlyData: MonthlyDatum[]
  jobTypePieData: HoursDatum[]
  workerData: HoursDatum[]
  subTypeData: HoursDatum[]
  logoUrl?: string
  letterheadUrl?: string
}

function getTaskHours(task: ReportTask) {
  return task.total_elapsed_seconds / 3600 + (task.manual_hours ?? 0)
}

function formatHours(value: number) {
  return value.toFixed(2)
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-"
  }

  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

function describePieSlice(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle)
  const end = polarToCartesian(centerX, centerY, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ")
}

function compactPieData(data: HoursDatum[], limit = 6) {
  if (data.length <= limit) {
    return data
  }

  const visible = data.slice(0, limit - 1)
  const remainingHours = data.slice(limit - 1).reduce((total, item) => total + item.hours, 0)

  return [...visible, { name: "Diğer", hours: Number(remainingHours.toFixed(2)) }]
}

function buildBreakdownRows(tasks: ReportTask[], key: "jobType" | "subType" | "worker") {
  const rows: Record<string, { name: string; tasks: number; hours: number }> = {}

  for (const task of tasks) {
    const name =
      key === "jobType"
        ? (task.job_type?.name ?? "Belirtilmedi")
        : key === "subType"
          ? (task.job_sub_type?.name ?? "Belirtilmedi")
          : (task.assigned_user?.display_name ?? "Atanmamış")

    if (!rows[name]) {
      rows[name] = { name, tasks: 0, hours: 0 }
    }

    rows[name].tasks += 1
    rows[name].hours += getTaskHours(task)
  }

  return Object.values(rows).sort((first, second) => second.hours - first.hours)
}

function PageBackground({ letterheadUrl }: Pick<ReportPdfProps, "letterheadUrl">) {
  if (!letterheadUrl) {
    return null
  }

  return <Image fixed src={letterheadUrl} style={s.letterhead} />
}

function ReportHeader({
  filters,
  generatedAt,
  logoUrl,
}: Pick<ReportPdfProps, "filters" | "logoUrl"> & { generatedAt: string }) {
  return (
    <>
      <View style={s.hero}>
        <View>
          {logoUrl ? <Image src={logoUrl} style={s.heroLogo} /> : null}
          <Text style={s.heroBrandText}>Cemre Tersanesi | Dizayn Departmanı</Text>
        </View>
        <View style={s.heroMeta}>
          <Text style={s.badge}>{filters.adminStatusLabel}</Text>
          <Text style={[s.badge, s.badgeMuted]}>Oluşturulma: {generatedAt}</Text>
        </View>
      </View>

      <View style={s.titleCard}>
        <Text style={s.eyebrow}>İş Takip Sistemi</Text>
        <Text style={s.title}>Adam/Saat Raporu</Text>
        <Text style={s.subtitle}>
          {filters.projectLabel} | {formatDate(filters.from)} - {formatDate(filters.to)}
        </Text>
        <View style={s.dividerRow}>
          <View style={s.dividerGreen} />
          <View style={s.dividerBlue} />
        </View>
      </View>
    </>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={s.sectionHeadingRow}>
      <View style={s.sectionAccent} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  )
}

function VerticalBarChart({ data, color }: { data: MonthlyDatum[]; color: string }) {
  if (data.length === 0) {
    return <Text style={s.chartEmpty}>Bu filtrede grafik verisi yok.</Text>
  }

  const width = 220
  const height = 120
  const baseline = 102
  const maxValue = Math.max(...data.map((item) => item.hours), 1)
  const slotWidth = width / data.length
  const barWidth = Math.min(24, slotWidth * 0.55)

  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={8} y1={baseline} x2={width - 8} y2={baseline} stroke={BRAND.border} strokeWidth={1} />
        <Line x1={8} y1={20} x2={width - 8} y2={20} stroke={BRAND.border} strokeWidth={0.8} />
        <Line x1={8} y1={61} x2={width - 8} y2={61} stroke={BRAND.border} strokeWidth={0.8} />
        {data.map((item, index) => {
          const x = slotWidth * index + (slotWidth - barWidth) / 2
          const barHeight = Math.max(4, (item.hours / maxValue) * 78)
          const y = baseline - barHeight

          return <Rect key={item.month} x={x} y={y} width={barWidth} height={barHeight} fill={color} rx={3} ry={3} />
        })}
      </Svg>
      <View style={s.axisLabelsRow}>
        {data.map((item) => (
          <Text key={item.month} style={s.axisLabel}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  )
}

function PieChart({ data }: { data: HoursDatum[] }) {
  if (data.length === 0) {
    return <Text style={s.chartEmpty}>Bu filtrede grafik verisi yok.</Text>
  }

  const chartData = compactPieData(data)
  const total = chartData.reduce((sum, item) => sum + item.hours, 0)
  let currentAngle = 0

  return (
    <View style={s.pieLayout}>
      <Svg width={120} height={120}>
        {chartData.map((item, index) => {
          const sliceAngle = total > 0 ? (item.hours / total) * 360 : 0
          const path = describePieSlice(60, 60, 48, currentAngle, currentAngle + sliceAngle)
          const element = <Path key={item.name} d={path} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          currentAngle += sliceAngle
          return element
        })}
      </Svg>
      <View style={s.pieLegend}>
        {chartData.map((item, index) => (
          <View key={item.name} style={s.legendItem}>
            <View style={[s.legendSwatch, { backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }]} />
            <Text style={s.legendText}>{item.name}</Text>
            <Text style={s.legendValue}>{formatHours(item.hours)}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function HorizontalBarChart({ data, color, limit = 8 }: { data: HoursDatum[]; color: string; limit?: number }) {
  if (data.length === 0) {
    return <Text style={s.chartEmpty}>Bu filtrede grafik verisi yok.</Text>
  }

  const visible = data.slice(0, limit)
  const maxValue = Math.max(...visible.map((item) => item.hours), 1)

  return (
    <View style={s.horizontalChart}>
      {visible.map((item) => (
        <View key={item.name} style={s.horizontalRow}>
          <Text style={s.horizontalLabel}>{item.name}</Text>
          <View style={s.horizontalTrack}>
            <View
              style={{
                width: `${Math.max(6, (item.hours / maxValue) * 100)}%`,
                height: 8,
                backgroundColor: color,
                borderRadius: 999,
              }}
            />
          </View>
          <Text style={s.horizontalValue}>{formatHours(item.hours)}</Text>
        </View>
      ))}
      {data.length > limit ? <Text style={s.chartNote}>İlk {limit} kalem gösterildi.</Text> : null}
    </View>
  )
}

function BreakdownTable({
  title,
  rows,
  totalHours,
}: {
  title: string
  rows: Array<{ name: string; tasks: number; hours: number }>
  totalHours: number
}) {
  return (
    <View style={s.sectionCard}>
      <SectionHeader title={title} />
      <View style={s.table}>
        <View style={s.thead}>
          <Text style={[s.th, { flex: 3 }]}>Kalem</Text>
          <Text style={[s.th, { flex: 1, textAlign: "center" }]}>Görev</Text>
          <Text style={[s.th, { flex: 1.5, textAlign: "right" }]}>Adam/Saat</Text>
          <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Pay</Text>
        </View>
        {rows.map((row, index) => (
          <View key={`${title}-${row.name}`} style={index % 2 === 1 ? [s.tr, s.trAlt] : s.tr}>
            <Text style={[s.td, { flex: 3 }]}>{row.name}</Text>
            <Text style={[s.td, { flex: 1, textAlign: "center" }]}>{row.tasks}</Text>
            <Text style={[s.tdBold, { flex: 1.5, textAlign: "right" }]}>{formatHours(row.hours)}</Text>
            <Text style={[s.tdMuted, { flex: 1, textAlign: "right" }]}>
              {totalHours > 0 ? `${Math.round((row.hours / totalHours) * 100)}%` : "0%"}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function PageNumber() {
  return <Text style={s.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
}

export function ReportPdf({
  tasks,
  filters,
  monthlyData,
  jobTypePieData,
  workerData,
  subTypeData,
  logoUrl,
  letterheadUrl,
}: ReportPdfProps) {
  const totalHours = tasks.reduce((sum, task) => sum + getTaskHours(task), 0)
  const totalTasks = tasks.length
  const approvedTasks = tasks.filter((task) => task.admin_status === "onaylandi").length
  const completionRate = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0
  const generatedAt = new Date().toLocaleString("tr-TR")

  const jobTypeRows = buildBreakdownRows(tasks, "jobType")
  const subTypeRows = buildBreakdownRows(tasks, "subType")
  const workerRows = buildBreakdownRows(tasks, "worker")

  return (
    <Document title="Adam/Saat Raporu" author="Cemre Tersanesi" subject="Adam/Saat Raporu">
      <Page size="A4" style={s.page}>
        <PageBackground letterheadUrl={letterheadUrl} />
        <ReportHeader filters={filters} generatedAt={generatedAt} logoUrl={logoUrl} />

        <View style={s.sectionCard}>
          <SectionHeader title="Uygulanan Filtreler" />
          <View style={s.filterGrid}>
            <View style={s.filterCard}>
              <Text style={s.filterLabel}>Proje</Text>
              <Text style={s.filterValue}>{filters.projectLabel}</Text>
            </View>
            <View style={s.filterCard}>
              <Text style={s.filterLabel}>Tarih Aralığı</Text>
              <Text style={s.filterValue}>
                {formatDate(filters.from)} - {formatDate(filters.to)}
              </Text>
            </View>
            <View style={s.filterCard}>
              <Text style={s.filterLabel}>Onay Durumu</Text>
              <Text style={s.filterValue}>{filters.adminStatusLabel}</Text>
            </View>
            <View style={s.filterCard}>
              <Text style={s.filterLabel}>Çalışan</Text>
              <Text style={s.filterValue}>{filters.userLabel}</Text>
            </View>
            <View style={s.filterCard}>
              <Text style={s.filterLabel}>İş Tipi</Text>
              <Text style={s.filterValue}>{filters.jobTypeLabel}</Text>
            </View>
            <View style={s.filterCard}>
              <Text style={s.filterLabel}>Toplam Kayıt</Text>
              <Text style={s.filterValue}>{totalTasks} görev</Text>
            </View>
          </View>
        </View>

        <View style={s.sectionCard}>
          <SectionHeader title="Genel Özet" />
          <View style={s.summaryRow}>
            <View style={s.summaryCard}>
              <Text style={s.summaryValue}>{formatHours(totalHours)}</Text>
              <Text style={s.summaryLabel}>Toplam Adam/Saat</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryValue}>{totalTasks}</Text>
              <Text style={s.summaryLabel}>Toplam Görev</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryValue}>{approvedTasks}</Text>
              <Text style={s.summaryLabel}>Onaylanan</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryValue}>%{completionRate}</Text>
              <Text style={s.summaryLabel}>Tamamlanma</Text>
            </View>
          </View>
        </View>

        <View style={s.chartRow}>
          <View style={s.chartCard}>
            <Text style={s.chartTitle}>Aylık Adam/Saat</Text>
            <VerticalBarChart data={monthlyData} color={BRAND.blue} />
          </View>
          <View style={s.chartCard}>
            <Text style={s.chartTitle}>İş Tipine Göre Dağılım</Text>
            <PieChart data={jobTypePieData} />
          </View>
        </View>

        <View style={s.chartRow}>
          <View style={s.chartCard}>
            <Text style={s.chartTitle}>Çalışan Bazlı Adam/Saat</Text>
            <HorizontalBarChart data={workerData} color={BRAND.green} />
          </View>
          <View style={s.chartCard}>
            <Text style={s.chartTitle}>Alt Tip Bazlı Adam/Saat</Text>
            <HorizontalBarChart data={subTypeData} color={BRAND.blue} />
          </View>
        </View>

        <PageNumber />
      </Page>

      <Page size="A4" style={s.page}>
        <PageBackground letterheadUrl={letterheadUrl} />
        <ReportHeader filters={filters} generatedAt={generatedAt} logoUrl={logoUrl} />

        <BreakdownTable title="İş Tipi Kırılımı" rows={jobTypeRows} totalHours={totalHours} />
        <BreakdownTable title="Alt Tip Kırılımı" rows={subTypeRows} totalHours={totalHours} />
        <BreakdownTable title="Çalışan Kırılımı" rows={workerRows} totalHours={totalHours} />

        <PageNumber />
      </Page>
    </Document>
  )
}
