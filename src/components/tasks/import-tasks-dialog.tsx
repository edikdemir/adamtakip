"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Upload, FileSpreadsheet, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { parseTasksXlsx } from "@/lib/excel/parse-tasks"
import { downloadTaskTemplate } from "@/lib/excel/template"
import type { Lookups, ParsedRow, RowStatus } from "@/lib/excel/types"
import { useAllZones, useJobTypes, useProjects } from "@/hooks/use-reference-data"
import { useBulkImportTasks, useTasks } from "@/hooks/use-tasks"
import { toast } from "sonner"

interface ImportTasksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FilterMode = "all" | "valid" | "duplicate" | "error"

const STATUS_LABELS: Record<RowStatus, string> = {
  valid: "Geçerli",
  error: "Hatalı",
  "duplicate-db": "Duplicate (DB)",
  "duplicate-file": "Duplicate (Dosya)",
}

const STATUS_COLORS: Record<RowStatus, string> = {
  valid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  error: "bg-red-50 text-red-700 border-red-200",
  "duplicate-db": "bg-yellow-50 text-yellow-800 border-yellow-200",
  "duplicate-file": "bg-amber-50 text-amber-800 border-amber-200",
}

export function ImportTasksDialog({ open, onOpenChange }: ImportTasksDialogProps) {
  const { data: existingTasks = [] } = useTasks()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string>("")
  const [parsing, setParsing] = useState(false)
  const [fileError, setFileError] = useState<string>("")
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [filter, setFilter] = useState<FilterMode>("all")

  const { data: projects = [] } = useProjects()
  const { data: jobTypes = [] } = useJobTypes()
  const { data: zones = [] } = useAllZones()

  const bulkImport = useBulkImportTasks()

  // Reset on close
  useEffect(() => {
    if (!open) {
      setFileName("")
      setFileError("")
      setRows([])
      setFilter("all")
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [open])

  const lookups: Lookups = useMemo(
    () => ({
      projects: projects.map((project) => ({ ...project, name: project.name ?? "" })),
      jobTypes: jobTypes.map((jobType) => ({
        ...jobType,
        job_sub_types: (jobType.job_sub_types || []).map((subType) => ({
          id: subType.id,
          name: subType.name,
        })),
      })),
      zones,
      existing: existingTasks.map((t) => ({
        project_id: t.project_id,
        drawing_no: t.drawing_no,
        location: t.location ?? null,
        job_sub_type_id: t.job_sub_type_id,
      })),
    }),
    [projects, jobTypes, zones, existingTasks]
  )

  const handleFile = async (file: File) => {
    setParsing(true)
    setFileError("")
    setRows([])
    setFileName(file.name)
    try {
      const result = await parseTasksXlsx(file, lookups)
      if (result.fileError) {
        setFileError(result.fileError)
      } else {
        setRows(result.rows)
      }
    } catch (e) {
      setFileError((e as Error).message)
    } finally {
      setParsing(false)
    }
  }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const summary = useMemo(() => {
    const s = { total: rows.length, valid: 0, dupDb: 0, dupFile: 0, error: 0, selected: 0 }
    for (const r of rows) {
      if (r.status === "valid") s.valid++
      else if (r.status === "duplicate-db") s.dupDb++
      else if (r.status === "duplicate-file") s.dupFile++
      else if (r.status === "error") s.error++
      if (r.selected && r.status === "valid") s.selected++
    }
    return s
  }, [rows])

  const filtered = useMemo(() => {
    if (filter === "all") return rows
    if (filter === "valid") return rows.filter((r) => r.status === "valid")
    if (filter === "duplicate") return rows.filter((r) => r.status === "duplicate-db" || r.status === "duplicate-file")
    if (filter === "error") return rows.filter((r) => r.status === "error")
    return rows
  }, [rows, filter])

  const toggleRow = (rowNumber: number) => {
    setRows((prev) =>
      prev.map((r) => (r.rowNumber === rowNumber ? { ...r, selected: !r.selected } : r))
    )
  }

  const toggleAllValid = (checked: boolean) => {
    setRows((prev) => prev.map((r) => (r.status === "valid" ? { ...r, selected: checked } : r)))
  }

  const handleImport = async () => {
    const toSend = rows.filter((r) => r.selected && r.status === "valid").map((r) => r.fields)
    if (toSend.length === 0) {
      toast.error("Seçili geçerli satır yok")
      return
    }
    try {
      await bulkImport.mutateAsync({ tasks: toSend })
      onOpenChange(false)
    } catch {
      // hook zaten toast gösterdi
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" /> Excel ile Toplu Görev İçe Aktar
          </DialogTitle>
          <DialogDescription>
            Excel dosyasından yüzlerce görevi tek seferde ekleyin. Mevcut görevlerle ve dosya içinde tekrar eden satırlar otomatik olarak işaretlenir.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: File pick + template */}
        {rows.length === 0 && !parsing && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => downloadTaskTemplate()} className="gap-2">
                <Download className="h-4 w-4" /> Şablon İndir
              </Button>
              <span className="text-xs text-zinc-500">
                Doğru başlık satırını içeren boş bir Excel dosyası indirir.
              </span>
            </div>

            <label className="flex flex-col items-center justify-center gap-2 p-10 border-2 border-dashed border-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-50 transition-colors">
              <Upload className="h-8 w-8 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-700">Excel dosyası seçin</span>
              <span className="text-xs text-zinc-400">.xlsx, .xls veya .csv (max 5MB, 1000 satır)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={onPickFile}
              />
            </label>

            {fileError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{fileError}</span>
              </div>
            )}

            <div className="text-xs text-zinc-500 space-y-1">
              <p className="font-semibold text-zinc-700">Kabul edilen kolonlar:</p>
              <p>
                <strong>Zorunlu:</strong> Proje Kodu, İş Tipi, İş Alt Tipi, Resim No, Yapılacak İş
              </p>
              <p>
                <strong>Opsiyonel:</strong> Zone, Mahal, Başlama Tarihi, Hedef Bitiş Tarihi, Öncelik, Notlar
              </p>
              <p>
                <strong>Duplicate kuralı:</strong> Proje + Resim No + Mahal + İş Alt Tipi aynı olan satırlar duplicate sayılır.
              </p>
            </div>
          </div>
        )}

        {parsing && (
          <div className="py-12 text-center text-sm text-zinc-500">Dosya işleniyor...</div>
        )}

        {/* Step 2: Preview */}
        {rows.length > 0 && !parsing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-zinc-500" />
                <span className="font-medium text-zinc-800">{fileName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => {
                    setRows([])
                    setFileName("")
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                {(["all", "valid", "duplicate", "error"] as FilterMode[]).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFilter(f)}
                  >
                    {f === "all" && "Tümü"}
                    {f === "valid" && `Geçerli (${summary.valid})`}
                    {f === "duplicate" && `Duplicate (${summary.dupDb + summary.dupFile})`}
                    {f === "error" && `Hatalı (${summary.error})`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-600 px-1">
              <span>Toplam: <strong>{summary.total}</strong></span>
              <span className="text-emerald-700">Geçerli: <strong>{summary.valid}</strong></span>
              <span className="text-yellow-700">Duplicate (DB): <strong>{summary.dupDb}</strong></span>
              <span className="text-amber-700">Duplicate (Dosya): <strong>{summary.dupFile}</strong></span>
              <span className="text-red-700">Hatalı: <strong>{summary.error}</strong></span>
              <span className="ml-auto">Seçili: <strong>{summary.selected}</strong></span>
            </div>

            <div className="rounded-lg border border-zinc-200 overflow-hidden">
              <ScrollArea className="h-[420px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-zinc-50 z-10">
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          aria-label="Tümünü seç"
                          checked={summary.valid > 0 && summary.selected === summary.valid}
                          onChange={(e) => toggleAllValid(e.target.checked)}
                          className="h-4 w-4"
                        />
                      </TableHead>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="w-32">Durum</TableHead>
                      <TableHead className="w-24">Proje</TableHead>
                      <TableHead className="w-28">İş Tipi</TableHead>
                      <TableHead className="w-28">Alt Tip</TableHead>
                      <TableHead className="w-24">Zone</TableHead>
                      <TableHead className="w-28">Mahal</TableHead>
                      <TableHead className="w-28">Resim No</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead className="w-24">Hedef Bitiş</TableHead>
                      <TableHead className="w-20">Öncelik</TableHead>
                      <TableHead>Hata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-8 text-zinc-400">
                          Bu filtrede satır yok
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((r) => (
                        <TableRow
                          key={r.rowNumber}
                          className={cn(
                            r.status === "error" && "bg-red-50/40",
                            r.status === "duplicate-db" && "bg-yellow-50/40",
                            r.status === "duplicate-file" && "bg-amber-50/40"
                          )}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={r.selected}
                              disabled={r.status !== "valid"}
                              onChange={() => toggleRow(r.rowNumber)}
                              className="h-4 w-4"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-400">{r.rowNumber}</TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", STATUS_COLORS[r.status])}>
                              {STATUS_LABELS[r.status]}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">{r.display.project_code}</TableCell>
                          <TableCell className="text-xs">{r.display.job_type_name}</TableCell>
                          <TableCell className="text-xs">{r.display.job_sub_type_name}</TableCell>
                          <TableCell className="text-xs">{r.display.zone_name}</TableCell>
                          <TableCell className="text-xs">{r.display.location}</TableCell>
                          <TableCell className="font-mono text-xs">{r.display.drawing_no}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate" title={r.display.description}>
                            {r.display.description}
                          </TableCell>
                          <TableCell className="text-xs">{r.display.planned_end}</TableCell>
                          <TableCell className="text-xs">{r.display.priority}</TableCell>
                          <TableCell className="text-xs text-red-600">
                            {r.errors.length > 0 ? r.errors.join("; ") : ""}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Kapat</Button>
          {rows.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={summary.selected === 0 || bulkImport.isPending}
            >
              {bulkImport.isPending
                ? "İçe Aktarılıyor..."
                : `${summary.selected} Görevi İçe Aktar`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
