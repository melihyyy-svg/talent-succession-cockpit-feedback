/* heatmap.js — Ekran: Halefiyet Sağlığı Isı Haritası
   Firma × Seviye kırılımında succession riski / Ready-now açığı yoğunluğu.
   YALNIZCA mevcut positions/backups verisi ve mevcut hesap fonksiyonları (risk,
   aciliyet, hasBackup, positionHasReady) üzerinden AGREGASYON. Yeni veri/skor/AI yok;
   gizli "health score" üretilmez. N+1/raporlama hattı/org ağacı gösterilmez. */

const SEVIYE_ORDER = ["Başkan / GM", "Direktör / GMY", "Müdür"];

/* Lens tanımları — her biri mevcut bir yüklemin grup içi sayımıdır. */
const HEAT_LENSES = {
  gap: {
    label:"Kritik Ready-now Açığı", unit:"kritik açık", higherWorse:true,
    desc:"ACİL veya YÜKSEK olup Ready-now halefi bulunmayan pozisyonların oranı ve sayısı.",
    metric:p => C.HIGH_RISK.includes(String(p[C.URGENCY]).trim()) && !positionHasReady(p),
  },
  coverage: {
    label:"Ready-now Coverage", unit:"korunaklı", higherWorse:false,
    desc:"En az bir Ready-now halefi bulunan pozisyonların oranı.",
    metric:p => positionHasReady(p),
  },
  nobackup: {
    label:"Tanımlı Yedek Açığı", unit:"yedeksiz", higherWorse:true,
    desc:"Tanımlı yedeği olmayan pozisyonların oranı ve sayısı.",
    metric:p => !hasBackup(p),
  },
  highrisk: {
    label:"Yüksek Risk Yoğunluğu", unit:"yüksek riskli", higherWorse:true,
    desc:"Yüksek risk (ACİL + YÜKSEK) pozisyonların oranı ve sayısı.",
    metric:p => C.HIGH_RISK.includes(String(p[C.URGENCY]).trim()),
  },
};

const _heatState = { lens:"gap", firma:[], seviye:[], criticalOnly:false };

/* Firma listesi (satır) ve Seviye listesi (sütun) — mevcut veriden. */
function _heatAxes(){
  const firmas = [...new Set(DATA.positions.filter(p=>!isBlank(p["Firma"]))
    .map(p=>String(p["Firma"]).trim()))].sort((a,b)=>a.localeCompare(b,"tr"));
  const present = new Set(DATA.positions.map(p=>String(p["Seviye"]).trim()));
  const seviyes = SEVIYE_ORDER.filter(s=>present.has(s))
    .concat([...present].filter(s=>s && !SEVIYE_ORDER.includes(s)).sort((a,b)=>a.localeCompare(b,"tr")));
  return {firmas, seviyes};
}

function _group(firma, seviye){
  return DATA.positions.filter(p =>
    String(p["Firma"]).trim()===firma && String(p["Seviye"]).trim()===seviye);
}

/* Bir grubun aktif lense göre özeti. */
function _cellStat(group, lens){
  const total = group.length;
  const count = group.filter(lens.metric).length;
  const ratio = total ? count/total : 0;
  const risk = group.reduce((a,p)=>a + (Number.isNaN(num(p[C.RISK_TOTAL]))?0:num(p[C.RISK_TOTAL])), 0);
  return {total, count, ratio, risk};
}

/* Kritik gap (varsayılan kavram) — "yalnızca kritik açık" filtresi için. */
function _criticalGapCount(group){
  return group.filter(p => C.HIGH_RISK.includes(String(p[C.URGENCY]).trim()) && !positionHasReady(p)).length;
}

function _cellTone(ratio, higherWorse, total){
  if(!total) return "none";
  if(higherWorse){
    if(ratio>=0.5) return "danger";
    if(ratio>=0.25) return "warning";
    return "success";            // düşük açık = sağlıklı
  }
  if(ratio>=0.5) return "success";
  if(ratio>=0.25) return "warning";
  return "danger";               // düşük coverage = zayıf
}

/* Bir grup için drill temsil pozisyonu (en öncelikli): aciliyet→risk sıralı ilk. */
function _repIndex(group){
  if(!group.length) return null;
  const rep = sortByUrgencyThenRisk(group)[0];
  return DATA.positions.indexOf(rep);
}

let _heatUpdate = () => {};

function renderHeatmap(el){
  const axes = _heatAxes();
  const firmaOpts = axes.firmas, seviyeOpts = axes.seviyes;

  el.innerHTML = `
    <header class="exec-head">
      <div class="exec-head-main">
        <div class="exec-eyebrow">HALEFİYET SAĞLIĞI</div>
        <h2 class="exec-title">Halefiyet Sağlığı Isı Haritası</h2>
        <p class="exec-lede">Risk ve hazır halef açığının şirket ve seviye bazında
          yoğunlaştığı alanları inceleyin.</p>
      </div>
    </header>
    ${note("info", `Bu görünüm mevcut risk, aciliyet, tanımlı yedek ve Ready-now verilerinin
      şirket/seviye bazında gruplanmış özetidir. Gizli bileşik skor üretilmez; gerçek N+1 /
      raporlama hattı gösterilmez. Nihai değerlendirme yönetici ve İK kalibrasyonunda yapılır.`)}

    <div class="heat-controls">
      <div class="field"><label for="heat_lens">Lens</label>
        <select id="heat_lens">
          ${Object.entries(HEAT_LENSES).map(([k,l])=>
            `<option value="${k}" ${k===_heatState.lens?"selected":""}>${esc(l.label)}</option>`).join("")}
        </select></div>
      ${multiselectField("heat_firma","Firma", firmaOpts)}
      ${multiselectField("heat_seviye","Seviye", seviyeOpts)}
      <div class="field"><label>Görünüm</label>
        <label class="chk"><input type="checkbox" id="heat_crit" ${_heatState.criticalOnly?"checked":""}>
          Yalnızca kritik açık taşıyan gruplar</label>
        <button class="btn secondary small" id="heat_reset" style="margin-top:6px">Haritayı sıfırla</button>
      </div>
    </div>

    <div id="heat_legend" class="heat-legend"></div>
    <div id="heat_grid"></div>

    <div class="section-head" style="margin-top:26px"><h3>Öncelikli İncelenecek Alanlar</h3></div>
    <div class="caption">Sıralama, mevcut verideki açık sayısı ve oranına göre yapılır;
      önceliklendirme kalibrasyon toplantısında değerlendirilmelidir.</div>
    <div id="heat_priority"></div>
  `;

  const gridEl = document.getElementById("heat_grid");
  const legendEl = document.getElementById("heat_legend");
  const prioEl = document.getElementById("heat_priority");

  _heatUpdate = function(){
    const lens = HEAT_LENSES[_heatState.lens];
    const selF = getMultiselect("heat_firma");
    const selS = getMultiselect("heat_seviye");
    let firmas = axes.firmas.filter(f => !selF.length || selF.includes(f));
    let seviyes = axes.seviyes.filter(s => !selS.length || selS.includes(s));

    // Yalnızca kritik açık taşıyan gruplar -> ilgili firma satırlarını sınırla
    if(_heatState.criticalOnly){
      firmas = firmas.filter(f => seviyes.some(s => _criticalGapCount(_group(f,s))>0));
    }

    // --- Legend (dinamik) ---
    const hw = lens.higherWorse;
    legendEl.innerHTML = `<div class="legend-row">
      <b>${esc(lens.label)}:</b> <span class="muted">${esc(lens.desc)}</span></div>
      <div class="legend-keys">
        ${hw
          ? `<span class="lk t-danger">Yüksek oran · daha fazla açık</span>
             <span class="lk t-warning">Orta</span>
             <span class="lk t-success">Düşük · sağlıklı</span>`
          : `<span class="lk t-success">Yüksek oran · güçlü coverage</span>
             <span class="lk t-warning">Orta</span>
             <span class="lk t-danger">Düşük · zayıf</span>`}
        <span class="lk t-none">Kayıt yok</span>
      </div>
      <div class="caption">Renk tek başına anlam taşımaz; her hücrede sayı ve oran görünür.</div>`;

    // --- Heatmap grid (tablo) ---
    if(!firmas.length || !seviyes.length){
      gridEl.innerHTML = emptyState("Seçili filtrelerle gösterilecek grup yok.");
    } else {
      let html = `<div class="table-scroll"><table class="heatmap"><thead><tr><th class="hm-corner">Firma \\ Seviye</th>`;
      seviyes.forEach(s => html += `<th>${esc(s)}</th>`);
      html += `</tr></thead><tbody>`;
      firmas.forEach(f => {
        html += `<tr><th class="hm-rowhead">${esc(f)}</th>`;
        seviyes.forEach(s => {
          const g = _group(f,s);
          const st = _cellStat(g, lens);
          const tone = _cellTone(st.ratio, hw, st.total);
          if(!st.total){
            html += `<td class="heat-cell t-none"><div class="hc-empty">Kayıt yok</div></td>`;
          } else {
            const idx = _repIndex(g);
            html += `<td class="heat-cell t-${tone}">
              <button class="hc-btn" data-firma="${esc(f)}" data-seviye="${esc(s)}" data-rep="${idx}">
                <div class="hc-main">${st.count} <span class="hc-unit">${esc(lens.unit)}</span></div>
                <div class="hc-ratio">%${trPct(100*st.ratio)}</div>
                <div class="hc-total">${st.total} pozisyon içinde</div>
              </button></td>`;
          }
        });
        html += `</tr>`;
      });
      html += `</tbody></table></div>`;
      gridEl.innerHTML = html;
    }

    // --- Öncelik listesi (aktif lense göre) ---
    const groups = [];
    firmas.forEach(f => seviyes.forEach(s => {
      const g = _group(f,s);
      if(!g.length) return;
      const st = _cellStat(g, lens);
      const gap = _criticalGapCount(g);
      const ready = g.filter(positionHasReady).length;
      const nb = g.filter(p=>!hasBackup(p)).length;
      groups.push({f, s, g, st, gap, ready, nb});
    }));
    // higherWorse: dikkat = count desc; coverage: dikkat = açık (total-count) desc
    const attn = o => HEAT_LENSES[_heatState.lens].higherWorse ? o.st.count : (o.st.total - o.st.count);
    groups.sort((a,b)=> attn(b)-attn(a) || b.st.ratio-a.st.ratio || b.st.risk-a.st.risk);
    const shown = groups.filter(o => (_heatState.criticalOnly ? o.gap>0 : true)).slice(0,12);

    if(!shown.length){
      prioEl.innerHTML = emptyState("Seçili kapsam/filtre ile öncelikli alan yok.");
    } else {
      const cols = [
        {key:"f",label:"Firma",fmt:v=>v},
        {key:"s",label:"Seviye",fmt:v=>v},
        {key:"gap",label:"Kritik açık / toplam",rawFmt:(v,r)=>`${r.gap} / ${r.st.total}`},
        {key:"cov",label:"Ready-now coverage",rawFmt:(v,r)=>`${r.ready}/${r.st.total} · %${trPct(100*(r.st.total?r.ready/r.st.total:0))}`},
        {key:"nb",label:"Tanımlı yedek açığı",rawFmt:(v,r)=>`${r.nb}`},
        {key:"act",label:"",rawFmt:(v,r)=>`<button class="btn secondary small" data-firma="${esc(r.f)}" data-seviye="${esc(r.s)}" data-rep="${_repIndex(r.g)}">Pozisyonları incele →</button>`},
      ];
      prioEl.innerHTML = buildTable(cols, shown);
    }

    // Drill bağlama (hücre + öncelik listesi)
    gridEl.querySelectorAll(".hc-btn[data-rep]").forEach(_wireHeatDrill);
    prioEl.querySelectorAll("[data-rep]").forEach(_wireHeatDrill);
  };

  function _wireHeatDrill(btn){
    btn.onclick = () => {
      const rep = Number(btn.getAttribute("data-rep"));
      if(Number.isNaN(rep) || rep<0) return;
      openInDetailContext({
        firma: btn.getAttribute("data-firma"),
        seviye: btn.getAttribute("data-seviye"),
        lens: HEAT_LENSES[_heatState.lens].label,
        positionIndex: rep,
      });
    };
  }

  document.getElementById("heat_lens").onchange = e => { _heatState.lens = e.target.value; _heatUpdate(); };
  document.getElementById("heat_firma").onchange = _heatUpdate;
  document.getElementById("heat_seviye").onchange = _heatUpdate;
  document.getElementById("heat_crit").onchange = e => { _heatState.criticalOnly = e.target.checked; _heatUpdate(); };
  document.getElementById("heat_reset").onclick = () => {
    _heatState.lens="gap"; _heatState.criticalOnly=false;
    document.getElementById("heat_lens").value="gap";
    document.getElementById("heat_crit").checked=false;
    ["heat_firma","heat_seviye"].forEach(id=>{const s=document.getElementById(id);[...s.options].forEach(o=>o.selected=false);});
    _heatUpdate();
  };
  _heatUpdate();
}
