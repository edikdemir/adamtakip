# ADR 0002 — Zaman modeli: istemcinin ölçtüğü aralıklar, çevrimdışı senkron

**Durum:** Kabul edildi (2026-10-01)
**İlgili:** ADR 0001

## Bağlam

Eski uygulamada süre, görev satırındaki sayaçlar (`total_elapsed_seconds`, `timer_started_at`, `last_heartbeat_at`, `manual_hours`) ile `timer_logs` ve `manual_time_entries` arasında dağılmıştı. "Nereye kadar say" kuralı uçlara göre değişiyordu (`stop/sync` 900 sn tavanı; `cancel` ve `bitti` → `now()`); `sync` her dakika `timer_started_at`'i ileri alırken heartbeat'e dokunmadığı için yedek hesap anlamsızlaşıyordu; `stop_stale_timers` olmayan bir alanı okuyup CHECK'i ihlal eden `auto_stop` yazıyordu. Kök neden: **süre, "şimdi" ile uzatılan değiştirilebilir sayaçlar olarak saklanıyordu.**

Yeni gereksinimler: sayaç masaüstü istemcide; ağ kesintisinde ve şirket ağı dışında süre kaybolmasın.

## Karar

### İlkeler
1. Sunucu yalnızca **istemcinin fiilen ölçtüğü aralıkları** saklar; hiçbir süre `now()` ile uzatılmaz.
2. Her aralığın **tek yazıcısı** vardır (masaüstü istemci, manuel giriş ya da yönetici).
3. Sunucu bildirilen süreyi **asla kısaltmaz, silmez** — şüpheli olanı **bayraklar**; inceleme yöneticinindir.
4. **1 saat ve üzeri hiçbir süre sessizce sayılmaz.**
5. Toplamlar cache'lenmez, aralıklardan türetilir.

### `time_entries` — tek tablo; görevlerde süre kolonu yok
```
id                   TEXT(36) PK, UUID v7, yazan taraf üretir
task_id, user_id     FK
started_at, ended_at UTC NOT NULL — ended_at = "buraya kadar sayıldı"
duration_seconds     INT, sunucu hesaplar, ≥ 1
is_open              BOOL — istemci hâlâ çalışıyor diyor; kısmi unique index (user_id) WHERE is_open=1
source               desktop | web(rezerve) | manual | admin | import
reason               manual/admin/edited için zorunlu
device_id            FK devices (desktop)
client_version       INT — aynı id için büyük olan kazanır
client_created_at, client_clock_offset_ms, server_received_at, server_updated_at
status               accepted | flagged | superseded | voided
flags                csv: overlap, too_long, auto_closed, not_assignee, task_closed, edited, clock_jump, late, idle_kept, clock_skew
replaces_id, edited_by/at, reviewed_by/at, void_reason
```
İndeksler: `(user_id, started_at)`, `(task_id)`, `(status) WHERE status='flagged'`.

- **Çalışan sayaç** = `is_open=1` satırı; istemci 60 sn'de bir daha büyük `ended_at` ile upsert eder. Canlılık `devices` tablosundadır (`state running|idle|stopped|silent`, `last_seen_at`, `open_entry_id`) ve **yalnızca gösterim** içindir.
- **Manuel giriş** gerçek aralıktır: tarih + saat (+ opsiyonel başlangıç, varsayılan `working_hours.start`), site saatiyle oluşturulup UTC saklanır; çakışma kontrolünden muaftır.
- **Türetmeler:** görev toplamı = `SUM(duration_seconds) WHERE status IN (accepted, flagged)`. Gün/ay adam×saat: her aralık `site_timezone` yerel gece yarılarında dilimlenir (`ManHourSlicer`).
- **Düzenleme append-only:** `void` (status→voided + sebep) ya da `replace` (eski→superseded, yeni satır `replaces_id`). Mühendis: kendi kayıtları, ≤ 7 gün, onaylanmamış görev. Yönetici: onaylanmamış her şey. Onaylı görev dondurulur. Ayrı audit tablosu gerekmez.
- **Eski veri:** her eski görev toplamı tek `source=import` satırı (doğrulamadan muaf).

### Doğrulama (tek servis: `TimeEntryValidator`; sync, web ve yönetici yazımları aynı yoldan geçer)
| Kural | Sonuç |
|---|---|
| kullanıcı pasif / görev yok / `ended < started + 1 s` | **reddet** |
| `started > now + 5 dk` | kabul + `clock_skew` |
| süre > `max_entry_hours` (16) | kabul + `too_long` |
| aynı kullanıcıda `started < o.ended AND ended > o.started` (manuel/voided hariç) | kabul + `overlap` (geç gelene) |
| atanan kişi değil | kabul + `not_assignee` |
| görev iptal/onaylı/bağımlı | kabul + `task_closed` |
| `ended_at`'ten > 7 gün sonra geldi | kabul + `late` |
Durum geçişleri (`atandi`, `bitti`, `onay`, `iptal`) `time_entries`'e **yazmaz**.

### Senkron protokolü — `POST /api/time-entries/sync`
İstemci deposu `%LOCALAPPDATA%\IsTakip\client.db` (SQLite WAL, yalnızca yerel disk): `settings`, `tasks` (snapshot), `time_entries` (+`sync_state`), `outbox(seq, op, ref_id, payload)`, `timer_state` (tekil).

```
→ { device_id, app_version, client_time_utc, state,
    items:[{ id, task_id, started_at, ended_at, is_open, source, client_version, reason?, flags? }],
    ops:[{ seq, op:"task_complete", task_id }], tasks_since }
← { server_time_utc, settings, min_client_version, task_updates:[...],
    results:[{ id, outcome: accepted|flagged|rejected|closed, flags, message, server_version }],
    op_results:[{ seq, ok, message }] }
```
(Tüm API'de olduğu gibi snake_case; sözleşme `Client.Core/Sync/SyncContracts.cs` içinde.)
- Kullanıcı başına kilit, batch başına tek transaction, ≤ 200 öğe.
- Aynı `(id, clientVersion)` → `accepted` no-op (idempotent); büyük versiyon → upsert + doğrulama.
- Bozuk/olmayan görev → `rejected`; istemci kaydı "Gönderilemeyen kayıtlar"da tutar, **asla silmez**.
- Artık sayılamayan görevde ya da kullanıcının başka açık kaydı varken gelen `isOpen` öğe, bildirilen `endedAt`'te kapatılır, `closed` döner; istemci sayacı durdurur ve `message` gösterir.
- Kadans: start/stop/boşta kararında hemen; çalışırken 60 sn, değilken 5 dk; geri çekilme 5s→15s→60s→5dk (jitter); `NetworkAvailabilityChanged` ve uyanmada tetik. Outbox `seq` sırasıyla boşalır. İç adres başarısızsa dış adres denenir.
- Saat: her yanıtın `serverTimeUtc`'sinden `offset` (EMA); tüm zamanlar `UtcNow + offset`. Duvar saati sıçraması monotonik saatle yakalanır: iki tick arası fark > 2 dk ⇒ son tick'te kapat (`clock_jump`), yeni kayıt.
- Canlı pano: açık kayda dokunan her sync sonrası SignalR `/hubs/board` → `timerChanged{...}`; `last_seen_at > 10 dk` ⇒ "cihaz sessiz". İstemci v1'de SignalR kullanmaz.

### İstemci kuralları (eşikler sunucudan `settings` ile gelir)
| Olay | Tespit | Davranış |
|---|---|---|
| Canlılık, 30 sn | timer | `last_alive_at` yaz, açık kaydın `ended_at`'ini ilerlet |
| Boşta başlangıcı | en erken olan: girdi yok ≥ 10 dk, `SessionLock`, `Suspend`, iki tick arası boşluk > 2 dk | `idle_started_at` = son girdi / kilit / uyku / son tick — **asla "şimdi"** |
| Dönüş, boşta L | girdi, kilit açma, uyanma, uygulama açılışı | **L ≥ 60 dk:** boşta başında kapat, durdur, toast [Devam et]. **L < 60 dk:** "L dk ara sayılsın mı?" [Say]/[Sayma]; 2 dk yanıtsız ⇒ Say (`idle_kept`); Sayma ⇒ boşta başında kapat, dönüşten yeni kayıt |
| Sert tavan | açık kayıt 16 sa | kapat, `auto_closed`, durdur |
| Çıkış / logoff / kapanış | menü, `SessionEnding` | şimdi durdur, yerele yaz, 3 sn sync dene |
| Güncelleme / hızlı yeniden başlatma | son tick'ten ≤ 2 dk sonra açılış | çalışan kaydı sessizce devral |

### Çakışma kuralları (web: "Zaman Kayıtları › İnceleme Bekleyen" — Onayla / Kırp / Sil)
| Durum | Sunucu | İstemci | Yönetici |
|---|---|---|---|
| Çevrimdışıyken görev başkasına atandı | kabul + `not_assignee`; açık öğe `closed` | "Görev artık size atanmadı, süre incelemeye alındı" | Onayla çalışana yazar, Sil void'ler |
| Çevrimdışıyken iptal/onaylandı | kabul + `task_closed`; `closed` | görev listeden düşer | listede |
| Web'den `bitti`, sayaç çalışıyor | görev→tamamlandi; sonraki sync `closed` | sayaç durur | — |
| Aynı kullanıcı iki cihaz | ilk açık kayıt kazanır; ikinci bildirilen sonunda kapalı (`overlap`); çevrimiçi Start `GET /api/me/timer` → `POST /api/me/timer/takeover` | "Sayaç PC-05'te çalışıyor. Devral?" | panoda cihaz adı |
| Çakışan kayıtlar | geç gelene `overlap`; manuel muaf | "incelemede" | Kırp |
| > 16 sa | `too_long` | rozet | listede |
| Görev silinmiş | `rejected` | "Gönderilemeyen kayıtlar" | — |
| > 7 gün gecikmiş | `late` (bilgi) | — | listede |

### Sunucu arka plan işleri
| İş | Zaman | Eylem |
|---|---|---|
| Presence | 1 dk | `devices.state=silent` (`last_seen_at > 10 dk`), SignalR — yalnız gösterim |
| Güvenlik kapatma | 10 dk | `server_updated_at > 24 sa` açık kayıt ⇒ `is_open=0`, `auto_closed`; `ended_at` değişmez |
| Yedek | 02:00 site | `VACUUM INTO`, 30 gün sakla, opsiyonel UNC |
| Gecikme bildirimi | 08:00 | `overdue_notified_at` ile günde bir |
| Haftalık rapor | Pzt 07:00 | kişi/proje adam×saat, XLSX (+PDF P3) |

## Gerekçe
Aralık modeli "ne zaman başladı, nereye kadar ölçüldü" dışında hiçbir varsayım taşımaz; sunucu saatine ya da heartbeat'e dayanan hiçbir ekstrapolasyon yoktur. Bayraklama, veri kaybetmeden insan kararını mümkün kılar. Idempotent, versiyonlu upsert çevrimdışı tekrarları ve yeniden denemeleri güvenli yapar.

## Sonuçlar
- `tasks` tablosundan tüm süre kolonları kalkar; `timer_logs`, `manual_time_entries`, `manual_hours`, `increment_manual_hours` yoktur.
- Web kodu hiçbir koşulda aralık yazmaz (`beforeunload`, `sendBeacon`, heartbeat kalkar).
- Lisans süresi dolsa bile `/sync` çalışır: süre kaybı olmaz.
- Tuzaklar: yalnız UTC (`DateTimeKind.Utc` converter, SQLite'ta sabit hassasiyetli ISO metin); IANA saat dilimi için ICU; GUID v7'nin SQL Server `uniqueidentifier` sıralaması → identity `row_no`; antivirüs dışlamaları + `busy_timeout`; Modern Standby event vermeyebilir → boşluk kuralı asıl koruma; `minClientVersion` eski istemciyi outbox boşalmadan zorlamaz.
