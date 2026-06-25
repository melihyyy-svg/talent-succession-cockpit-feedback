/* exec.js — Ekran 1: Yönetici Karar Özeti (+ Yönetici Özeti)
   Referans: views.render_executive_decision_view & render_summary_view */

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

function renderExec(el){
  const poz = DATA.positions;
  const s = calculateSummary(poz);
  const q = DATA.quality.counts;

  const kpis1 = [
    kpiCard("Toplam Pozisyon", s.critical_count, "", "brand"),
    kpiCard("ACİL", s.acil, "En yüksek aciliyet", "danger"),
    kpiCard("YÜKSEK", s.yuksek, "Yakından izleyin", "warning"),
  ].join("");
  const kpis2 = [
    kpiCard("Tanımlı Yedeği Olmayan", s.coverage_absent, "Yedek belirleme önceliği", "danger"),
    kpiCard("Yedek Kapsamı", "%"+trPct(100*s.coverage_ratio), "", "success"),
    kpiCard("Yüksek Risk (ACİL+YÜKSEK)", s.high_risk_count,
            "Toplamın %"+trPct(100*s.high_risk_ratio)+"'si", "warning"),
  ].join("");

  const focus = [];
  if(s.acil>0) focus.push(`🔴 <b>${s.acil} ACİL pozisyon</b> — önce bunlara yedek/aksiyon planlayın (Pozisyon &amp; Yedek Detayı).`);
  if(s.coverage_absent>0) focus.push(`🟠 <b>${s.coverage_absent} pozisyonun tanımlı yedeği yok</b> — yedek belirleme önceliği.`);
  focus.push("✅ Risk değerleri kaynaktan okunur; bu demoda yeniden hesaplanmaz.");

  const topAY = acilYuksekTop(poz, 10);
  const nb = noBackupPositions(poz);
  const cols = _priorityColumns();

  const urgDist = {};
  C.URGENCY_ORDER.forEach(u => urgDist[u] = s.urgency_counts[u]||0);
  Object.keys(s.urgency_counts).forEach(k => { if(!(k in urgDist)) urgDist[k]=s.urgency_counts[k]; });

  el.innerHTML = `
    <h2>Yönetici Karar Özeti</h2>
    <p><b>Eksim Talent &amp; Succession Cockpit</b> — kritik pozisyonların yedeklilik
    riskini görür, yedek/aday durumunu değerlendirir ve takip önceliklerini belirlersiniz.
    Aşağıdaki <b>"Bugün neye odaklanmalıyım?"</b> alanıyla başlayın.</p>

    ${note("info", `Veri, salt-okunur Excel dosyalarından üretilmiştir; otomatik atama/yedeklik
      kararı veya skor üretilmez. Veri Kalitesi: ${q.error} hata · ${q.warning} uyarı ·
      ${q.info} bilgi (ayrıntı: Veri Kalitesi sekmesi).
      <br>Bu public demo <b>yalnızca görüntüleme ve filtreleme</b> sunar; aksiyon kaydı tutulmaz.
      Geri bildirimlerinizi sayfanın altındaki <b>Geri Bildirim</b> alanından iletebilirsiniz.`)}
    <div class="caption">Veri dosyası referans tarihi: ${esc(DATA.meta.generated_at)}</div>

    <h3>Bugün neye odaklanmalıyım?</h3>
    <div class="kpi-grid">${kpis1}</div>
    <div class="kpi-grid">${kpis2}</div>
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
      ${metricCard("Yedek Kapsamı", "%"+trPct(100*s.coverage_ratio))}
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
}
