"use client"
import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { USER_ROLES, ROLE_LABELS, UserRole } from "@/lib/constants"
import { toast } from "sonner"
import { Users } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface User {
  id: string
  email: string
  display_name: string
  job_title?: string | null
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <Users className="h-5 w-5" /> Kullanıcı Yönetimi
        </h1>
        <Badge variant="secondary">{users.length} kullanıcı</Badge>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50/80">
              <TableHead>Ad Soyad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead className="w-40">Rol</TableHead>
              <TableHead className="w-24">Aktif</TableHead>
              <TableHead>Kayıt Tarihi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-zinc-400">Yükleniyor...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-zinc-400">
                  Henüz kullanıcı yok. Kullanıcılar ilk girişte otomatik oluşturulur.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-zinc-50/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/users/${user.id}`} className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase flex-shrink-0 hover:bg-indigo-200 transition-colors">
                        {user.display_name.charAt(0)}
                      </Link>
                      <div>
                        <Link href={`/admin/users/${user.id}`} className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline underline-offset-2 transition-colors">
                          {user.display_name}
                        </Link>
                        {user.job_title && <p className="text-xs text-zinc-500">{user.job_title}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(role) => updateUser.mutate({ id: user.id, updates: { role: role as UserRole } })}
                    >
                      <SelectTrigger className="h-7 w-36 text-xs border-0 shadow-none bg-transparent p-0 hover:bg-zinc-100 rounded px-2">
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
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.is_active}
                      onCheckedChange={(checked) =>
                        updateUser.mutate({ id: user.id, updates: { is_active: checked } })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">{formatDate(user.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-zinc-400">
        Kullanıcılar Microsoft Entra ID ile ilk kez giriş yaptıklarında otomatik olarak sisteme eklenir.
        BT tarafından aktif olmayan kullanıcılar buradan devre dışı bırakılabilir.
      </p>
    </div>
  )
}
