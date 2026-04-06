export async function downloadTaskTemplate(): Promise<void> {
  const XLSX = await import("xlsx")

  const headers = [
    "Proje Kodu",
    "İş Tipi",
    "İş Alt Tipi",
    "Zone",
    "Mahal",
    "Resim No",
    "Yapılacak İş",
    "Başlama Tarihi",
    "Hedef Bitiş Tarihi",
    "Öncelik",
    "Notlar",
  ]

  const example = [
    "PRJ-001",
    "Boyama",
    "İç Yüzey",
    "A-Zone",
    "Makine Dairesi",
    "R-202",
    "Kapı boyaması",
    "01.04.2026",
    "15.04.2026",
    "Orta",
    "",
  ]

  const worksheet = XLSX.utils.aoa_to_sheet([headers, example])
  // Sütun genişlikleri
  worksheet["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Görevler")

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "gorev-import-sablon.xlsx"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
