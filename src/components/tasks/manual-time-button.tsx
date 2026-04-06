"use client"
import { useState } from "react"
import { PlusCircle, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { Task } from "@/types/task"
import { useAddManualTime, useManualTimeEntries } from "@/hooks/use-manual-time"
import { cn } from "@/lib/utils"

interface ManualTimeButtonProps {
  task: Task
  onAdded?: () => void
}

// Shared badge: shows total manual hours, opens popover with entries on click
export function ManualHoursBadge({ taskId, manualHours }: { taskId: number; manualHours: number }) {
  const [open, setOpen] = useState(false)
  const { data: entries = [], isLoading } = useManualTimeEntries(taskId, open)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors"
          title="Manuel süre girişlerini görüntüle"
        >
          <Pencil className="h-3 w-3" />
          +{manualHours.toFixed(1)} sa manuel
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <p className="text-xs font-semibold text-zinc-700 mb-2">Manuel Süre Girişleri</p>
        {isLoading ? (
          <p className="text-xs text-zinc-400">Yükleniyor...</p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-zinc-400">Giriş bulunamadı</p>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((e) => (
              <li key={e.id} className="text-xs border-b border-zinc-100 pb-1.5 last:border-0">
                <div className="flex justify-between items-start">
                  <span className="text-zinc-500">
                    {new Date(e.created_at).toLocaleString("tr-TR", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span className="font-semibold text-amber-600 ml-2">{e.hours.toFixed(1)} sa</span>
                </div>
                <p className="text-zinc-700 mt-0.5 italic">&ldquo;{e.reason}&rdquo;</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 pt-2 border-t border-zinc-100 flex justify-between text-xs font-semibold">
          <span className="text-zinc-500">Toplam</span>
          <span className="text-amber-600">{manualHours.toFixed(1)} sa</span>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Button + dialog for workers to add manual time
export function ManualTimeButton({ task, onAdded }: ManualTimeButtonProps) {
  const [open, setOpen] = useState(false)
  const [inputHours, setInputHours] = useState("")
  const [inputMinutes, setInputMinutes] = useState("")
  const [reason, setReason] = useState("")

  const addManualTime = useAddManualTime(task.id, () => {
    setOpen(false)
    setInputHours("")
    setInputMinutes("")
    setReason("")
    onAdded?.()
  })

  // Don't render for completed/approved tasks
  if (task.admin_status === "onaylandi") return null

  const hrs = parseInt(inputHours) || 0
  const mins = parseInt(inputMinutes) || 0
  const totalHours = hrs + mins / 60
  const isValid = totalHours > 0 && reason.trim().length >= 3

  const handleSubmit = () => {
    if (!isValid) return
    addManualTime.mutate({ hours: totalHours, reason: reason.trim() })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-50",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        title="Manuel süre ekle"
      >
        <PlusCircle className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Manuel Süre Ekle</DialogTitle>
            <p className="text-sm text-zinc-500 mt-0.5">
              {task.drawing_no}
              {task.project?.code && (
                <span className="text-zinc-400"> · {task.project.code}</span>
              )}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Süre</Label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    placeholder="0"
                    value={inputHours}
                    onChange={(e) => setInputHours(e.target.value)}
                    className="w-20 h-9 text-center"
                  />
                  <span className="text-sm text-zinc-500">sa</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0"
                    value={inputMinutes}
                    onChange={(e) => setInputMinutes(e.target.value)}
                    className="w-20 h-9 text-center"
                  />
                  <span className="text-sm text-zinc-500">dk</span>
                </div>
              </div>
              {totalHours > 0 && (
                <p className="text-xs text-zinc-400">= {totalHours.toFixed(2)} saat</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Sebep <span className="text-red-400">*</span></Label>
              <Textarea
                placeholder="Örn: İnternet kesildi, elektrik kesintisi, ofiste çevrimdışı çalışma..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-20 resize-none text-sm"
              />
              {reason.length > 0 && reason.trim().length < 3 && (
                <p className="text-xs text-red-500">En az 3 karakter gerekli</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || addManualTime.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {addManualTime.isPending ? "Ekleniyor..." : "Ekle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
