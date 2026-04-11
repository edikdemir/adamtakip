"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Upload, FileSpreadsheet, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { buildTaskDuplicateKey, parseTasksXlsx } from "@/lib/excel/parse-tasks"
import { downloadTaskTemplate } from "@/lib/excel/template"
import type { Lookups, ParsedRow, RowStatus } from "@/lib/excel/types"
import { useAllZones, useJobTypes, useProjects } from "@/hooks/use-reference-data"
import { useBulkImportTasks } from "@/hooks/use-tasks"
import { readApiData } from "@/lib/api-client"
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState("")
  const [parsing, setParsing] = useState(false)
  const [fileError, setFileError] = useState("")
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [filter, setFilter] = useState<FilterMode>("all")

  const { data: projects = [] } = useProjects()
  const { data: jobTypes = [] } = useJobTypes()
  const { data: zones = [] } = useAllZones()

  const bulkImport = useBulkImportTasks()

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
    }),
    [projects, jobTypes, zones]
  )

  const findDbDuplicateKeys = async (parsedRows: ParsedRow[]) => {
    const tasks = parsedRows
      .filter((row) => row.status === "valid")
      .map((row) => row.fields)
      .filter((fields) => fields.project_id && fields.job_sub_type_id && fields.description)

    if (tasks.length === 0) {
      return new Set<string>()
    }

    const response = await fetch("/api/tasks/duplicates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks }),
    })
    const payload = await readApiData<{ duplicate_keys?: string[] }>(response, "Duplicate kontrolü yapılamadı")

    return new Set<string>(payload.duplicate_keys ?? [])
  }

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
        const duplicateKeys = await findDbDuplicateKeys(result.rows)
        setRows(
          result.rows.map((row) => {
            if (row.status !== "valid" || !row.fields.project_id || !row.fields.job_sub_type_id) {
              return row
            }

            const key = buildTaskDuplicateKey(
              row.fields.project_id,
              row.fields.drawing_no ?? "",
              row.fields.location,
              row.fields.job_sub_type_id,
              row.fields.description
            )

            return duplicateKeys.has(key) ? { ...row, status: "duplicate-db", selected: false } : row
          })
        )
      }
    } catch (error) {
      setFileError((error as Error).message)
    } finally {
      setParsing(false)
    }
  }

  const onPickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) handleFile(file)
  }

  const summary = useMemo(() => {
    const value = { total: rows.length, valid: 0, dupDb: 0, dupFile: 0, error: 0, selected: 0 }

    for (const row of rows) {
      if (row.status === "valid") value.valid++
      else if (row.status === "duplicate-db") value.dupDb++
      else if (row.status === "duplicate-file") value.dupFile++
      else if (row.status === "error") value.error++

      if (row.selected && row.status === "valid") value.selected++
    }

    return value
  }, [rows])

  const filtered = useMemo(() => {
    if (filter === "all") return rows
    if (filter === "valid") return rows.filter((row) => row.status === "valid")
    if (filter === "duplicate") return rows.filter((row) => row.status === "duplicate-db" || row.status === "duplicate-file")
    if (filter === "error") return rows.filter((row) => row.status === "error")
    return rows
  }, [rows, filter])

  const toggleRow = (rowNumber: number) => {
    setRows((current) =>
      current.map((row) => (row.rowNumber === rowNumber ? { ...row, selected: !row.selected } : row))
    )
  }

  const toggleAllValid = (checked: boolean) => {
    setRows((current) => current.map((row) => (row.status === "valid" ? { ...row, selected: checked } : row)))
  }

  const handleImport = async () => {
    const tasks = rows.filter((row) => row.selected && row.status === "valid").map((row) => row.fields)
    if (tasks.length === 0) {
      toast.error("Seçili geçerli satır yok")
      return
    }

    try {
      await bulkImport.mutateAsync({ tasks })
      onOpenChange(false)
    } catch {
      // hook zaten toast gösteriyor
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
            Excel dosyasından yüzlerce görevi tek seferde ekleyin. Mevcut görevlerle ve dosya içindeki tekrar eden satırlar otomatik olarak işaretlenir.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 && !parsing ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => downloadTaskTemplate()} className="gap-2">
                <Download className="h-4 w-4" /> Şablon İndir
              </Button>
              <span className="text-xs text-zinc-500">
                Doğru başlık satırını içeren boş bir Excel dosyası indirir.
              </span>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 p-10 transition-colors hover:bg-zinc-50">
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

            {fileError ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{fileError}</span>
              </div>
            ) : null}

            <div className="space-y-1 text-xs text-zinc-500">
              <p className="font-semibold text-zinc-700">Kabul edilen kolonlar:</p>
              <p>
                <strong>Zorunlu:</strong> Proje Kodu, Proje Adı, İş Tipi, İş Alt Tipi, Yapılacak İş
              </p>
              <p>
                <strong>Opsiyonel:</strong> Zone, Mahal, Resim No, Başlama Tarihi, Termin, Öncelik, Notlar
              </p>
              <p>
                <strong>Duplicate kuralı:</strong> Proje + Resim No veya Yapılacak İş + Mahal + İş Alt Tipi birleşimi duplicate kontrolünde kullanılır.
              </p>
            </div>
          </div>
        ) : null}

        {parsing ? <div className="py-12 text-center text-sm text-zinc-500">Dosya işleniyor...</div> : null}

        {rows.length > 0 && !parsing ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
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
                {(["all", "valid", "duplicate", "error"] as FilterMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={filter === mode ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setFilter(mode)}
                  >
                    {mode === "all" && "Tümü"}
                    {mode === "valid" && `Geçerli (${summary.valid})`}
                    {mode === "duplicate" && `Duplicate (${summary.dupDb + summary.dupFile})`}
                    {mode === "error" && `Hatalı (${summary.error})`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 px-1 text-xs text-zinc-600">
              <span>Toplam: <strong>{summary.total}</strong></span>
              <span className="text-emerald-700">Geçerli: <strong>{summary.valid}</strong></span>
              <span className="text-yellow-700">Duplicate (DB): <strong>{summary.dupDb}</strong></span>
              <span className="text-amber-700">Duplicate (Dosya): <strong>{summary.dupFile}</strong></span>
              <span className="text-red-700">Hatalı: <strong>{summary.error}</strong></span>
              <span className="ml-auto">Seçili: <strong>{summary.selected}</strong></span>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200">
              <ScrollArea className="h-[420px]">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-zinc-50">
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          aria-label="Tümünü seç"
                          checked={summary.valid > 0 && summary.selected === summary.valid}
                          onChange={(event) => toggleAllValid(event.target.checked)}
                          className="h-4 w-4"
                        />
                      </TableHead>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="w-32">Durum</TableHead>
                      <TableHead className="w-40">Proje</TableHead>
                      <TableHead className="w-28">İş Tipi</TableHead>
                      <TableHead className="w-28">Alt Tip</TableHead>
                      <TableHead className="w-24">Zone</TableHead>
                      <TableHead className="w-28">Mahal</TableHead>
                      <TableHead className="w-28">Resim No</TableHead>
                      <TableHead>Yapılacak İş</TableHead>
                      <TableHead className="w-24">Termin</TableHead>
                      <TableHead className="w-20">Öncelik</TableHead>
                      <TableHead>Hata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="py-8 text-center text-zinc-400">
                          Bu filtrede satır yok
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((row) => (
                        <TableRow
                          key={row.rowNumber}
                          className={cn(
                            row.status === "error" && "bg-red-50/40",
                            row.status === "duplicate-db" && "bg-yellow-50/40",
                            row.status === "duplicate-file" && "bg-amber-50/40"
                          )}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={row.selected}
                              disabled={row.status !== "valid"}
                              onChange={() => toggleRow(row.rowNumber)}
                              className="h-4 w-4"
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-zinc-400">{row.rowNumber}</TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", STATUS_COLORS[row.status])}>
                              {STATUS_LABELS[row.status]}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="space-y-0.5">
                              <div className="font-medium text-zinc-800">{row.display.project_code}</div>
                              <div className="text-zinc-500">{row.display.project_name}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{row.display.job_type_name}</TableCell>
                          <TableCell className="text-xs">{row.display.job_sub_type_name}</TableCell>
                          <TableCell className="text-xs">{row.display.zone_name}</TableCell>
                          <TableCell className="text-xs">{row.display.location}</TableCell>
                          <TableCell className="font-mono text-xs">{row.display.drawing_no}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs" title={row.display.description}>
                            {row.display.description}
                          </TableCell>
                          <TableCell className="text-xs">{row.display.planned_end}</TableCell>
                          <TableCell className="text-xs">{row.display.priority}</TableCell>
                          <TableCell className="text-xs text-red-600">
                            {row.errors.length > 0 ? row.errors.join("; ") : ""}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Kapat</Button>
          {rows.length > 0 ? (
            <Button onClick={handleImport} disabled={summary.selected === 0 || bulkImport.isPending}>
              {bulkImport.isPending ? "İçe Aktarılıyor..." : `${summary.selected} Görevi İçe Aktar`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
