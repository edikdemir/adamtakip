"use client"
import { useState, useRef, useEffect } from "react"
import { MessageSquare, Send } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useTaskNotes, useAddTaskNote } from "@/hooks/use-task-notes"
import { toast } from "sonner"

interface TaskNoteButtonProps {
  taskId: number
  drawingNo: string
  noteCount?: number
}

export function TaskNoteButton({ taskId, drawingNo, noteCount = 0 }: TaskNoteButtonProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: notes = [], isLoading } = useTaskNotes(taskId, true)
  const addNote = useAddTaskNote(taskId, () => setText(""))

  // Auto-scroll to bottom when notes load or new note added
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (open && !isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [notes.length, open, isLoading])

  const handleSend = () => {
    const content = text.trim()
    if (!content) return
    addNote.mutate(content, {
      onError: (err) => toast.error(err.message),
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`relative flex items-center gap-1 text-xs font-medium transition-colors ${notes.length > 0 ? "text-indigo-600 hover:text-indigo-800" : "text-zinc-400 hover:text-indigo-600"}`}
          title={`${drawingNo} — Notlar`}
          onClick={(e) => e.stopPropagation()}
        >
          <MessageSquare className={`h-3.5 w-3.5 ${notes.length > 0 ? "fill-indigo-100" : ""}`} />
          {notes.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-600 text-[9px] text-white font-bold leading-none">
              {notes.length > 9 ? "9+" : notes.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 flex flex-col"
        align="end"
        style={{ maxHeight: "380px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-zinc-100 flex-shrink-0">
          <p className="text-xs font-semibold text-zinc-700">Notlar</p>
          <p className="text-[10px] text-zinc-400">{drawingNo}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[80px]" style={{ maxHeight: "220px" }}>
          {isLoading ? (
            <p className="text-xs text-zinc-400 py-2">Yükleniyor...</p>
          ) : notes.length === 0 ? (
            <p className="text-xs text-zinc-400 py-2 text-center">Henüz not yok.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="flex gap-2">
                <UserAvatar
                  displayName={note.user?.display_name || "?"}
                  photoUrl={note.user?.photo_url}
                  size="sm"
                  className="flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] font-semibold text-zinc-700 truncate">
                      {note.user?.display_name || "Bilinmeyen"}
                    </span>
                    <span className="text-[10px] text-zinc-400 flex-shrink-0">
                      {new Date(note.created_at).toLocaleString("tr-TR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 whitespace-pre-wrap break-words mt-0.5">{note.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-zinc-100 p-2 flex-shrink-0">
          <div className="flex gap-1.5 items-end">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Not yaz... (Ctrl+Enter gönderir)"
              className="flex-1 resize-none rounded border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[56px] max-h-[100px]"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || addNote.isPending}
              className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Gönder (Ctrl+Enter)"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
