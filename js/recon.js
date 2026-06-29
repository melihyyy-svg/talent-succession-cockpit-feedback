/* recon.js — Kaynak ↔ Cockpit mutabakat / invariant kontrolleri.
   Tüm kontroller YÜKLENEN veriden ve cockpit'in kendi kurallarından üretilir;
   kaynak "aktif kayıt" sayıları generate_data.py tarafından quality.json'a yazılmıştır.
   9-Box toplamı tüm popülasyona ZORLA eşitlenmez; ekran kapsamı (Talent Pool) esas alınır. */

function _sheetActive(sheetName){
  for(const wb of (DATA.quality.load || [])){
    for(const s of (wb.sheets || [])){
      if(s.name === sheetName) return s.active_row_count;
    }
  }
  return null;
}

function reconciliationChecks(){
  const P = DATA.positions, B = DATA.backups, T = DATA.talent;
  const s = calculateSummary(P);
  const rn = readyNowStats();
  const matrix = nineboxMatrix(T);
  const unmapped = unmappedYedekTipi();
  const unmappedKeys = Object.keys(unmapped);

  const checks = [];
  const add = (name, expected, actual, opts={}) => checks.push({
    name, expected, actual, ok: expected === actual, ...opts });

  // 1-3) Kaynak aktif kayıt ↔ cockpit'e yüklenen kayıt
  add("Pozisyon kaydı (kaynak aktif ↔ yüklenen)", _sheetActive("Pozisyon Verisi"), P.length);
  add("Yedek kaydı (kaynak aktif ↔ yüklenen)", _sheetActive("Yedek Verisi"), B.length);
  add("Talent Pool kaydı (kaynak aktif ↔ yüklenen)", _sheetActive("Yetenek Havuzu"), T.length);

  // 4) Aciliyet kademeleri toplamı = toplam pozisyon
  const urgSum = Object.values(s.urgency_counts).reduce((a,b)=>a+b, 0);
  add("Aciliyet kademeleri toplamı = toplam pozisyon", P.length, urgSum);

  // 5) Yedek var + yok = toplam pozisyon
  add("Yedek var + yok = toplam pozisyon", P.length, s.coverage_present + s.coverage_absent);

  // 6) 9-Box matris toplamı = Talent Pool kapsamı (KAPSAM bazlı; tüm pop. değil)
  add("9-Box matris toplamı = Talent Pool kapsamı (216)", T.length, matrix.total);

  // 7) Ready-now açığı iki bağımsız yoldan aynı olmalı
  add("Ready-now açığı (iki yol tutarlı)", rn.gap, positionsReadyGap().length);

  // 8) Öncelik listesi (ACİL+YÜKSEK) = aciliyet sayımı
  add("ACİL+YÜKSEK öncelik listesi = aciliyet sayımı", s.acil + s.yuksek, acilYuksekTop(P, 0).length);

  // 9) Eşlenmemiş Yedek_Tipi yok (varsa WARNING)
  add("Eşlenmemiş Yedek_Tipi değeri yok", 0, unmappedKeys.length,
      {warn: true, sample: unmappedKeys});

  return {checks, unmapped};
}
