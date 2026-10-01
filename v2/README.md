# İş Takip v2

Tersane dizayn departmanları için, müşterinin kendi Windows altyapısına kurulan, lisanslı iş ve adam×saat takip ürünü. Mimari kararlar `docs/adr/` altında (0001 mimari, 0002 zaman modeli).

```
src/Server/          ASP.NET Core host (tek exe, Windows servisi), API, SignalR, arka plan işleri
src/Server.Domain/   entity'ler, enum'lar, zaman doğrulama (TimeEntryValidator), adam×saat dilimleme (ManHourSlicer)
src/Server.Data/     EF Core DbContext + konfigürasyonlar (SQLite varsayılan, SQL Server hazır)
src/Client.Core/     masaüstü istemci çekirdeği: sync sözleşmeleri, outbox, boşta/kilit kuralları (UI'sız)
src/Web/             React 19 + Vite SPA (adamtakip UI'ından taşındı)
tests/               xUnit
```

## Geliştirme

### Sunucu (.NET 10 SDK gerekir)
```
dotnet restore
dotnet build
dotnet test
dotnet run --project src/Server            # https://localhost:8443
```
İlk migration SDK ile üretilir:
```
dotnet tool install -g dotnet-ef
dotnet ef migrations add Initial -p src/Server.Data -s src/Server -o Migrations
```

### Web
```
cd src/Web
npm install
npm run dev        # Vite, /api istekleri https://localhost:8443'e proxy'lenir
npm run build      # çıktı: src/Server/wwwroot (sunucu exe'ye gömülür)
```

## Durum (P0 iskelet)
- Bu iskelet internetsiz bir ortamda yazıldı; **.NET derlemesi henüz doğrulanmadı** (SDK indirilemedi). Web projesi `npm run build` ile doğrulandı.
- Web tarafında eski sayaç uçlarını çağıran kodlar (`use-task-timer`, `use-timer-guard`, `task-row-timer`) P1'de salt-okunur sayaç + `time-entries` uçlarına bağlanacak; şu an eski sözleşmeyle derleniyor.
- Excel içe aktarma P3'te sunucuya (ClosedXML) taşınacak; o zamana kadar istemci tarafı `xlsx` ile derleniyor.
- Marka varlıkları (`public/brand`, `public/logo_cemre.png`) ve PDF fontu Effra **geçici**: ürün sürümünde marka ayardan gelir, PDF fontu açık lisanslı bir fontla (Inter) değiştirilir.
