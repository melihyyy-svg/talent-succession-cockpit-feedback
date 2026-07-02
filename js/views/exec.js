/* exec.js — Ekran 1: Yönetici Karar Özeti (Executive Decision View)
   Görsel premium iterasyon: üç katmanlı karar hiyerarşisi.
   Korunan: tüm metrik değerleri, Ready-now & risk mantığı, 4 KPI drill-down,
   "Detayda aç" deep-link, responsive yapı, Midnight Executive kimliği.
   Yeni veri/metrik/hesap/AI YOK — yalnızca render & CSS sunum katmanı. */

function _levelCoverage(rows){
  const groups = {};
  rows.forEach(r => {
    const sev = isBlank(r["Seviye"]) ? BLANK : String(r["Seviye"]).trim();
    (groups[sev] = groups[sev] || []).push(r);
  });
  return Object.entries(groups).map(([sev,grp]) => {
    const present = grp.filter(hasBackup).length;
    const risks = grp.map(r=>num(r[C.RISK_TOTAL])).filter(x=>!Number.isNaN(x));
    const avg = risks.length ? risks.reduce((a,b)=>a+b,0)/risks.length : 0;
    return {Seviye:sev, Pozisyon:grp.length, "Yedeği Var":present,
      "Kapsam %": grp.length?trPct(100*present/grp.length):"0,0",
      "Ort. Risk": avg.toFixed(1).replace(".",",")};
  });
}

/* KPI drill-down hedef tanımları (filtreli pozisyon listesi). */
const _DRILL_DEFS = {
  acil: {title:"ACİL pozisyonlar",
         filter:p=>String(p[C.URGENCY]).trim()==="ACİL"},
  nobackup: {title:"Tanımlı yedeği olmayan pozisyonlar (Yedek_Var = Hayır)",
             filter:p=>!hasBackup(p)},
  highrisk: {title:"Yüksek Risk — ACİL + YÜKSEK pozisyonlar",
             filter:p=>C.HIGH_RISK.includes(String(p[C.URGENCY]).trim())},
  readygap: {title:"ACİL + YÜKSEK riskli pozisyonlarda Göreve Hazır Yedek Açığı (Göreve Hazır Yedek Yok)",
             filter:p=>C.HIGH_RISK.includes(String(p[C.URGENCY]).trim()) && !positionHasReady(p)},
};

/* Mevcut durumdan deterministik "sonraki adım" etiketi (yeni mantık/metrik DEĞİL;
   mevcut hasBackup / positionHasReady yüklemlerinin sunumu). */
function _nextStep(p){
  if(!hasBackup(p)) return ["Yedek belirle","danger"];
  if(!positionHasReady(p)) return ["Yedek hazırlığı","warning"];
  return ["İzle / sürdür","success"];
}

function _renderExecDrill(id){
  const def = _DRILL_DEFS[id];
  const host = document.getElementById("exec_drill");
  if(!def){ host.innerHTML = ""; return; }
  const subset = sortByUrgencyThenRisk(DATA.positions.filter(def.filter));
  const cols = [
    {key:"İsim",label:"Mevcut Pozisyon Sahibi",fmt:v=>disp(v)},
    {key:"Pozisyon",label:"Pozisyon",fmt:v=>disp(v)},
    {key:"Firma",label:"Firma",fmt:v=>disp(v)},
    {key:"Şehir",label:"Şehir",fmt:v=>disp(v)},
    {key:"Toplam_Risk",label:"Toplam Risk",fmt:v=>disp(v)},
    {key:"Aciliyet_Final",label:"Aciliyet",rawFmt:v=>badge(disp(v))},
    {key:"Yedek_Var",label:"Yedek",rawFmt:(v,r)=>badge(hasBackup(r)?"Var":"Yok", hasBackup(r)?"success":"danger")},
    {key:"_ready",label:"Göreve Hazır Yedek",rawFmt:(v,r)=>positionHasReady(r)
        ? badge("Var","success") : badge("Yok","neutral")},
    {key:"_act",label:"",rawFmt:(v,r)=>`<button class="btn secondary small" data-pos="${DATA.positions.indexOf(r)}">Detayda aç →</button>`},
  ];
  host.innerHTML = `<div class="panel exec-drillpanel">
    <h3 style="margin-top:0">Drill-down: ${esc(def.title)} <span class="muted">(${subset.length})</span></h3>
    ${subset.length ? buildTable(cols, subset) : emptyState("Bu filtreyle eşleşen pozisyon yok.")}
  </div>`;
  host.querySelectorAll("[data-pos]").forEach(btn =>
    btn.onclick = () => openInDetail(Number(btn.getAttribute("data-pos"))));
  host.scrollIntoView({behavior:"smooth", block:"start"});
}

/* Tier 1 — kritik sinyal kartı (tıklanabilir; drill tetikler). Sayı mevcut hesaptan gelir. */
function _signal(id, tone, count, title, subtitle){
  return `<button class="signal-card t-${tone}" data-drill="${id}">
    <div class="sig-num">${esc(count)}</div>
    <div class="sig-label">${esc(title)}</div>
    <div class="sig-desc">${esc(subtitle)}</div>
    <div class="sig-action">${esc(count)} pozisyonu görüntüle <span class="sig-go">→</span></div>
  </button>`;
}

/* Tier 2 — Kapsam vs Hazır-Halef karşılaştırma bileşeni (en güçlü ayrım). */
function _coverageCompare(s, rn){
  const cov = (100*s.coverage_ratio), ready = (100*rn.coverageRatio);
  const gap = s.coverage_present - rn.coverage;
  return `<div class="cov-compare">
    <div class="cov-row">
      <div class="cov-head"><span class="cov-name">Tanımlı Yedek Kapsamı</span>
        <span class="cov-val ok">%${trPct(cov)}</span></div>
      <div class="cov-bar"><div class="cov-fill strong" style="width:${cov.toFixed(1)}%"></div></div>
      <div class="cov-meaning">${s.coverage_present}/${s.critical_count} pozisyonun
        <b>en az bir tanımlı yedeği</b> var.</div>
    </div>
    <div class="cov-row">
      <div class="cov-head"><span class="cov-name">Göreve Hazır Kapsamı</span>
        <span class="cov-val warn">%${trPct(ready)}</span></div>
      <div class="cov-bar"><div class="cov-fill weak" style="width:${ready.toFixed(1)}%"></div></div>
      <div class="cov-meaning">${rn.coverage}/${rn.total} pozisyonun <b>Göreve Hazır Yedeği</b> var
        (YETENEK HAZIR / DOĞAL + HAZIR).</div>
    </div>
    <div class="cov-gap"><b>${gap} pozisyonda</b> tanımlı yedek bulunuyor; Göreve Hazır Yedek bulunmuyor.
      <span class="muted">Tanımlı yedek, Göreve Hazır Yedek anlamına gelmez.</span></div>
  </div>`;
}

function renderExec(el){
  const poz = DATA.positions;
  const s = calculateSummary(poz);
  const rn = readyNowStats();

  // Kritik karar listesi: ACİL+YÜKSEK öncelikli (ilk 12), zengin sütunlar.
  const critical = acilYuksekTop(poz, 12);
  const critCols = [
    {key:"_pos",label:"Pozisyon",cls:"wrap-cell",rawFmt:(v,r)=>
      `<div class="cl-pos"><b>${esc(disp(r["Pozisyon"]))}</b><span>${esc(disp(r["İsim"]))} · ${esc(disp(r["Firma"]))} · ${esc(disp(r["Şehir"]))}</span></div>`},
    {key:"_why",label:"Neden riskli?",rawFmt:(v,r)=>
      `${badge(disp(r["Aciliyet_Final"]))}<div class="cl-sub">Risk ${esc(disp(r["Toplam_Risk"]))}</div>`},
    {key:"_succ",label:"Yedek durumu",rawFmt:(v,r)=>{
      const ready = positionHasReady(r); const n = lookupBackups(r["İsim"]).length;
      return `${badge(ready?"Göreve Hazır Yedek Var":"Göreve Hazır Yedek Yok", ready?"success":(hasBackup(r)?"warning":"danger"))}<div class="cl-sub">${n} tanımlı yedek</div>`;}},
    {key:"_next",label:"Sonraki adım",rawFmt:(v,r)=>{const ns=_nextStep(r); return badge(ns[0],ns[1]);}},
    {key:"_act",label:"",rawFmt:(v,r)=>`<button class="btn secondary small" data-pos="${DATA.positions.indexOf(r)}">Detayda aç →</button>`},
  ];

  const urgDist = {};
  C.URGENCY_ORDER.forEach(u => urgDist[u] = s.urgency_counts[u]||0);
  Object.keys(s.urgency_counts).forEach(k => { if(!(k in urgDist)) urgDist[k]=s.urgency_counts[k]; });

  // V1.2-A — Açık Halefiyet Riskleri (Karar Kuyruğu): mevcut yüklemlerden türeyen,
  // en az bir açık risk bayrağı taşıyan pozisyonlar. Yeni skor/sıralama yok.
  const _rqAll = openSuccessionRiskList();                 // [{p, idx, flags}]
  const _rqFirmaOpts = [...new Set(_rqAll.map(o => o.p["Firma"]).filter(v=>!isBlank(v))
    .map(v=>String(v).trim()))].sort((a,b)=>a.localeCompare(b,"tr"));
  const _RQ_SEV_ORDER = ["Başkan / GM", "Direktör / GMY", "Müdür"];
  const _rqSeviyeOpts = _RQ_SEV_ORDER.filter(s2 => _rqAll.some(o => String(o.p["Seviye"]).trim()===s2))
    .concat([...new Set(_rqAll.map(o=>String(o.p["Seviye"]).trim()))]
      .filter(s2 => s2 && !_RQ_SEV_ORDER.includes(s2)).sort((a,b)=>a.localeCompare(b,"tr")));
  const _rqTypeOpts = SUCCESSION_RISK_ORDER.map(k => SUCCESSION_RISK_FLAGS[k].label);
  const _rqLabelToKey = {};
  SUCCESSION_RISK_ORDER.forEach(k => _rqLabelToKey[SUCCESSION_RISK_FLAGS[k].label] = k);

  // V1.3-A — Öncelikli Pozisyonlar: mevcut risk kuyruğunun sırasıyla (urgencyRank→risk) ilk 5.
  // Yeni sıralama/skor/kural üretmez; kartların altında kompakt, tıklanabilir satır listesi.
  const _prio = [..._rqAll].sort((a,b)=>{
    const ra=urgencyRank(a.p[C.URGENCY]), rb=urgencyRank(b.p[C.URGENCY]);
    if(ra!==rb) return ra-rb;
    const xa=num(a.p[C.RISK_TOTAL]), xb=num(b.p[C.RISK_TOTAL]);
    return (Number.isNaN(xb)?-Infinity:xb)-(Number.isNaN(xa)?-Infinity:xa);
  }).slice(0,5);
  const _prioRows = _prio.map(o => {
    const flags = o.flags.map(f=>badge(SUCCESSION_RISK_FLAGS[f].label, SUCCESSION_RISK_FLAGS[f].tone)).join(" ");
    return `<button class="exec-prio-row" data-pos="${o.idx}"
        aria-label="${esc(disp(o.p["Pozisyon"]))} — Pozisyon Karar Dosyası'nı aç">
      <span class="epr-info">
        <span class="epr-name">${esc(disp(o.p["Pozisyon"]))}</span>
        <span class="epr-meta">${esc(disp(o.p["Firma"]))} · ${esc(disp(o.p["Seviye"]))}</span>
        <span class="epr-flags">${flags}</span>
      </span>
      <span class="epr-go" aria-hidden="true">›</span>
    </button>`;
  }).join("");

  el.innerHTML = `
    <header class="exec-head">
      <div class="exec-head-main">
        <div class="exec-eyebrow">YÖNETİCİ KARAR ÖZETİ</div>
        <h2 class="exec-title">Kritik Yedekleme Durumu</h2>
        <p class="exec-lede">Kritik pozisyonlar, Göreve Hazır Kapsamı ve açık yedekleme riskleri.</p>
      </div>
      <div class="exec-meta">
        <span class="meta-chip">${s.critical_count} pozisyon</span>
        ${isBlank(DATA.meta.generated_at) ? "" : `<span class="meta-chip">Veri tarihi: ${esc(DATA.meta.generated_at)}</span>`}
      </div>
    </header>

    <!-- TIER 1 — Kritik Sinyaller -->
    <section class="exec-section">
      <div class="section-head"><h3>Kritik Sinyaller</h3>
        <span class="section-hint">Karta tıklayın → filtreli pozisyon listesi</span></div>
      <div class="signal-grid">
        ${_signal("acil","danger", s.acil, "Acil Pozisyon", "Yedek veya aksiyon planı gerektirir")}
        ${_signal("readygap","danger", rn.gap, "Göreve Hazır Yedek Açığı", "ACİL+YÜKSEK riskli pozisyonlarda Göreve Hazır Yedek Yok")}
        ${_signal("nobackup","warning", s.coverage_absent, "Tanımlı Yedeği Yok", "Yedek adayı tanımlanmamış pozisyonlar")}
      </div>
      <div class="caption sig-note">Sinyaller aynı pozisyonda kesişebilir; kartlardaki sayılar toplanmaz.</div>
      <div id="exec_drill"></div>
    </section>

    <!-- Öncelikli Pozisyonlar (mevcut risk kuyruğu sırası; ilk 5) -->
    <section class="exec-section">
      <div class="section-head"><h3>Öncelikli Pozisyonlar</h3>
        <span class="section-hint">Açık yedekleme riski taşıyan ilk ${_prio.length} pozisyon</span></div>
      ${_prio.length
        ? `<div class="exec-prio-list">${_prioRows}</div>
           <button class="exec-prio-all" data-prio-all="1">Tüm açık yedekleme risklerini görüntüle →</button>`
        : emptyState("Açık yedekleme riski bulunmuyor.")}
    </section>

    <!-- TIER 2 — Succession Sağlığı -->
    <section class="exec-section">
      <div class="section-head"><h3>Kapsam ve Hazırlık</h3></div>
      <div class="panel cov-panel">
        ${_coverageCompare(s, rn)}
        <div class="cov-foot">
          <button class="stat-link" data-drill="highrisk">Yüksek Risk (ACİL+YÜKSEK):
            <b>${s.high_risk_count}</b> · toplamın %${trPct(100*s.high_risk_ratio)}'si <span>›</span></button>
          <span class="muted">Göreve Hazır yedek <b>kaydı</b>: ${rn.readyRecords} (pozisyon değil, kayıt ölçüsü)</span>
        </div>
      </div>
    </section>

    <!-- TIER 3 — Kritik Pozisyon Listesi (aksiyon) -->
    <section class="exec-section">
      <div class="section-head"><h3>3 · Kritik pozisyonlar — sonraki adım</h3>
        <span class="section-hint">ACİL + YÜKSEK öncelikli · ilk ${critical.length} / ${s.high_risk_count}</span></div>
      <div id="exec_critical_table">
        ${critical.length ? buildTable(critCols, critical)
          : emptyState("ACİL veya YÜKSEK riskli pozisyon yok.")}
      </div>
      ${s.high_risk_count>critical.length
        ? `<div class="caption">Tümü için yukarıdaki <b>Yüksek Risk</b> kartından inebilirsiniz.</div>`:""}
    </section>

    <!-- TIER 4 — Açık Halefiyet Riskleri (Karar Kuyruğu) -->
    <section class="exec-section">
      <div class="section-head"><h3>4 · Açık yedekleme riskleri — karar kuyruğu</h3>
        <span class="section-hint">Açık riskli pozisyonları filtreleyin → pozisyon detayına inin</span></div>
      ${note("info", `Mevcut karar kurallarından türeyen açık riskleri taşıyan pozisyonların tek,
        salt-okunur ve filtrelenebilir kuyruğu. Bayraklar mevcut yüklemlerle aynıdır
        (Kritik Göreve Hazır Yedek Açığı · Tanımlı yedek yok · Tek yedek bağımlılığı); yeni
        skor/öneri/sıralama üretilmez. Nihai değerlendirme yönetici ve İK kalibrasyonunda yapılır.`)}
      <div class="rq-controls" id="rq_controls">
        ${multiselectField("rq_type","Risk türü", _rqTypeOpts)}
        ${multiselectField("rq_firma","Firma", _rqFirmaOpts)}
        ${multiselectField("rq_seviye","Seviye", _rqSeviyeOpts)}
        <div class="field"><label>&nbsp;</label>
          <button class="btn secondary small" id="rq_reset">Filtreleri temizle</button></div>
      </div>
      <div id="rq_counts"></div>
      <div id="rq_table"></div>
    </section>

    <!-- Bağlam (sakin, ikincil) -->
    <section class="exec-section exec-context">
      <div class="section-head"><h3 class="muted-head">Bağlam</h3></div>
      <div class="distros">
        <div class="panel"><h4>Aciliyet Dağılımı</h4>${renderBars(urgDist)}</div>
        <div class="panel"><h4>Seviye Bazında Kapsam</h4>
          ${buildTable(
            [{key:"Seviye",label:"Seviye"},{key:"Pozisyon",label:"Pozisyon"},
             {key:"Yedeği Var",label:"Yedeği Var"},{key:"Kapsam %",label:"Kapsam %"},
             {key:"Ort. Risk",label:"Ort. Risk"}], _levelCoverage(poz))}
        </div>
      </div>
      <div class="caption">Risk dağılımı — ortalama ${s.risk_mean.toFixed(1).replace(".",",")} ·
        medyan ${s.risk_median.toFixed(1).replace(".",",")} ·
        maks ${s.risk_max.toFixed(1).replace(".",",")}.
        Veri salt-okunur; risk ve Göreve Hazır değerleri yeniden hesaplanmaz.</div>
    </section>
  `;

  // KPI/sinyal drill-down olayları (data-drill: signal-card, stat-link)
  el.querySelectorAll("[data-drill]").forEach(card => {
    const go = () => _renderExecDrill(card.getAttribute("data-drill"));
    card.onclick = go;
    card.onkeydown = e => { if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } };
  });
  // Kritik liste + Öncelikli Pozisyonlar satırları "Detayda aç" deep-link (data-pos → openInDetail)
  el.querySelectorAll(".exec-section [data-pos]").forEach(btn =>
    btn.onclick = () => openInDetail(Number(btn.getAttribute("data-pos"))));
  // "Tüm açık halefiyet risklerini görüntüle" → mevcut Risk Kuyruğu bölümüne güvenli scroll.
  const _prioAll = el.querySelector("[data-prio-all]");
  if(_prioAll) _prioAll.onclick = () => {
    const t = document.getElementById("rq_controls");
    if(t) t.scrollIntoView({behavior:"smooth", block:"start"});
  };

  // --- TIER 4: Açık Halefiyet Riskleri (Karar Kuyruğu) güncelleme + bağlama ---
  const _rqCountsEl = document.getElementById("rq_counts");
  const _rqTableEl = document.getElementById("rq_table");
  const _rqCols = [
    {key:"_pos",label:"Pozisyon",cls:"wrap-cell",rawFmt:(v,r)=>
      `<div class="cl-pos"><b>${esc(disp(r.p["Pozisyon"]))}</b><span>${esc(disp(r.p["İsim"]))} · ${esc(disp(r.p["Firma"]))} · ${esc(disp(r.p["Şehir"]))}</span></div>`},
    {key:"_why",label:"Neden riskli?",rawFmt:(v,r)=>
      `${badge(disp(r.p["Aciliyet_Final"]))}<div class="cl-sub">Risk ${esc(disp(r.p["Toplam_Risk"]))}</div>`},
    {key:"_flags",label:"Açık riskler",cls:"wrap-cell",rawFmt:(v,r)=>
      r.flags.map(f=>badge(SUCCESSION_RISK_FLAGS[f].label, SUCCESSION_RISK_FLAGS[f].tone)).join(" ")},
    {key:"_bk",label:"Tanımlı yedek",rawFmt:(v,r)=>String(lookupBackups(r.p["İsim"]).length)},
    {key:"_act",label:"",rawFmt:(v,r)=>`<button class="btn secondary small" data-pos="${r.idx}">Detayda aç →</button>`},
  ];
  function _rqUpdate(){
    const selTypes = getMultiselect("rq_type").map(l => _rqLabelToKey[l]).filter(Boolean);
    const selF = getMultiselect("rq_firma");
    const selS = getMultiselect("rq_seviye");
    const items = _rqAll.filter(o =>
      (!selF.length || selF.includes(String(o.p["Firma"]).trim())) &&
      (!selS.length || selS.includes(String(o.p["Seviye"]).trim())) &&
      (!selTypes.length || o.flags.some(f => selTypes.includes(f))));
    items.sort((a,b)=>{
      const ra=urgencyRank(a.p[C.URGENCY]), rb=urgencyRank(b.p[C.URGENCY]);
      if(ra!==rb) return ra-rb;
      const xa=num(a.p[C.RISK_TOTAL]), xb=num(b.p[C.RISK_TOTAL]);
      return (Number.isNaN(xb)?-Infinity:xb)-(Number.isNaN(xa)?-Infinity:xa);
    });
    // Canlı sayım şeridi (filtrelenen kuyruktaki bayrak kırılımı; bir pozisyon >1 bayrak taşıyabilir)
    const fc = {};
    SUCCESSION_RISK_ORDER.forEach(k => fc[k] = items.filter(o=>o.flags.includes(k)).length);
    _rqCountsEl.innerHTML = `<div class="metric-grid rq-counts">
      ${metricCard("Kuyruktaki pozisyon", items.length, "en az bir açık risk")}
      ${SUCCESSION_RISK_ORDER.map(k =>
        metricCard(SUCCESSION_RISK_FLAGS[k].label, fc[k], "")).join("")}
    </div>`;
    _rqTableEl.innerHTML = items.length ? buildTable(_rqCols, items)
      : emptyState("Seçili filtrelerle açık risk taşıyan pozisyon yok.");
    _rqTableEl.querySelectorAll("[data-pos]").forEach(btn =>
      btn.onclick = () => openInDetail(Number(btn.getAttribute("data-pos"))));
  }
  document.querySelectorAll("#rq_controls select").forEach(sel => sel.onchange = _rqUpdate);
  const _rqReset = document.getElementById("rq_reset");
  if(_rqReset) _rqReset.onclick = () => {
    ["rq_type","rq_firma","rq_seviye"].forEach(id => {
      const s2 = document.getElementById(id); if(s2)[...s2.options].forEach(o=>o.selected=false);
    });
    _rqUpdate();
  };
  _rqUpdate();
}
