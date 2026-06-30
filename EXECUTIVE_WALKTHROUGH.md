# EXECUTIVE_WALKTHROUGH — Yönetici Kullanım Senaryosu

> **Kapsam:** Yalnızca **mevcut ürün** davranışlarını anlatan bir kullanım kılavuzu.
> Yeni ekran/metrik/akış tarif edilmez. Tüm sayılar mevcut veri paketinden
> (177 pozisyon · 470 yedek · 216 Talent Pool) doğrulanmıştır. Bu belge kod/veri
> değiştirmez. Otomatik karar / AI önerisi / tahmin / match score dili kullanılmaz.

---

## 1) Cockpit'in Tek Cümlelik Yönetici Değeri

**Kritik pozisyonların yedeklilik riskini ve "tanımlı yedek ≠ hazır halef (Ready-now)"
gerçeğini şirket/seviye kırılımında görünür kılar; yöneticiyi en kritik alandan tek bir
pozisyonun karar dosyasına ve kalibrasyon toplantısı gündemine kadar götürür.**

---

## 2) 3–5 Dakikalık Yönetici Kullanım Akışı

| Süre | Ekran | Yönetici ne görür |
|---|---|---|
| 0:00–0:30 | **Yönetici Karar Özeti** | Kritik sinyaller: **6 ACİL** · **Ready-now açığı 43/49** · **16 yedeksiz**; ve kritik ayrım: **Yedek Kapsamı %91,0** vs **Ready-now Coverage %20,3**. |
| 0:30–1:30 | **Halefiyet Sağlığı** | Riskin yoğunlaştığı Firma × Seviye alanı (varsayılan lens: *Kritik Ready-now Açığı*). En yoğun alan: **Dicle Dağıtım × Direktör/GMY — 8 açık / 12 pozisyon (%66,7)**. |
| 1:30–3:00 | **Pozisyon Karar Dosyası** | "Pozisyonları incele →" ile inilen pozisyonda: rol neden kritik, tanımlı yedek/Ready-now durumu, kalibrasyon konusu. |
| 3:00–4:00 | **Talent Review / Kalibrasyon Görünümü** | Toplantıda incelenecek yetenek grupları (Yıldız 71, Yüksek Potansiyel 156, Yüksek Performans 131). |
| 4:00–5:00 | **Aksiyon Takip + Veri Kalitesi** | Kaynak-tanımlı önerilen aksiyonlar; ve kararın dayandığı verinin güven göstergeleri (mutabakat, bütünlük, uyarılar). |

---

## 3) Ekran Bazında Karar Soruları

### Adım 1 — Yönetici Karar Özeti
**İlk 30 saniyede bakılacak alanlar:** üç kritik sinyal kartı (ACİL · ACİL+YÜKSEK
Ready-now açığı · Tanımlı yedeği olmayan) ve *Succession sağlığı* karşılaştırması
(Yedek Kapsamı %91,0 ↔ Ready-now Coverage %20,3, fark **125 pozisyon**).
**Karar soruları:**
- Bugün acil müdahale gerektiren kaç pozisyon var? (**6 ACİL**)
- "Yedeğimiz var" rahatlığı gerçek hazırlığı yansıtıyor mu? (**161 tanımlı yedek, ama yalnızca 36 hazır halef**)
- Yüksek riskli pozisyonların kaçında hazır halef yok? (**43 / 49**)

### Adım 2 — Halefiyet Sağlığı Isı Haritası
**Varsayılan lens:** *Kritik Ready-now Açığı*. Satır = Firma, sütun = Seviye.
**Bir hücre nasıl okunur** (gerçek örnek — Dicle Dağıtım × Direktör/GMY):
`8 kritik açık` (lens sayısı) · `%66,7` (oran) · `12 pozisyon içinde` (grup toplamı).
Yani bu grupta 12 direktör pozisyonundan 8'i ACİL/YÜKSEK olup hazır halefsiz.
**Geçiş:** hücreye ya da öncelik listesinde **"Pozisyonları incele →"**e tıklayınca
Pozisyon Karar Dosyası, o Firma+Seviye+lens bağlamıyla açılır.
**Karar soruları:** Risk hangi şirket ve hangi yönetim kademesinde yoğunlaşıyor?
Lensi değiştirince (Coverage / Tanımlı Yedek Açığı / Yüksek Risk) tablo nasıl değişiyor?

### Adım 3 — Pozisyon Karar Dosyası
Seçilen pozisyonda dört soru:
- **Rol neden kritik?** → Aciliyet + Toplam Risk + durum etiketi + F1–F5 risk gerekçeleri.
- **Tanımlı yedek var mı?** → "Tanımlı yedek" sayısı ve Halefler Karşılaştırması.
- **Ready-now halef var mı?** → "Ready-now halef" sayısı; "Tanımlı yedek ≠ Hazır halef" kontrastı.
- **Kalibrasyonda hangi konu?** → "Kalibrasyonda İncelenebilecek Konular" (kural-bazlı, nötr).
Durum etiketleri: **Korunaklı · Kritik Açık · Yedeksiz · Hazır Halef Açığı**.
**Heatmap bağlamından gelindiyse:** bağlam bandının altında **"Bu heatmap seçimi içinde
incelenebilecek pozisyonlar"** listesi açılır (gerçek örnek: *8 / 12 pozisyon*); listedeki
her satırdan tek tek karar dosyasına geçilir, böylece hücredeki tüm pozisyonlar görünür kalır.

### Adım 4 — Talent Review / Kalibrasyon Görünümü
Talent Pool & 9-Box Explorer içindeki **mod seçici** ile açılır. Görünürlük grupları
(örtüşebilir; toplu headcount olarak okunmaz):
**Yıldız 71 · Yüksek Potansiyel 156 · Yüksek Performans 131 · Assessment bilgisi eksik ·
9-Box bilgisi eksik.** Grup kartına ya da 9-Box hücresine tıklayınca "İncelenecek Kişiler"
listesi açılır; her kişide görünürlük gerekçesi gösterilir.
> Bu alan **kişi bazında otomatik halef önerisi üretmez**; yalnızca mevcut değerlendirme
> verisini **toplantı hazırlığı** için görünür kılar.

### Adım 5 — Aksiyon Takip ve Veri Kalitesi
- **Aksiyon Takip:** kaynak Yetenek Havuzu'nda **zaten tanımlı önerilen aksiyonların**
  görüntülenmesi ve filtrelenmesi (bu public demo yeni aksiyon oluşturmaz/güncellemez).
- **Veri Kalitesi:** kararın dayandığı verinin güven katmanı —
  **Kaynak↔Cockpit Mutabakatı (9/9)**, **Halefiyet Sağlığı Agregasyon Mutabakatı (6/6)**,
  **Ready-now İlişki Anahtarı Bütünlüğü (7/7)** ve veri uyarıları (**0 hata · 1 uyarı · 9 bilgi**).
  Bu göstergeler, ekrandaki sayıların kaynak aktif kayıtlarıyla tutarlı olduğunu doğrular →
  yönetici sayılara güvenerek karar konuşması yapabilir.

---

## 4) Örnek Drill-down Yolculuğu (gerçek veriyle)

1. **Yönetici Karar Özeti:** "Ready-now açığı 43" kartı dikkat çeker.
2. **Halefiyet Sağlığı** (varsayılan lens): en yoğun hücre **Dicle Dağıtım × Direktör/GMY —
   8 kritik açık / 12 pozisyon / %66,7**.
3. Hücreden **"Pozisyonları incele →"**: Pozisyon Karar Dosyası, bağlam bandıyla açılır —
   *"Dicle Dağıtım · Direktör / GMY · Kritik Ready-now Açığı — 8 / 12 pozisyon"*; altında 8 pozisyonluk liste.
4. Listedeki ilk pozisyon: **Regülasyon Direktörü** — durum **Kritik Açık**, **tanımlı yedek 0**,
   **Ready-now halef 0**; kalibrasyon konusu: *"Pozisyon için tanımlı yedek kapsamı
   kalibrasyonda değerlendirilebilir."*
5. **Kalibrasyon Görünümü:** aynı şirket/seviye filtresiyle Yıldız / Yüksek Potansiyel
   grupları toplantı gündemine alınır.

> Bu yolculuktaki tüm sayılar mevcut veriden okunur; hiçbir öneri/skor/tahmin üretilmez.

---

## 5) Yönetici İçin Dikkat Edilecek Metrikler

| Metrik | Değer | Neden önemli |
|---|---|---|
| ACİL pozisyon | **6** | En yüksek aciliyet; öncelikli müdahale. |
| Ready-now açığı (ACİL+YÜKSEK) | **43 / 49** | Yüksek riskte hazır halefsizlik. |
| Tanımlı yedeği olmayan | **16** | Yedek kapsamı boşluğu. |
| Yedek Kapsamı | **%91,0 (161/177)** | "En az bir *tanımlı* yedek" — hazırlığı göstermez. |
| Ready-now Coverage | **%20,3 (36/177)** | "En az bir *hazır* halef" — gerçek hazırlık. |
| Fark | **125 pozisyon** | Yedeği var ama hazır halefi yok. |
| Ready-now yedek **kaydı** | **59** | Kayıt ölçüsü (pozisyon değil). |

> En kritik tek mesaj: **%91 ile %20,3 arasındaki fark.** "Yedek var" ≠ "hazır halef".

---

## 6) Ne Söylemez / Ne Yapmaz?

- **Terfi, atama veya halefiyet kararı vermez.** Yalnızca mevcut veriyi görünür kılar.
- **AI önerisi / otomatik karar / tahmin / match score üretmez.**
- **Risk veya 9-Box değerlerini yeniden hesaplamaz** — kaynaktaki hesaplanmış değerleri okur.
- **Talent Pool ile Yedek Verisi'ni kişi bazında otomatik eşleştirmez** (doğrulanmış ortak
  anahtar yok; fuzzy/isim eşleştirmesi yapılmaz).
- **Gerçek organizasyon/raporlama (N+1) ağacı çizmez** — kaynakta yönetici alanı yoktur;
  Halefiyet Sağlığı bir Firma×Seviye yoğunluk görünümüdür, raporlama hattı değildir.
- **Kaynakta olmayan bilgi için çıkarım üretmez** — "Kaynakta belirtilmedi" gösterir.
- **Bu public demoda kalıcı aksiyon yazmaz** (Aksiyon Takip görüntüleme + filtreleme).

---

## 7) Veri ve Metodoloji Sınırları

- **Kapsam:** Pozisyon Verisi (177) + Yedek Verisi (470) + Talent Pool / Yetenek Havuzu (216).
  9-Box görünümü **yalnızca Talent Pool kapsamındaki 216 kişiyi** gösterir, tüm çalışan
  popülasyonunu değil.
- **Ready-now tanımı:** açık allowlist — `Yedek_Tipi ∈ {YETENEK HAZIR, DOĞAL + HAZIR}`
  (normalize tam-eşleşme; substring/casefold yok). Eşlenmemiş tip Veri Kalitesi'nde uyarı üretir.
- **İlişki anahtarı:** Pozisyon↔Yedek bağı `Pozisyon_Sahibi → İsim` isim-anahtarına dayanır
  (kaynakta benzersiz Sicil No yoktur). Mevcut veride yinelenen normalize isim **0** (güvenli);
  Veri Kalitesi'ndeki Ready-now İlişki Anahtarı Bütünlüğü kontrolü bunu aktif izler.
- **Talent Pool ↔ Yedek Verisi:** doğrulanmış ortak kişi anahtarı **bulunmadığından**,
  kişi bazında halef eşleştirmesi yapılmaz; Kalibrasyon ve Aday Keşfi yalnızca görünürlük sağlar.

---

## 8) İlk Kullanımda Görülebilecek Boşluklar

1. **Hazırlık verisi tamlığı:** Talent Pool'da Assessment ve 9-Box alanları **tam doludur**,
   bu nedenle "Assessment / 9-Box bilgisi eksik" kalibrasyon grupları bu kapsamda **0** görünür.
   Daha geniş popülasyon (kaynaktaki "Assessment Gerekli" seti) bu demoya taşınmamıştır.
2. **9-Box kapsamı:** matris yalnızca 216 kişilik Talent Pool'u kapsar; tüm popülasyon görünümü
   ayrı bir veri seti gerektirir.
3. **Gerçek halefiyet ağacı yok:** N+1/raporlama alanı kaynakta bulunmadığından SAP-tarzı
   organizasyon ağacı kurulamaz; Halefiyet Sağlığı yoğunluk görünümüdür.
4. **Kişi bazında halef join'i yok:** Talent Pool–Yedek ortak anahtarı olmadığından otomatik
   aday→pozisyon eşleştirmesi yapılmaz.
5. **Aksiyon kalıcılığı yok:** Bu demoda aksiyonlar kaynak-tanımlı önerilerin görüntülenmesidir;
   operasyonel takip masaüstü cockpit'te yapılır.
6. **Bilinen küçük etkileşim notu:** Heatmap bağlam grup listesindeki bazı tıklama
   davranışlarında bilinen bir sorun raporlanmıştır; **birincil drill yolu** (hücre /
   "Pozisyonları incele →" ve karar dosyasına geçiş) çalışır.

---

## 9) Yönetici Sunumu İçin 60 Saniyelik Açılış Konuşması

> "Bu cockpit, kritik pozisyonlarımızda 'yedeğimiz var mı' değil, **'hazır halefimiz var mı'**
> sorusunu yanıtlıyor. İlk ekranda görüyoruz: pozisyonlarımızın **%91'inde tanımlı bir yedek
> var; ancak yalnızca %20'sinde hazır halef var.** Aradaki **125 pozisyonluk fark**, gerçek
> halefiyet riskimiz. Yüksek riskli 49 pozisyondan **43'ünde hazır halef yok.**
>
> Riskin nerede yoğunlaştığını ısı haritasında görüyoruz — örneğin **Dicle Dağıtım direktör
> kademesinde 12 pozisyonun 8'i** hazır halefsiz. Oradan tek tıkla ilgili pozisyonun karar
> dosyasına iniyoruz: rol neden kritik, yedek ve hazır halef durumu ne, kalibrasyonda hangi
> konu konuşulmalı — hepsi tek ekranda.
>
> Önemli not: bu araç **karar vermez, öneri/skor üretmez**; kaynak verimizi karar toplantısı
> için **görünür ve güvenilir** kılar — ekrandaki her sayı, veri kalitesi sekmesindeki
> mutabakat kontrolleriyle kaynak kayıtlara karşı doğrulanmıştır. Bugünkü kalibrasyonda
> önceliğimiz: **hazır halefi olmayan yüksek riskli roller.**"
