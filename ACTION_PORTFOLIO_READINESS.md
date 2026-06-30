# ACTION_PORTFOLIO_READINESS — Executive Succession Action Portfolio Hazırlık Analizi

> **Kapsam:** Yalnızca **salt-okunur analiz**. Kod / CSS / veri / ekran / hesaplama / UI
> değiştirilmemiş; commit/push yapılmamıştır. Amaç: mevcut **Aksiyon Takip** sekmesinin
> yönetici seviyesinde bir *"Succession Action Portfolio"* — yani
> **"hangi kritik açık için hangi aksiyon, kimde, ne zamana kadar?"** — görünümünü taşıyıp
> taşıyamadığını belirlemek. Sayılar mevcut veri paketinden (177 / 470 / 216) doğrulanmıştır.

---

## Mevcut "Aksiyon Takip" sekmesi bugün ne yapıyor?

Bu public demoda Aksiyon Takip, kaynak **Yetenek Havuzu**'nda zaten tanımlı **"Önerilen
Aksiyon"** kayıtlarının (216 kişi) **görüntülenmesi ve filtrelenmesidir**. Tarayıcı içinde
aksiyon oluşturma/güncelleme yoktur; operasyonel takip alanları (sahip/tarih/durum) yoktur.

---

## 1) Gerekli Action Portfolio alanları gerçekten var mı?

| Alan | Var mı? | Kaynak / not |
|---|---|---|
| Hedef pozisyon | ❌ Yok | "Önerilen Aksiyon" kişi (Talent Pool) düzeyinde; kritik pozisyona bağlı değil |
| Aksiyon tipi | ⚠️ Yapısal değil | Yalnızca serbest metin `Önerilen Aksiyon`; **216/216 dolu ama yalnızca 2 distinct değer** (neredeyse tamamı *"Mentorluk + Zorlu Görev + Yedek Olarak Ata"*) — farklılaştırılmış tip yok |
| Öncelik | ❌ Yok | Aksiyon kaydında öncelik alanı yok |
| Sahip (owner) | ❌ Yok | Sorumlu/owner alanı yok |
| Hedef tarih | ❌ Yok | Due date alanı yok |
| Durum (status) | ❌ Yok | Açık/Devam/Tamamlandı alanı yok |
| Gerekçe | ✅ Var | `Talent.Gerekçe` (kişi düzeyinde, 216/216 dolu) |

**Sonuç:** 7 alandan **6'sı yok**; yalnızca kişi düzeyinde *gerekçe* ve farklılaşmamış bir
*öneri metni* var. (Pozisyon/Yedek verisinde aksiyon/sahip/tarih/durum alanı **hiç yok**.)

> Not: Kaynak masaüstü (Streamlit) projesinde oturum-içi bir aksiyon modeli
> (tip/sahip/tarih/durum) vardı; ancak bu **kalıcı değildi ve statik veri paketine
> taşınmadı**. Bu public demoda bu kayıtlar mevcut değildir.

## 2) Aksiyonlar kritik açıklara doğrulanmış biçimde bağlanabiliyor mu?

**Hayır.** "Önerilen Aksiyon" Talent Pool **kişilerine** aittir; kritik **pozisyonlar**
Pozisyon Verisi'ndedir. İki taraf arasında **doğrulanmış ortak kişi anahtarı yok**:
- Talent `Ad-Soyad` → Pozisyon `İsim` isim eşleşmesi yalnızca **%20,4 (44/216)**.
- Pozisyon Verisi ve Yedek Verisi'nde **Sicil No yok** (Talent'te var, tek tarafta).

Bu nedenle bir önerilen aksiyon, belirli bir **kritik Ready-now açığı / yedeksiz rol /
yüksek riskli pozisyon** ile **güvenilir biçimde eşleştirilemez** (fuzzy/isim eşleştirmesi
önerilmez).

## 3) Yönetici "en kritik açıkları kapatmak için hangi aksiyonlar takip edilmeli?" sorusuna cevap alabilir mi?

**Hayır — tam olarak değil.** Cockpit, **açıkların kendisini** mevcut kurallardan net üretir:
- **Kritik Ready-now açığı: 43** · **Yedeksiz: 16** · **Yüksek risk: 49**
- Pozisyon Karar Dosyası'nda her açık için **kural-bazlı kalibrasyon konusu** gösterilir.

Ancak **"hangi aksiyon, kimde, ne zamana kadar, hangi durumda"** sorusu yanıtlanamaz:
sahip/tarih/durum alanları yok ve önerilen aksiyonlar açıklara bağlanamıyor. Yani cockpit
bugün **açığı teşhis eder**, ama aksiyonu **yönetici seviyesinde takip ettirmez**.

## 4) Sahip/tarih/durum yoksa, uydurmadan hangi seviyeye kadar Portfolio kurulabilir?

Uydurma yapılmadan kurulabilecek **en üst seviye, salt-okunur bir "Succession Gap Portföyü"**dür:
- Kritik açıkların (Kritik açık / Yedeksiz / Yüksek risk) **tek listede** toplanması,
- her satırda mevcut pozisyon bağlamı (Firma, Seviye, Aciliyet, Toplam Risk, tanımlı yedek /
  Ready-now sayısı, durum etiketi) ve **mevcut kural-bazlı kalibrasyon konusu**,
- sıralama/filtre (açık tipi, firma, seviye) ve Pozisyon Karar Dosyası'na geçiş.

Bu, **"gündeme hangi açıklar alınmalı"** portföyüdür; **"aksiyon takibi" (sahip/tarih/durum)
değildir** ve büyük ölçüde mevcut Halefiyet Sağlığı + Karar Dosyası'nın sunduğunu tek listede
toplar. **Sahip, hedef tarih, durum ve açık↔aksiyon bağı kaynak veri olmadan eklenemez.**

## 5) Yeni ekran mı gerekir, mevcut sekme içinde mi geliştirilebilir?

- **Salt-okunur Gap Portföyü** (Madde 4) **yeni üst-menü sekmesi GEREKTİRMEZ**; mevcut
  **Aksiyon Takip** sekmesi içinde ikinci bir mod/bölüm olarak geliştirilebilir.
- **Gerçek Executive Action Portfolio** (sahip/tarih/durum ile takip) ise yeni ekrandan
  önce **yeni kaynak veri** gerektirir; veri olmadan ekran geliştirmek yalnızca boş alanlar
  veya uydurma üretir.

---

## Tek Net Karar

### ▶ **Faz 2 veri gerektirir.**

Mevcut veriyle **gerçek bir Executive Action Portfolio** (kritik açık ↔ aksiyon ↔ sahip ↔
hedef tarih ↔ durum) **kurulamaz**: aksiyon kayıtlarında sahip/tarih/durum/öncelik/hedef
pozisyon alanları yoktur ve önerilen aksiyonlar kritik pozisyonlara doğrulanmış biçimde
bağlanamaz (ortak benzersiz anahtar yok; isim eşleşmesi %20,4).

**Bu yüzden zorlanmamalı.** Yönetici takip halkasını gerçek anlamda kapatmak için Faz 2'de
kaynakta şunlar gerekir:
- `Sicil No`'nun **Pozisyon Verisi ve Yedek Verisi**'ne eklenmesi (açık↔kişi↔aksiyon için
  doğrulanmış anahtar),
- aksiyon kayıtlarına **sahip, hedef tarih, durum, öncelik, hedef pozisyon** alanları.

**Faz 2'ye kadar no-fabrication ara seçenek (opsiyonel):** mevcut **Aksiyon Takip** sekmesi
içinde, sahiplik/tarih/durum **iddia etmeyen**, salt-okunur **"Succession Gap Portföyü"**
(Madde 4) geliştirilebilir. Bu bir teşhis/gündem aracıdır; aksiyon takibi değildir ve
mevcut üst-seviye cockpit'in sunduğunu büyük ölçüde tekrarlar — dolayısıyla **şart değildir**.

**Öneri:** Üst-seviye cockpit'i burada bırakmak doğru hamledir; takip yeteneği Faz 2 veri
kararına bağlanmalıdır.
