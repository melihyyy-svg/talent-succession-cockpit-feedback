# CLAUDE.md — Talent & Succession Cockpit (public feedback demo)

Bu dosya, gelecek Claude Code session'larının repoyu sıfırdan keşfetmeden işe
başlayabilmesi içindir. **Önce bunu oku**, sonra yalnızca görevin gerektirdiği
minimum kodu incele.

## 1) Amaç ve mimari
- Eksim Akademi yöneticileri için kritik pozisyon / yedeklilik / aksiyon **karar desteği**
  sunan, salt-okunur public **geri bildirim demosu**.
- **Statik site**: HTML + CSS + vanilla JS, **build yok**. Hedef: statik GitHub Pages.
- Çalışma: `python -m http.server` ile servis edilir (`file://` üzerinden fetch engellenir).
  Veri `data/*.json` dosyalarından `fetch` ile yüklenir.

## 2) Dosya haritası
- `index.html` — script yükleme sırası:
  `js/data.js → calc.js → recon.js → views/{exec,heatmap,detail,talent,discovery,actions,quality}.js → app.js`
- `js/data.js` — `DATA` (positions/backups/talent/quality/meta) yükleme + ortak yardımcılar
  (`normalizeValue`, `isBlank`, `disp`, `esc`, `num`, `trPct`, `BLANK` …).
- `js/calc.js` — **saf iş kuralları** (mvp `calculations.py` karşılığı) + sabitler (`C`) +
  ortak UI yardımcıları (`badge`, `kpiCard`, `buildTable`, `multiselectField`, `renderCascade` …).
  Risk/9-Box **yeniden hesaplanmaz**, kaynaktan okunur.
- `js/recon.js` — mutabakat / bütünlük kontrolleri (Veri Kalitesi ekranında gösterilir).
- `js/views/*.js` — sekme render'ları (her biri bir ekran).
- `js/app.js` — önyükleme, sekme yönlendirme, drill-down deep-link, geri bildirim.
- `css/styles.css` — tek stil dosyası (tasarım token'ları + bileşen sınıfları).
- `tools/test_v11.py` — Python oracle testleri (saf hesapları veri-kontratı düzeyinde doğrular).
- `tools/generate_data.py` — kaynak Excel'i **salt-okunur** okuyup `data/*.json` üretir.

## 3) Dokunma: MVP & kaynak Excel
- `../talent_succession_cockpit_mvp` (Streamlit MVP) ve kaynak Excel dosyalarına **DOKUNMA**.
- Bunları yalnızca `generate_data.py` **salt-okunur** okur.

## 4) Mutabakat / lens / toplamları koru
- Mevcut mutabakatı **DEĞİŞTİRME**: Kaynak↔Cockpit 9/9, Halefiyet Agregasyon 6/6,
  Ready-now İlişki Bütünlüğü 7/7.
- Heatmap lens toplamları ve çekirdek metrikler (ör. ACİL 6, YÜKSEK 43, yedeksiz 16,
  Ready-now coverage 36/177, Ready-now kayıt 59) korunmalıdır.

## 5) Yasaklar
- Yeni **skor**, **AI önerisi**, **otomatik aday sıralaması**, **match-score** üretme.
- **Veri uydurma** ve **zorunlu veri modeli değişikliği** yapma.
- Yeni sekme açmadan, mevcut sekme içinde çalış (aksi açıkça istenmedikçe).
- Yeni saf hesaplar **additive** olmalı; mevcut fonksiyon/recon imzalarını bozma.

## 6) Eksik veride dürüst boş durum
- Çıkarım/tahmin üretme. Desteklenmeyen alan için açık etiket kullan:
  `Kayıt bulunmuyor` · `Veri eksik` · `Kalibrasyon tarihi yok` ·
  `Kaynakta belirtilmedi` · `Tanımlı yedek bulunmuyor.`
- Zaman-bazlı readiness (1 yıl / 2+ yıl) kaynakta **yoktur** — üretme.

## 7) Ready Now allowlist (tam eşleşme)
- Hazır (Ready-now) yedek tipi yalnızca: **`YETENEK HAZIR`**, **`DOĞAL + HAZIR`**.
- `calc.js`: `READY_NOW_TIPI` + `normTipi` (NFC + boşluk sadeleştirme, **casefold/substring/fuzzy YOK**).
- Bu kuralı **değiştirme**; yeni "hazır" varyantı ekleme.

## 8) Talent Pool ↔ Yedek join yasağı
- Talent Pool ile Yedek Verisi arasında **doğrulanmış ortak kişi anahtarı yoktur**.
- Kişi-bazlı join **YAPMA** (Sicil No yalnızca Talent'te; Ad-Soyad eşleşmesi güvenilmez).
- Pozisyon↔Yedek ilişkisi yalnızca: `Yedek.Pozisyon_Sahibi → Pozisyon.İsim` (`lookupBackups`).

## 9) Test komutu ve yaklaşım
- Komut: `python tools/test_v11.py` (çıkış 0 = tüm testler geçti; salt-okunur).
- **Node KURULU DEĞİL** — testler Python ile yazılır.
- Yaklaşım: JS saf fonksiyonlarının mantığını Python'da bağımsız yeniden uygulayıp
  `data/*.json` üzerinde **oracle / veri-kontratı** olarak doğrula.
- Yeni saf hesap eklersen **karşılık gelen oracle testini ekle**; mevcut testleri koru.

## 10) UI regresyon hassasiyetleri
- **Breadcrumb**: `detail`'de yalnızca **heatmap bağlamı** varsa gösterilir
  (`Halefiyet Sağlığı → Firma → Seviye → Lens`); bağlamsız normal Detail'de breadcrumb **YOK**.
- **Drawer (Hızlı Halef Kartı)**: sağdan açılır; Escape + overlay tıklama + X kapatır;
  Önceki/Sonraki navigasyon; mobil tam ekran; overlay yatay taşmayı önler — **bozma**.
- **Drill-down / deep-link**: `openInDetail(idx)` ve `openInDetailContext(ctx)` +
  `window.__pendingDetail` / `window.__detailContext`. Grup kartları event-delegation ile
  tıklanabilir (`closest('.gl-card')`). `_renderDetailBody`, `_currentRow/_currentBackups`'ı
  set eder; drawer buna bağlıdır — **bozma**.
- Mobilde taşma yaratma; mevcut tasarım sistemini (sınıflar + token'lar) kullan.

## 11) Yeni session çalışma ilkesi
1. Önce bu `CLAUDE.md`'yi oku.
2. Yalnızca görev için gereken minimum kodu incele (ilgili view + `calc.js` fonksiyonları).
3. Genel repo keşfi / Pages / preview / browser altyapısı araştırması **yapma**
   (preview araçları bu repoda güvenilmez; doğrulamayı Python oracle ile yap).
4. En fazla birkaç maddelik kısa plan yaz, sonra doğrudan implementasyona geç.
5. Yalnız hedef dosyaları değiştir; `git diff --check` + dosya listesi ile doğrula.

## 12) Güncel sürüm notu
- **V1.1 — Karar Kanıtı ve Aksiyon Bağlantısı**: mevcut veriyi karar için şeffaf kılan kanıt
  katmanı (Halefiyet Karar Kanıtı, Neden Kritik? / Bugünkü Risk, çoklu-rol mikro-uyarı).
- **V1.2-A — Açık Halefiyet Riskleri**: Yönetici Karar Özeti'nde filtrelenebilir karar kuyruğu
  (`positionRiskFlags`, `openSuccessionRiskList`; gap/nobackup/single bayrakları).
- **V1.2-B — Halef Havuzu Gücü Şeridi**: Pozisyon Karar Dosyası'nda kompakt bench-strength
  şeridi (`benchStrength`; Hazır Şimdi / Diğer Aday / Toplam Aday + dürüst boş durum).

> Not: Repo kökünde 4 untracked denetim belgesi bilinçli olarak commit edilmez —
> bunlara dokunma (`PUBLIC_RELEASE_AUDIT.md` vb.).
