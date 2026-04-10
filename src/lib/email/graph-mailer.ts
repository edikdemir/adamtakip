import { createServerClient } from "@/lib/supabase/server"
import { Task } from "@/types/task"
import { User } from "@/types/user"

type EmailSettings = {
  enabled: boolean
  send_on_assign: boolean
  send_on_approve: boolean
  send_on_reject: boolean
  send_on_complete: boolean
  send_on_note?: boolean
  send_on_cancel?: boolean
  overdue_notify_user?: boolean
  overdue_notify_admin?: boolean
}

async function getGraphToken(): Promise<string> {
  const tenantId = process.env.AZURE_AD_TENANT_ID
  const clientId = process.env.AZURE_AD_CLIENT_ID
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET

  const response = await fetch(
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

  const payload = await response.json()
  if (!payload.access_token) {
    throw new Error("Failed to get Graph token")
  }

  return payload.access_token
}

async function getEmailSettings(): Promise<EmailSettings | null> {
  const supabase = createServerClient()
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "email_notifications")
    .single()

  return (data?.value as EmailSettings | undefined) ?? null
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
    const response = await fetch(
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

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Graph sendMail error:", errorText)
    }
  } catch (error) {
    console.error("Email send failed:", error)
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
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;margin:0;padding:24px 16px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#18181b;padding:20px 32px;display:flex;align-items:center;gap:12px;">
      <div style="width:4px;height:32px;background:${accentColor};border-radius:2px;"></div>
      <div>
        <div style="color:#fff;font-size:16px;font-weight:700;letter-spacing:-0.3px;">Adam Takip</div>
        <div style="color:#a1a1aa;font-size:12px;margin-top:1px;">Cemre Tersanesi | Dizayn Departmanı</div>
      </div>
    </div>
    <div style="background:${accentColor};padding:14px 32px;">
      <h2 style="color:#fff;margin:0;font-size:17px;font-weight:600;">${title}</h2>
    </div>
    <div style="padding:28px 32px;">
      ${body}
      ${ctaUrl ? `<div style="margin-top:28px;"><a href="${appUrl}${ctaUrl}" style="display:inline-block;background:${accentColor};color:#fff;padding:11px 24px;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px;">${ctaText || "Uygulamaya Git"}</a></div>` : ""}
    </div>
    <div style="background:#f8f8f9;padding:14px 32px;border-top:1px solid #e4e4e7;">
      <p style="color:#a1a1aa;font-size:11px;margin:0;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function taskDetailTable(rows: Array<[string, string | null | undefined]>): string {
  const visibleRows = rows.filter(([, value]) => value && value !== "-")
  if (visibleRows.length === 0) {
    return ""
  }

  return `
<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
  ${visibleRows
    .map(
      ([label, value]) => `
  <tr>
    <td style="padding:8px 12px;background:#f8f8f9;border:1px solid #e4e4e7;font-weight:600;color:#52525b;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:8px 12px;border:1px solid #e4e4e7;color:#18181b;vertical-align:top;">${escapeHtml(value)}</td>
  </tr>`
    )
    .join("")}
</table>`
}

function withTaskIdRow(task: Task, rows: Array<[string, string | null | undefined]>) {
  return [["ID", `#${task.id}`], ...rows] as Array<[string, string | null | undefined]>
}

const PRIORITY_LABEL: Record<string, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  urgent: "Acil",
}

const ADMIN_STATUS_LABEL: Record<string, string> = {
  atandi: "Atandı",
  devam_ediyor: "Devam Ediyor",
  tamamlandi: "Onay Bekliyor",
  onaylandi: "Hazır",
  iptal: "İptal",
}

function fmtDate(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function greeting(name: string): string {
  return `<p style="color:#18181b;font-size:15px;margin:0 0 20px;">Merhaba <strong>${escapeHtml(name)}</strong>,</p>`
}

function getProjectLabel(task: Task): string | null {
  if (!task.project?.code) {
    return null
  }

  return task.project.name ? `${task.project.code} | ${task.project.name}` : task.project.code
}

function getTaskLabel(task: Task): string {
  return task.drawing_no?.trim() || `Görev #${task.id}`
}

function getTaskHours(task: Task): string | null {
  const totalHours = ((task.total_elapsed_seconds || 0) / 3600 + (task.manual_hours || 0)).toFixed(1)
  return totalHours !== "0.0" ? `${totalHours} saat` : null
}

export async function sendTaskAssignedEmail(user: User, task: Task): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled || !settings.send_on_assign) {
    return
  }

  const subject = `[Adam Takip] Yeni Görev: ${getTaskLabel(task)}`
  const body = `
    ${greeting(user.display_name)}
    <p style="color:#52525b;font-size:14px;margin:0 0 4px;">Size yeni bir görev atandı. Görev detayları aşağıda yer almaktadır:</p>
    ${taskDetailTable(withTaskIdRow(task, [
      ["Proje", getProjectLabel(task)],
      ["Resim No", task.drawing_no || null],
      ["İş Tipi", task.job_type?.name],
      ["İş Alt Tipi", task.job_sub_type?.name],
      ["Yapılacak İş", task.description],
      ["Öncelik", PRIORITY_LABEL[task.priority] || task.priority],
      ["Başlama Tarihi", fmtDate(task.planned_start)],
      ["Termin", fmtDate(task.planned_end)],
      ["Admin Notu", task.admin_notes],
    ]))}
    <p style="color:#52525b;font-size:13px;margin:16px 0 0;">Görevi görüntülemek ve kronometreyi başlatmak için uygulamaya giriniz.</p>
  `

  await sendEmail(
    user.email,
    subject,
    emailTemplate("Yeni Görev Atandı", "#2563eb", body, "/dashboard", "Göreve Git")
  )
}

export async function sendTaskApprovedEmail(user: User, task: Task): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled || !settings.send_on_approve) {
    return
  }

  const subject = `[Adam Takip] Görev Onaylandı: ${getTaskLabel(task)}`
  const body = `
    ${greeting(user.display_name)}
    <p style="color:#52525b;font-size:14px;margin:0 0 4px;">Aşağıdaki göreviniz yöneticiniz tarafından onaylandı ve <strong>Hazır</strong> olarak işaretlendi.</p>
    ${taskDetailTable(withTaskIdRow(task, [
      ["Proje", getProjectLabel(task)],
      ["Resim No", task.drawing_no || null],
      ["İş Tipi", task.job_type?.name],
      ["İş Alt Tipi", task.job_sub_type?.name],
      ["Yapılacak İş", task.description],
      ["Onay Tarihi", fmtDate(task.approved_at)],
      ["Toplam Süre", getTaskHours(task)],
    ]))}
  `

  await sendEmail(
    user.email,
    subject,
    emailTemplate("Görev Onaylandı", "#16a34a", body, "/dashboard", "Panele Git")
  )
}

export async function sendTaskRejectedEmail(user: User, task: Task, reason?: string): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled || !settings.send_on_reject) {
    return
  }

  const subject = `[Adam Takip] Revize İsteği: ${getTaskLabel(task)}`
  const body = `
    ${greeting(user.display_name)}
    <p style="color:#52525b;font-size:14px;margin:0 0 4px;">Aşağıdaki göreviniz revize için size iade edildi. Gerekli düzeltmeleri yaparak tekrar tamamlayınız.</p>
    ${taskDetailTable(withTaskIdRow(task, [
      ["Proje", getProjectLabel(task)],
      ["Resim No", task.drawing_no || null],
      ["İş Tipi", task.job_type?.name],
      ["İş Alt Tipi", task.job_sub_type?.name],
      ["Yapılacak İş", task.description],
      ["Öncelik", PRIORITY_LABEL[task.priority] || task.priority],
      ["Termin", fmtDate(task.planned_end)],
    ]))}
    ${reason ? `
    <div style="margin:16px 0;padding:14px 16px;background:#fff7ed;border-left:4px solid #f97316;border-radius:4px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#c2410c;">Revize Sebebi</p>
      <p style="margin:0;font-size:14px;color:#7c2d12;">${escapeHtml(reason)}</p>
    </div>` : ""}
    <p style="color:#52525b;font-size:13px;margin:16px 0 0;">Lütfen uygulamaya girerek görevi inceleyin ve gerekli düzeltmeleri yapın.</p>
  `

  await sendEmail(
    user.email,
    subject,
    emailTemplate("Görev Revizeye Gönderildi", "#d97706", body, "/dashboard", "Göreve Git")
  )
}

export async function sendTaskCancelledEmail(user: User, task: Task, reason?: string): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled || settings.send_on_cancel === false) {
    return
  }

  const subject = `[Adam Takip] Görev İptal Edildi: ${getTaskLabel(task)}`
  const body = `
    ${greeting(user.display_name)}
    <p style="color:#52525b;font-size:14px;margin:0 0 4px;">Aşağıdaki görev yönetici tarafından iptal edildi.</p>
    ${taskDetailTable(withTaskIdRow(task, [
      ["Proje", getProjectLabel(task)],
      ["Resim No", task.drawing_no || null],
      ["İş Tipi", task.job_type?.name],
      ["İş Alt Tipi", task.job_sub_type?.name],
      ["Yapılacak İş", task.description],
      ["Termin", fmtDate(task.planned_end)],
      ["Durum", ADMIN_STATUS_LABEL[task.admin_status] || task.admin_status],
    ]))}
    ${reason ? `
    <div style="margin:16px 0;padding:14px 16px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#b91c1c;">İptal Sebebi</p>
      <p style="margin:0;font-size:14px;color:#7f1d1d;">${escapeHtml(reason)}</p>
    </div>` : ""}
  `

  await sendEmail(
    user.email,
    subject,
    emailTemplate("Görev İptal Edildi", "#dc2626", body, "/dashboard", "Panele Git")
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
  if (!settings?.enabled) {
    return
  }
  if (recipientRole === "user" && settings.overdue_notify_user === false) {
    return
  }
  if (recipientRole === "admin" && settings.overdue_notify_admin === false) {
    return
  }

  const actionLine =
    recipientRole === "admin" && task.admin_status === "tamamlandi"
      ? "Görev tamamlandı ancak onay bekliyor. Lütfen onaylayın veya revizeye gönderin."
      : recipientRole === "admin"
        ? "Görev hâlâ tamamlanmadı. Çalışanı bilgilendirmeniz önerilir."
        : "Lütfen görevi en kısa sürede tamamlayın."

  const subject = `[Adam Takip] Gecikmiş Görev (+${daysOverdue} gün): ${getTaskLabel(task)}`
  const body = `
    ${greeting(recipientName)}
    <p style="color:#52525b;font-size:14px;margin:0 0 4px;"><strong>${escapeHtml(getTaskLabel(task))}</strong> numaralı görevin termini <strong>${daysOverdue} gün</strong> önce geçti.</p>
    ${taskDetailTable(withTaskIdRow(task, [
      ["Proje", getProjectLabel(task)],
      ["Resim No", task.drawing_no || null],
      ["İş Tipi", task.job_type?.name],
      ["İş Alt Tipi", task.job_sub_type?.name],
      ["Yapılacak İş", task.description],
      ["Termin", fmtDate(task.planned_end)],
      ["Gecikme", `${daysOverdue} gün`],
      ["Öncelik", PRIORITY_LABEL[task.priority] || task.priority],
      ["Durum", ADMIN_STATUS_LABEL[task.admin_status] || task.admin_status],
    ]))}
    <div style="margin:16px 0;padding:14px 16px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;">
      <p style="margin:0;font-size:14px;color:#991b1b;">${escapeHtml(actionLine)}</p>
    </div>
  `

  const ctaUrl = recipientRole === "admin" ? "/admin" : "/dashboard"
  await sendEmail(
    recipientEmail,
    subject,
    emailTemplate("Termin Geçti", "#dc2626", body, ctaUrl, "Göreve Git")
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
  if (!settings?.enabled || !settings.send_on_note) {
    return
  }

  const subject = `[Adam Takip] Yeni Not: ${getTaskLabel(task)}`
  const body = `
    ${greeting(recipientName)}
    <p style="color:#52525b;font-size:14px;margin:0 0 4px;"><strong>${escapeHtml(senderName)}</strong> tarafından aşağıdaki göreve yeni bir not eklendi:</p>
    ${taskDetailTable(withTaskIdRow(task, [
      ["Proje", getProjectLabel(task)],
      ["Resim No", task.drawing_no || null],
      ["İş Tipi", task.job_type?.name],
      ["İş Alt Tipi", task.job_sub_type?.name],
      ["Yapılacak İş", task.description],
      ["Termin", fmtDate(task.planned_end)],
    ]))}
    <div style="margin:16px 0;padding:14px 16px;background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:4px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;">Not İçeriği</p>
      <p style="margin:0;font-size:14px;color:#0c4a6e;line-height:1.6;">${escapeHtml(noteContent)}</p>
    </div>
    <p style="color:#52525b;font-size:13px;margin:16px 0 0;">Notu görmek ve yanıtlamak için uygulamaya giriniz.</p>
  `

  await sendEmail(
    recipientEmail,
    subject,
    emailTemplate("Göreve Yeni Not Eklendi", "#0ea5e9", body, "/dashboard", "Göreve Git")
  )
}

export async function sendTaskCompletedEmail(
  adminEmail: string,
  adminName: string,
  task: Task,
  workerName: string
): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled || !settings.send_on_complete) {
    return
  }

  const subject = `[Adam Takip] Onay Bekliyor: ${getTaskLabel(task)} | ${workerName}`
  const body = `
    ${greeting(adminName)}
    <p style="color:#52525b;font-size:14px;margin:0 0 4px;"><strong>${escapeHtml(workerName)}</strong> aşağıdaki görevi tamamladı ve onayınızı bekliyor:</p>
    ${taskDetailTable(withTaskIdRow(task, [
      ["Proje", getProjectLabel(task)],
      ["Resim No", task.drawing_no || null],
      ["İş Tipi", task.job_type?.name],
      ["İş Alt Tipi", task.job_sub_type?.name],
      ["Yapılacak İş", task.description],
      ["Çalışan", workerName],
      ["Toplam Süre", getTaskHours(task)],
      ["Öncelik", PRIORITY_LABEL[task.priority] || task.priority],
      ["Termin", fmtDate(task.planned_end)],
    ]))}
    <p style="color:#52525b;font-size:13px;margin:16px 0 0;">Görevi onaylamak veya revizeye göndermek için İş Havuzu'na gidiniz.</p>
  `

  await sendEmail(
    adminEmail,
    subject,
    emailTemplate("Görev Onay Bekliyor", "#7c3aed", body, "/admin", "İş Havuzuna Git")
  )
}
