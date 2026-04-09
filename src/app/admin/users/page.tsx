"use client"
import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { USER_ROLES, ROLE_LABELS, UserRole } from "@/lib/constants"
import { toast } from "sonner"
import { Users } from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"

interface User {
  id: string
  email: string
  display_name: string
  job_title?: string | null
  photo_url?: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

function useUsers() {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then(r => r.json()).then(r => r.data || []),
  })
}

function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<User> }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error("Güncelleme başarısız")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("Kullanıcı güncellendi")
    },
    onError: () => toast.error("Güncelleme başarısız"),
  })
}

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  user: "bg-zinc-100 text-zinc-600 border-zinc-200",
}

export default function UsersPage() {
  const { data: users = [], isLoading } = useUsers()
  const updateUser = useUpdateUser()
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active")

  const filtered = users.filter(u =>
    filter === "all" ? true : filter === "active" ? u.is_active : !u.is_active
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <Users className="h-5 w-5" /> Kullanıcı Yönetimi
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{users.length} kullanıcı</Badge>
          <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {f === "all" ? "Tümü" : f === "active" ? "Aktif" : "Pasif"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 bg-white p-5 animate-pulse">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-zinc-200" />
                <div className="h-4 w-32 bg-zinc-200 rounded" />
                <div className="h-3 w-24 bg-zinc-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Kullanıcı bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((user) => (
            <div
              key={user.id}
              className={`rounded-xl border bg-white shadow-sm flex flex-col items-center p-5 gap-3 transition-opacity ${
                user.is_active ? "border-zinc-200 opacity-100" : "border-zinc-100 opacity-60"
              }`}
            >
              <Link href={`/admin/users/${user.id}`} className="flex flex-col items-center gap-2 group">
                <UserAvatar
                  displayName={user.display_name}
                  photoUrl={user.photo_url}
                  size="lg"
                  className="ring-2 ring-zinc-100 group-hover:ring-indigo-200 transition-all"
                />
                <div className="text-center">
                  <p className="font-semibold text-zinc-900 group-hover:text-indigo-700 transition-colors text-sm leading-tight">
                    {user.display_name}
                  </p>
                  {user.job_title && (
                    <p className="text-xs text-zinc-500 mt-0.5 leading-tight">{user.job_title}</p>
                  )}
                  <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[160px]">{user.email}</p>
                </div>
              </Link>

              <div className="w-full border-t border-zinc-100 pt-3 flex items-center justify-between gap-2">
                <Select
                  value={user.role}
                  onValueChange={(role) => updateUser.mutate({ id: user.id, updates: { role: role as UserRole } })}
                >
                  <SelectTrigger className="h-7 w-auto text-xs border-0 shadow-none bg-transparent p-0 hover:bg-zinc-100 rounded px-2 flex-1">
                    <SelectValue>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Switch
                  checked={user.is_active}
                  onCheckedChange={(checked) =>
                    updateUser.mutate({ id: user.id, updates: { is_active: checked } })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-400">
        Kullanıcılar Microsoft Entra ID ile ilk kez giriş yaptıklarında otomatik olarak sisteme eklenir.
        BT tarafından aktif olmayan kullanıcılar buradan devre dışı bırakılabilir.
      </p>
    </div>
  )
}
