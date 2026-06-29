/* exec.js — Ekran 1: Yönetici Karar Özeti (+ Yönetici Özeti)
   Referans: views.render_executive_decision_view & render_summary_view
   Faz 1: Ready-now metrikleri + KPI kartlarından filtreli drill-down. */

function _priorityColumns(){
  return C.EXEC_PRIORITY.map(([key,label]) => {
    if(key === "Aciliyet_Final") return {key,label,rawFmt:v=>badge(disp(v))};
    if(key === "Yedek_Var") return {key,label,rawFmt:v=>{
      const has = normalizeValue(v)==="evet"; return badge(has?"Var":"Yok", has?"success":"danger");
    }};
    return {key,label,fmt:v=>disp(v)};
  });
}

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

/* Tıklanabilir KPI sarmalayıcı (drill-down). */
function _drill(id, html){
  return `<div class="drillable" data-drill="${id}" role="button" tabindex="0">${html}</div>`;
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
  host.innerHTML = `<div class="panel">
    <h3 style="margin-top:0">Drill-down: ${esc(def.title)} <span class="muted">(${subset.length})</span></h3>
    ${subset.length ? buildTable(cols, subset) : emptyState("Bu filtreyle eşleşen pozisyon yok.")}
  </div>`;
  host.querySelectorAll("[data-pos]").forEach(btn =>
    btn.onclick = () => openInDetail(Number(btn.getAttribute("data-pos"))));
  host.scrollIntoView({behavior:"smooth", block:"start"});
}

function renderExec(el){
  const poz = DATA.positions;
  const s = calculateSummary(poz);
  const rn = readyNowStats();
  const q = DATA.quality.counts;

  const kpis1 = [
    kpiCard("Toplam Pozisyon", s.critical_count, "", "brand"),
    _drill("acil", kpiCard("ACİL", s.acil, "En yüksek aciliyet · detaya git", "danger")),
    kpiCard("YÜKSEK", s.yuksek, "Yakından izleyin", "warning"),
  ].join("");
  const kpis2 = [
    _drill("nobackup", kpiCard("Tanımlı Yedeği Olmayan", s.coverage_absent, "Detaya git", "danger")),
    kpiCard("Yedek Kapsamı", "%"+trPct(100*s.coverage_ratio), "En az bir tanımlı yedek", "success"),
    _drill("highrisk", kpiCard("Yüksek Risk (ACİL+YÜKSEK)", s.high_risk_count,
            "Toplamın %"+trPct(100*s.high_risk_ratio)+"'si · detaya git", "warning")),
  ].join("");
  // Faz 1 — Ready-now (kayıt vs pozisyon ayrı; hazır kapasite)
  const kpis3 = [
    kpiCard("Ready-now Coverage (Pozisyon Bazlı)",
            rn.coverage + " · %"+trPct(100*rn.coverageRatio),
            "Hazır halefi olan pozisyon / toplam", "info"),
    _drill("readygap", kpiCard("Ready-now Açığı (ACİL+YÜKSEK)", rn.gap,
            rn.acilYuksek + " riskli pozisyonda · detaya git", "danger")),
    kpiCard("Ready-now Yedek Kaydı", rn.readyRecords,
            "Kayıt bazlı (pozisyon değil)", "neutral"),
  ].join("");

  const focus = [];
  if(s.acil>0) focus.push(`🔴 <b>${s.acil} ACİL pozisyon</b> — önce bunlara yedek/aksiyon planlayın.`);
  if(rn.gap>0) focus.push(`🟠 <b>${rn.gap} ACİL/YÜKSEK pozisyonun hazır halefi yok</b> (Ready-now açığı) — yedek hazırlık önceliği.`);
  if(s.coverage_absent>0) focus.push(`🟠 <b>${s.coverage_absent} pozisyonun tanımlı yedeği yok</b> — yedek belirleme önceliği.`);
  focus.push("✅ Risk ve hazırlık (HAZIR) değerleri kaynaktan okunur; bu demoda yeniden hesaplanmaz.");

  const topAY = acilYuksekTop(poz, 10);
  const nb = noBackupPositions(poz);
  const cols = _priorityColumns();

  const urgDist = {};
  C.URGENCY_ORDER.forEach(u => urgDist[u] = s.urgency_counts[u]||0);
  Object.keys(s.urgency_counts).forEach(k => { if(!(k in urgDist)) urgDist[k]=s.urgency_counts[k]; });

  el.innerHTML = `
    <h2>Yönetici Karar Özeti</h2>
    <p><b>Eksim Talent &amp; Succession Cockpit</b> — kritik pozisyonların yedeklilik
    riskini görür, <b>hazır halef (Ready-now)</b> kapasitesini değerlendirir ve takip
    önceliklerini belirlersiniz. KPI kartlarına tıklayarak ilgili pozisyon listesine inebilirsiniz.</p>

    ${note("info", `Veri, salt-okunur Excel dosyalarından üretilmiştir; otomatik atama/yedeklik
      kararı veya skor üretilmez. Veri Kalitesi: ${q.error} hata · ${q.warning} uyarı ·
      ${q.info} bilgi (ayrıntı: Veri Kalitesi sekmesi).
      <br>Bu public demo <b>yalnızca görüntüleme ve filtreleme</b> sunar; aksiyon kaydı tutulmaz.`)}
    <div class="caption">Veri dosyası referans tarihi: ${esc(DATA.meta.generated_at)}</div>

    <h3>Bugün neye odaklanmalıyım?</h3>
    <div class="kpi-grid">${kpis1}</div>
    <div class="kpi-grid">${kpis2}</div>
    <div class="kpi-grid">${kpis3}</div>
    <div class="caption">ℹ️ <b>Yedek Kapsamı (%${trPct(100*s.coverage_ratio)})</b> = en az bir
      <i>tanımlı</i> yedeği olan pozisyon oranı. <b>Ready-now Coverage (%${trPct(100*rn.coverageRatio)})</b> =
      en az bir <i>hazır</i> halefi (YETENEK HAZIR / DOĞAL + HAZIR) olan pozisyon oranı. İki ölçü farklıdır.</div>
    <div id="exec_drill"></div>
    <div class="panel"><ul>${focus.map(f=>`<li>${f}</li>`).join("")}</ul></div>

    <h3>Öncelik Görünümü</h3>
    <div class="caption">ACİL ve YÜKSEK Riskli İlk 10 Pozisyon</div>
    ${topAY.length ? buildTable(cols, topAY)
      : emptyState("ACİL veya YÜKSEK riskli pozisyon yok.")}
    <div class="caption" style="margin-top:14px">Yedek Olmayan Pozisyonlar (${nb.length})</div>
    ${nb.length ? buildTable(cols, nb.slice(0,15))
      : emptyState("Tanımlı yedeği olmayan pozisyon yok — kapsama tam görünüyor.")}
    ${nb.length>15 ? `<div class="caption">İlk 15 gösteriliyor (toplam ${nb.length}).</div>`:""}

    <h2 style="margin-top:26px">Yönetici Özeti</h2>
    <div class="metric-grid">
      ${metricCard("Toplam Pozisyon", s.critical_count)}
      ${metricCard("🔴 ACİL", s.acil)}
      ${metricCard("🟠 YÜKSEK", s.yuksek)}
      ${metricCard("Ortalama Risk", s.risk_mean.toFixed(1).replace(".",","))}
    </div>
    <div class="metric-grid">
      ${metricCard("Yüksek Risk (ACİL+YÜKSEK)", s.high_risk_count, "Toplamın %"+trPct(100*s.high_risk_ratio)+"'si")}
      ${metricCard("Yedek Kapsamı", "%"+trPct(100*s.coverage_ratio), "en az bir tanımlı yedek")}
      ${metricCard("Yedeği Var", s.coverage_present)}
      ${metricCard("Yedeği Yok", s.coverage_absent)}
    </div>
    <div class="caption">Risk dağılımı — medyan ${s.risk_median.toFixed(1).replace(".",",")} ·
      maks ${s.risk_max.toFixed(1).replace(".",",")}</div>

    <div class="distros" style="margin-top:12px">
      <div class="panel"><h3>Aciliyet Dağılımı</h3>${renderBars(urgDist)}</div>
      <div class="panel"><h3>Seviye Bazında Kapsam</h3>
        ${buildTable(
          [{key:"Seviye",label:"Seviye"},{key:"Pozisyon",label:"Pozisyon"},
           {key:"Yedeği Var",label:"Yedeği Var"},{key:"Kapsam %",label:"Kapsam %"},
           {key:"Ort. Risk",label:"Ort. Risk"}], _levelCoverage(poz))}
      </div>
    </div>
  `;

  // KPI drill-down olayları
  el.querySelectorAll("[data-drill]").forEach(card => {
    const go = () => _renderExecDrill(card.getAttribute("data-drill"));
    card.onclick = go;
    card.onkeydown = e => { if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } };
  });
}
