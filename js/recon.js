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

/* === Faz 1.1: Ready-now İlişki Anahtarı (Pozisyon_Sahibi → İsim) Bütünlüğü ===
   Salt-okunur denetim. Hiçbir kayıt otomatik düzeltilmez/birleştirilmez/eşleştirilmez;
   fuzzy matching yoktur. Uyarılar yalnızca görünür kılınır; hesaplama mantığı değişmez.
   Tüm ihlaller WARNING düzeyindedir (yapısal ERROR değil; MVP'de yinelenen İsim de
   WARNING'tir). Temiz olduğunda kontrol "Tutarlı" gösterilir. */
function relationshipIntegrityChecks(){
  const P = DATA.positions, B = DATA.backups;
  const nvOwner = b => normalizeValue(b["Pozisyon_Sahibi"]);
  const nvIsim  = p => normalizeValue(p["İsim"]);

  // Normalize isim -> pozisyon kayıtları (çakışma/belirsizlik tespiti için)
  const isimToPos = {};
  P.forEach(p => { const k = nvIsim(p); if(k){ (isimToPos[k] = isimToPos[k] || []).push(p); } });
  const posIsimSet = new Set(Object.keys(isimToPos));

  // 1) Boş/geçersiz normalize Pozisyon_Sahibi (yedek tarafı)
  const blankOwner = B.filter(b => !nvOwner(b));
  // 2) Aynı normalize isimle >1 pozisyon sahibi (isim-anahtarı çakışması)
  const dupNames = Object.entries(isimToPos).filter(([,arr]) => arr.length > 1);
  // 3) Pozisyon kaydı olmadan kalan yedek (orphan: sahip hiçbir İsme eşleşmiyor)
  const orphan = B.filter(b => { const k = nvOwner(b); return k && !posIsimSet.has(k); });
  // 4) Yedek_Var=Evet ama eşleşen yedek ilişkisi YOK
  const evetNoLink = P.filter(p => hasBackup(p) && lookupBackups(p["İsim"]).length === 0);
  // 5) Yedek_Var=Hayır ama eşleşen yedek ilişkisi VAR
  const hayirHasLink = P.filter(p => !hasBackup(p) && lookupBackups(p["İsim"]).length > 0);
  // 6) Ready-now hesabına giren (HAZIR) ama pozisyon bağlantısı belirsiz (çok-eşleşen) yedek
  const ambiguousReady = B.filter(b =>
    isReadyBackup(b) && (isimToPos[nvOwner(b)] || []).length > 1);
  // 7) Yeni/eşlenmemiş Yedek_Tipi (Ready-now sınıflamasına giren ham değer)
  const unmappedKeys = Object.keys(unmappedYedekTipi());

  const checks = [
    {name:"Boş/geçersiz normalize Pozisyon_Sahibi (yedek)", expected:0,
     actual:blankOwner.length,
     impact:"Bu yedekler hiçbir pozisyona bağlanamaz; Ready-now hesabı dışında kalır."},
    {name:"Aynı normalize isimle >1 pozisyon sahibi (isim-anahtarı çakışması)", expected:0,
     actual:dupNames.length, sample:dupNames.map(([k])=>k).slice(0,8),
     impact:"İsim-anahtarı belirsizleşir; Ready-now yanlış pozisyona atfedilebilir (en yüksek risk)."},
    {name:"Pozisyon kaydı olmadan kalan yedek (orphan)", expected:0, actual:orphan.length,
     sample:[...new Set(orphan.map(b=>b["Pozisyon_Sahibi"]))].slice(0,8),
     impact:"Bu yedekler hiçbir pozisyonun Ready-now hesabına girmez."},
    {name:"Yedek_Var=Evet olduğu hâlde eşleşen yedek ilişkisi yok", expected:0,
     actual:evetNoLink.length, sample:evetNoLink.map(p=>p["İsim"]).slice(0,8),
     impact:"Kapsam bayrağı ile ilişki tutarsız; Ready-now bu pozisyonu eksik değerlendirebilir."},
    {name:"Yedek_Var=Hayır olduğu hâlde eşleşen yedek ilişkisi var", expected:0,
     actual:hayirHasLink.length, sample:hayirHasLink.map(p=>p["İsim"]).slice(0,8),
     impact:"Kapsam bayrağı ile ilişki tutarsız; kayıt gözden geçirilmeli."},
    {name:"Ready-now'a giren ama pozisyon bağlantısı belirsiz (HAZIR) yedek", expected:0,
     actual:ambiguousReady.length,
     impact:"Belirsiz bağlantı doğrudan Ready-now sayımını bozabilir; öncelikli incelenmeli."},
    {name:"Yeni/eşlenmemiş Yedek_Tipi değeri", expected:0, actual:unmappedKeys.length,
     sample:unmappedKeys.slice(0,8),
     impact:"Eşlenmemiş tip Ready-now DIŞI sayılır; allowlist gözden geçirilmeli."},
  ].map(c => ({...c, ok: c.actual === c.expected}));

  return {checks};
}

/* === Halefiyet Sağlığı (Firma × Seviye) Agregasyon Mutabakatı ===
   Heatmap, mevcut metriklerin grup-bazlı toplamıdır. Bu kontroller, gruplama
   partition'ının global toplamları KORUDUĞUNU doğrular (yeni hesap üretmez). */
function heatmapReconChecks(){
  const P = DATA.positions;
  const s = calculateSummary(P);
  const rn = readyNowStats();
  const isHigh = p => ["ACİL","YÜKSEK"].includes(String(p["Aciliyet_Final"]).trim());

  // Firma × Seviye hücrelerine dağıt; her pozisyon tam 1 hücreye düşmeli.
  const cells = {};
  let assigned = 0;
  P.forEach(p => {
    const f = String(p["Firma"]).trim(), sv = String(p["Seviye"]).trim();
    const k = f + "||" + sv;
    (cells[k] = cells[k] || []).push(p);
    assigned++;
  });
  const cellArrays = Object.values(cells);
  const sum = fn => cellArrays.reduce((a,g)=>a + g.filter(fn).length, 0);

  const cellTotal = cellArrays.reduce((a,g)=>a+g.length, 0);
  const gapSum = sum(p => isHigh(p) && !positionHasReady(p));
  const readySum = sum(p => positionHasReady(p));
  const nbSum = sum(p => !hasBackup(p));
  const highSum = sum(p => isHigh(p));

  const checks = [
    {name:"Hücre toplam pozisyon = toplam pozisyon", expected:P.length, actual:cellTotal},
    {name:"Her pozisyon tam 1 hücreye atandı", expected:P.length, actual:assigned},
    {name:"Kritik Ready-now açığı toplamı = global", expected:rn.gap, actual:gapSum},
    {name:"Ready-now olan pozisyon toplamı = global", expected:rn.coverage, actual:readySum},
    {name:"Tanımlı yedeği olmayan toplam = global", expected:s.coverage_absent, actual:nbSum},
    {name:"Yüksek risk (ACİL+YÜKSEK) toplamı = global", expected:s.high_risk_count, actual:highSum},
  ].map(c => ({...c, ok: c.actual === c.expected}));

  return {checks, cellCount: cellArrays.length};
}
