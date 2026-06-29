# Ready-now Taksonomi — Doğrulama Notu (kodlama ÖNCESİ)

> **Amaç:** Faz 1'deki Ready-now metriklerini kodlamadan önce, "hazır halef" iş kuralını
> ve `Yedek_Tipi` alanının **mevcut gerçek değerlerini** açık bir eşleme (mapping) olarak
> sabitlemek. Bu not bir **karar/teyit belgesidir**; henüz kod yazılmamıştır.
>
> **Tasarım ilkeleri (talimat gereği):**
> - Serbest metinde "hazır" **araması yapılmaz** (substring yok).
> - Türkçe `casefold`/büyük-küçük harf davranışına bağlı eşleştirme **kullanılmaz**.
>   (Örn. `"HAZIR".casefold() → "hazir"` artefaktı bu yüzden ilk taslakta 0 üretmişti.)
> - `Yedek_Tipi` **normalize edilmiş, tam-eşleşmeli açık allowlist** üzerinden değerlendirilir.
> - Allowlist (hangi değerler Ready-now sayılır) **config/mapping katmanında görünür ve
>   kolay değiştirilebilir** olur.
> - "HAZIRLANIYOR (HAZ.NIYOR)", eksik/belirsiz ve **tanımsız/yeni** değerler Ready-now sayılmaz.

---

## 1) İş kuralı (öneri)

**Ready-now (pozisyon bazlı):** Bir pozisyon, `Pozisyon_Sahibi → İsim` ilişkisiyle bağlı en
az bir yedeğin `Yedek_Tipi` değeri **Ready-now allowlist**'inde ise "hazır halefi var"
sayılır. Hesap **kişi değil pozisyon** üzerindendir.

- **Ready-now coverage** = (en az bir hazır halefi olan pozisyon) / (toplam pozisyon)
- **Kritik Ready-now açığı** = `Aciliyet_Final ∈ {ACİL, YÜKSEK}` olup hazır halefi **olmayan** pozisyon sayısı

**Kaynak metodolojisine sadakat (önemli):** Kaynak veri, "hazır" doğal yedeği zaten ayrı
kodlamıştır (`DOĞAL + HAZIR`), performans profili taşıyan doğal yedeklerden (`DOĞAL (SAĞLAM
PERF.)` vb.) ayrı tutar. Bu yüzden readiness'i performanstan **biz türetmeyiz**; yalnızca
kaynağın **açık `HAZIR` etiketini** kullanırız.

## 2) Normalizasyon kuralı (casefold YOK)

```
norm(v) = NFC(v) -> tüm ardışık boşlukları tek boşluğa indir -> baş/son boşluğu at
# Büyük/küçük harf KORUNUR. casefold/lower YOK. Substring YOK. Tam eşleşme.
```
`Yedek_Tipi` bu kuralla normalize edilip allowlist'in (aynı kuralla normalize edilmiş)
anahtarlarıyla **tam eşleşme** aranır.

## 3) Önerilen config/mapping katmanı

```python
# Yalnızca bu iki değer Ready-now sayılır. Değiştirmek = bu tabloyu düzenlemek.
# (Anahtarlar norm() ile karşılaştırılır; büyük/küçük harf ve boşluk farkı tolere edilir,
#  ancak casefold/substring KULLANILMAZ.)
READY_NOW_TIPI = {
    "YETENEK HAZIR": True,
    "DOĞAL + HAZIR": True,
}
# Allowlist DIŞINDAKİ her değer (HAZ.NIYOR, eksik, gelişim profilleri, ALT KADEME,
# BOŞ ve TANIMSIZ/YENİ) -> Ready-now DEĞİL.
# Tanımsız/yeni bir Yedek_Tipi görülürse: Ready-now=False + Veri Kalitesi'nde "eşlenmemiş
# Yedek_Tipi" WARNING (sessizce düşürülmez).
```

## 4) Mevcut veri değerleri — tam eşleme tablosu (470 kayıt, 16 distinct, 0 boş)

| `Yedek_Tipi` (normalize) | Adet | Kategori | Ready-now? |
|---|---:|---|:---:|
| `YETENEK HAZIR` | 2 | Hazır (kaynak: HAZIR) | ✅ **Evet** |
| `DOĞAL + HAZIR` | 57 | Hazır (kaynak: HAZIR) | ✅ **Evet** |
| `DOĞAL + HAZ.NIYOR` | 88 | Hazırlanıyor | ❌ Hayır |
| `YETENEK HAZ.NIYOR` | 4 | Hazırlanıyor | ❌ Hayır |
| `ALT KADEME (Assess. eksik)` | 103 | Değerlendirme eksik | ❌ Hayır |
| `DOĞAL (Assess. eksik)` | 52 | Değerlendirme eksik | ❌ Hayır |
| `DOĞAL (Perf. eksik)` | 35 | Değerlendirme eksik | ❌ Hayır |
| `ALT KADEME (Perf. eksik)` | 1 | Değerlendirme eksik | ❌ Hayır |
| `DOĞAL (SAĞLAM PERF.)` | 43 | Doğal — gelişim/gözlem | ❌ Hayır |
| `DOĞAL (ÇEKİRDEK)` | 41 | Doğal — gelişim/gözlem | ❌ Hayır |
| `DOĞAL (ORTALAMA)` | 34 | Doğal — gelişim/gözlem | ❌ Hayır |
| `DOĞAL (GİZLİ POT.)` | 3 | Doğal — gelişim/gözlem | ❌ Hayır |
| `DOĞAL (DÜŞÜK)` | 3 | Doğal — gelişim/gözlem | ❌ Hayır |
| `DOĞAL (TUTARSIZ)` | 2 | Doğal — gelişim/gözlem | ❌ Hayır |
| `ALT KADEME (GİZLİ POT.)` | 1 | Alt kademe | ❌ Hayır |
| `ALT KADEME (ORTALAMA)` | 1 | Alt kademe | ❌ Hayır |
| **(boş / tanımsız / yeni)** | 0 | Eşlenmemiş | ❌ Hayır + WARNING |

**Ready-now kayıt toplamı:** 2 + 57 = **59 / 470**.

> **Not — "1–2 YIL" / "3+ YIL":** Bu literal değerler mevcut veride **yoktur**; "hazırlanıyor"
> sinyali `HAZ.NIYOR` (Hazırlanıyor) olarak kodlanmıştır. Allowlist tasarımı sayesinde böyle
> bir değer ileride ortaya çıkarsa **otomatik olarak Ready-now DIŞINDA** kalır (allowlist'te
> olmadığı için) ve eşlenmemiş olarak işaretlenir.

## 5) Kuralın sonuçları (doğrulanmış)

| Metrik | Değer |
|---|---|
| Ready-now yedek kaydı | **59 / 470** |
| **Ready-now coverage** (hazır halefi olan pozisyon) | **36 / 177 (%20,3)** |
| **Kritik Ready-now açığı** (ACİL+YÜKSEK, hazır halefsiz) | **43 / 49** |
| Karşılaştırma: mevcut "Yedek Kapsamı" (`Yedek_Var=Evet`) | 161 / 177 (%91,0) |

Mevcut "Yedek Kapsamı" metriği **kaldırılmaz**; Ready-now bunun yanında, hazır kapasiteyi
ayrı gösteren ikinci bir kavram olarak sunulur (125 pozisyonluk fark = tanımlı yedeği olup
hazır halefi olmayanlar).

## 6) Bilinen sınırlar / riskler

- **İsim-anahtar bağımlılığı:** `Pozisyon_Sahibi → İsim` ilişkisi isim üzerinden kurulur.
  Bu veride yinelenen İsim **0** (güvenli), ancak metodoloji genel olarak isim-anahtarı
  zayıflığını taşır; uygulama bunu zaten WARNING ile izliyor (yinelenen `position_key` 1 adet).
- **Taksonomi teyidi gereklidir:** `YETENEK HAZIR` ve `DOĞAL + HAZIR` değerlerinin Ready-now
  kapsamına **girmesi** iş tarafından onaylanmalı. Onay sonrası bu allowlist sabittir ve
  yalnızca config tablosu düzenlenerek değiştirilir.

## 7) Onay sorusu (Faz 1 kodlamasından önce)

> **Ready-now allowlist'i `{ "YETENEK HAZIR", "DOĞAL + HAZIR" }` olarak onaylıyor musunuz?**
> Onaylanırsa, bu mapping config katmanında kodlanır ve Faz 1 paketi (Ready-now coverage +
> kritik açık, 9-box kapsam etiketi, KPI drill-down, mutabakat kontrolleri) uygulanır.
