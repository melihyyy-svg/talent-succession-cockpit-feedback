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
    if(key==="Gerekçe") return {key,label,cls:"rationale-cell",rawFmt:v=>_rationaleCell(v)};
    return {key,label,fmt:v=>disp(v)};
  });
}

/* Explorer "Gerekçe" hücresi: satır yüksekliğini şişirmemesi için kompakt önizleme —
   gerçek metnin deterministik ilk ~90 karakteri, CSS line-clamp ile en fazla 2 satır,
   kesilince sonda "…". Tam gerekçe KAYBOLMAZ: yalnızca kesildiğinde, talep üzerine tam metni
   açan <details> "Detay" (mevcut inline expander deseni; yeni drawer/modal/rota YOK). Boş -> "Veri eksik".
   Drill-down davranışı değişmez. */
function _rationaleCell(v){
  if(isBlank(v)) return `<span class="muted">Veri eksik</span>`;
  const full = String(v).replace(/\s+/g, " ").trim();
  const LIMIT = 90;
  const truncated = full.length > LIMIT;
  const short = truncated ? full.slice(0, LIMIT).trim() + "…" : full;
  const more = truncated
    ? `<details class="rationale-more"><summary>Detay</summary>
        <div class="rationale-full">${esc(full)}</div></details>`
    : "";
  return `<div class="rationale-preview">${esc(short)}</div>${more}`;
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

/* ===================== MOD: EXPLORER (mevcut) — kompakt üst özet + tam genişlik Explorer =====================
   Üstte 2 kolonlu Talent Pool Overview (sol 9-Box Navigator · sağ Talent Review Özeti — kısa,
   karar odaklı, tablo genişliğinde DEĞİL). Altında tam genişlik Talent Pool Explorer.
   Hesap/filtre/hücre-seçim mantığı DEĞİŞMEDİ (aynı applyTalentFilters/nineboxMatrix/
   _renderNinebox/distribution); yalnızca yerleşim. Tekrar eden "ilk 15 hızlı önizleme"
   kaldırıldı — ana Explorer tablosu zaten aynı seçili kapsamı (scoped) gösterir. */
function _renderExplorerMode(host){
  const all = DATA.talent;
  const options = talentFilterOptions(all);
  const filterFields = C.TALENT_FILTER_COLUMNS.map(col =>
    multiselectField("tf_"+col, C.TALENT_FILTER_LABELS[col]||col, options[col]||[])).join("");

  host.innerHTML = `
    <div class="tp-overview">
      <aside class="panel tp-panel tp-nav">
        <h3 class="tp-panel-title">9-Box Performans × Potansiyel</h3>
        ${note("info", `Bu 9-Box görünümü <b>tüm çalışan popülasyonunu değil</b>, yalnızca
          Talent Pool kapsamındaki kişileri gösterir. Boş hücre (0) = <b>bu kapsamda kayıt
          yok</b> (veri hatası değildir).`)}
        <div class="caption">Hücreye tıklayın: Yatay Performans (Düşük→Yüksek) ·
          Dikey Potansiyel (Yüksek→Düşük); sayı = kişi.</div>
        <div id="talent_matrix"></div>
        <div id="talent_nav_summary" class="tp-nav-summary"></div>
      </aside>

      <aside class="panel tp-panel tp-review">
        <h3 class="tp-panel-title">Talent Review Özeti</h3>
        <div id="talent_review_summary"></div>
      </aside>
    </div>

    <section class="panel tp-panel tp-main">
      <h3 class="tp-panel-title">Talent Pool Explorer</h3>
      <div id="talent_context" class="tp-context"></div>
      <div class="tp-filters-head">Filtreler</div>
      <div class="controls tp-filters-grid" id="talent_filters">${filterFields}</div>
      <div id="talent_table"></div>
    </section>
  `;

  const matrixEl = document.getElementById("talent_matrix");
  const navSummaryEl = document.getElementById("talent_nav_summary");
  const contextEl = document.getElementById("talent_context");
  const tableEl = document.getElementById("talent_table");
  const reviewEl = document.getElementById("talent_review_summary");
  const cols = _talentExplorerColumns();

  _talentUpdate = function(){
    const selections = {};
    C.TALENT_FILTER_COLUMNS.forEach(col => selections[col] = getMultiselect("tf_"+col));
    const base = applyTalentFilters(all, selections);
    const matrix = nineboxMatrix(base);
    _renderNinebox(matrixEl, matrix);

    const cell = _talentState.cell;
    const scoped = cell === "Tümü" ? base : base.filter(r => String(r["9-Box"]).trim() === cell);

    // Sol panel — kompakt özet (filtrelenen / toplam / 9-Box eksik).
    const boxMissing = base.filter(r => isBlank(r["9-Box"])).length;
    navSummaryEl.innerHTML = `<div class="tp-stat"><span>Filtrelenen kişi</span><b>${base.length}</b></div>
      <div class="tp-stat"><span>Toplam kişi</span><b>${all.length}</b></div>
      <div class="tp-stat"><span>9-Box eksik</span><b>${boxMissing}</b></div>`;

    // Explorer bağlam bandı (nötr veya seçili grup) — ayrı "ilk 15 önizleme" YOK; ana tablo
    // zaten aynı seçili kapsamı (scoped) gösterdiği için tekrar edilmez (bkz. üstteki not).
    if(cell === "Tümü"){
      contextEl.innerHTML = `<div class="tp-context-line muted">Tüm Talent Pool kayıtları
        gösteriliyor. Bir 9-Box hücresine tıklayarak inceleyin.</div>`;
    } else {
      const meaning = DATA.meta.ninebox.meaning[cell] || "";
      const cellInfo = (matrix.rows.flat().find(c=>c.label===cell)) || {};
      contextEl.innerHTML = `<div class="tp-context-line"><b>Seçili Grup:</b> ${esc(cell)}
        <span class="muted">— Performans: ${esc(cellInfo.performance||"—")} ·
        Potansiyel: ${esc(cellInfo.potential||"—")}</span></div>
        ${meaning ? `<div class="tp-context-mean muted">${esc(meaning)}</div>` : ""}`;
    }

    // Explorer tablosu (Filtrelenen Kişi kartı + Gerekçe önizleme korunur).
    let tbl = `<div class="metric-grid"><div class="metric"><div class="m-label">Filtrelenen Kişi</div>
      <div class="m-value">${scoped.length}</div></div></div>`;
    if(!scoped.length){
      tbl += emptyState("Seçilen filtre / 9-Box kategorisi ile eşleşen kişi yok.");
    } else {
      tbl += buildTable(cols, scoped);
      tbl += `<div class="caption">Kaynak: Yetenek Havuzu (salt-okunur). 9-Box değerleri
        yeniden hesaplanmaz; boş alanlar 'Belirtilmedi'.</div>`;
    }
    tableEl.innerHTML = tbl;

    // Sağ panel — Talent Review Özeti (yeni veri/skor yok; mevcut distribution() çağrısı).
    const scopeLabel = cell === "Tümü" ? "Tüm Talent Pool" : cell;
    if(!scoped.length){
      reviewEl.innerHTML = `<div class="tp-review-scope"><span>Kapsam</span><b>${esc(scopeLabel)}</b></div>
        ${emptyState("Kayıt bulunmuyor")}`;
    } else {
      const kararDist = distribution(scoped, "Talent Kararı");
      const succDist = distribution(scoped, "Succession");
      reviewEl.innerHTML = `
        <div class="tp-review-scope"><span>Kapsam</span><b>${esc(scopeLabel)}</b></div>
        <div class="tp-review-count"><span>Kişi sayısı</span><b>${scoped.length}</b></div>
        <div class="tp-review-dists">
          <div class="tp-review-block"><h4>Talent Kararı Dağılımı</h4>${renderBars(kararDist)}</div>
          <div class="tp-review-block"><h4>Succession Dağılımı</h4>${renderBars(succDist)}</div>
        </div>
        <div class="tp-review-block muted">
          <div>Kararı veren / kalibrasyon grubu: <b>Kayıt bulunmuyor</b></div>
          <div>Sonraki gözden geçirme tarihi: <b>Kalibrasyon tarihi yok</b></div>
        </div>
        <div class="caption">Bireysel karar kayıtlarını incelemek için
          <b>Kalibrasyon Görünümü</b> moduna geçin.</div>`;
    }
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
        </div>
        <div class="rev-decision">
          <div class="rd-line"><span>Karar durumu:</span>
            ${isBlank(p["Talent Kararı"]) ? `<span class="muted">Karar kaydı bulunmuyor</span>`
              : badge(disp(p["Talent Kararı"]), "neutral")}
            <span class="rd-sep">·</span> Succession: <b>${esc(disp(p["Succession"]))}</b></div>
          <div class="rd-line muted">Karar gerekçesi: ${esc(disp(p["Gerekçe"]))}</div>
          <div class="rd-line muted">Kararı veren / kalibrasyon grubu · Sonraki gözden geçirme tarihi ·
            Açık aksiyon: Kayıt bulunmuyor</div>
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
