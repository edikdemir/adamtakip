"use client"
import { useMemo, useState, useEffect } from "react"
import { Task } from "@/types/task"
import { useLinkTasks } from "@/hooks/use-tasks"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Link2 } from "lucide-react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  primary: Task | null
  allUserTasks: Task[]
}

/**
 * "Bağlı görevleri yönet" modal'ı.
 * Kullanıcı, primary olarak seçtiği görev üzerinden kendi diğer
 * görevlerini bağımlı olarak işaretler. Mevcut bağlar default
 * işaretli gelir; replace semantik kullanılır.
 */
export function LinkTasksDialog({ open, onOpenChange, primary, allUserTasks }: Props) {
  const linkTasks = useLinkTasks()
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // Default seçili: zaten primary'ye bağlı olanlar
  useEffect(() => {
    if (primary && open) {
      const current = new Set<number>(
        allUserTasks
          .filter((t) => t.linked_to_task_id === primary.id)
          .map((t) => t.id)
      )
      setSelected(current)
    }
  }, [primary, allUserTasks, open])

  // Seçilebilir görev listesi:
  // - Primary'nin kendisi hariç
  // - Başka bir göreve bağlı olanlar (zaten bu primary'ye bağlı olanlar hariç) gizlenir
  // - Bu task primary mi (kendisinin bağımlıları var mı) — varsa bağımlı yapılamaz, gizle
  const candidates = useMemo(() => {
    if (!primary) return []
    return allUserTasks.filter((t) => {
      if (t.id === primary.id) return false
      // Zaten başka primary'ye bağlı → gizle
      if (t.linked_to_task_id !== null && t.linked_to_task_id !== primary.id) return false
      // Bu task kendisi başkalarının primary'si ise (bağımlıları varsa) gizle
      if (t.linked_tasks && t.linked_tasks.length > 0) return false
      return true
    })
  }, [primary, allUserTasks])

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    if (!primary) return
    await linkTasks.mutateAsync({
      primaryId: primary.id,
      dependentIds: Array.from(selected),
    })
    onOpenChange(false)
  }

  // Primary kendisi başka göreve bağlıysa linkleme yapamaz
  const primaryIsDependent = primary?.linked_to_task_id != null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Bağlı Görevleri Yönet
          </DialogTitle>
          {primary && (
            <DialogDescription>
              Primary: <span className="font-mono">#{primary.id}</span> — {primary.drawing_no}
              <br />
              <span className="text-xs text-zinc-500">
                Bu görev üzerinde yaptığın çizimi paylaşan diğer görevlerini işaretle.
              </span>
            </DialogDescription>
          )}
        </DialogHeader>

        {primaryIsDependent ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Bu görev zaten başka bir göreve bağlı (#{primary?.linked_to_task_id}).
            Önce o bağı kaldırman gerekir.
          </div>
        ) : (
          <ScrollArea className="h-72 rounded-md border border-zinc-200">
            {candidates.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-400">
                Linklenebilecek başka görev yok.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {candidates.map((t) => (
                  <li key={t.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-zinc-50">
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => toggle(t.id)}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-xs text-zinc-400">#{t.id}</span>
                          <span className="font-medium text-zinc-800">{t.drawing_no}</span>
                          {t.project?.code && (
                            <span className="text-xs text-zinc-500">— {t.project.code}</span>
                          )}
                        </div>
                        <p className="truncate text-xs text-zinc-500">{t.description}</p>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button
            onClick={handleSave}
            disabled={primaryIsDependent || linkTasks.isPending}
          >
            {linkTasks.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
