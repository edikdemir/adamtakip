"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Bell, Clock, Mail, Settings } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { MetricCardStrip } from "@/components/layout/metric-card-strip"
import { PageHeader } from "@/components/layout/page-header"

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
    queryFn: () => fetch("/api/settings").then((response) => response.json()).then((payload) => payload.data),
  })
}

function useUpdateSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      })
      if (!response.ok) {
        throw new Error("Güncelleme başarısız")
      }
      return response.json()
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
      if (settings.email_notifications) {
        setEmail(settings.email_notifications)
      }

      if (settings.working_hours) {
        setWorkingHours(settings.working_hours)
      }
    }
  }, [settings])

  if (isLoading) {
    return <p className="py-8 text-sm text-zinc-400">Yükleniyor...</p>
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sistem Yapılandırması"
        title="Ayarlar"
        description="Bildirim davranışlarını, çalışma saatlerini ve timer uyarı eşiklerini yönetim görünümünden düzenleyin."
      />

      <MetricCardStrip
        items={[
          { label: "E-posta", value: email.enabled ? "Açık" : "Kapalı", icon: Mail, tone: email.enabled ? "green" : "slate" },
          { label: "Uyarı eşiği", value: `${email.deadline_warning_days} gün`, icon: Bell, tone: "amber" },
          { label: "Çalışma saati", value: `${workingHours.start} - ${workingHours.end}`, icon: Clock, tone: "blue" },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[28px] border-white/80 bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              E-posta Bildirimleri
            </CardTitle>
            <CardDescription>dizaynistakip@cemreshipyard.com üzerinden iletilen bilgilendirme akışları.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Bildirim sistemi</p>
                <p className="mt-1 text-xs text-zinc-500">Tüm e-posta bildirimlerini tek anahtardan açıp kapatın.</p>
              </div>
              <Switch checked={email.enabled} onCheckedChange={(value) => setEmail((current) => ({ ...current, enabled: value }))} />
            </div>

            <Separator />

            <div className="space-y-3">
              {[
                { key: "send_on_assign" as const, title: "Görev atandığında", text: "Yeni görev ataması kullanıcıya bildirilsin." },
                { key: "send_on_approve" as const, title: "Görev onaylandığında", text: "Tamamlanan iş onaylandığında kullanıcı bilgilendirilsin." },
                { key: "send_on_reject" as const, title: "Görev iade edildiğinde", text: "Revize notu kullanıcıya e-posta ile iletilsin." },
                { key: "send_on_complete" as const, title: "Görev tamamlandığında", text: "Tamamlanan görev admin ekibine bildirilsin." },
                { key: "overdue_notify_user" as const, title: "Geciken iş · kullanıcı", text: "Termin geçen görev için kullanıcı uyarı alsın." },
                { key: "overdue_notify_admin" as const, title: "Geciken iş · admin", text: "Termin geçen görev için admin ekibi uyarı alsın." },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 rounded-[20px] border border-zinc-100 bg-white p-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.text}</p>
                  </div>
                  <Switch
                    checked={email[item.key]}
                    disabled={!email.enabled}
                    onCheckedChange={(value) => setEmail((current) => ({ ...current, [item.key]: value }))}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-[22px] border border-zinc-100 bg-white p-4">
              <div>
                <p className="text-sm font-medium text-zinc-900">Termin uyarı eşiği</p>
                <p className="mt-1 text-xs text-zinc-500">Bitiş tarihinden kaç gün önce uyarı gitsin?</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={14}
                  value={email.deadline_warning_days}
                  disabled={!email.enabled}
                  onChange={(event) =>
                    setEmail((current) => ({
                      ...current,
                      deadline_warning_days: Number.parseInt(event.target.value || "2", 10) || 2,
                    }))
                  }
                  className="h-9 w-20 rounded-xl text-center"
                />
                <span className="text-sm text-zinc-500">gün</span>
              </div>
            </div>

            <Button onClick={() => updateSetting.mutate({ key: "email_notifications", value: email })} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? "Kaydediliyor..." : "E-posta ayarlarını kaydet"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-[28px] border-white/80 bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Çalışma Saatleri
              </CardTitle>
              <CardDescription>Timer ve rapor yorumları için referans saat penceresi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="working-start">Başlangıç</Label>
                  <Input
                    id="working-start"
                    type="time"
                    value={workingHours.start}
                    onChange={(event) => setWorkingHours((current) => ({ ...current, start: event.target.value }))}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="working-end">Bitiş</Label>
                  <Input
                    id="working-end"
                    type="time"
                    value={workingHours.end}
                    onChange={(event) => setWorkingHours((current) => ({ ...current, end: event.target.value }))}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>

              <Button onClick={() => updateSetting.mutate({ key: "working_hours", value: workingHours })} disabled={updateSetting.isPending}>
                {updateSetting.isPending ? "Kaydediliyor..." : "Çalışma saatlerini kaydet"}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-white/80 bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Timer Notları
              </CardTitle>
              <CardDescription>Uygulama içi hatırlatmalar ve veri güvenliği davranışları.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-600">
              <div className="rounded-[20px] border border-zinc-100 bg-zinc-50 p-4">
                Kullanıcı başına tek aktif timer çalışır; bağımlı, iptal veya onaylı görevlerde başlatılamaz.
              </div>
              <div className="rounded-[20px] border border-zinc-100 bg-zinc-50 p-4">
                Timer her 60 saniyede bir sync, her 5 dakikada bir heartbeat gönderir.
              </div>
              <div className="rounded-[20px] border border-zinc-100 bg-zinc-50 p-4">
                Sekme kapanırken uyarı çıkar; kapanışta aktif timer otomatik durdurulmaya çalışılır.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
