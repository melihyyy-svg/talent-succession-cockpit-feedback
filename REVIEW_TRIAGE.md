# REVIEW_TRIAGE — Dış Değerlendirme Notları Triyajı

> **Kapsam ve ilke:** Bu belge yalnızca **değerlendirme ve fizibilite** içerir.
> Hiçbir ekran, veri modeli veya hesaplama varsayımla değiştirilmemiştir. Her madde
> mevcut kod (`talent_succession_cockpit_mvp/src/*` ve bu repodaki `js/*`,
> `tools/generate_data.py`) ile **gerçek veri** (`data/*.json`, kaynaktan salt-okunur
> üretildi) üzerinden doğrulanmıştır. Aşağıdaki tüm sayılar bu veri setine aittir.
>
> **Veri taban çizgisi (doğrulanmış):**
> - Pozisyon Verisi: **177** kayıt — Aciliyet_Final: ACİL 6 · YÜKSEK 43 · ORTA 123 · DÜŞÜK 5 · Yedek_Var: Evet 161 / Hayır 16
> - Yedek Verisi: **470** kayıt
> - Yetenek Havuzu (Talent Pool): **216** · 9-Box Tümü: **466** · Assessment Gerekli: **1403** · Succession Plan: 216
>
> **Statü etiketleri:** Kabul · Uyarlanarak kabul · Faz 2'ye ertelenir · Reddedilir · Veri doğrulaması gerekli

---

## Özet tablo

| # | Madde | Statü |
|---|---|---|
| 1 | Ready-now / Bench Strength | **Uyarlanarak kabul** (Faz 1) |
| 2 | 9-Box kapsamı | **Uyarlanarak kabul** (etiket/şeffaflık, Faz 1) + tüm popülasyon görünümü **Faz 2'ye ertelenir** |
| 3 | Talent Pool ↔ Yedek Verisi join | **Reddedilir** (otomatik join) + **Faz 2 veri ihtiyacı** |
| 4 | Yönetici ekranı drill-down | **Uyarlanarak kabul** (sınırlı set, Faz 1) |
| 5 | Mutabakat & veri kalitesi testleri | **Kabul** (Faz 1) |
| 6 | Top Talent kayıp riski | **Faz 2'ye ertelenir** (veri yok) |
| 7 | Aday Keşfi puanlaması | **Reddedilir** (şimdilik) + Faz 2 veri gereksinimi listesi |

---

## 1) Ready-now / Bench Strength — **Uyarlanarak kabul**

**Mevcut uygulamadaki durum.**
"Yedek Kapsamı" metriği yalnızca **tanımlı yedek varlığını** ölçer, hazır halef
kapasitesini değil. Kanıt: `src/calculations.py::_coverage_mask` → `Yedek_Var == "Evet"`
(statik karşılığı `js/calc.js::hasBackup` → `normalizeValue(Yedek_Var)==="evet"`).
Yani bir pozisyonun "yedeği var" sayılması için tek koşul `Yedek_Var=Evet` olmasıdır;
yedeğin **hazır** olup olmadığına bakılmaz.

**Kaynak/veri kanıtı.**
- Mevcut metrik: **161/177** pozisyon "yedeği var" (%91,0).
- `Yedek Verisi.Yedek_Tipi` alanında **hazırlık sinyali fiilen mevcut**:
  `YETENEK HAZIR` (2) + `DOĞAL + HAZIR` (57) = **59 hazır yedek kaydı**.
  "Hazırlanıyor" ayrı kodlanmış: `DOĞAL + HAZ.NIYOR` (88), `YETENEK HAZ.NIYOR` (4) → hazır **değil**.
- **Pozisyon bazında** (Pozisyon_Sahibi → İsim ilişkisiyle gruplanarak):
  - **Ready-now coverage:** en az bir hazır halefi olan pozisyon = **36/177 (%20,3)**.
  - **Ready-now açığı:** ACİL+YÜKSEK olup hazır halefi olmayan = **43 / 49**.
  - Mevcut "Yedek Kapsamı" (161) ile ready-now (36) arasındaki **125 pozisyonluk fark**,
    metriğin neyi ölçtüğüne dair eleştiriyi doğrular.
- Hesaplama **pozisyon bazlıdır** (kişi sayısı değil) ve mevcut `lookup_backups`
  (Pozisyon_Sahibi→İsim) ilişkisini yeniden kullanır.

**Risk.**
- Eşleşme isim-anahtarı üzerinden kurulur. Bu veri setinde yinelenen İsim **0**
  (güvenli), ancak 1 adet yinelenen `position_key` uyarısı mevcut; metodoloji genel
  olarak isim-anahtarı zayıflığını taşır (uygulama bunu zaten WARNING ile izliyor).
- "Hazır" tanımının taksonomisi (`HAZIR` içeren tüm etiketler) iş tarafından teyit
  edilmeli; yanlış kodlanmış bir `Yedek_Tipi` metriği saptırabilir.

**Önerilen aksiyon.**
- Faz 1'de iki **pozisyon bazlı** metrik eklenebilir (mevcut veriyle, yeni kaynak veri
  GEREKMEZ): *Ready-now coverage* ve *Ready-now açığı*. Mevcut "Yedek Kapsamı" metriği
  **kaldırılmaz**; yanına "hazır halef" ayrımı eklenir (iki kavram ayrı sunulur).
- "Hazır" tanımını `Yedek_Tipi ⊇ HAZIR (∧ ¬HAZ.NIYOR)` olarak sabitle; Veri Kalitesi'nde
  tanım şeffafça gösterilsin.

**Yeni veri ihtiyacı.** Yok (mevcut `Yedek_Tipi` yeterli). Yalnızca **taksonomi teyidi** (veri doğrulaması).

**Etkilenecek dosyalar.**
`js/calc.js` (`calculateSummary` + yeni ready-now sayacı), `js/views/exec.js` (KPI),
`tools/generate_data.py` (istenirse önceden hesap/şeffaflık) · Kanonik karşılık:
`src/calculations.py`, `src/views.py`, `src/schema.py`.

---

## 2) 9-Box kapsamı — **Uyarlanarak kabul** (+ tüm popülasyon **Faz 2'ye ertelenir**)

**Mevcut uygulamadaki durum.**
9-Box ekranı **yalnızca Talent Pool (Yetenek Havuzu, 216 kişi)** kapsamını gösterir;
tüm çalışan popülasyonunu değil. Kanıt: `src/views.py::render_talent_pool_view` →
`schema.TALENT_POOL_SHEET = "Yetenek Havuzu"`; matris `ninebox_matrix(filtered_base)`
ile yalnızca bu df'nin `9-Box` kolonundan sayım yapar (statik karşılığı
`js/views/talent.js` + `js/calc.js::nineboxMatrix`).

**Kaynak/veri kanıtı.**
- Ekranda toplam **216** kişi (doğrulandı; matris toplamı 216).
- Mevcut veride 216 kişi yalnızca birkaç hücreyi doldurur (ör. 1-YILDIZ 71, 2-YÜKSEK POT.
  85, 3-YÜKSEK PERF. 60; kalan hücreler 0) — çünkü Talent Pool **seçilmiş yüksek-yetenek
  alt kümesidir**, tüm popülasyon değil.
- **Karşılaştırılabilir geniş veri seti GERÇEKTEN var:** `9-Box Tümü` sayfası **466**
  kayıt ve `9-Box` kolonu içerir; `Assessment Gerekli` **1403** kayıt. Yani daha geniş
  bir 9-box görünümü Faz 2'de **fizibildir**.

**Risk.**
- Bu **bug değildir**; kapsam tasarımıdır. Ancak kullanıcı 216'yı "tüm şirket" sanırsa
  yanlış okuma riski var. 0'lı hücreler "veri hatası" gibi algılanabilir.

**Önerilen aksiyon (Faz 1, küçük).**
- "Talent Pool kapsamı — 216 kişi" bilgisini ekran başında ve matris başlığında
  **belirgin** hale getir.
- 0 değerli hücrelerde "bu kapsamda kayıt yok" açıklaması göster (boş hücre = veri hatası
  değil). Bu ifade **uygundur**.

**Önerilen aksiyon (Faz 2).**
- `9-Box Tümü` (466) için **ayrı, karşılaştırılabilir** bir görünüm/geçiş (Talent Pool ↔
  Tüm) değerlendirilebilir. 9-box toplamı tüm popülasyona **zorunlu eşitlenmez**; her
  görünüm kendi kapsamını esas alır.

**Yeni veri ihtiyacı.** Faz 1: yok. Faz 2: `9-Box Tümü` paketinin de statik veriye taşınması.

**Etkilenecek dosyalar.** `js/views/talent.js` (etiket/boş-hücre metni) · Kanonik: `src/views.py`.

---

## 3) Talent Pool ↔ Yedek Verisi eşleşmesi — **Reddedilir (otomatik join)** + Faz 2 veri ihtiyacı

**Mevcut uygulamadaki durum.**
Aday Keşfi, Talent Pool ile mevcut yedekleri **otomatik eşleştirmez**; "doğrulanmış ortak
anahtar yok" notu gösterir (`src/views.py::render_candidate_discovery_view`).

**Kaynak/veri kanıtı (teknik doğrulama).**
- **Ortak anahtar yok:** `Yedek Verisi`'nde Sicil No **yok** (kolonlar: Pozisyon_Sahibi,
  Yedek_İsim, Yedek_Görev, …; `Sicil No` anahtarı yok). `Talent Pool`'da `Sicil No` var.
- **Talent anahtar kalitesi:** Sicil No = 216 kayıt, **216 benzersiz, 0 boş** → temiz,
  ama yalnızca tek tarafta.
- **İsim bazlı kesişim (zayıf):** `Yedek_İsim → Talent.Ad-Soyad` eşleşme **%32,1**
  (151/470); `Pozisyon İsim (incumbent) → Talent` **%24,9** (44/177).
- Talent tarafında yinelenen Ad-Soyad = 1 (neredeyse benzersiz), ancak düşük kapsam
  güvenilir join'i engeller.

**Risk.**
- İsim/fuzzy eşleştirme yanlış kişi birleştirir (özellikle %25–32 kapsamda) → karar
  güvenilirliğini bozar. Bu **kabul edilemez**.

**Önerilen aksiyon.**
- Mevcut "eşleştirme yok" davranışı **korunur**. İsim-soyisim veya fuzzy matching ile
  otomatik join **önerilmez**.
- Faz 2: kaynakta `Yedek Verisi` (ve `Pozisyon Verisi`) kayıtlarına **Sicil No** eklenirse,
  benzersiz/doğrulanmış join **mümkün** olur.

**Yeni veri ihtiyacı (Faz 2).** `Yedek Verisi.Yedek_Sicil_No` ve `Pozisyon Verisi.Sicil_No`
(kaynakta, doğrulanmış ve benzersiz).

**Etkilenecek dosyalar.** Değişiklik yok (öneri). Faz 2: `tools/generate_data.py`,
`src/schema.py`, `src/data_loader.py`, `src/validation.py` (anahtar bütünlüğü kontrolü).

---

## 4) Yönetici ekranı drill-down — **Uyarlanarak kabul** (sınırlı set, Faz 1)

**Mevcut uygulamadaki durum.**
KPI kartlarından filtre uygulanmış sekme geçişi **yok**. Kanıt: KPI kartları statik HTML
(`js/calc.js::kpiCard` / `theme.kpi_card`), tıklama handler'ı yok; sekmeler yalnızca hash
ile yönlendirilir (`js/app.js::activate`), ekranlar arası filtre parametresi taşınmaz.
Not: statik demoda Pozisyon & Yedek Detayı **cascade** (Firma→Ünvan→Sahip) tabanlıdır;
Aciliyet/risk filtreli bir pozisyon listesi UI'si henüz yoktur (MVP'de ayrı "Pozisyon Risk
Haritası" `FILTER_COLUMNS` ile vardı). Ancak Yönetici Karar Özeti **zaten** "ACİL+YÜKSEK
İlk 10" ve "Yedek Olmayan Pozisyonlar" tablolarını satır-içi gösterir.

**Kaynak/veri kanıtı.**
- ACİL=6, Yedek yok=16, Yüksek risk (ACİL+YÜKSEK)=49 — hepsi mevcut veriden filtrelenebilir
  (exec ekranı bunları zaten listeliyor).
- Ready-now açığı = 43 pozisyon (Madde 1) — uygun hedef liste olarak üretilebilir.

**Risk.**
- Detay ekranı cascade tabanlı olduğundan, KPI→Detay "filtre" geçişi için ya hafif bir
  **filtreli pozisyon listesi** görünümü eklenmeli ya da geçiş mevcut exec tablolarına
  **çapa/scroll** ile yapılmalı. Aksi halde "filtre uygulanmış geçiş" beklentisi tam karşılanmaz.

**Önerilen aksiyon (Faz 1, küçük).**
- KPI kartlarını tıklanabilir yap; aşağıdaki eşlemelerle:
  - **ACİL** → ACİL filtreli pozisyon listesi
  - **Tanımlı Yedeği Olmayan** → `Yedek_Var=Hayır` listesi
  - **Yüksek Risk** → ACİL+YÜKSEK listesi
  - **Ready-now açığı** (Madde 1 ile) → 43 pozisyonluk liste
- En küçük uygulama: bu listeler için exec'teki mevcut tablolara çapa + ortak bir
  "filtreli pozisyon listesi" bileşeni; ekranlar arası filtre için `js/app.js`'e basit bir
  durum/parametre taşıma eklenir.

**Yeni veri ihtiyacı.** Yok.

**Etkilenecek dosyalar.** `js/app.js` (filtre parametresi taşıma), `js/views/exec.js`,
gerekirse yeni hafif liste bileşeni / `js/views/detail.js` · Kanonik: `src/views.py`.

---

## 5) Mutabakat ve veri kalitesi — **Kabul** (Faz 1)

**Mevcut uygulamadaki durum.**
Veri Kalitesi sekmesi yapı/başlık/yinelenen/kategorik/aralık ve çapraz-referans
(`Pozisyon_Sahibi→İsim`), Talent anahtar raporu ve override izlerini kontrol eder
(`src/validation.py::run_all`). Ayrıca aktif kayıt sayıları (`active_row_count`)
gösterilir. Ancak **beklenen toplamlara karşı otomatik mutabakat iddiaları** ve
**filtre sonrası beklenen toplam** kontrolleri **yoktur**.

**Kaynak/veri kanıtı.**
- `quality.json` yalnızca sayımları (0 hata · 1 uyarı · 9 bilgi) ve yükleme özetini taşır;
  "177=177", "kapsam_var+kapsam_yok=toplam" gibi **invariant testleri** yok.
- Doğrulanabilir invariantlar mevcut: ACİL+YÜKSEK+ORTA+DÜŞÜK = 177; Yedek Var(161)+Yok(16)=177;
  matris toplamı = ekran kapsamı (216); filtre sonrası alt-toplam ≤ üst-toplam.

**Risk.**
- Mutabakat olmadan kaynak ↔ cockpit sapması sessizce geçebilir (özellikle yeni dönem
  verisinde).

**Önerilen aksiyon (Faz 1).**
- Otomatik **mutabakat/invariant testleri** ekle (pytest, MVP'de) ve Veri Kalitesi'ne bir
  **mutabakat paneli**: pozisyon sayısı, yedek kaydı sayısı, Talent toplamı, 9-box kapsam
  toplamı (ekran kapsamına göre), kapsam filtreleri sonrası beklenen toplamlar, aktif kayıt
  ↔ görünüm tutarlılığı.
- **Önemli sınır:** 9-box toplamı tüm popülasyona **zorunlu eşitlenmez**; mutabakat
  ekranın kendi kapsamını (216) esas alır (Madde 2 ile tutarlı).

**Yeni veri ihtiyacı.** Yok.

**Etkilenecek dosyalar.** `tools/generate_data.py` (mutabakat çıktısı), `data/quality.json`,
`js/views/quality.js` · Kanonik: `src/validation.py` + yeni `tests/` (pytest).

---

## 6) Top Talent kayıp riski — **Faz 2'ye ertelenir** (veri yok)

**Mevcut uygulamadaki durum.**
Executive Decision View'da çalışan bazlı "kayıp riski" yok.

**Kaynak/veri kanıtı.**
- `Talent Pool` kolonlarında **çalışan bazlı ayrılma/kayıp riski alanı YOK** (kolonlar:
  Sicil No, Ad-Soyad, …, Potansiyel, Performans, 9-Box, Talent Kararı, Succession, Önerilen
  Aksiyon, Gerekçe — risk-of-loss alanı yok; tarama sonucu boş).
- `Yedek Verisi.Ayrılma_Riski` (Düşük 160 / Orta 250 / Yüksek 60) mevcuttur **ancak bu
  yedeğin/halefin ayrılma riskidir**, Talent Pool'daki yüksek-potansiyelli çalışanın
  kayıp riski **değildir** (farklı varlık).

**Risk.**
- Mevcut `Ayrılma_Riski`'ni "top talent kayıp riski" diye sunmak **kavramsal hata** olur.

**Önerilen aksiyon.**
- **Yeni metrik üretme.** Talent Pool'a çalışan bazlı, güncel ve güvenilir bir
  "Ayrılma/Kayıp Riski" alanı eklenirse Executive View'a eklenmesi fizibildir.

**Yeni veri ihtiyacı (Faz 2).** `Talent Pool.Calisan_Kayip_Riski` (kaynakta, çalışan bazlı, güncel).

**Etkilenecek dosyalar.** Değişiklik yok. Faz 2: `tools/generate_data.py`,
`data/talent_pool.json`, `js/views/exec.js` · Kanonik: `src/schema.py`, `src/views.py`.

---

## 7) Aday Keşfi puanlaması — **Reddedilir (şimdilik)** + Faz 2 veri gereksinimi

**Mevcut uygulamadaki durum.**
Otomatik eşleşme/match score yok; yalnızca **şeffaf filtreler** ve bilgi amaçlı
"Firma/Şehir Eşleşmesi: Aynı/Farklı" sütunları var (`src/calculations.py::add_candidate_comparison`,
`js/views/discovery.js`). Karar/öneri/skor dili içermez.

**Risk.**
- Otomatik match score şimdi eklenirse açıklanabilirlik kaybolur ve doğrulanmamış
  ağırlıklar yanlış sıralama üretir.

**Önerilen aksiyon.**
- **Match score ekleme.** Mevcut açıklanabilir filtre mantığı korunur. İleride **şeffaf,
  kural-temelli** bir sıralama için gereken veri/altyapı aşağıda listelenir (ML/fuzzy yok).

**İleride kural-temelli sıralama için veri gereksinimleri (öneri listesi).**
- **Hazırlık:** mevcut `Succession`/`Talent Kararı` (Hazır/Hazırlanıyor) — *var*.
- **Performans:** `Perf Ort`, `2024/2025 Perf` — *var*; ancak `Assessment` ölçeği tipe göre
  değişiyor (DYT ≈ 0–10, AC ≈ 0–5) → **tipe göre normalize edilmiş** ortak ölçek gerekir.
- **Coğrafi/mobilite uyumu:** pozisyon `Şehir` vs aday `İş Adresi` — *var* (kural bazlı türetilebilir).
- **Fonksiyonel uyum:** güvenilir **rol/fonksiyon taksonomisi** gerekir (şu an yok;
  `Yedek Verisi.Fonksiyonel_Uyum` yalnızca yedekler için ve sınırlı).
- **Rol kıdemi:** `Rol_Kıdemi` (Yedek Verisi) — yalnızca tanımlı yedekler için.
- **Halefin ayrılma riski:** `Yedek Verisi.Ayrılma_Riski` — *var* (yedekler için).
- **Ortak anahtar:** Madde 3'teki Sicil No şartı (Talent ↔ Yedek güvenilir join).
- Her kural **ağırlık + açıklama** ile şeffaf sunulmalı; gizli skor üretilmemeli.

**Yeni veri ihtiyacı (Faz 2).** Normalize Assessment ölçeği, rol/fonksiyon taksonomisi,
Sicil No ortak anahtarı.

**Etkilenecek dosyalar.** Değişiklik yok. Faz 2: `js/views/discovery.js`,
`src/calculations.py`, `src/schema.py`.

---

## Net öneri — En küçük ama en yüksek etkili Faz 1 paketi

> *"Mevcut veri bütünlüğünü ve metodolojik güvenilirliği koruyarak, ilk uygulanacak en
> küçük ama en yüksek etkili Faz 1 paketi nedir?"*

**Önerilen Faz 1 paketi (yeni kaynak veri GEREKTİRMEYEN, yüksek karar değeri):**

1. **Ready-now metrikleri (Madde 1).** Mevcut `Yedek_Tipi` ile *Ready-now coverage*
   (36/177) ve *Ready-now açığı* (ACİL+YÜKSEK'te 43) eklenir. **En yüksek etki:** "%91
   kapsam" yanılsamasını gerçek hazırlık tablosuyla (%20,3) dengeler. Mevcut metrik korunur.
2. **Mutabakat/invariant testleri (Madde 5).** Toplamların ve filtre alt-toplamlarının
   otomatik doğrulanması — yeni metriklerin güvenilirliğini garanti eder, sıfır kaynak-veri
   maliyeti.
3. **9-Box kapsam şeffaflığı (Madde 2).** "Talent Pool — 216 kişi" etiketi + 0-hücre
   açıklaması. Çok küçük, yanlış-okuma riskini kapatır.
4. **Sınırlı drill-down (Madde 4).** Üç mevcut KPI (ACİL, Yedeği Olmayan, Yüksek Risk) +
   yeni Ready-now açığı → filtreli pozisyon listesine geçiş. İçgörüyü aksiyona bağlar.

**Bilinçli olarak Faz 1 DIŞI:** otomatik join (3), top-talent kayıp riski (6) ve match
score (7) — üçü de **yeni/güvenilir kaynak veri** gerektirir ve şimdi uygulanırsa
metodolojik güvenilirliği zedeler.

**Gerekli tek ön-koşul (veri doğrulaması):** Madde 1'deki "hazır" taksonomisinin
(`Yedek_Tipi ⊇ HAZIR ∧ ¬HAZ.NIYOR`) iş tarafından teyidi. Bu teyit alınınca paket
güvenle uygulanabilir.
