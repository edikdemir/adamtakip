"use client"
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer"

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  primary:   "#1e40af",
  secondary: "#1e3a5f",
  accent:    "#3b82f6",
  bg:        "#f8fafc",
  surface:   "#ffffff",
  border:    "#e2e8f0",
  text:      "#1e293b",
  muted:     "#64748b",
  light:     "#94a3b8",
  row1:      "#f8fafc",
  row2:      "#ffffff",
  success:   "#16a34a",
  warning:   "#d97706",
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.text,
    backgroundColor: C.surface,
    paddingTop: 0,
    paddingBottom: 36,
    paddingHorizontal: 0,
  },

  // Header band
  header: {
    backgroundColor: C.secondary,
    paddingHorizontal: 36,
    paddingTop: 28,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoPlaceholder: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 9,
    textAlign: "center",
  },
  logoImg: {
    width: 64,
    height: 64,
    borderRadius: 8,
    objectFit: "contain",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  companySubtitle: {
    fontSize: 9,
    color: "rgba(255,255,255,0.7)",
    marginTop: 3,
    letterSpacing: 0.3,
  },

  // Accent strip under header
  accentStrip: {
    backgroundColor: C.accent,
    height: 4,
  },

  // Report title section
  titleSection: {
    paddingHorizontal: 36,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  reportTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
  },
  reportSubtitle: {
    fontSize: 9,
    color: C.muted,
    marginTop: 4,
  },
  metaBlock: {
    alignItems: "flex-end",
  },
  metaText: {
    fontSize: 8,
    color: C.muted,
    marginBottom: 2,
  },

  // Body
  body: {
    paddingHorizontal: 36,
    paddingTop: 16,
  },

  // Section
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    marginBottom: 8,
    marginTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.accent,
  },

  // Summary cards
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
  },
  summaryLabel: {
    fontSize: 7,
    color: C.muted,
    marginTop: 3,
    textAlign: "center",
  },

  // Table
  table: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginBottom: 8,
  },
  thead: {
    flexDirection: "row",
    backgroundColor: C.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  th: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  tbody: {},
  tr: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tr_even: {
    backgroundColor: C.row1,
  },
  tr_odd: {
    backgroundColor: C.row2,
  },
  td: {
    fontSize: 8,
    color: C.text,
  },
  tdMuted: {
    fontSize: 8,
    color: C.muted,
  },
  tdBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.text,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: C.light,
  },
  pageNum: {
    fontSize: 7,
    color: C.light,
  },
})

// ─── Types ────────────────────────────────────────────────────────────────────
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

export interface ReportPdfProps {
  tasks: ReportTask[]
  filters: {
    from: string
    to: string
    adminStatusLabel: string
    projectLabel?: string
    userLabel?: string
    jobTypeLabel?: string
  }
  monthlyData: { month: string; label: string; hours: number }[]
  logoUrl?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function adamSaat(t: ReportTask) {
  return t.total_elapsed_seconds / 3600 + (t.manual_hours ?? 0)
}

function fmt(n: number) {
  return n.toFixed(2)
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

// ─── Document ─────────────────────────────────────────────────────────────────
export function ReportPdf({ tasks, filters, monthlyData, logoUrl }: ReportPdfProps) {
  const totalHours     = tasks.reduce((a, t) => a + adamSaat(t), 0)
  const totalTasks     = tasks.length
  const completedTasks = tasks.filter(t => t.admin_status === "onaylandi").length
  const completionPct  = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Job type breakdown
  const jobTypeMap: Record<string, { name: string; tasks: number; hours: number }> = {}
  for (const t of tasks) {
    const key  = t.job_type?.id ?? "unknown"
    const name = t.job_type?.name ?? "Bilinmiyor"
    if (!jobTypeMap[key]) jobTypeMap[key] = { name, tasks: 0, hours: 0 }
    jobTypeMap[key].tasks++
    jobTypeMap[key].hours += adamSaat(t)
  }
  const jobTypeRows = Object.values(jobTypeMap).sort((a, b) => b.hours - a.hours)

  // Sub-type breakdown
  const subTypeMap: Record<string, { name: string; tasks: number; hours: number }> = {}
  for (const t of tasks) {
    const key = t.job_sub_type?.name ?? "Bilinmiyor"
    if (!subTypeMap[key]) subTypeMap[key] = { name: key, tasks: 0, hours: 0 }
    subTypeMap[key].tasks++
    subTypeMap[key].hours += adamSaat(t)
  }
  const subTypeRows = Object.values(subTypeMap).sort((a, b) => b.hours - a.hours)

  // Worker breakdown (summary only)
  const workerMap: Record<string, { name: string; tasks: number; hours: number }> = {}
  for (const t of tasks) {
    const u = t.assigned_user; if (!u) continue
    if (!workerMap[u.id]) workerMap[u.id] = { name: u.display_name, tasks: 0, hours: 0 }
    workerMap[u.id].tasks++
    workerMap[u.id].hours += adamSaat(t)
  }
  const workerRows = Object.values(workerMap).sort((a, b) => b.hours - a.hours)

  const generatedAt = new Date().toLocaleString("tr-TR")

  return (
    <Document
      title="AdamxSaat Raporu — Cemre Tersanesi"
      author="Cemre Tersanesi Dizayn"
      subject="AdamxSaat Raporu"
    >
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBox}>
            {logoUrl ? (
              <Image src={logoUrl} style={s.logoImg} />
            ) : (
              <Text style={s.logoPlaceholder}>LOGO{"\n"}BURAYA</Text>
            )}
          </View>
          <View style={s.headerRight}>
            <Text style={s.companyName}>CEMRE TERSANESİ</Text>
            <Text style={s.companySubtitle}>Dizayn Departmanı — İş Takip Sistemi</Text>
          </View>
        </View>
        <View style={s.accentStrip} />

        {/* Rapor başlığı + filtre bilgileri */}
        <View style={s.titleSection}>
          <View>
            <Text style={s.reportTitle}>AdamxSaat Raporu</Text>
            <Text style={s.reportSubtitle}>
              {fmtDate(filters.from)} – {fmtDate(filters.to)} • {filters.adminStatusLabel}
            </Text>
          </View>
          <View style={s.metaBlock}>
            {filters.projectLabel  && <Text style={s.metaText}>Proje: {filters.projectLabel}</Text>}
            {filters.userLabel     && <Text style={s.metaText}>Çalışan: {filters.userLabel}</Text>}
            {filters.jobTypeLabel  && <Text style={s.metaText}>İş Tipi: {filters.jobTypeLabel}</Text>}
            <Text style={s.metaText}>Oluşturulma: {generatedAt}</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* Özet kartlar */}
          <Text style={s.sectionTitle}>GENEL ÖZET</Text>
          <View style={s.summaryRow}>
            <View style={s.summaryCard}>
              <Text style={s.summaryValue}>{fmt(totalHours)}</Text>
              <Text style={s.summaryLabel}>Toplam AdamxSaat (sa)</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryValue}>{totalTasks}</Text>
              <Text style={s.summaryLabel}>Toplam Görev</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryValue}>{completedTasks}</Text>
              <Text style={s.summaryLabel}>Onaylanan Görev</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryValue}>%{completionPct}</Text>
              <Text style={s.summaryLabel}>Tamamlanma Oranı</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryValue}>{workerRows.length}</Text>
              <Text style={s.summaryLabel}>Çalışan Sayısı</Text>
            </View>
          </View>

          {/* Aylık AdamxSaat Tablosu */}
          {monthlyData.length > 0 && (
            <>
              <Text style={s.sectionTitle}>AYLIK ADAMxSAAT DAĞILIMI</Text>
              <View style={s.table}>
                <View style={s.thead}>
                  <Text style={[s.th, { flex: 3 }]}>Ay</Text>
                  <Text style={[s.th, { flex: 2, textAlign: "right" }]}>AdamxSaat (sa)</Text>
                  <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Pay (%)</Text>
                </View>
                <View style={s.tbody}>
                  {monthlyData.map((row, i) => (
                    <View key={row.month} style={[s.tr, i % 2 === 0 ? s.tr_even : s.tr_odd]}>
                      <Text style={[s.td, { flex: 3 }]}>{row.label}</Text>
                      <Text style={[s.tdBold, { flex: 2, textAlign: "right" }]}>{fmt(row.hours)}</Text>
                      <Text style={[s.tdMuted, { flex: 1, textAlign: "right" }]}>
                        {totalHours > 0 ? Math.round((row.hours / totalHours) * 100) : 0}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* İş Tipi Tablosu */}
          <Text style={s.sectionTitle}>İŞİN TİPİNE GÖRE DAĞILIM</Text>
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={[s.th, { flex: 3 }]}>İş Tipi</Text>
              <Text style={[s.th, { flex: 1, textAlign: "center" }]}>Görev</Text>
              <Text style={[s.th, { flex: 1.5, textAlign: "right" }]}>AdamxSaat (sa)</Text>
              <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Pay (%)</Text>
            </View>
            <View style={s.tbody}>
              {jobTypeRows.map((row, i) => (
                <View key={row.name} style={[s.tr, i % 2 === 0 ? s.tr_even : s.tr_odd]}>
                  <Text style={[s.td, { flex: 3 }]}>{row.name}</Text>
                  <Text style={[s.td, { flex: 1, textAlign: "center" }]}>{row.tasks}</Text>
                  <Text style={[s.tdBold, { flex: 1.5, textAlign: "right" }]}>{fmt(row.hours)}</Text>
                  <Text style={[s.tdMuted, { flex: 1, textAlign: "right" }]}>
                    {totalHours > 0 ? Math.round((row.hours / totalHours) * 100) : 0}%
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Alt Tip Tablosu */}
          <Text style={s.sectionTitle}>İŞİN ALT TİPİNE GÖRE DAĞILIM</Text>
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={[s.th, { flex: 4 }]}>Alt Tip</Text>
              <Text style={[s.th, { flex: 1, textAlign: "center" }]}>Görev</Text>
              <Text style={[s.th, { flex: 1.5, textAlign: "right" }]}>AdamxSaat (sa)</Text>
              <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Pay (%)</Text>
            </View>
            <View style={s.tbody}>
              {subTypeRows.map((row, i) => (
                <View key={row.name} style={[s.tr, i % 2 === 0 ? s.tr_even : s.tr_odd]}>
                  <Text style={[s.td, { flex: 4 }]}>{row.name}</Text>
                  <Text style={[s.td, { flex: 1, textAlign: "center" }]}>{row.tasks}</Text>
                  <Text style={[s.tdBold, { flex: 1.5, textAlign: "right" }]}>{fmt(row.hours)}</Text>
                  <Text style={[s.tdMuted, { flex: 1, textAlign: "right" }]}>
                    {totalHours > 0 ? Math.round((row.hours / totalHours) * 100) : 0}%
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Çalışan Bazlı Özet */}
          <Text style={s.sectionTitle}>ÇALIŞAN BAZLI ÖZET</Text>
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={[s.th, { flex: 3 }]}>Çalışan</Text>
              <Text style={[s.th, { flex: 1, textAlign: "center" }]}>Görev</Text>
              <Text style={[s.th, { flex: 1.5, textAlign: "right" }]}>AdamxSaat (sa)</Text>
              <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Pay (%)</Text>
            </View>
            <View style={s.tbody}>
              {workerRows.map((row, i) => (
                <View key={row.name} style={[s.tr, i % 2 === 0 ? s.tr_even : s.tr_odd]}>
                  <Text style={[s.td, { flex: 3 }]}>{row.name}</Text>
                  <Text style={[s.td, { flex: 1, textAlign: "center" }]}>{row.tasks}</Text>
                  <Text style={[s.tdBold, { flex: 1.5, textAlign: "right" }]}>{fmt(row.hours)}</Text>
                  <Text style={[s.tdMuted, { flex: 1, textAlign: "right" }]}>
                    {totalHours > 0 ? Math.round((row.hours / totalHours) * 100) : 0}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Cemre Tersanesi — Dizayn İş Takip Sistemi</Text>
          <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `Sayfa ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
