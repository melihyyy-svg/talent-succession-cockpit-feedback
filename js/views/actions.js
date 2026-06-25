/* actions.js — Ekran 5: Aksiyon Takip (yalnızca görüntüleme + filtreleme)
   Bu public demo aksiyon OLUŞTURMAZ/GÜNCELLEMEZ. Kaynak Yetenek Havuzu'nda
   ZATEN tanımlı "Önerilen Aksiyon" kayıtları salt-okunur listelenir; uygulama
   yeni aksiyon/öneri/skor üretmez. */

const _ACTION_FILTERS = ["Ana Firma","Seviye","9-Box","Talent Kararı","Succession","Önerilen Aksiyon"];

function renderActions(el){
  // Kaynakta önerilen aksiyonu olan kayıtlar.
  const rows = DATA.talent.filter(r => !isBlank(r["Önerilen Aksiyon"]));

  const options = {};
  _ACTION_FILTERS.forEach(col => {
    const set = new Set();
    rows.forEach(r => { const v=r[col]; if(!isBlank(v)) set.add(String(v).trim()); });
    options[col] = [...set].sort((a,b)=>a.localeCompare(b,"tr"));
  });
  const labels = {"Ana Firma":"Firma","9-Box":"9-Box"};
  const filterFields = _ACTION_FILTERS.map(col =>
    multiselectField("af_"+col, labels[col]||col, options[col])).join("");

  el.innerHTML = `
    <h2>Aksiyon Takip</h2>
    ${note("warn", `Bu public demo <b>yalnızca görüntüleme ve filtreleme</b> sunar;
      tarayıcı içinde aksiyon oluşturma/güncelleme yoktur. Aşağıdaki liste, kaynak
      Yetenek Havuzu verisinde <b>zaten tanımlı</b> önerilen aksiyonlardır
      (uygulama yeni aksiyon/öneri/skor üretmez). Operasyonel aksiyon takibi masaüstü
      cockpit'te yapılır; geri bildirimlerinizi sayfa altındaki Geri Bildirim alanından iletin.`)}

    <div class="metric-grid">
      ${metricCard("Önerilen Aksiyon Tanımlı Kayıt", rows.length)}
      ${metricCard("Talent Pool — Toplam", DATA.talent.length)}
    </div>

    <h3>Filtreler</h3>
    <div class="controls" id="action_filters">${filterFields}</div>

    <h3>Önerilen Aksiyonlar</h3>
    <div id="action_table"></div>
  `;

  const tableEl = document.getElementById("action_table");
  const cols = [
    {key:"Ad-Soyad",label:"Ad Soyad",fmt:v=>disp(v)},
    {key:"Ana Firma",label:"Firma",fmt:v=>disp(v)},
    {key:"Seviye",label:"Seviye",fmt:v=>disp(v)},
    {key:"Unvan",label:"Ünvan",fmt:v=>disp(v)},
    {key:"9-Box",label:"9-Box",rawFmt:v=>badge(disp(v), nineboxTone(v))},
    {key:"Talent Kararı",label:"Talent Kararı",fmt:v=>disp(v)},
    {key:"Succession",label:"Succession",fmt:v=>disp(v)},
    {key:"Önerilen Aksiyon",label:"Önerilen Aksiyon",cls:"wrap-cell",fmt:v=>disp(v)},
    {key:"Gerekçe",label:"Gerekçe",cls:"wrap-cell",fmt:v=>disp(v)},
  ];

  function update(){
    let filtered = rows;
    _ACTION_FILTERS.forEach(col => {
      const chosen = getMultiselect("af_"+col);
      if(chosen.length) filtered = filtered.filter(r => chosen.includes(String(r[col]).trim()));
    });
    let html = `<div class="metric-grid"><div class="metric">
      <div class="m-label">Filtrelenen Kayıt</div><div class="m-value">${filtered.length}</div></div></div>`;
    html += filtered.length ? buildTable(cols, filtered)
      : emptyState("Seçilen filtrelerle eşleşen kayıt yok.");
    tableEl.innerHTML = html;
  }
  document.querySelectorAll("#action_filters select").forEach(s => s.onchange = update);
  update();
}

/* 9-Box etiketinden ton (meta referansından). */
function nineboxTone(label){
  if(isBlank(label)) return "neutral";
  return (DATA.meta.ninebox.tone[String(label).trim()]) || "neutral";
}
