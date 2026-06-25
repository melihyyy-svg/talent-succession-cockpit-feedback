# Talent & Succession Cockpit — Public Feedback

Eksim Talent & Succession Cockpit'in **statik, salt-okunur** web demosu. Ekip
arkadaşlarının link üzerinden inceleyip geri bildirim vermesi için hazırlanmıştır.
Tamamen istemci tarafında çalışır: **HTML + CSS + vanilla JavaScript + yerel üretilmiş
JSON veri paketleri**. Node, React, backend, API, CDN, harici font/ikon, telemetri
veya analytics **kullanılmaz**.

> Kaynak masaüstü Streamlit projesi (`talent_succession_cockpit_mvp`) ve kaynak Excel
> dosyaları bu demoda **değiştirilmez**; yalnızca salt-okunur referans olarak kullanılır.

## Ekranlar

1. **Yönetici Karar Özeti** — KPI kartları, "Bugün neye odaklanmalıyım?", öncelik
   görünümü (ACİL/YÜKSEK ilk 10, yedek olmayan pozisyonlar), yönetici özeti.
2. **Pozisyon & Yedek Detayı** — Firma → Ünvan → Mevcut Pozisyon Sahibi seçimi;
   pozisyon özeti, risk bileşenleri (F1–F5), yedek aday listesi.
3. **Talent Pool & 9-Box Explorer** — tıklanabilir 3×3 9-Box matrisi, inline
   drill-down, filtre-duyarlı explorer.
4. **Aday Keşfi** — pozisyon bağlamında şeffaf Talent Pool filtreleme + karşılaştırma.
5. **Aksiyon Takip** — kaynak veride tanımlı önerilen aksiyonların görüntülenmesi ve
   filtrelenmesi (bu demo yeni aksiyon oluşturmaz/güncellemez).
6. **Veri Kalitesi** — yükleme durumu, validation bulguları, teyitli firma override izleri.

İş kuralı sadakati: risk ve 9-Box değerleri **yeniden hesaplanmaz**; kaynaktaki
hesaplanmış değerler taşınır.

## Veri üretimi

`data/*.json` dosyaları, kaynak Excel'lerden **yerelde** üretilir. Excel dosyaları
repoya konmaz (`.gitignore`).

```powershell
# Mevcut MVP venv'i ile (openpyxl + pandas kurulu):
cd ..\talent_succession_cockpit_mvp
.\.venv\Scripts\python.exe ..\talent_succession_cockpit_public_feedback\tools\generate_data.py
```

Üretici, MVP'nin `data_loader` + `validation` katmanını **salt-okunur** yeniden
kullanır; kaynak dosya yolları (kişisel) çıktıya yazılmaz, yalnızca dosya adı tutulur.

Üretilen paketler:

| Dosya | İçerik |
|---|---|
| `data/positions.json` | Pozisyon Verisi (kimlik, risk, F1–F5, aciliyet, yedek durumu) |
| `data/backups.json` | Yedek Verisi (yedek aday alanları, uyum, ayrılma riski) |
| `data/talent_pool.json` | Yetenek Havuzu (9-Box, talent kararı, succession, önerilen aksiyon) |
| `data/quality.json` | Validation bulguları, override izleri, yükleme özeti |
| `data/meta.json` | 9-Box referans tablosu, kayıt sayıları, kaynak meta |

## Yerel çalıştırma

`file://` üzerinden `fetch` engellendiği için basit bir statik sunucu gerekir:

```powershell
cd talent_succession_cockpit_public_feedback
python -m http.server 8000
# Tarayıcı: http://localhost:8000
```

## Geri bildirim

Sayfa altındaki **Geri Bildirim** alanı 4 soru içerir ve GitHub Issue şablonuna
(`.github/ISSUE_TEMPLATE/feedback.yml`) yönlendirir. Repo yayınlandıktan sonra
`js/app.js` içindeki `FEEDBACK_REPO` sabitini `kullanici/repo` olarak doldurun;
buton otomatik aktifleşir.

## Yayın (GitHub Pages)

Repo public oluşturulduktan sonra: **Settings ▸ Pages ▸ Deploy from a branch ▸
`main` / root**. `.nojekyll` ile saf statik servis sağlanır; tüm yollar görelidir.

## Güvenlik / repo hijyeni

- `.gitignore`: `.env`, tokenlar, anahtarlar, IDE/OS geçici dosyaları ve `*.xlsx`.
- Repoya GitHub token / şifre / kişisel anahtar **yazılmaz**.
- Kaynak Excel dosyaları ve MVP projesi salt-okunur kalır.
