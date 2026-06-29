/* detail.js — Ekran 2: Pozisyon & Yedek Detayı
   Referans: views.render_position_detail_view
   Firma -> Ünvan -> Mevcut Pozisyon Sahibi cascade; salt-okunur. */

function _identityHeader(row){
  const isim = disp(row["İsim"]);
  return `<div class="eks-ident">
    <div class="eks-ident-title">${esc(disp(row["Pozisyon"]))}</div>
    <div class="eks-ident-meta">Firma: <b>${esc(disp(row["Firma"]))}</b> ·
      Şehir: ${esc(disp(row["Şehir"]))} · Mevcut Pozisyon Sahibi: <b>${esc(isim)}</b></div>
    <div class="eks-ident-row">${badge(disp(row["Aciliyet_Final"]))}</div>
  </div>`;
}

function _renderDetailBody(row){
  if(!row) return emptyState("Gösterilecek pozisyon yok.");
  const isim = row["İsim"];
  const has = hasBackup(row);

  // Risk bileşenleri
  const rc = riskComponentRows(row);
  const rcTable = buildTable([
    {key:"Bileşen",label:"Bileşen"},
    {key:"Puan",label:"Puan",fmt:v=>disp(v)},
    {key:"Açıklama",label:"Açıklama",cls:"wrap-cell",fmt:v=>cleanFactorText(v)},
  ], rc);

  // Yedek adaylar
  const backups = lookupBackups(isim);
  let backupBlock;
  if(!backups.length){
    backupBlock = note("warn", `<b>${esc(disp(isim))}</b> için tanımlı yedek aday yok.
      Talent Pool &amp; 9-Box Explorer veya Aday Keşfi sekmelerinden değerlendirme yapabilirsiniz.`);
  } else {
    const cols = C.BACKUP_DISPLAY.map(([key,label]) => {
      if(key==="Rol_Kıdemi") return {key,label,fmt:v=>formatYears(v)};
      return {key,label,fmt:v=>disp(v)};
    });
    backupBlock = buildTable(cols, backups) +
      `<div class="caption">İlişki: Yedek Verisi.Pozisyon_Sahibi → Pozisyon Verisi.İsim.
       Yetenek Havuzu ile otomatik eşleştirme yapılmaz; boş alanlar 'Belirtilmedi'.</div>`;
  }

  const ambiguity = nameOccurrenceCount(isim) > 1
    ? note("info", `Bu isim birden fazla pozisyonda görünüyor; yedek eşleşmesi isim
        üzerinden yapıldığından bazı adaylar başka bir pozisyona ait olabilir
        (ayrıntı: Veri Kalitesi).`) : "";

  return `
    ${_identityHeader(row)}
    <h3>Pozisyon Özeti</h3>
    <div class="metric-grid">
      ${metricCard("Toplam Risk", disp(row["Toplam_Risk"]))}
      ${metricCard("Aciliyet", disp(row["Aciliyet_Final"]))}
      ${metricCard("Yedek", has?"Var":"Yok")}
    </div>
    <div class="panel">
      <b>Mevcut Pozisyon Sahibi:</b> ${esc(disp(row["İsim"]))}<br>
      <b>Pozisyon:</b> ${esc(disp(row["Pozisyon"]))} · <b>Firma:</b> ${esc(disp(row["Firma"]))} ·
      <b>Seviye:</b> ${esc(disp(row["Seviye"]))} · <b>Şehir:</b> ${esc(disp(row["Şehir"]))}<br>
      <b>Kritik Bilgi:</b> ${esc(disp(row["Kritik_Bilgi"]))} ·
      <b>Temel Risk:</b> ${esc(disp(row["Temel_Risk"]))} ·
      <b>Bilgi Etkisi:</b> ${esc(disp(row["Bilgi_Etkisi"]))}
    </div>

    <h3>Risk Bileşenleri</h3>
    ${rcTable}
    <div class="caption">Puanlar kaynaktan okunur; risk formülleri yeniden hesaplanmaz.</div>

    <h3>Yedek Adaylar</h3>
    ${ambiguity}
    ${backupBlock}
  `;
}

function renderDetail(el){
  el.innerHTML = `
    <h2>Pozisyon &amp; Yedek Detayı</h2>
    <div class="caption">🔎 Pozisyon seç: Firma → Ünvan → Mevcut Pozisyon Sahibi</div>
    <div id="detail_cascade"></div>
    <div id="detail_body"></div>
  `;
  const body = document.getElementById("detail_body");
  // KPI drill-down "Detayda aç" ile gelen önyükleme indeksi (varsa).
  let initial = (typeof window.__pendingDetail === "number") ? window.__pendingDetail : null;
  window.__pendingDetail = null;
  renderCascade(document.getElementById("detail_cascade"), DATA.positions, "detail",
    row => { body.innerHTML = _renderDetailBody(row); }, initial);
}
