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

function emailTemplate(title: string, body: string, ctaUrl?: string, ctaText?: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin:0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #18181b; padding: 24px 32px;">
      <h1 style="color: #fff; margin: 0; font-size: 18px; font-weight: 600;">Adam Takip | Cemre</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #18181b; margin: 0 0 16px; font-size: 20px;">${title}</h2>
      <p style="color: #52525b; line-height: 1.6; margin: 0 0 24px;">${body}</p>
      ${ctaUrl ? `<a href="${appUrl}${ctaUrl}" style="display: inline-block; background: #18181b; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">${ctaText || "Uygulamaya Git"}</a>` : ""}
    </div>
    <div style="background: #f4f4f5; padding: 16px 32px; border-top: 1px solid #e4e4e7;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">Bu email otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
    </div>
  </div>
</body>
</html>`
}

const PRIORITY_LABEL: Record<string, string> = {
  low: "Düşük", medium: "Orta", high: "Yüksek", urgent: "Acil",
}

export async function sendTaskAssignedEmail(user: User, task: Task): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled || !settings?.send_on_assign) return

  const subject = `Yeni Görev: ${task.drawing_no} — ${task.project?.code || ""}`
  const body = `
    Merhaba ${user.display_name},<br><br>
    Size yeni bir görev atandı:<br><br>
    <strong>Proje:</strong> ${task.project?.code || "-"}<br>
    <strong>Çizim No:</strong> ${task.drawing_no}<br>
    <strong>İş Tipi:</strong> ${task.job_type?.name || "-"}<br>
    <strong>İş Alt Tipi:</strong> ${task.job_sub_type?.name || "-"}<br>
    <strong>Açıklama:</strong> ${task.description}<br>
    <strong>Öncelik:</strong> ${PRIORITY_LABEL[task.priority] || task.priority}<br>
    ${task.planned_start ? `<strong>Başlama Tarihi:</strong> ${new Date(task.planned_start).toLocaleDateString("tr-TR")}<br>` : ""}
    ${task.planned_end ? `<strong>Hedef Bitiş Tarihi:</strong> ${new Date(task.planned_end).toLocaleDateString("tr-TR")}<br>` : ""}
    ${task.admin_notes ? `<strong>Admin Notu:</strong> ${task.admin_notes}<br>` : ""}
    <br>Detaylar için uygulamaya gidiniz.
  `
  await sendEmail(user.email, subject, emailTemplate("Yeni Görev Atandı", body, "/dashboard"))
}

export async function sendTaskApprovedEmail(user: User, task: Task): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled || !settings?.send_on_approve) return

  const body = `
    Merhaba ${user.display_name},<br><br>
    <strong>${task.drawing_no}</strong> numaralı göreviniz onaylandı ve tamamlandı olarak işaretlendi.<br><br>
    <strong>Proje:</strong> ${task.project?.code || "-"}<br>
    <strong>İş Tipi:</strong> ${task.job_type?.name || "-"}<br>
    <strong>İş Alt Tipi:</strong> ${task.job_sub_type?.name || "-"}<br>
    <strong>Açıklama:</strong> ${task.description}<br>
    ${task.approved_at ? `<strong>Kesin Bitiş Tarihi:</strong> ${new Date(task.approved_at).toLocaleDateString("tr-TR")}<br>` : ""}
  `
  await sendEmail(user.email, `Görev Hazır: ${task.drawing_no}`, emailTemplate("Görev Onaylandı — Hazır", body, "/dashboard"))
}

export async function sendTaskRejectedEmail(user: User, task: Task, reason?: string): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled || !settings?.send_on_reject) return

  const body = `
    Merhaba ${user.display_name},<br><br>
    <strong>${task.drawing_no}</strong> numaralı göreviniz revizeye gönderildi.<br><br>
    <strong>Proje:</strong> ${task.project?.code || "-"}<br>
    <strong>İş Tipi:</strong> ${task.job_type?.name || "-"}<br>
    <strong>İş Alt Tipi:</strong> ${task.job_sub_type?.name || "-"}<br>
    <strong>Açıklama:</strong> ${task.description}<br>
    ${reason ? `<br><strong>Revize Sebebi:</strong> ${reason}<br>` : ""}
    <br>Lütfen gerekli düzeltmeleri yaparak görevi tekrar tamamlayın.
  `
  await sendEmail(user.email, `Revize: ${task.drawing_no}`, emailTemplate("Görev Revizeye Gönderildi", body, "/dashboard"))
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

  const dueDate = task.planned_end ? new Date(task.planned_end).toLocaleDateString("tr-TR") : "-"
  const actionLine =
    recipientRole === "admin" && task.admin_status === "tamamlandi"
      ? "Lütfen onaylayın veya iade edin."
      : recipientRole === "admin"
        ? "Görev hâlâ tamamlanmadı."
        : "Lütfen görevi en kısa sürede tamamlayın."

  const body = `
    Merhaba ${recipientName},<br><br>
    <strong>${task.drawing_no}</strong> görevinin hedef bitiş tarihi ${daysOverdue} gün önce geçti.<br><br>
    <strong>Proje:</strong> ${task.project?.code || "-"}<br>
    <strong>Hedef Bitiş Tarihi:</strong> ${dueDate}<br>
    <strong>Açıklama:</strong> ${task.description}<br><br>
    ${actionLine}
  `
  const cta = recipientRole === "admin" ? "/admin/job-pool" : "/dashboard"
  await sendEmail(
    recipientEmail,
    `[Adam Takip] Hedef Bitiş Tarihi Geçti — ${task.drawing_no}`,
    emailTemplate("Hedef Bitiş Tarihi Geçti", body, cta)
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

  const body = `
    Merhaba ${recipientName},<br><br>
    <strong>${senderName}</strong> tarafından aşağıdaki göreve yeni bir not eklendi:<br><br>
    <strong>Çizim No:</strong> ${task.drawing_no}<br>
    <strong>Proje:</strong> ${(task as unknown as Record<string, unknown> & { project?: { code?: string } }).project?.code || "-"}<br><br>
    <strong>Not:</strong><br>
    <blockquote style="border-left: 3px solid #e4e4e7; margin: 8px 0; padding: 8px 12px; color: #52525b;">${noteContent}</blockquote>
    <br>Görevi görmek için uygulamaya gidiniz.
  `
  await sendEmail(
    recipientEmail,
    `Yeni Not: ${task.drawing_no}`,
    emailTemplate("Göreve Yeni Not Eklendi", body, "/dashboard")
  )
}

export async function sendTaskCompletedEmail(adminEmail: string, adminName: string, task: Task, workerName: string): Promise<void> {
  const settings = await getEmailSettings()
  if (!settings?.enabled || !settings?.send_on_complete) return

  const totalHours = ((task.total_elapsed_seconds || 0) / 3600 + (task.manual_hours || 0)).toFixed(1)
  const body = `
    Merhaba ${adminName},<br><br>
    <strong>${workerName}</strong> tarafından aşağıdaki görev tamamlandı ve onayınızı bekliyor:<br><br>
    <strong>Proje:</strong> ${(task as unknown as Record<string, unknown> & { project?: { code?: string } }).project?.code || "-"}<br>
    <strong>Çizim No:</strong> ${task.drawing_no}<br>
    <strong>İş Tipi:</strong> ${(task as unknown as Record<string, unknown> & { job_type?: { name?: string } }).job_type?.name || "-"}<br>
    <strong>İş Alt Tipi:</strong> ${(task as unknown as Record<string, unknown> & { job_sub_type?: { name?: string } }).job_sub_type?.name || "-"}<br>
    <strong>Açıklama:</strong> ${task.description}<br>
    <strong>Toplam Süre:</strong> ${totalHours} sa<br>
  `
  await sendEmail(adminEmail, `Onay Bekliyor: ${task.drawing_no}`, emailTemplate("Görev Onay Bekliyor", body, "/admin/job-pool"))
}
