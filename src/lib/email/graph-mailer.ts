import { createServerClient } from "@/lib/supabase/server"
import { Task } from "@/types/task"
import { User } from "@/types/user"

async function getGraphToken(): Promise<string> {
  const tenantId = process.env.AZURE_AD_TENANT_ID
  const clientId = process.env.AZURE_AD_CLIENT_ID
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId!,
        client_secret: clientSecret!,
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  )
  const json = await res.json()
  if (!json.access_token) throw new Error("Failed to get Graph token")
  return json.access_token
}

async function getEmailSettings() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "email_notifications")
    .single()
  return data?.value as {
    enabled: boolean
    send_on_assign: boolean
    send_on_approve: boolean
    send_on_reject: boolean
    send_on_complete: boolean
    send_on_note?: boolean
    overdue_notify_user?: boolean
    overdue_notify_admin?: boolean
  } | null
}

export async function getEmailNotificationSettings() {
  return getEmailSettings()
}

async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  const senderEmail = process.env.GRAPH_SENDER_EMAIL
  if (!senderEmail) {
    console.warn("GRAPH_SENDER_EMAIL not configured, skipping email")
    return
  }

  try {
    const token = await getGraphToken()
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject,
            body: { contentType: "HTML", content: htmlBody },
            toRecipients: [{ emailAddress: { address: to } }],
          },
          saveToSentItems: false,
        }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      console.error("Graph sendMail error:", err)
    }
  } catch (err) {
    console.error("Email send failed:", err)
  }
}

function emailTemplate(
  title: string,
  accentColor: string,
  body: string,
  ctaUrl?: string,
  ctaText?: string
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin:0; padding: 24px 16px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background: #18181b; padding: 20px 32px; display: flex; align-items: center; gap: 12px;">
      <div style="width: 4px; height: 32px; background: ${accentColor}; border-radius: 2px;"></div>
      <div>
        <div style="color: #fff; font-size: 16px; font-weight: 700; letter-spacing: -0.3px;">Adam Takip</div>
        <div style="color: #a1a1aa; font-size: 12px; margin-top: 1px;">Cemre Tersanesi — Dizayn Departmanı</div>
      </div>
    </div>
    <!-- Title bar -->
    <div style="background: ${accentColor}; padding: 14px 32px;">
      <h2 style="color: #fff; margin: 0; font-size: 17px; font-weight: 600;">${title}</h2>
    </div>
    <!-- Content -->
    <div style="padding: 28px 32px;">
      ${body}
      ${ctaUrl ? `<div style="margin-top: 28px;"><a href="${appUrl}${ctaUrl}" style="display: inline-block; background: ${accentColor}; color: #fff; padding: 11px 24px; border-radius: 7px; text-decoration: none; font-weight: 600; font-size: 14px;">${ctaText || "Uygulamaya Git"}</a></div>` : ""}
    </div>
    <!-- Footer -->
    <div style="background: #f8f8f9; padding: 14px 32px; border-top: 1px solid #e4e4e7;">
      <p style="color: #a1a1aa; font-size: 11px; margin: 0;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
    </div>
  </div>
</body>
</html>`
}

// Two-column detail table for task info
function taskDetailTable(rows: Array<[string, string | null | undefined]>): string {
  const visibleRows = rows.filter(([, v]) => v && v !== "-")
  if (visibleRows.length === 0) return ""
  return `
<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
  ${visibleRows.map(([label, value]) => `
  <tr>
    <td style="padding: 8px 12px; background: #f8f8f9; border: 1px solid #e4e4e7; font-weight: 600; color: #52525b; width: 38%; vertical-align: top;">${label}</td>
    <td style="padding: 8px 12px; border: 1px solid #e4e4e7; color: #18181b; vertical-align: top;">${value}</td>
  </tr>`).join("")}
</table>`
}

const PRIORITY_LABEL: Record<string, string> = {
  low: "🟢 Düşük", medium: "🟡 Orta", high: "🟠 Yüksek", urgent: "🔴 Acil",
}

const ADMIN_STATUS_LABEL: Record<string, string> = {
  atandi: "Atandı", devam_ediyor: "Devam Ediyor",
  tamamlandi: "Onay Bekliyor", onaylandi: "Hazır", iptal: "İptal",
}

function fmtDate(d: string | null | undefined): string | null {
  if (!d) return null
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })
}

function greeting(name: string): string {
  return `<p style="color: #18181b; font-size: 15px; margin: 0 0 20px;">Merhaba <strong>${name}</strong>,</p>`
}

export async function sendTaskAssignedEmail(user: User, task: Task): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled || !settings?.send_on_assign) return

  const subject = `[Adam Takip] Yeni Görev: ${task.drawing_no} — ${task.project?.code || ""}`
  const body = `
    ${greeting(user.display_name)}
    <p style="color: #52525b; font-size: 14px; margin: 0 0 4px;">Size yeni bir görev atandı. Görev detayları aşağıda yer almaktadır:</p>
    ${taskDetailTable([
      ["Proje", task.project?.code ? `${task.project.code}${task.project.name ? " — " + task.project.name : ""}` : null],
      ["Çizim No", task.drawing_no],
      ["İş Tipi", task.job_type?.name],
      ["İş Alt Tipi", task.job_sub_type?.name],
      ["Açıklama", task.description],
      ["Öncelik", PRIORITY_LABEL[task.priority] || task.priority],
      ["Başlama Tarihi", fmtDate(task.planned_start)],
      ["Hedef Bitiş Tarihi", fmtDate(task.planned_end)],
      ["Durum", ADMIN_STATUS_LABEL[task.admin_status] || task.admin_status],
      ["Admin Notu", task.admin_notes],
    ])}
    <p style="color: #52525b; font-size: 13px; margin: 16px 0 0;">Görevi görüntülemek ve kronometreyi başlatmak için uygulamaya giriniz.</p>
  `
  await sendEmail(
    user.email, subject,
    emailTemplate("Yeni Görev Atandı", "#2563eb", body, "/dashboard", "Göreve Git")
  )
}

export async function sendTaskApprovedEmail(user: User, task: Task): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled || !settings?.send_on_approve) return

  const subject = `[Adam Takip] Görev Onaylandı — Hazır: ${task.drawing_no}`
  const totalHours = ((task.total_elapsed_seconds || 0) / 3600 + (task.manual_hours || 0)).toFixed(1)
  const body = `
    ${greeting(user.display_name)}
    <p style="color: #52525b; font-size: 14px; margin: 0 0 4px;">Aşağıdaki göreviniz yöneticiniz tarafından onaylandı ve <strong>Hazır</strong> olarak işaretlendi. Tebrikler!</p>
    ${taskDetailTable([
      ["Proje", task.project?.code ? `${task.project.code}${task.project.name ? " — " + task.project.name : ""}` : null],
      ["Çizim No", task.drawing_no],
      ["İş Tipi", task.job_type?.name],
      ["İş Alt Tipi", task.job_sub_type?.name],
      ["Açıklama", task.description],
      ["Kesin Bitiş Tarihi", fmtDate(task.approved_at)],
      ["Toplam Süre", totalHours && totalHours !== "0.0" ? `${totalHours} saat` : null],
    ])}
  `
  await sendEmail(
    user.email, subject,
    emailTemplate("Görev Onaylandı — Hazır ✓", "#16a34a", body, "/dashboard", "Panele Git")
  )
}

export async function sendTaskRejectedEmail(user: User, task: Task, reason?: string): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled || !settings?.send_on_reject) return

  const subject = `[Adam Takip] Revize İsteği: ${task.drawing_no}`
  const body = `
    ${greeting(user.display_name)}
    <p style="color: #52525b; font-size: 14px; margin: 0 0 4px;">Aşağıdaki göreviniz revize için size iade edildi. Gerekli düzeltmeleri yaparak tekrar tamamlayınız.</p>
    ${taskDetailTable([
      ["Proje", task.project?.code ? `${task.project.code}${task.project.name ? " — " + task.project.name : ""}` : null],
      ["Çizim No", task.drawing_no],
      ["İş Tipi", task.job_type?.name],
      ["İş Alt Tipi", task.job_sub_type?.name],
      ["Açıklama", task.description],
      ["Öncelik", PRIORITY_LABEL[task.priority] || task.priority],
    ])}
    ${reason ? `
    <div style="margin: 16px 0; padding: 14px 16px; background: #fff7ed; border-left: 4px solid #f97316; border-radius: 4px;">
      <p style="margin: 0; font-size: 13px; font-weight: 600; color: #c2410c; margin-bottom: 4px;">Revize Sebebi</p>
      <p style="margin: 0; font-size: 14px; color: #7c2d12;">${reason}</p>
    </div>` : ""}
    <p style="color: #52525b; font-size: 13px; margin: 16px 0 0;">Lütfen uygulamaya girerek görevi inceleyin ve gerekli düzeltmeleri yapın.</p>
  `
  await sendEmail(
    user.email, subject,
    emailTemplate("Görev Revizeye Gönderildi", "#d97706", body, "/dashboard", "Göreve Git")
  )
}

export async function sendOverdueEmail(
  recipientEmail: string,
  recipientName: string,
  task: Task,
  daysOverdue: number,
  recipientRole: "user" | "admin"
): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled) return
  if (recipientRole === "user" && settings.overdue_notify_user === false) return
  if (recipientRole === "admin" && settings.overdue_notify_admin === false) return

  const actionLine =
    recipientRole === "admin" && task.admin_status === "tamamlandi"
      ? "Görev tamamlandı ancak onay bekliyor. Lütfen onaylayın veya revizeye gönderin."
      : recipientRole === "admin"
        ? "Görev hâlâ tamamlanmadı. Çalışanı bilgilendirmeniz önerilir."
        : "Lütfen görevi en kısa sürede tamamlayın."

  const subject = `[Adam Takip] Gecikmiş Görev (+${daysOverdue} gün): ${task.drawing_no}`
  const body = `
    ${greeting(recipientName)}
    <p style="color: #52525b; font-size: 14px; margin: 0 0 4px;"><strong>${task.drawing_no}</strong> numaralı görevin hedef bitiş tarihi <strong>${daysOverdue} gün</strong> önce geçti.</p>
    ${taskDetailTable([
      ["Proje", task.project?.code ? `${task.project.code}${task.project.name ? " — " + task.project.name : ""}` : null],
      ["Çizim No", task.drawing_no],
      ["İş Tipi", (task as unknown as Record<string, unknown> & { job_type?: { name?: string } }).job_type?.name],
      ["İş Alt Tipi", (task as unknown as Record<string, unknown> & { job_sub_type?: { name?: string } }).job_sub_type?.name],
      ["Açıklama", task.description],
      ["Hedef Bitiş Tarihi", fmtDate(task.planned_end)],
      ["Gecikme", `${daysOverdue} gün`],
      ["Öncelik", PRIORITY_LABEL[task.priority] || task.priority],
      ["Durum", ADMIN_STATUS_LABEL[task.admin_status] || task.admin_status],
    ])}
    <div style="margin: 16px 0; padding: 14px 16px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #991b1b;">${actionLine}</p>
    </div>
  `
  const cta = recipientRole === "admin" ? "/admin/job-pool" : "/dashboard"
  await sendEmail(
    recipientEmail, subject,
    emailTemplate("Hedef Bitiş Tarihi Geçti ⚠️", "#dc2626", body, cta, "Göreve Git")
  )
}

export async function sendTaskNoteEmail(
  recipientEmail: string,
  recipientName: string,
  task: Task,
  senderName: string,
  noteContent: string
): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled || !settings?.send_on_note) return

  const t = task as unknown as Task & {
    project?: { code?: string; name?: string }
    job_type?: { name?: string }
    job_sub_type?: { name?: string }
  }

  const subject = `[Adam Takip] Yeni Not: ${task.drawing_no}`
  const body = `
    ${greeting(recipientName)}
    <p style="color: #52525b; font-size: 14px; margin: 0 0 4px;"><strong>${senderName}</strong> tarafından aşağıdaki göreve yeni bir not eklendi:</p>
    ${taskDetailTable([
      ["Proje", t.project?.code ? `${t.project.code}${t.project.name ? " — " + t.project.name : ""}` : null],
      ["Çizim No", task.drawing_no],
      ["İş Tipi", t.job_type?.name],
      ["İş Alt Tipi", t.job_sub_type?.name],
    ])}
    <div style="margin: 16px 0; padding: 14px 16px; background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px;">
      <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">Not İçeriği</p>
      <p style="margin: 0; font-size: 14px; color: #0c4a6e; line-height: 1.6;">${noteContent}</p>
    </div>
    <p style="color: #52525b; font-size: 13px; margin: 16px 0 0;">Notu görmek ve yanıtlamak için uygulamaya giriniz.</p>
  `
  await sendEmail(
    recipientEmail, subject,
    emailTemplate("Göreve Yeni Not Eklendi 💬", "#0ea5e9", body, "/dashboard", "Göreve Git")
  )
}

export async function sendTaskCompletedEmail(adminEmail: string, adminName: string, task: Task, workerName: string): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled || !settings?.send_on_complete) return

  const t = task as unknown as Task & {
    project?: { code?: string; name?: string }
    job_type?: { name?: string }
    job_sub_type?: { name?: string }
  }
  const totalHours = ((task.total_elapsed_seconds || 0) / 3600 + (task.manual_hours || 0)).toFixed(1)

  const subject = `[Adam Takip] Onay Bekliyor: ${task.drawing_no} — ${workerName}`
  const body = `
    ${greeting(adminName)}
    <p style="color: #52525b; font-size: 14px; margin: 0 0 4px;"><strong>${workerName}</strong> aşağıdaki görevi tamamladı ve onayınızı bekliyor:</p>
    ${taskDetailTable([
      ["Proje", t.project?.code ? `${t.project.code}${t.project.name ? " — " + t.project.name : ""}` : null],
      ["Çizim No", task.drawing_no],
      ["İş Tipi", t.job_type?.name],
      ["İş Alt Tipi", t.job_sub_type?.name],
      ["Açıklama", task.description],
      ["Çalışan", workerName],
      ["Toplam Süre", totalHours && totalHours !== "0.0" ? `${totalHours} saat` : null],
      ["Öncelik", PRIORITY_LABEL[task.priority] || task.priority],
    ])}
    <p style="color: #52525b; font-size: 13px; margin: 16px 0 0;">Görevi onaylamak veya revizeye göndermek için İş Havuzu'na gidiniz.</p>
  `
  await sendEmail(
    adminEmail, subject,
    emailTemplate("Görev Onay Bekliyor", "#7c3aed", body, "/admin/job-pool", "İş Havuzuna Git")
  )
}
