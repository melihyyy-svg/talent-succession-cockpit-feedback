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
  readygap: {title:"ACİL + YÜKSEK riskli pozisyonlarda Ready-now açığı (hazır halef yok)",
             filter:p=>C.HIGH_RISK.includes(String(p[C.URGENCY]).trim()) && !positionHasReady(p)},
};

/* Mevcut durumdan deterministik "sonraki adım" etiketi (yeni mantık/metrik DEĞİL;
   mevcut hasBackup / positionHasReady yüklemlerinin sunumu). */
function _nextStep(p){
  if(!hasBackup(p)) return ["Yedek belirle","danger"];
  if(!positionHasReady(p)) return ["Halef hazırlığı","warning"];
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
    {key:"_ready",label:"Hazır Halef",rawFmt:(v,r)=>positionHasReady(r)
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

/* Tier 1 — kritik sinyal kartı (tıklanabilir; drill tetikler). */
function _signal(id, tone, num, label, action){
  return `<button class="signal-card t-${tone}" data-drill="${id}">
    <div class="sig-num">${esc(num)}</div>
    <div class="sig-label">${esc(label)}</div>
    <div class="sig-action">${esc(action)}<span class="sig-go">Detaya in ›</span></div>
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
      <div class="cov-head"><span class="cov-name">Ready-now (Hazır Halef) Kapsamı</span>
        <span class="cov-val warn">%${trPct(ready)}</span></div>
      <div class="cov-bar"><div class="cov-fill weak" style="width:${ready.toFixed(1)}%"></div></div>
      <div class="cov-meaning">${rn.coverage}/${rn.total} pozisyonun <b>hazır halefi</b> var
        (YETENEK HAZIR / DOĞAL + HAZIR).</div>
    </div>
    <div class="cov-gap">⚠️ <b>${gap} pozisyon</b> tanımlı yedeğe sahip ama <b>hazır halefi yok</b>.
      <span class="muted">"Yedek var" ≠ "hazır halef" — kapsam, gerçek hazırlığı göstermez.</span></div>
  </div>`;
}

function renderExec(el){
  const poz = DATA.positions;
  const s = calculateSummary(poz);
  const rn = readyNowStats();
  const q = DATA.quality.counts;
  const dq = q.error>0 ? "err" : (q.warning>0 ? "warn" : "ok");

  // Kritik karar listesi: ACİL+YÜKSEK öncelikli (ilk 12), zengin sütunlar.
  const critical = acilYuksekTop(poz, 12);
  const critCols = [
    {key:"_pos",label:"Pozisyon",cls:"wrap-cell",rawFmt:(v,r)=>
      `<div class="cl-pos"><b>${esc(disp(r["Pozisyon"]))}</b><span>${esc(disp(r["İsim"]))} · ${esc(disp(r["Firma"]))} · ${esc(disp(r["Şehir"]))}</span></div>`},
    {key:"_why",label:"Neden riskli?",rawFmt:(v,r)=>
      `${badge(disp(r["Aciliyet_Final"]))}<div class="cl-sub">Risk ${esc(disp(r["Toplam_Risk"]))}</div>`},
    {key:"_succ",label:"Halef durumu",rawFmt:(v,r)=>{
      const ready = positionHasReady(r); const n = lookupBackups(r["İsim"]).length;
      return `${badge(ready?"Hazır halef var":"Hazır halef yok", ready?"success":(hasBackup(r)?"warning":"danger"))}<div class="cl-sub">${n} tanımlı yedek</div>`;}},
    {key:"_next",label:"Sonraki adım",rawFmt:(v,r)=>{const ns=_nextStep(r); return badge(ns[0],ns[1]);}},
    {key:"_act",label:"",rawFmt:(v,r)=>`<button class="btn secondary small" data-pos="${DATA.positions.indexOf(r)}">Detayda aç →</button>`},
  ];

  const urgDist = {};
  C.URGENCY_ORDER.forEach(u => urgDist[u] = s.urgency_counts[u]||0);
  Object.keys(s.urgency_counts).forEach(k => { if(!(k in urgDist)) urgDist[k]=s.urgency_counts[k]; });

  el.innerHTML = `
    <header class="exec-head">
      <div class="exec-head-main">
        <div class="exec-eyebrow">YÖNETİCİ KARAR ÖZETİ</div>
        <h2 class="exec-title">Bugün yönetimin müdahale etmesi gereken alanlar</h2>
        <p class="exec-lede">Kritik pozisyonların yedeklilik riskini ve <b>hazır halef
          (Ready-now)</b> kapasitesini tek bakışta görün; en kritik sinyallerden pozisyon
          detayına inin.</p>
      </div>
      <div class="exec-meta">
        <span class="meta-chip">${s.critical_count} pozisyon</span>
        <span class="meta-chip">Veri: ${esc(DATA.meta.generated_at)}</span>
        <span class="meta-chip dq-${dq}">Veri Kalitesi: ${q.error}·${q.warning}·${q.info}</span>
      </div>
    </header>

    <!-- TIER 1 — Kritik Sinyaller -->
    <section class="exec-section">
      <div class="section-head"><h3>1 · Karar gerektiren kritik sinyaller</h3>
        <span class="section-hint">Karta tıklayın → filtreli pozisyon listesi</span></div>
      <div class="signal-grid">
        ${_signal("acil","danger", s.acil, "ACİL pozisyon", "Önce bunlara yedek/aksiyon planlayın")}
        ${_signal("readygap","danger", rn.gap, "ACİL+YÜKSEK · Ready-now açığı", "Hazır halefi yok — hazırlık başlatın")}
        ${_signal("nobackup","warning", s.coverage_absent, "Tanımlı yedeği olmayan pozisyon", "Yedek belirleme önceliği")}
      </div>
      <div id="exec_drill"></div>
    </section>

    <!-- TIER 2 — Succession Sağlığı -->
    <section class="exec-section">
      <div class="section-head"><h3>2 · Succession sağlığı: kapsam ≠ hazırlık</h3></div>
      <div class="panel cov-panel">
        ${_coverageCompare(s, rn)}
        <div class="cov-foot">
          <button class="stat-link" data-drill="highrisk">Yüksek Risk (ACİL+YÜKSEK):
            <b>${s.high_risk_count}</b> · toplamın %${trPct(100*s.high_risk_ratio)}'si <span>›</span></button>
          <span class="muted">Ready-now yedek <b>kaydı</b>: ${rn.readyRecords} (pozisyon değil, kayıt ölçüsü)</span>
        </div>
      </div>
    </section>

    <!-- TIER 3 — Kritik Pozisyon Listesi (aksiyon) -->
    <section class="exec-section">
      <div class="section-head"><h3>3 · Kritik pozisyonlar — sonraki adım</h3>
        <span class="section-hint">ACİL + YÜKSEK öncelikli · ilk ${critical.length} / ${s.high_risk_count}</span></div>
      ${critical.length ? buildTable(critCols, critical)
        : emptyState("ACİL veya YÜKSEK riskli pozisyon yok.")}
      ${s.high_risk_count>critical.length
        ? `<div class="caption">Tümü için yukarıdaki <b>Yüksek Risk</b> kartından inebilirsiniz.</div>`:""}
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
        Veri salt-okunur; risk ve Ready-now değerleri yeniden hesaplanmaz.</div>
    </section>
  `;

  // KPI/sinyal drill-down olayları (data-drill: signal-card, stat-link)
  el.querySelectorAll("[data-drill]").forEach(card => {
    const go = () => _renderExecDrill(card.getAttribute("data-drill"));
    card.onclick = go;
    card.onkeydown = e => { if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } };
  });
  // Kritik liste "Detayda aç" deep-link
  el.querySelectorAll(".exec-section [data-pos]").forEach(btn =>
    btn.onclick = () => openInDetail(Number(btn.getAttribute("data-pos"))));
}
