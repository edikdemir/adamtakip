"use client"
import { useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function Combobox({ value, onChange, options, placeholder, disabled, className }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(value.toLowerCase())
  )

  const handleSelect = (option: string) => {
    onChange(option)
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setOpen(true)
  }

  const handleBlur = () => {
    // küçük gecikme: önce mousedown işlensin
    setTimeout(() => setOpen(false), 150)
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        value={value}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="h-9"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-md border border-zinc-200 bg-white shadow-md max-h-60 overflow-y-auto">
          {filtered.map((option) => (
            <button
              key={option}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 cursor-pointer transition-colors",
                value === option && "bg-zinc-50 font-medium"
              )}
              onMouseDown={(e) => {
                e.preventDefault() // blur tetiklenmesin
                handleSelect(option)
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
