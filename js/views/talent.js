/* talent.js — Ekran: Talent Pool & 9-Box (iki mod)
   Mod 1: Explorer (mevcut davranış — KORUNDU)
   Mod 2: Talent Review / Kalibrasyon Görünümü (read-only toplantı hazırlık alanı)
   Yeni veri/skor/AI/join YOK; mevcut Talent Pool / 9-Box / Assessment / Performans /
   Potansiyel alanları toplantı hazırlığı için görünür kılınır. */

let _talentMode = "explorer";

/* ===================== ORTAK 9-BOX (Explorer) ===================== */
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
  const perf = nb.performance_order;
  let html = `<div class="ninebox"><div class="nb-corner"></div>`;
  perf.forEach(p => html += `<div class="nb-axis-x">${esc(p)}</div>`);
  matrix.rows.forEach(row => {
    html += `<div class="nb-axis-y">Potansiyel<br>${esc(row[0].potential)}</div>`;
    row.forEach(c => {
      const sel = c.label===_talentState.cell ? " sel" : "";
      const empty = c.count===0 ? " nb-empty" : "";
      const color = TONE_HEX[c.tone] || TONE_HEX.neutral;
      const sub = c.count===0 ? "Bu kapsamda kayıt yok"
                              : `Pot: ${esc(c.potential)} · Perf: ${esc(c.performance)}`;
      html += `<button class="nb-cell${sel}${empty}" style="--ct:${color}" data-cell="${esc(c.label)}">
        <div class="nm">${esc(c.label||"—")}</div>
        <div class="ct">${c.count}</div>
        <div class="sub">${sub}</div></button>`;
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

/* ===================== MOD: EXPLORER (mevcut) ===================== */
function _renderExplorerMode(host){
  const all = DATA.talent;
  const summary = talentSummary(all);
  const options = talentFilterOptions(all);
  const filterFields = C.TALENT_FILTER_COLUMNS.map(col =>
    multiselectField("tf_"+col, C.TALENT_FILTER_LABELS[col]||col, options[col]||[])).join("");

  host.innerHTML = `
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
    ${note("info", `<b>Kapsam: Talent Pool — ${summary.total} kişi.</b> Bu 9-Box görünümü
      <b>tüm çalışan popülasyonunu değil</b>, yalnızca Talent Pool kapsamındaki kişileri
      gösterir. Boş hücre (0) = <b>bu kapsamda kayıt yok</b> (veri hatası değildir).`)}
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

/* ===================== MOD: KALİBRASYON ===================== */
/* Görünürlük kategorileri (örtüşebilir; mevcut alanlardan kural-bazlı, yeni skor yok). */
const KALIB_GROUPS = [
  {key:"yildiz", label:"Yıldız", reason:"Yıldız grubunda görünür",
   desc:"mevcut 9-Box değerlendirmesinde yüksek performans ve yüksek potansiyel görünümü",
   match:t => String(t["9-Box"]).trim()==="1-YILDIZ (Star)"},
  {key:"yukpot", label:"Yüksek Potansiyel", reason:"Yüksek Potansiyel grubunda görünür",
   desc:"mevcut değerlendirmede potansiyeli yüksek görünen kişiler",
   match:t => String(t["Potansiyel"]).trim()==="Yüksek"},
  {key:"yukperf", label:"Yüksek Performans", reason:"Yüksek Performans grubunda görünür",
   desc:"mevcut değerlendirmede performansı yüksek görünen kişiler",
   match:t => String(t["Performans"]).trim()==="Yüksek"},
  {key:"assmiss", label:"Assessment bilgisi eksik", reason:"Assessment bilgisi eksik",
   desc:"değerlendirme görünümünde eksik veri bulunan kişiler",
   match:t => isBlank(t["Assessment"])},
  {key:"boxmiss", label:"9-Box bilgisi eksik", reason:"9-Box bilgisi eksik",
   desc:"toplantı öncesinde veri tamamlanması değerlendirilebilecek kişiler",
   match:t => isBlank(t["9-Box"]) || isBlank(t["Potansiyel"]) || isBlank(t["Performans"])},
];

const _kalibState = { firma:[], seviye:[], sel:null };  // sel: {type:'group',key} | {type:'cell',label} | null
let _kalibUpdate = () => {};

function _kalibScope(){
  return DATA.talent.filter(t => {
    if(_kalibState.firma.length && !_kalibState.firma.includes(String(t["Ana Firma"]).trim())) return false;
    if(_kalibState.seviye.length && !_kalibState.seviye.includes(String(t["Seviye"]).trim())) return false;
    return true;
  });
}

function _boxOrder(label){ const m=String(label).match(/^(\d+)/); return m?parseInt(m[1],10):99; }

/* İnceleme listesi sıralaması: Assessment eksik → 9-Box eksik → 9-Box/perf/pot → ad alfabetik. */
function _reviewSort(arr){
  return [...arr].sort((a,b)=>{
    const aA=isBlank(a["Assessment"])?0:1, bA=isBlank(b["Assessment"])?0:1;
    if(aA!==bA) return aA-bA;
    const aB=isBlank(a["9-Box"])?0:1, bB=isBlank(b["9-Box"])?0:1;
    if(aB!==bB) return aB-bB;
    const ra=_boxOrder(a["9-Box"]), rb=_boxOrder(b["9-Box"]);
    if(ra!==rb) return ra-rb;
    return String(a["Ad-Soyad"]).localeCompare(String(b["Ad-Soyad"]),"tr");
  });
}

function _renderKalibNinebox(mount, matrix){
  const nb = DATA.meta.ninebox;
  const activeCell = (_kalibState.sel && _kalibState.sel.type==="cell") ? _kalibState.sel.label : null;
  let html = `<div class="ninebox"><div class="nb-corner"></div>`;
  nb.performance_order.forEach(p => html += `<div class="nb-axis-x">${esc(p)}</div>`);
  matrix.rows.forEach(row => {
    html += `<div class="nb-axis-y">Potansiyel<br>${esc(row[0].potential)}</div>`;
    row.forEach(c => {
      const sel = c.label===activeCell ? " sel" : "";
      const empty = c.count===0 ? " nb-empty" : "";
      const color = TONE_HEX[c.tone] || TONE_HEX.neutral;
      const sub = c.count===0 ? "Bu kapsamda kayıt yok"
                              : `Pot: ${esc(c.potential)} · Perf: ${esc(c.performance)}`;
      html += `<button class="nb-cell${sel}${empty}" style="--ct:${color}" data-kcell="${esc(c.label)}">
        <div class="nm">${esc(c.label||"—")}</div><div class="ct">${c.count}</div>
        <div class="sub">${sub}</div></button>`;
    });
  });
  html += `</div>`;
  mount.innerHTML = html;
  mount.querySelectorAll("[data-kcell]").forEach(btn => btn.onclick = () => {
    _kalibState.sel = {type:"cell", label: btn.getAttribute("data-kcell")}; _kalibUpdate();
  });
}

function _renderKalibrasyonMode(host){
  const firmaOpts = [...new Set(DATA.talent.map(t=>String(t["Ana Firma"]).trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,"tr"));
  const seviyeOpts = [...new Set(DATA.talent.map(t=>String(t["Seviye"]).trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,"tr"));

  host.innerHTML = `
    <header class="exec-head">
      <div class="exec-head-main">
        <div class="exec-eyebrow">TALENT REVIEW</div>
        <h2 class="exec-title">Talent Review / Kalibrasyon Görünümü</h2>
        <p class="exec-lede">Seçili kapsamda mevcut değerlendirme verisiyle görünür olan
          yetenek gruplarını toplantı hazırlığı amacıyla inceleyin.</p>
      </div>
      <div class="exec-meta" id="kalib_meta"></div>
    </header>
    <nav class="breadcrumb" id="kalib_breadcrumb" aria-label="Bağlam"></nav>

    <div class="controls" id="kalib_filters">
      ${multiselectField("kf_firma","Firma", firmaOpts)}
      ${multiselectField("kf_seviye","Seviye", seviyeOpts)}
    </div>

    <div class="section-head"><h3>Kalibrasyonda incelenebilecek gruplar</h3></div>
    <div class="kalib-groups" id="kalib_groups"></div>
    <div class="caption">Gruplar aynı kişileri içerebilir. Bu görünüm karar vermez; mevcut
      değerlendirme verisini toplantı hazırlığı için görünür hale getirir.</div>

    <div class="section-head" style="margin-top:22px"><h3>9-Box toplantı görünümü</h3></div>
    ${note("info", `<b>Kapsam: Talent Pool.</b> Bu 9-Box yalnızca Talent Pool kapsamındaki
      kişileri gösterir; boş hücre = <b>bu kapsamda kayıt yok</b>.`)}
    <div id="kalib_matrix"></div>

    <div class="section-head" style="margin-top:22px"><h3>İncelenecek Kişiler</h3>
      <button class="btn secondary small" id="kalib_clear">Seçimi temizle</button></div>
    <div id="kalib_active"></div>
    <div id="kalib_review"></div>

    ${note("info", `Bu görünüm mevcut performans, potansiyel, assessment ve 9-Box verisinin
      toplantı hazırlığı amacıyla gruplanmış özetidir. Nihai değerlendirme yönetici ve İK
      kalibrasyonunda yapılır.`)}
    ${note("info", `Talent Pool ile Yedek Verisi arasında doğrulanmış ortak kişi anahtarı
      bulunmadığı için kişi bazında halefiyet eşleştirmesi bu görünümde yapılmaz.`)}
  `;

  const metaEl = document.getElementById("kalib_meta");
  const breadcrumbEl = document.getElementById("kalib_breadcrumb");
  const groupsEl = document.getElementById("kalib_groups");
  const matrixEl = document.getElementById("kalib_matrix");
  const activeEl = document.getElementById("kalib_active");
  const reviewEl = document.getElementById("kalib_review");

  _kalibUpdate = function(){
    _kalibState.firma = getMultiselect("kf_firma");
    _kalibState.seviye = getMultiselect("kf_seviye");
    const scope = _kalibScope();

    // Meta çipleri
    const fLabel = _kalibState.firma.length ? _kalibState.firma.join(", ") : "Tümü";
    const sLabel = _kalibState.seviye.length ? _kalibState.seviye.join(", ") : "Tümü";
    metaEl.innerHTML = `
      <span class="meta-chip">Firma: ${esc(fLabel)}</span>
      <span class="meta-chip">Seviye: ${esc(sLabel)}</span>
      <span class="meta-chip">${scope.length} kişi</span>
      <span class="meta-chip">Veri: ${esc(DATA.meta.generated_at)}</span>
      <span class="meta-chip dq-ok">Kalibrasyon Görünümü</span>`;

    // Standart breadcrumb (gerçek seçili Firma/Seviye + aktif grup/hücre bağlamı)
    let selText = "(seçim yok)";
    if(_kalibState.sel){
      if(_kalibState.sel.type==="group"){
        const g = KALIB_GROUPS.find(x => x.key===_kalibState.sel.key);
        selText = g ? g.label : "";
      } else { selText = "9-Box: " + _kalibState.sel.label; }
    }
    breadcrumbEl.innerHTML = `Talent Review <i>→</i> ${esc(fLabel)} <i>→</i> ${esc(sLabel)}
      <i>→</i> ${esc(selText)}`;

    // Grup kartları (örtüşebilir; toplam HEADCOUNT olarak sunulmaz; tüm kart tıklanabilir)
    groupsEl.innerHTML = KALIB_GROUPS.map(gr => {
      const n = scope.filter(gr.match).length;
      const active = _kalibState.sel && _kalibState.sel.type==="group" && _kalibState.sel.key===gr.key;
      const empty = n === 0;
      const cue = empty ? `<div class="kc-go kc-empty">Bu kapsamda kayıt yok</div>`
                        : `<div class="kc-go">Listeyi incele →</div>`;
      return `<button class="kalib-card${active?" active":""}${empty?" empty":""}" data-group="${gr.key}"
          aria-pressed="${active?"true":"false"}">
        <div class="kc-count">${n}</div>
        <div class="kc-label">${esc(gr.label)}</div>
        <div class="kc-desc">${esc(gr.desc)}</div>
        ${cue}</button>`;
    }).join("");
    groupsEl.querySelectorAll("[data-group]").forEach(btn => btn.onclick = () => {
      _kalibState.sel = {type:"group", key: btn.getAttribute("data-group")}; _kalibUpdate();
    });

    // 9-Box toplantı görünümü
    _renderKalibNinebox(matrixEl, nineboxMatrix(scope));

    // Aktif seçim + inceleme listesi
    const sel = _kalibState.sel;
    if(!sel){
      activeEl.innerHTML = "";
      reviewEl.innerHTML = emptyState("Bir grup kartına veya 9-Box hücresine tıklayarak incelenecek kişileri açın.");
      return;
    }

    let people, reasonFor, selLabel;
    if(sel.type==="group"){
      const gr = KALIB_GROUPS.find(g=>g.key===sel.key);
      people = scope.filter(gr.match);
      reasonFor = () => gr.reason;
      selLabel = gr.label;
    } else {
      people = scope.filter(t => String(t["9-Box"]).trim()===sel.label);
      reasonFor = () => "Seçili 9-Box hücresinde yer alıyor";
      selLabel = "9-Box: " + sel.label;
    }
    people = _reviewSort(people);

    activeEl.innerHTML = `<div class="kalib-active">Aktif seçim:
      <b>${esc(selLabel)}</b> · ${people.length} kişi</div>`;

    if(!people.length){
      reviewEl.innerHTML = emptyState("Bu kapsamda kayıt yok.");
      return;
    }
    reviewEl.innerHTML = `<div class="revlist">` + people.map(p => {
      const box = disp(p["9-Box"]);
      return `<div class="rev-card">
        <div class="rev-head"><b>${esc(disp(p["Ad-Soyad"]))}</b>
          <span class="rev-reason">${badge(reasonFor(p), "info")}</span></div>
        <div class="rev-sub">${esc(disp(p["Unvan"]))} · ${esc(disp(p["Ana Firma"]))} ·
          ${esc(disp(p["Seviye"]))}</div>
        <div class="rev-tags">
          <span class="rev-tag">9-Box: ${badge(box, nineboxTone(p["9-Box"]))}</span>
          <span class="rev-tag">Assessment: <b>${esc(trNumber(p["Assessment"],2))}</b></span>
          <span class="rev-tag">Performans: <b>${esc(disp(p["Performans"]))}</b></span>
          <span class="rev-tag">Potansiyel: <b>${esc(disp(p["Potansiyel"]))}</b></span>
        </div></div>`;
    }).join("") + `</div>`;
  };

  document.querySelectorAll("#kalib_filters select").forEach(s => s.onchange = _kalibUpdate);
  document.getElementById("kalib_clear").onclick = () => { _kalibState.sel = null; _kalibUpdate(); };
  _kalibUpdate();
}

/* ===================== GİRİŞ: mod seçici ===================== */
function renderTalent(el){
  el.innerHTML = `
    <h2>Talent Pool &amp; 9-Box Explorer</h2>
    <div class="mode-switch" id="talent_mode">
      <button data-mode="explorer" class="${_talentMode==="explorer"?"active":""}">Explorer</button>
      <button data-mode="kalibrasyon" class="${_talentMode==="kalibrasyon"?"active":""}">Kalibrasyon Görünümü</button>
    </div>
    <div id="talent_mode_host"></div>
  `;
  const host = document.getElementById("talent_mode_host");
  function renderMode(){
    if(_talentMode==="kalibrasyon") _renderKalibrasyonMode(host);
    else _renderExplorerMode(host);
  }
  document.querySelectorAll("#talent_mode [data-mode]").forEach(btn => btn.onclick = () => {
    _talentMode = btn.getAttribute("data-mode");
    document.querySelectorAll("#talent_mode [data-mode]").forEach(x =>
      x.classList.toggle("active", x===btn));
    renderMode();
  });
  renderMode();
}
