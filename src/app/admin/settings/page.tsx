"use client"
import { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Settings, Mail, Clock, Bell } from "lucide-react"
import { toast } from "sonner"

interface EmailSettings {
  enabled: boolean
  send_on_assign: boolean
  send_on_approve: boolean
  send_on_reject: boolean
  send_on_complete: boolean
  deadline_warning_days: number
  overdue_notify_user: boolean
  overdue_notify_admin: boolean
}

interface SystemSettings {
  email_notifications: EmailSettings
  working_hours: { start: string; end: string }
  app_name: string
}

function useSettings() {
  return useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then(r => r.json()).then(r => r.data),
  })
}

function useUpdateSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) throw new Error("Güncelleme başarısız")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      toast.success("Ayarlar kaydedildi")
    },
    onError: () => toast.error("Kaydetme başarısız"),
  })
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const updateSetting = useUpdateSetting()

  const [email, setEmail] = useState<EmailSettings>({
    enabled: true,
    send_on_assign: true,
    send_on_approve: true,
    send_on_reject: true,
    send_on_complete: true,
    deadline_warning_days: 2,
    overdue_notify_user: true,
    overdue_notify_admin: true,
  })
  const [workingHours, setWorkingHours] = useState({ start: "08:00", end: "17:00" })

  useEffect(() => {
    if (settings) {
      if (settings.email_notifications) setEmail(settings.email_notifications)
      if (settings.working_hours) setWorkingHours(settings.working_hours)
    }
  }, [settings])

  const saveEmailSettings = () => {
    updateSetting.mutate({ key: "email_notifications", value: email })
  }

  const saveWorkingHours = () => {
    updateSetting.mutate({ key: "working_hours", value: workingHours })
  }

  if (isLoading) {
    return <p className="text-zinc-400 text-sm py-8">Yükleniyor...</p>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
        <Settings className="h-5 w-5" /> Sistem Ayarları
      </h1>

      {/* Email Notifications */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email Bildirimleri
          </CardTitle>
          <CardDescription>
            dizaynistakip@cemreshipyard.com üzerinden mail bildirimleri.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Master switch */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-200">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Email Bildirimleri</p>
              <p className="text-xs text-zinc-500 mt-0.5">Tüm email bildirimlerini aç/kapat</p>
            </div>
            <Switch
              checked={email.enabled}
              onCheckedChange={(v) => setEmail(e => ({ ...e, enabled: v }))}
            />
          </div>

          <Separator />

          {/* Individual toggles */}
          <div className="space-y-3">
            {[
              { key: "send_on_assign" as const, label: "Görev Atandığında", desc: "Kullanıcıya yeni görev bildir" },
              { key: "send_on_approve" as const, label: "Görev Onaylandığında", desc: "Kullanıcıya onay bildir" },
              { key: "send_on_reject" as const, label: "Görev İade Edildiğinde", desc: "Kullanıcıya iade bildir" },
              { key: "send_on_complete" as const, label: "Görev Tamamlandığında", desc: "Adminlere bildir" },
              { key: "overdue_notify_user" as const, label: "Gecikmiş Görev — Kullanıcıya", desc: "Hedef bitiş tarihi geçen görev için kullanıcıya mail gönder" },
              { key: "overdue_notify_admin" as const, label: "Gecikmiş Görev — Adminlere", desc: "Hedef bitiş tarihi geçen görev için adminlere mail gönder" },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-800">{item.label}</p>
                  <p className="text-xs text-zinc-400">{item.desc}</p>
                </div>
                <Switch
                  checked={email[item.key]}
                  disabled={!email.enabled}
                  onCheckedChange={(v) => setEmail(e => ({ ...e, [item.key]: v }))}
                />
              </div>
            ))}
          </div>

          <Separator />

          {/* Deadline warning days */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800">Deadline Uyarısı</p>
              <p className="text-xs text-zinc-400">Bitiş tarihinden kaç gün önce uyarı gönderilsin</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={14}
                value={email.deadline_warning_days}
                onChange={(e) => setEmail(em => ({ ...em, deadline_warning_days: parseInt(e.target.value) || 2 }))}
                className="w-16 h-8 text-sm text-center"
                disabled={!email.enabled}
              />
              <span className="text-sm text-zinc-500">gün</span>
            </div>
          </div>

          <Button onClick={saveEmailSettings} disabled={updateSetting.isPending} size="sm">
            {updateSetting.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </CardContent>
      </Card>

      {/* Working Hours */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Çalışma Saatleri
          </CardTitle>
          <CardDescription>
            Timer uyarıları ve raporlama için referans çalışma saatleri.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="wh-start" className="text-xs">Başlangıç</Label>
              <Input
                id="wh-start"
                type="time"
                value={workingHours.start}
                onChange={(e) => setWorkingHours(wh => ({ ...wh, start: e.target.value }))}
                className="h-8 w-28 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wh-end" className="text-xs">Bitiş</Label>
              <Input
                id="wh-end"
                type="time"
                value={workingHours.end}
                onChange={(e) => setWorkingHours(wh => ({ ...wh, end: e.target.value }))}
                className="h-8 w-28 text-sm"
              />
            </div>
          </div>
          <Button onClick={saveWorkingHours} disabled={updateSetting.isPending} size="sm">
            {updateSetting.isPending ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </CardContent>
      </Card>

      {/* Timer warning info */}
      <Card className="border-zinc-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" /> Timer Uyarıları
          </CardTitle>
          <CardDescription>
            Kullanıcılar 8 saati geçen timer'lar için uygulama içi uyarı alır.
            Timer verileri her 60 saniyede bir otomatik kaydedilir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-zinc-500 space-y-1">
            <p>• Timer çalışırken tarayıcı kapanırsa veri kaybolmaz (DB'de tutulur)</p>
            <p>• Kullanıcı tekrar girişte açık timer uyarısı görür</p>
            <p>• Logout öncesi açık timer uyarısı verilir</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
