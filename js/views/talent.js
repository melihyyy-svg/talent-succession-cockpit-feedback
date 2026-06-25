/* talent.js — Ekran 3: Talent Pool & 9-Box Explorer
   Referans: views.render_talent_pool_view
   Tıklanabilir 3x3 9-Box + inline drill-down + filtre-duyarlı explorer. */

const _talentState = { cell: "Tümü" };

function _talentExplorerColumns(){
  return C.TALENT_EXPLORER.map(([key,label]) => {
    if(key in C.TALENT_NUMERIC) return {key,label,fmt:v=>trNumber(v, C.TALENT_NUMERIC[key])};
    if(key==="Gerekçe") return {key,label,cls:"wrap-cell",fmt:v=>disp(v)};
    return {key,label,fmt:v=>disp(v)};
  });
}

function _renderNinebox(mount, matrix){
  const nb = DATA.meta.ninebox;
  const perf = nb.performance_order;     // Düşük, Orta, Yüksek
  let html = `<div class="ninebox"><div class="nb-corner"></div>`;
  perf.forEach(p => html += `<div class="nb-axis-x">${esc(p)}</div>`);
  matrix.rows.forEach(row => {
    html += `<div class="nb-axis-y">Potansiyel<br>${esc(row[0].potential)}</div>`;
    row.forEach(c => {
      const sel = c.label===_talentState.cell ? " sel" : "";
      const color = TONE_HEX[c.tone] || TONE_HEX.neutral;
      html += `<button class="nb-cell${sel}" style="--ct:${color}" data-cell="${esc(c.label)}">
        <div class="nm">${esc(c.label||"—")}</div>
        <div class="ct">${c.count}</div>
        <div class="sub">Pot: ${esc(c.potential)} · Perf: ${esc(c.performance)}</div></button>`;
    });
  });
  html += `</div>`;
  html += `<button class="nb-allbtn${_talentState.cell==="Tümü"?" sel":""}" data-cell="Tümü">Tümünü göster</button>`;
  mount.innerHTML = html;
  mount.querySelectorAll("[data-cell]").forEach(btn => {
    btn.onclick = () => { _talentState.cell = btn.getAttribute("data-cell"); _talentUpdate(); };
  });
}

let _talentUpdate = () => {};

function renderTalent(el){
  const all = DATA.talent;
  const summary = talentSummary(all);
  const options = talentFilterOptions(all);

  const filterFields = C.TALENT_FILTER_COLUMNS.map(col =>
    multiselectField("tf_"+col, C.TALENT_FILTER_LABELS[col]||col, options[col]||[])
  ).join("");

  el.innerHTML = `
    <h2>Talent Pool &amp; 9-Box Explorer</h2>
    <div class="metric-grid">
      ${metricCard("Talent Pool — Toplam Kişi", summary.total)}
      ${metricCard("Assessment Eksik / Belirtilmemiş", summary.assessment_blank)}
    </div>
    <div class="distros">
      <div class="panel"><h3>9-Box Dağılımı</h3>${renderBars(summary.ninebox)}</div>
      <div class="panel"><h3>Talent Kararı Dağılımı</h3>${renderBars(summary.talent_karari)}</div>
      <div class="panel"><h3>Succession Dağılımı</h3>${renderBars(summary.succession)}</div>
    </div>

    <h3>Filtreler</h3>
    <div class="controls" id="talent_filters">${filterFields}</div>

    <h3>9-Box Görünümü</h3>
    <div class="caption">Hücreye tıklayarak kategoriye odaklanın. Yatay: Performans
      (Düşük→Yüksek) · Dikey: Potansiyel (Yüksek→Düşük); sayı = kişi.</div>
    <div id="talent_matrix"></div>
    <div id="talent_drill"></div>

    <h3>Talent Pool Explorer</h3>
    <div id="talent_table"></div>
  `;

  const matrixEl = document.getElementById("talent_matrix");
  const drillEl = document.getElementById("talent_drill");
  const tableEl = document.getElementById("talent_table");
  const cols = _talentExplorerColumns();

  _talentUpdate = function(){
    const selections = {};
    C.TALENT_FILTER_COLUMNS.forEach(col => selections[col] = getMultiselect("tf_"+col));
    const base = applyTalentFilters(all, selections);
    const matrix = nineboxMatrix(base);
    _renderNinebox(matrixEl, matrix);

    const cell = _talentState.cell;
    // Drill-down
    if(cell === "Tümü"){
      drillEl.innerHTML = emptyState("Tüm kategoriler gösteriliyor. Bir hücreye tıklayarak o 9-Box kategorisine odaklanın.");
    } else {
      const meaning = DATA.meta.ninebox.meaning[cell] || "";
      const count = (matrix.rows.flat().find(c=>c.label===cell)||{}).count || 0;
      const people = base.filter(r => String(r["9-Box"]).trim() === cell);
      let body;
      if(!people.length){
        body = emptyState("Bu kategoride mevcut filtrelerle kişi yok — filtreleri gözden geçirin.");
      } else {
        const dcols = [
          {key:"Ad-Soyad",label:"Ad Soyad",fmt:v=>disp(v)},
          {key:"Ana Firma",label:"Firma",fmt:v=>disp(v)},
          {key:"Unvan",label:"Ünvan",fmt:v=>disp(v)},
          {key:"Seviye",label:"Seviye",fmt:v=>disp(v)},
          {key:"9-Box",label:"9-Box",fmt:v=>disp(v)},
        ];
        body = buildTable(dcols, people.slice(0,15));
        if(people.length>15) body += `<div class="caption">İlk 15 gösteriliyor (toplam ${people.length} kişi).</div>`;
      }
      drillEl.innerHTML = `<div class="eks-ddh">
        <div class="eks-ddh-title">${esc(cell)} · ${count} kişi</div>
        <div class="eks-ddh-mean">${esc(meaning)}</div></div>${body}`;
    }

    // Explorer tablosu
    let filtered = base;
    if(cell !== "Tümü") filtered = base.filter(r => String(r["9-Box"]).trim() === cell);
    let tbl = `<div class="metric-grid"><div class="metric"><div class="m-label">Filtrelenen Kişi</div>
      <div class="m-value">${filtered.length}</div></div></div>`;
    if(!filtered.length){
      tbl += emptyState("Seçilen filtre / 9-Box kategorisi ile eşleşen kişi yok.");
    } else {
      tbl += buildTable(cols, filtered);
      tbl += `<div class="caption">Kaynak: Yetenek Havuzu (salt-okunur). 9-Box değerleri
        yeniden hesaplanmaz; boş alanlar 'Belirtilmedi'.</div>`;
    }
    tableEl.innerHTML = tbl;
  };

  document.querySelectorAll("#talent_filters select").forEach(sel => sel.onchange = _talentUpdate);
  _talentUpdate();
}
