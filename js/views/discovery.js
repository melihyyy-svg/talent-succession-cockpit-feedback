/* discovery.js — Ekran 4: Talent Pool'dan Aday Keşfi
   Referans: views.render_candidate_discovery_view
   Pozisyon cascade + şeffaf filtre + karşılaştırma (öneri/karar/skor YOK). */

function _discoveryColumns(){
  const base = C.DISCOVERY.map(([key,label]) => {
    if(key in C.TALENT_NUMERIC) return {key,label,fmt:v=>trNumber(v, C.TALENT_NUMERIC[key])};
    // Gerekçe tek uzun-metin sütunu (wrap-cell -> satır yüksekliğini şişiren gerçek neden).
    // Explorer'daki mevcut kompakt önizleme deseni yeniden kullanılır (_rationaleCell,
    // js/views/talent.js — script sırası: talent.js önce yüklenir, global fonksiyon).
    if(key==="Gerekçe") return {key,label,cls:"rationale-cell",rawFmt:v=>_rationaleCell(v)};
    return {key,label,fmt:v=>disp(v)};
  });
  base.push({key:"Firma Eşleşmesi",label:"Firma Eşleşmesi",
    rawFmt:v=>badge(v, v==="Aynı"?"success":"neutral")});
  base.push({key:"Şehir Eşleşmesi",label:"Şehir Eşleşmesi",
    rawFmt:v=>badge(v, v==="Aynı"?"success":"neutral")});
  return base;
}

function _renderDiscoveryFor(row, mount){
  const isim = row["İsim"];
  const posFirma = row["Firma"], posSehir = row["Şehir"];
  const backups = lookupBackups(isim);
  const has = hasBackup(row);
  const options = talentFilterOptions(DATA.talent);

  const filterFields = C.TALENT_FILTER_COLUMNS.map(col =>
    multiselectField("df_"+col, C.TALENT_FILTER_LABELS[col]||col, options[col]||[])
  ).join("");

  let backupBlock;
  if(!backups.length){
    backupBlock = `<div class="caption">Bu pozisyon için tanımlı yedek bulunmuyor.</div>`;
  } else {
    const bcols = C.BACKUP_DISPLAY.map(([key,label]) => {
      if(key==="Rol_Kıdemi") return {key,label,fmt:v=>formatYears(v)};
      return {key,label,fmt:v=>disp(v)};
    });
    backupBlock = buildTable(bcols, backups) +
      `<div class="caption">Not: Bu liste Talent Pool ile otomatik eşleştirilmez
       (doğrulanmış ortak anahtar yok).</div>`;
  }

  mount.innerHTML = `
    <h3>Pozisyon Bağlamı</h3>
    <div class="metric-grid">
      ${metricCard("Toplam Risk", disp(row["Toplam_Risk"]))}
      ${metricCard("Aciliyet", disp(row["Aciliyet_Final"]))}
      ${metricCard("Yedek", has?"Var":"Yok")}
      ${metricCard("Mevcut Tanımlı Yedek", backups.length)}
    </div>
    <div class="panel">
      <b>Pozisyon:</b> ${esc(disp(row["Pozisyon"]))} · <b>Firma:</b> ${esc(disp(posFirma))} ·
      <b>Seviye:</b> ${esc(disp(row["Seviye"]))} · <b>Şehir:</b> ${esc(disp(posSehir))}
    </div>
    ${note("info", `Bu ekran mevcut Talent Pool verisini filtreleyerek aday keşfi sağlar.
      Fonksiyonel uyum, rol uygunluğu ve yönetici görüşü gibi kriterler otomatik
      hesaplanmaz. Ekran nihai atama veya yedeklik kararı üretmez.`)}

    <h3>Mevcut Tanımlı Yedekler</h3>
    ${backupBlock}

    <h3>Aday Keşif Filtreleri</h3>
    <div class="controls" id="discovery_filters">${filterFields}
      <div class="field"><label for="df_assessmin">Assessment minimum (0 = filtre yok)</label>
        <input type="number" id="df_assessmin" min="0" step="0.5" value="0"></div>
    </div>
    <div class="caption">Assessment ölçeği tipe göre değişir (DYT ≈ 0–10, AC ≈ 0–5);
      eşik tamamen kullanıcı tercihidir.</div>

    <h3>Aday Keşif Tablosu</h3>
    <div id="discovery_table"></div>
  `;

  const tableEl = document.getElementById("discovery_table");
  const cols = _discoveryColumns();
  function update(){
    const selections = {};
    C.TALENT_FILTER_COLUMNS.forEach(col => selections[col] = getMultiselect("df_"+col));
    let filtered = applyTalentFilters(DATA.talent, selections);
    const minV = Number(document.getElementById("df_assessmin").value) || 0;
    filtered = applyAssessmentMin(filtered, minV>0 ? minV : null);
    const comp = addCandidateComparison(filtered, posFirma, posSehir);
    let html = `<div class="metric-grid"><div class="metric">
      <div class="m-label">Eşleşen Talent Pool Kaydı</div><div class="m-value">${comp.length}</div></div></div>`;
    if(!comp.length){
      html += emptyState("Seçilen filtrelerle eşleşen Talent Pool kaydı bulunamadı.");
    } else {
      html += buildTable(cols, comp);
      html += `<div class="caption">Kaynak: Yetenek Havuzu (salt-okunur). Karşılaştırma
        sütunları yalnızca bilgi amaçlıdır; öneri/karar/skor üretmez.</div>`;
    }
    tableEl.innerHTML = html;
  }
  document.querySelectorAll("#discovery_filters select, #discovery_filters input")
    .forEach(elm => elm.onchange = update);
  update();
}

function renderDiscovery(el){
  el.innerHTML = `
    <h2>Talent Pool'dan Aday Keşfi</h2>
    <div class="caption">🔎 Pozisyon seç: Firma → Ünvan → Mevcut Pozisyon Sahibi</div>
    <div id="discovery_cascade"></div>
    <div id="discovery_body"></div>
  `;
  const body = document.getElementById("discovery_body");
  renderCascade(document.getElementById("discovery_cascade"), DATA.positions, "discovery",
    row => { if(row) _renderDiscoveryFor(row, body); else body.innerHTML = emptyState("Pozisyon yok."); });
}
