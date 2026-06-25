/* calc.js — iş kuralları (referans: mvp/src/calculations.py & schema.py) +
   ortak UI yardımcıları. Risk / 9-Box YENİDEN HESAPLANMAZ; kaynaktan okunur. */

/* === Sabitler (schema.py karşılığı) === */
const C = {
  RISK_TOTAL: "Toplam_Risk",
  URGENCY: "Aciliyet_Final",
  COVERAGE: "Yedek_Var",
  COVERAGE_PRESENT: "evet",
  IDENTITY: ["İsim","Pozisyon","Firma","Seviye","Şehir"],
  URGENCY_ORDER: ["ACİL","YÜKSEK","ORTA","DÜŞÜK"],
  HIGH_RISK: ["ACİL","YÜKSEK"],
  FILTER_COLUMNS: ["Firma","Seviye","Şehir","Aciliyet_Final"],
  RISK_COMPONENT: ["F1: Yedek Puan","F2: Seviye Puan","F3: Etki Puan",
    "F4: Kıdem Puan","F5: Dolum Puan","Temel_Risk","Kritik_Bilgi",
    "Bilgi_Etkisi","Toplam_Risk","Aciliyet_Final"],
  F_FACTOR_PAIRS: [
    ["F1","Yedek Durumu","F1: Yedek Puan","F1: Yedek Durumu"],
    ["F2","Organizasyonel Seviye","F2: Seviye Puan","F2: Organizasyonel Seviye"],
    ["F3","Etki Alanı","F3: Etki Puan","F3: Etki Alanı"],
    ["F4","Kıdem / Kurumsal Hafıza","F4: Kıdem Puan","F4: Kıdem/ Kurumsal Hafıza Riski"],
    ["F5","Dolum Zorluğu","F5: Dolum Puan","F5: Dolum Zorluğu"],
  ],
  POSITION_SUMMARY: [
    ["Mevcut Pozisyon Sahibi","İsim"],["Pozisyon","Pozisyon"],["Firma","Firma"],
    ["Seviye","Seviye"],["Şehir","Şehir"],["Toplam Risk","Toplam_Risk"],
    ["Aciliyet","Aciliyet_Final"],["Yedek","Yedek_Var"],["Kritik Bilgi","Kritik_Bilgi"],
    ["Temel Risk","Temel_Risk"],["Bilgi Etkisi","Bilgi_Etkisi"],
  ],
  BACKUP_DISPLAY: [
    ["Yedek_İsim","Yedek İsim"],["Yedek_Görev","Görev"],["Yedek_Firma","Firma"],
    ["Yedek_Şehir","Şehir"],["Yedek_Tipi","Tip"],["Yedek_Assess","Assessment"],
    ["Yedek_Perf","Performans"],["Yedek_9Box","9-Box"],["Coğrafi_Uyum","Coğrafi Uyum"],
    ["Fonksiyonel_Uyum","Fonksiyonel Uyum"],["Rol_Kıdemi","Rol Kıdemi"],
    ["Ayrılma_Riski","Ayrılma Riski"],["Çoklu_Yedek","Çoklu Yedek"],
  ],
  BACKUP_OWNER: "Pozisyon_Sahibi",
  TALENT_EXPLORER: [
    ["Sicil No","Sicil No"],["Ad-Soyad","Ad Soyad"],["Seviye","Seviye"],
    ["Ana Firma","Firma"],["Unvan","Unvan"],["Kıdem (Yıl)","Kıdem (Yıl)"],
    ["Perf Ort","Performans Ortalaması"],["Assessment","Assessment"],
    ["Assessment Tipi","Assessment Tipi"],["Potansiyel","Potansiyel"],
    ["Performans","Performans"],["9-Box","9-Box"],["Talent Kararı","Talent Kararı"],
    ["Succession","Succession"],["Önerilen Aksiyon","Önerilen Aksiyon"],["Gerekçe","Gerekçe"],
  ],
  DISCOVERY: [
    ["Sicil No","Sicil No"],["Ad-Soyad","Ad Soyad"],["Seviye","Seviye"],
    ["Ana Firma","Firma"],["İş Adresi","İş Adresi / Şehir"],["Unvan","Unvan"],
    ["Kıdem (Yıl)","Kıdem (Yıl)"],["Perf Ort","Performans Ortalaması"],
    ["Assessment","Assessment"],["Assessment Tipi","Assessment Tipi"],
    ["Potansiyel","Potansiyel"],["Performans","Performans"],["9-Box","9-Box"],
    ["Talent Kararı","Talent Kararı"],["Succession","Succession"],
    ["Önerilen Aksiyon","Önerilen Aksiyon"],["Gerekçe","Gerekçe"],
  ],
  EXEC_PRIORITY: [
    ["İsim","Mevcut Pozisyon Sahibi"],["Pozisyon","Pozisyon"],["Firma","Firma"],
    ["Şehir","Şehir"],["Toplam_Risk","Toplam Risk"],["Aciliyet_Final","Aciliyet"],
    ["Yedek_Var","Yedek"],
  ],
  TALENT_FILTER_COLUMNS: ["Ana Firma","Seviye","İş Adresi","9-Box","Talent Kararı",
    "Succession","Assessment Tipi","Potansiyel","Performans"],
  TALENT_FILTER_LABELS: {"Ana Firma":"Firma","İş Adresi":"İş Adresi / Şehir"},
  TALENT_NUMERIC: {"Kıdem (Yıl)":1,"Perf Ort":2,"Assessment":2},
  COLUMN_LABELS: {"Aciliyet_Final":"Aciliyet","Toplam_Risk":"Toplam Risk"},
};

/* Ton hex (theme.py TONES, çizgi rengi). */
const TONE_HEX = {danger:"#DC2626",warning:"#B45309",success:"#0F9D8C",
  info:"#2563EB",brand:"#5B3FA8",neutral:"#5A6072"};

/* Durum etiketi -> ton (theme.py STATUS_TONE). */
const STATUS_TONE = {
  "ACİL":"danger","YÜKSEK":"warning","ORTA":"neutral","DÜŞÜK":"neutral",
  "Açık":"info","Devam Ediyor":"warning","Tamamlandı":"success","Beklemede":"neutral",
  "Var":"success","Yok":"danger",
};
function toneFor(label){ return STATUS_TONE[String(label).trim()] || "neutral"; }

/* === İş kuralları === */
function hasBackup(row){
  return normalizeValue(row[C.COVERAGE]) === C.COVERAGE_PRESENT;
}

function calculateSummary(rows){
  const total = rows.length;
  const counts = {};
  rows.forEach(r => {
    const u = isBlank(r[C.URGENCY]) ? "" : String(r[C.URGENCY]).trim();
    if(u) counts[u] = (counts[u]||0)+1;
  });
  const urgency_counts = {};
  C.URGENCY_ORDER.forEach(u => urgency_counts[u] = counts[u]||0);
  Object.keys(counts).forEach(k => { if(!(k in urgency_counts)) urgency_counts[k]=counts[k]; });
  const high = C.HIGH_RISK.reduce((a,u)=>a+(urgency_counts[u]||0),0);
  const risks = rows.map(r=>num(r[C.RISK_TOTAL])).filter(x=>!Number.isNaN(x));
  const present = rows.filter(hasBackup).length;
  const mean = risks.length ? risks.reduce((a,b)=>a+b,0)/risks.length : 0;
  const sorted = [...risks].sort((a,b)=>a-b);
  const median = sorted.length ? (sorted.length%2 ? sorted[(sorted.length-1)/2]
    : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2) : 0;
  return {
    critical_count: total, urgency_counts,
    acil: urgency_counts["ACİL"]||0, yuksek: urgency_counts["YÜKSEK"]||0,
    high_risk_count: high, high_risk_ratio: total?high/total:0,
    risk_mean: mean, risk_median: median, risk_max: risks.length?Math.max(...risks):0,
    coverage_present: present, coverage_absent: total-present,
    coverage_ratio: total?present/total:0,
  };
}

function urgencyRank(v){ const i = C.HIGH_RISK.indexOf(String(v).trim()); return i<0?C.HIGH_RISK.length:i; }

function sortByUrgencyThenRisk(rows){
  return [...rows].sort((a,b)=>{
    const ra=urgencyRank(a[C.URGENCY]), rb=urgencyRank(b[C.URGENCY]);
    if(ra!==rb) return ra-rb;
    const xa=num(a[C.RISK_TOTAL]), xb=num(b[C.RISK_TOTAL]);
    return (Number.isNaN(xb)?-Infinity:xb)-(Number.isNaN(xa)?-Infinity:xa);
  });
}

function acilYuksekTop(rows, n){
  const subset = rows.filter(r => C.HIGH_RISK.includes(String(r[C.URGENCY]).trim()));
  const s = sortByUrgencyThenRisk(subset);
  return n ? s.slice(0,n) : s;
}

function noBackupPositions(rows){
  const subset = rows.filter(r => !hasBackup(r));
  return [...subset].sort((a,b)=>{
    const xa=num(a[C.RISK_TOTAL]), xb=num(b[C.RISK_TOTAL]);
    return (Number.isNaN(xb)?-Infinity:xb)-(Number.isNaN(xa)?-Infinity:xa);
  });
}

function topRiskPositions(rows, n){
  const work = [...rows].sort((a,b)=>{
    const xa=num(a[C.RISK_TOTAL]), xb=num(b[C.RISK_TOTAL]);
    return (Number.isNaN(xb)?-Infinity:xb)-(Number.isNaN(xa)?-Infinity:xa);
  });
  return n ? work.slice(0,n) : work;
}

function filterOptions(rows, cols){
  const out = {};
  cols.forEach(col => {
    const set = new Set();
    rows.forEach(r => { const v=r[col]; if(!isBlank(v)) set.add(String(v).trim()); });
    let vals = [...set];
    if(col === C.URGENCY){
      vals.sort((a,b)=>{
        const ia=C.URGENCY_ORDER.indexOf(a), ib=C.URGENCY_ORDER.indexOf(b);
        return (ia<0?99:ia)-(ib<0?99:ib) || a.localeCompare(b,"tr");
      });
    } else vals.sort((a,b)=>a.localeCompare(b,"tr"));
    out[col]=vals;
  });
  return out;
}

function applyFilters(rows, selections, cols){
  let out = rows;
  cols.forEach(col => {
    const chosen = selections[col];
    if(chosen && chosen.length) out = out.filter(r => chosen.includes(String(r[col]).trim()));
  });
  return out;
}

function lookupBackups(isim){
  const key = normalizeValue(isim);
  if(!key) return [];
  return DATA.backups.filter(b => normalizeValue(b[C.BACKUP_OWNER]) === key);
}

function nameOccurrenceCount(isim){
  const key = normalizeValue(isim);
  if(!key) return 0;
  return DATA.positions.filter(p => normalizeValue(p["İsim"]) === key).length;
}

function riskComponentRows(row){
  return C.F_FACTOR_PAIRS.map(([code,name,puanCol,descCol]) => ({
    "Bileşen": `${code} — ${name}`,
    "Puan": row[puanCol],
    "Açıklama": row[descCol],
  }));
}

/* === Talent Pool === */
function distribution(rows, col){
  const out = {};
  rows.forEach(r => { const v=r[col]; if(!isBlank(v)){ const k=String(v).trim(); out[k]=(out[k]||0)+1; }});
  return Object.fromEntries(Object.entries(out).sort((a,b)=>b[1]-a[1]));
}

function talentSummary(rows){
  return {
    total: rows.length,
    ninebox: distribution(rows,"9-Box"),
    talent_karari: distribution(rows,"Talent Kararı"),
    succession: distribution(rows,"Succession"),
    assessment_blank: rows.filter(r=>isBlank(r["Assessment"])).length,
  };
}

function talentFilterOptions(rows){
  const out = {};
  C.TALENT_FILTER_COLUMNS.forEach(col => {
    const set = new Set();
    rows.forEach(r => { const v=r[col]; if(!isBlank(v)) set.add(String(v).trim()); });
    out[col] = [...set].sort((a,b)=>a.localeCompare(b,"tr"));
  });
  return out;
}

function applyTalentFilters(rows, selections){
  let out = rows;
  C.TALENT_FILTER_COLUMNS.forEach(col => {
    const chosen = selections[col];
    if(chosen && chosen.length) out = out.filter(r => chosen.includes(String(r[col]).trim()));
  });
  return out;
}

/* 3x3 9-Box matrisi (yalnızca sayım; meta.ninebox grid kullanılır). */
function nineboxMatrix(rows){
  const nb = DATA.meta.ninebox;
  const counts = {};
  rows.forEach(r => { const v=r["9-Box"]; if(!isBlank(v)){ const k=String(v).trim(); counts[k]=(counts[k]||0)+1; }});
  const grid = nb.grid, tone = nb.tone;
  const matrix = nb.potential_order.map(pot =>
    nb.performance_order.map(perf => {
      const label = grid[`${pot}|${perf}`] || "";
      return {label, count: counts[label]||0, potential:pot, performance:perf,
              tone: tone[label] || "neutral"};
    })
  );
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  return {rows: matrix, total};
}

function addCandidateComparison(rows, posFirma, posSehir){
  const pf = normalizeValue(posFirma), ps = normalizeValue(posSehir);
  return rows.map(r => ({...r,
    "Firma Eşleşmesi": pf && normalizeValue(r["Ana Firma"])===pf ? "Aynı":"Farklı",
    "Şehir Eşleşmesi": ps && normalizeValue(r["İş Adresi"])===ps ? "Aynı":"Farklı",
  }));
}

function applyAssessmentMin(rows, minValue){
  if(minValue === null || minValue === undefined) return rows;
  return rows.filter(r => { const v=num(r["Assessment"]); return !Number.isNaN(v) && v>=minValue; });
}

/* === Ortak UI yardımcıları === */
function badge(text, tone){
  const t = tone || toneFor(text);
  return `<span class="badge t-${t}"><span class="dot"></span>${esc(text)}</span>`;
}
function kpiCard(label, value, hint, tone){
  const c = TONE_HEX[tone] || TONE_HEX.neutral;
  return `<div class="eks-kpi" style="--kc:${c}">
    <div class="eks-kpi-label">${esc(label)}</div>
    <div class="eks-kpi-value">${esc(value)}</div>
    <div class="eks-kpi-hint">${esc(hint||"")}</div></div>`;
}
function metricCard(label, value, sub){
  return `<div class="metric"><div class="m-label">${esc(label)}</div>
    <div class="m-value">${esc(value)}</div>
    ${sub?`<div class="m-sub">${esc(sub)}</div>`:""}</div>`;
}
function emptyState(text){ return `<div class="eks-empty">${esc(text)}</div>`; }
function note(kind, html){ return `<div class="note ${kind}">${html}</div>`; }

/* Tablo: columns=[{key,label,cls,fmt}], rows=obj[]. fmt(value,row)->string (kaçışsız ham izinli mi?
   güvenli olması için fmt çıktısı düz metin kabul edilir ve kaçışlanır; badge için rawFmt kullan). */
function buildTable(columns, rows){
  const head = columns.map(c=>`<th>${esc(c.label)}</th>`).join("");
  const body = rows.map(r => "<tr>"+columns.map(c=>{
    let cell;
    if(c.rawFmt){ cell = c.rawFmt(r[c.key], r); }          // ham HTML (badge vb.)
    else if(c.fmt){ cell = esc(c.fmt(r[c.key], r)); }
    else { cell = esc(disp(r[c.key])); }
    return `<td class="${c.cls||""}">${cell}</td>`;
  }).join("")+"</tr>").join("");
  return `<div class="table-scroll"><table class="data">
    <thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/* Dağılım çubukları (obj: label->count). */
function renderBars(obj){
  const entries = Object.entries(obj);
  if(!entries.length) return emptyState("Veri yok.");
  const max = Math.max(...entries.map(e=>e[1]), 1);
  return entries.map(([k,v])=>`<div class="bar-row">
    <div class="bl" title="${esc(k)}">${esc(k)}</div>
    <div class="bt"><div class="bf" style="width:${Math.round(100*v/max)}%"></div></div>
    <div class="bv">${v}</div></div>`).join("");
}

/* Çoklu-seçim alanı (multiselect). id benzersiz olmalı. */
function multiselectField(id, label, options){
  const opts = options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join("");
  return `<div class="field"><label for="${id}">${esc(label)}</label>
    <select id="${id}" multiple size="4">${opts}</select></div>`;
}
function getMultiselect(id){
  const el = document.getElementById(id);
  if(!el) return [];
  return [...el.selectedOptions].map(o=>o.value);
}

/* === Üç kademeli bağlı seçim: Firma -> Ünvan -> Mevcut Pozisyon Sahibi ===
   mount: container; rows: pozisyon kayıtları; prefix: benzersiz id öneki;
   onPick(row|null) seçim değiştikçe çağrılır. */
function renderCascade(mount, rows, prefix, onPick){
  const companies = [...new Set(rows.filter(r=>!isBlank(r["Firma"]))
    .map(r=>String(r["Firma"]).trim()))].sort((a,b)=>a.localeCompare(b,"tr"));
  if(!companies.length){ mount.innerHTML = emptyState("Gösterilecek firma yok."); onPick(null); return; }

  const state = {firma: companies[0], unvan: null, personIdx: null};

  function titlesFor(firma){
    return [...new Set(rows.filter(r=>String(r["Firma"]).trim()===firma && !isBlank(r["Pozisyon"]))
      .map(r=>String(r["Pozisyon"]).trim()))].sort((a,b)=>a.localeCompare(b,"tr"));
  }
  function personsFor(firma,unvan){
    // {idx, row} listesi — global rows indeksini korur (kararlı eşleme)
    return rows.map((r,idx)=>({idx,r}))
      .filter(o=>String(o.r["Firma"]).trim()===firma && String(o.r["Pozisyon"]).trim()===unvan);
  }
  function personLabel(persons, o){
    const isim = o.r["İsim"];
    const base = isBlank(isim) ? "Pozisyon Sahibi Tanımlı Değil" : String(isim).trim();
    // aynı isim çakışması veya boş isim çokluğu -> şehir ekle
    const norm = normalizeValue(isim);
    const dup = norm && persons.filter(p=>normalizeValue(p.r["İsim"])===norm).length>1;
    const blankMulti = !norm && persons.filter(p=>normalizeValue(p.r["İsim"])==="").length>1;
    return (dup||blankMulti) ? `${base} · ${isBlank(o.r["Şehir"])?BLANK:String(o.r["Şehir"]).trim()}` : base;
  }

  function rebuild(){
    const titles = titlesFor(state.firma);
    if(!titles.includes(state.unvan)) state.unvan = titles[0] || null;
    const persons = state.unvan ? personsFor(state.firma, state.unvan) : [];
    if(!persons.some(p=>p.idx===state.personIdx)) state.personIdx = persons.length?persons[0].idx:null;

    const fOpts = companies.map(c=>`<option ${c===state.firma?"selected":""}>${esc(c)}</option>`).join("");
    const tOpts = titles.map(t=>`<option ${t===state.unvan?"selected":""}>${esc(t)}</option>`).join("");
    const pOpts = persons.map(o=>`<option value="${o.idx}" ${o.idx===state.personIdx?"selected":""}>${esc(personLabel(persons,o))}</option>`).join("");

    mount.innerHTML = `<div class="cascade">
      <div class="field"><label for="${prefix}_f">1 · Firma</label><select id="${prefix}_f">${fOpts}</select></div>
      <div class="field"><label for="${prefix}_t">2 · Ünvan</label><select id="${prefix}_t">${tOpts}</select></div>
      <div class="field"><label for="${prefix}_p">3 · Mevcut Pozisyon Sahibi</label><select id="${prefix}_p">${pOpts}</select></div>
    </div>`;

    document.getElementById(prefix+"_f").onchange = e => { state.firma=e.target.value; state.unvan=null; state.personIdx=null; rebuild(); };
    document.getElementById(prefix+"_t").onchange = e => { state.unvan=e.target.value; state.personIdx=null; rebuild(); };
    document.getElementById(prefix+"_p").onchange = e => { state.personIdx=Number(e.target.value); fire(); };
    fire();
  }
  function fire(){ onPick(state.personIdx!=null ? rows[state.personIdx] : null); }
  rebuild();
}
