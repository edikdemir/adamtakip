# ADR 0001 — Ürün mimarisi: tersane içi kurulum, masaüstü sayaç, tek sunucu exe

**Durum:** Kabul edildi (2026-10-01)
**Kapsam:** İş Takip v2 — tersane dizayn departmanlarına satılan, müşterinin kendi altyapısına kurulan ürün

## Bağlam

`adamtakip` (Next.js 16 + Supabase + Vercel, ~16k satır) Cemre için yazılmış, buluta bağlı tek müşterilik bir uygulamadır. Hedef, aynı ürünü **başka tersanelere lisanslı olarak satmak** ve **tersanenin kendi Windows altyapısına** kurmaktır; internet erişimi olmayan sahalar da hedef müşteri profilindedir.

Keşif sonuçları:
- Backend her durumda yeniden yazılmak zorunda: Supabase servis anahtarı, Postgres fonksiyonlarında iş kuralları (`list_tasks` 250 satır), Azure AD + Microsoft Graph, Vercel cron ve Supabase Realtime tersane sunucusunda çalışmaz.
- React arayüzünün ~%97'si taşınabilir: veri erişimi yalnızca `fetch("/api/...")` + React Query; Next'e bağlı dosya sayısı 6.
- Zaman modeli hatalı: süre beş ayrı yerde tutuluyor, "nereye kadar say" kuralı üç farklı uçta farklı; `stop_stale_timers` yazıldığı gibi çalışamıyor. Hayalet süre hatalarının kökü bu (bkz. ADR 0002).
- Ürün yönü: mühendis web'e en az seviyede girsin; projeyi/görevi masaüstü uygulamadan seçip start/stop yapsın; **ağ kesintisinde ve şirket ağı dışında süre kaybolmasın**.

## Karar

### Bileşenler
| Bileşen | Teknoloji | Not |
|---|---|---|
| Sunucu | .NET 10 (LTS) ASP.NET Core, **tek exe, Windows servisi** | REST API, SignalR, gömülü SPA, arka plan işleri, lisans doğrulama, istemci güncelleme feed'i |
| Web arayüz | React 19 + Vite, Tailwind v4 | Mevcut UI taşınır; yönetici tüm işlemleri, mühendis salt-okunur sayaç + manuel giriş + onaya gönder + notlar |
| Masaüstü istemci | WPF (.NET 10) tray uygulaması | **Sayaç yalnızca burada.** Proje/görev seç, Start/Stop, bugünkü toplam, "Detay → web" |
| Veritabanı | SQLite varsayılan; SQL Server opsiyonel (EF Core) | SQL Server v1'de açılmaz; müşteri isterse kendi lisansı ya da ücretsiz Express |
| Kimlik | Yerel hesap + Windows/AD (Negotiate); Entra ID (OIDC) pilot için P5 | İstemci: cihaz token (DPAPI), çevrimdışı açılışta ağ gerekmez |
| Lisans | İmzalı `.lic` (ECDSA), internetsiz aktivasyon | Adlandırılmış kullanıcı sayısı; süresiz+bakım **veya** abonelik, dosyadaki tip alanıyla |
| Kurulum | WiX MSI (sunucu), Velopack (istemci, feed sunucuda) | Kod imzalama sertifikası ön koşul |

### Mimari
```
 Mühendis PC (Windows)                         Yönetici / Mühendis (tarayıcı)
 ┌─────────────────────────────┐              ┌───────────────────────────────┐
 │ İş Takip İstemci (WPF tray) │              │ Web UI (React, exe içinde)    │
 │ proje→görev→Start/Stop      │              │ havuz·atama·onay·rapor·ayar   │
 │ yerel SQLite + outbox       │              │ zaman kayıtları inceleme      │
 │ boşta/kilit/uyku kuralları  │              │ canlı pano (SignalR)          │
 └──────┬──────────────────────┘              └──────────────┬────────────────┘
        │ HTTPS /api/time-entries/sync (cihaz token)         │ HTTPS cookie
        │ iç adres → yoksa dış adres                         │
        ▼                                                    ▼
 ┌─────────────── İş Takip Sunucu (tek exe, Windows servisi) ───────────────┐
 │ REST API · SignalR /hubs/board · gömülü SPA · istemci güncelleme feed'i  │
 │ Zaman çekirdeği (doğrulama/bayrak) · İş akışı · Raporlar · SMTP · Lisans │
 │ Arka plan: presence · güvenlik kapatma · gecikme · haftalık rapor · yedek│
 └───────────────┬──────────────────────────────────┬────────────────────────┘
        SQLite (C:\ProgramData\IsTakip)      Yedek klasörü / UNC
```

### Çözüm yapısı
```
src/Server/            host, API, SignalR, jobs, lisans doğrulama
src/Server.Domain/     entity'ler, durum makinesi, zaman doğrulama (UI'sız, test edilir)
src/Server.Data/       EF Core DbContext, migration'lar, SQLite/SqlServer
src/Client.Core/       istemci store, outbox, sync motoru, boşta/kilit kuralları (UI'sız, test edilir)
src/Client.Wpf/        tray + küçük pencere (MVVM)
src/Web/               React + Vite SPA
tools/LicenseTool/     .lic üretici (özel anahtar repoda YOK)
tools/LegacyImport/    Supabase → yeni DB tek seferlik taşıma
installer/             WiX MSI, Velopack paketi
docs/                  ADR, kılavuzlar, KVKK metni
tests/                 xUnit, Playwright
```

### API sözleşmesi korunur
Mevcut UI değişmeden çalışsın diye: `{data}` / `{error}` zarfı, `{success}` / `{ok}`, görev listesi `{data, meta:{total,offset,limit,has_more}}`, bildirim `{data, unreadCount}`, snake_case alan adları, kimliksiz `/api` isteklerine **401 JSON** (302 değil), `Origin` başlığıyla CSRF kontrolü, `/api/auth/{login,logout,me,heartbeat}`, SPA fallback. Yalnızca sayaç uçları değişir: `timer/start|stop|sync|heartbeat|stop-active` kalkar; yerine salt-okunur `GET /api/me/timer` ve `time-entries` uçları gelir.

### Uzaktan çalışma
İstemci süresiz çevrimdışı çalışır (snapshot'taki görevlerde sayaç tutar), bağlantı gelince senkronlar. **Çift adres**: iç adres yoksa dış adres denenir. Dış adres vermek tersane BT'nin kararıdır (reverse proxy/port yönlendirme + sertifika); VPN varsa ek bir şey gerekmez. Sunucu internete açılmaya uygun sertleştirilir: login oran sınırı + kilitleme, cihaz token iptali, HSTS/güvenlik başlıkları, opsiyonel IP allowlist, dışarıdan Negotiate kapalı, TLS zorunlu, denetim kaydı. Bulut relay v2.

### Kiracılık ve veri
Her kurulum tek müşteriye aittir; SaaS yoktur. Veri tersane ağından çıkmaz; bize hiçbir veri gelmez; lisans kontrolü sunucuda yapılır. İstemci yalnızca start/stop ve "son girdi zamanı" bilir — ekran görüntüsü, tuş kaydı, uygulama izleme **yoktur** (KVKK ve çalışan kabulü).

## Gerekçe

- **.NET yerine Node değil:** Windows servisi, AD ile şifresiz giriş, MSI, SQL Server desteği, derlenmiş kod koruması ve CAD/ERP entegrasyon API'leri .NET'te yerleşik; Node'da üçüncü parti ve daha zayıf.
- **Sayaç yalnızca masaüstünde:** her aralığın tek yazıcısı olur; cihaz-web yarışı, `pagehide`/`sendBeacon`, heartbeat/stale-stop makinesi ve kapalı laptop hayalet süresi ortadan kalkar. İstemcisi olmayan bir PC'de çare: saniyeler süren kullanıcı bazlı kurulum ya da manuel giriş.
- **WPF:** tray, `SystemEvents`, `GetLastInputInfo`, Velopack ve tek dil (C#). WinUI 3 (Windows App SDK/MSIX yükü), Avalonia (çapraz platform gereksiz), Electron/Tauri (ikinci yığın) elendi.
- **SQLite varsayılan:** bir departmanın yükü için fazlasıyla yeterli, sıfır kurulum, yedek uygulamanın içinde. SQL Server yalnızca "veri bizim sunucuda dursun" diyen müşteri için bağlantı seçeneği.
- **Çift adres:** VPN'siz uzaktan senkron isteyen müşteriyi bizim altyapı işletmeden karşılar; relay'i v2'ye erteler.

## Sonuçlar

- Backend C#'a geçer; UI büyük ölçüde mekanik taşınır; zaman modeli yeniden kurulur (ADR 0002).
- `xlsx` (CVE), `msal-browser`, `next-themes`, `react-table`, `date-fns`, `jose`, `msal-node`, Supabase bağımlılıkları kalkar. Excel sunucuda ClosedXML ile işlenir (P3).
- Raporlardaki "bir görevin tüm saati tek aya yazılıyor" hatası aralık dilimleme ile biter.
- Ön koşullar: Cemre ile fikri mülkiyet netleşmesi, kod imzalama sertifikası (OV), ürün adı/marka, KVKK aydınlatma metni, PDF'teki ticari font (Effra) yerine açık lisanslı font (Inter).
- Fazlar: P0 iskelet → P1 zaman çekirdeği → P2 masaüstü istemci → P3 iş akışı paritesi → P4 paketleme → P5 sertleştirme + Cemre pilotu. Her faz demo kriteriyle kapanır.

## Kapsam dışı (v2 adayları)
SaaS/bulut relay, mobil, CAD/PDM entegrasyonu, ERP/bordro, Gantt/kapasite, Linux/Docker, SQL Server resmî destek (kod hazır), genel Entra ID.
