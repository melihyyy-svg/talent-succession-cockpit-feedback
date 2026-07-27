/* exec.js — Ekran 1: Yönetici Karar Alanı (Talent & Succession çalışma alanı).
   Master–detail workspace: kompakt kritik sinyal şeridi → filtrelenebilir pozisyon listesi
   → seçili pozisyonun detay paneli.

   TÜM değerler MEVCUT hesaplardan gelir (calculateSummary / readyNowStats /
   positionRiskFlags / SUCCESSION_RISK_FLAGS / benchStrength / lookupBackups /
   positionHasReady / hasBackup / urgencyRank). Yeni skor, yeni risk kuralı, yeni
   sıralama mantığı veya tahmin ÜRETİLMEZ.

   Kaynakta BULUNMAYAN alanlar (aksiyon sahibi/termin/durum, son güncelleme tarihi,
   kalibrasyon tarihi, serbest not, zaman-bazlı hazırlık kademesi "1-2 yıl / 3+ yıl")
   UYDURULMAZ: ya dürüst boş durumla gösterilir ya da hiç render edilmez. */

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

/* Kritik sinyal yüklemleri — hepsi MEVCUT kurallardır (yeni eşik/kural yok).
   Bir sinyal seçildiğinde pozisyon listesi bu yükleme göre filtrelenir; kart üzerindeki
   sayı ile listedeki kayıt sayısı bu sayede birebir aynıdır. */
const _DRILL_DEFS = {
  acil:     {title:"Acil pozisyonlar",
             filter:p=>String(p[C.URGENCY]).trim()==="ACİL"},
  readygap: {title:"ACİL + YÜKSEK riskli pozisyonlarda Göreve Hazır Yedek Açığı",
             filter:p=>C.HIGH_RISK.includes(String(p[C.URGENCY]).trim()) && !positionHasReady(p)},
  nobackup: {title:"Tanımlı yedeği olmayan pozisyonlar",
             filter:p=>!hasBackup(p)},
  single:   {title:"Tek yedek bağımlılığı taşıyan pozisyonlar",
             filter:p=>SUCCESSION_RISK_FLAGS.single.test(p)},
  highrisk: {title:"Yüksek Risk — ACİL + YÜKSEK pozisyonlar",
             filter:p=>C.HIGH_RISK.includes(String(p[C.URGENCY]).trim())},
};

/* Mevcut durumdan deterministik "sonraki adım" etiketi (yeni mantık/metrik DEĞİL;
   mevcut hasBackup / positionHasReady yüklemlerinin sunumu). */
function _nextStep(p){
  if(!hasBackup(p)) return ["Yedek belirle","danger"];
  if(!positionHasReady(p)) return ["Yedek hazırlığı","warning"];
  return ["İzle / sürdür","success"];
}

/* Tanımlı Yedek Kapsamı vs Göreve Hazır Kapsamı (mevcut metrikler; değişmedi). */
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

/* === Çalışma alanı durumu (yalnızca UI state; hiçbir veriyi değiştirmez) === */
const WS_ALL = "__all__";
const _wsState = {
  signal: null,        // aktif kritik sinyal (KPI) — null ise "açık riskli" varsayılan kapsam
  firma: WS_ALL, seviye: WS_ALL, risk: WS_ALL, yedek: WS_ALL,
  q: "",               // pozisyon arama
  selected: null,      // seçili pozisyonun DATA.positions indeksi
  expanded: false,     // liste tümünü göster
};
const WS_PAGE = 15;    // varsayılan gösterim: ilk 15 pozisyon

/* Yedek durumu kovaları — mevcut yüklemler (successionEquityByLevel ile aynı mantık). */
const WS_BACKUP_STATES = [
  {v:"ready",  label:"Göreve Hazır Yedek var", test:p => positionHasReady(p)},
  {v:"prep",   label:"Yedek var, hazır değil", test:p => !positionHasReady(p) && lookupBackups(p["İsim"]).length > 0},
  {v:"none",   label:"Tanımlı yedek yok",      test:p => lookupBackups(p["İsim"]).length === 0},
];

/* Aktif filtrelere göre pozisyon kümesi. Sıralama MEVCUT kuyruk düzenidir
   (aciliyet sırası → Toplam Risk azalan); yeni öncelik kuralı üretilmez. */
function _wsItems(){
  const sig = _wsState.signal ? _DRILL_DEFS[_wsState.signal] : null;
  const q = normalizeValue(_wsState.q);
  let items = DATA.positions.map((p, idx) => ({p, idx, flags: positionRiskFlags(p)}));
  // Sinyal seçili değilse varsayılan kapsam: en az bir açık yedekleme riski taşıyanlar.
  items = sig ? items.filter(o => sig.filter(o.p)) : items.filter(o => o.flags.length);
  if(_wsState.firma !== WS_ALL)  items = items.filter(o => String(o.p["Firma"]).trim() === _wsState.firma);
  if(_wsState.seviye !== WS_ALL) items = items.filter(o => String(o.p["Seviye"]).trim() === _wsState.seviye);
  if(_wsState.risk !== WS_ALL)   items = items.filter(o => String(o.p[C.URGENCY]).trim() === _wsState.risk);
  if(_wsState.yedek !== WS_ALL){
    const st = WS_BACKUP_STATES.find(x => x.v === _wsState.yedek);
    if(st) items = items.filter(o => st.test(o.p));
  }
  if(q) items = items.filter(o =>
    normalizeValue(o.p["Pozisyon"]).includes(q) || normalizeValue(o.p["İsim"]).includes(q) ||
    normalizeValue(o.p["Firma"]).includes(q));
  return items.sort((a,b)=>{
    const ra=urgencyRank(a.p[C.URGENCY]), rb=urgencyRank(b.p[C.URGENCY]);
    if(ra!==rb) return ra-rb;
    const xa=num(a.p[C.RISK_TOTAL]), xb=num(b.p[C.RISK_TOTAL]);
    return (Number.isNaN(xb)?-Infinity:xb)-(Number.isNaN(xa)?-Infinity:xa);
  });
}

/* Kompakt kontrol (tek seçim + "Tümü"). */
function _wsSelect(id, label, options, value){
  const opts = [`<option value="${WS_ALL}"${value===WS_ALL?" selected":""}>Tümü</option>`]
    .concat(options.map(o => {
      const v = typeof o === "string" ? o : o.v, t = typeof o === "string" ? o : o.label;
      return `<option value="${esc(v)}"${value===v?" selected":""}>${esc(t)}</option>`;
    })).join("");
  return `<div class="ws-field"><label for="${id}">${esc(label)}</label>
    <select id="${id}" class="ws-select">${opts}</select></div>`;
}

/* Yedek hazırlığı göstergesi — mevcut benchStrength (yalnızca Hazır / diğer aday).
   Kaynakta zaman-bazlı hazırlık kademesi (1-2 yıl / 3+ yıl) YOKTUR; üretilmez. */
function _wsReadiness(p){
  const b = benchStrength(p["İsim"]);
  if(!b.total) return `<span class="ws-rd-none" title="Tanımlı yedek yok">—</span>`;
  return `<span class="ws-rd" title="${b.ready} Göreve Hazır · ${b.other} hazırlanan / diğer aday">
      <span class="ws-rd-i ready"><i></i>${b.ready}</span>
      <span class="ws-rd-i other"><i></i>${b.other}</span>
    </span>`;
}

function renderExec(el){
  const poz = DATA.positions;
  const s = calculateSummary(poz);
  const rn = readyNowStats();

  const urgDist = {};
  C.URGENCY_ORDER.forEach(u => urgDist[u] = s.urgency_counts[u]||0);
  Object.keys(s.urgency_counts).forEach(k => { if(!(k in urgDist)) urgDist[k]=s.urgency_counts[k]; });

  /* Kritik sinyaller — sayılar mevcut hesaplardan; her kart aynı yüklemle listeyi filtreler. */
  const signals = [
    {id:"acil",     tone:"critical", count:s.acil,               title:"Acil Pozisyon",
     desc:"Yedek veya aksiyon planı gerektirir"},
    {id:"readygap", tone:"critical", count:rn.gap,               title:"Göreve Hazır Yedek Açığı",
     desc:"ACİL+YÜKSEK riskli, hazır yedek yok"},
    {id:"nobackup", tone:"warning",  count:s.coverage_absent,    title:"Tanımlı Yedeği Yok",
     desc:"Yedek adayı tanımlanmamış"},
    {id:"single",   tone:"amber",    count:poz.filter(SUCCESSION_RISK_FLAGS.single.test).length,
     title:"Tek Yedek Bağımlılığı", desc:"Tek kişiye bağımlı yedekleme"},
    {id:"highrisk", tone:"neutral",  count:s.high_risk_count,    title:"Yüksek Risk",
     desc:"ACİL + YÜKSEK toplamı"},
  ];

  // Filtre seçenekleri — mevcut veri değerlerinden.
  const firmaOpts = [...new Set(poz.map(p=>String(p["Firma"]).trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,"tr"));
  const SEV_ORDER = ["Başkan / GM","Direktör / GMY","Müdür"];
  const sevPresent = [...new Set(poz.map(p=>String(p["Seviye"]).trim()).filter(Boolean))];
  const seviyeOpts = SEV_ORDER.filter(x=>sevPresent.includes(x))
    .concat(sevPresent.filter(x=>!SEV_ORDER.includes(x)).sort((a,b)=>a.localeCompare(b,"tr")));
  const riskOpts = C.URGENCY_ORDER.filter(u => (s.urgency_counts[u]||0) > 0);

  el.innerHTML = `
    <div class="ws">
      <header class="ws-head">
        <div class="ws-head-main">
          <div class="ws-eyebrow">YÖNETİCİ KARAR ALANI</div>
          <h2 class="ws-title">Kritik Yedekleme Durumu</h2>
          <p class="ws-lede">Kritik pozisyonları, yedekleme risklerini ve aksiyonları yönetin.</p>
        </div>
        <div class="ws-head-meta">
          <span class="ws-pill">${s.critical_count} pozisyon</span>
          ${isBlank(DATA.meta.generated_at) ? ""
            : `<span class="ws-pill">Veri tarihi: ${esc(DATA.meta.generated_at)}</span>`}
        </div>
      </header>

      <div class="ws-controls" id="ws_controls">
        ${_wsSelect("ws_firma","Şirket", firmaOpts, _wsState.firma)}
        ${_wsSelect("ws_seviye","Seviye", seviyeOpts, _wsState.seviye)}
        ${_wsSelect("ws_risk","Risk", riskOpts, _wsState.risk)}
        ${_wsSelect("ws_yedek","Yedek Durumu", WS_BACKUP_STATES.map(x=>({v:x.v,label:x.label})), _wsState.yedek)}
      </div>

      <section class="ws-signals" aria-label="Kritik sinyaller">
        ${signals.map(g => `
          <button class="ws-kpi t-${g.tone}" data-signal="${g.id}"
              aria-pressed="${_wsState.signal===g.id ? "true" : "false"}"
              title="${esc(_DRILL_DEFS[g.id].title)}">
            <span class="ws-kpi-num">${esc(g.count)}</span>
            <span class="ws-kpi-title">${esc(g.title)}</span>
            <span class="ws-kpi-desc">${esc(g.desc)}</span>
          </button>`).join("")}
      </section>
      <div class="caption ws-signal-note">Sinyaller aynı pozisyonda kesişebilir; kartlardaki
        sayılar toplanmaz. Sinyal seçili değilken liste, açık yedekleme riski taşıyan
        pozisyonları gösterir.</div>

      <div class="ws-grid">
        <section class="panel ws-list-panel" aria-label="Öncelikli pozisyonlar">
          <div class="ws-panel-head">
            <h3 class="ws-panel-title">Öncelikli Pozisyonlar</h3>
            <span class="ws-panel-hint" id="ws_scope_hint"></span>
          </div>
          <div class="ws-toolbar">
            <label class="ws-search">
              <span class="sr-only">Pozisyon ara</span>
              <input type="search" id="ws_q" placeholder="Pozisyon, kişi veya şirket ara…"
                value="${esc(_wsState.q)}" autocomplete="off">
            </label>
            <span class="ws-rd-legend" aria-hidden="true">
              <span class="ws-rd-i ready"><i></i>Göreve Hazır</span>
              <span class="ws-rd-i other"><i></i>Diğer aday</span>
            </span>
          </div>
          <div id="ws_chips" class="ws-chips"></div>
          <div id="ws_list"></div>
        </section>

        <aside class="panel ws-detail-panel" id="ws_detail" aria-live="polite"
               aria-label="Seçili pozisyon detayı"></aside>
      </div>

      <section class="exec-section">
        <div class="section-head"><h3>Kapsam ve Hazırlık</h3></div>
        <div class="panel cov-panel">
          ${_coverageCompare(s, rn)}
          <div class="cov-foot">
            <span class="muted">Göreve Hazır yedek <b>kaydı</b>: ${rn.readyRecords}
              (pozisyon değil, kayıt ölçüsü)</span>
          </div>
        </div>
      </section>

      <section class="exec-section exec-context">
        <div class="section-head"><h3 class="muted-head">Bağlam</h3></div>
        <div class="distros">
          <div class="panel"><h4>Aciliyet Dağılımı</h4>${renderBars(urgDist)}</div>
          <div class="panel"><h4>Seviye Bazında Kapsam</h4>
            ${buildTable(
              [{key:"Seviye",label:"Seviye"},{key:"Pozisyon",label:"Pozisyon"},
               {key:"Yedeği Var",label:"Yedeği Var"},{key:"Kapsam %",label:"Kapsam %"},
               {key:"Ort. Risk",label:"Ort. Risk"}], _levelCoverage(poz), {mobileCard:true})}
          </div>
        </div>
        <div class="caption">Risk dağılımı — ortalama ${s.risk_mean.toFixed(1).replace(".",",")} ·
          medyan ${s.risk_median.toFixed(1).replace(".",",")} ·
          maks ${s.risk_max.toFixed(1).replace(".",",")}.
          Veri salt-okunur; risk ve Göreve Hazır değerleri yeniden hesaplanmaz.</div>
      </section>
    </div>
  `;

  const listEl   = el.querySelector("#ws_list");
  const chipsEl  = el.querySelector("#ws_chips");
  const detailEl = el.querySelector("#ws_detail");
  const hintEl   = el.querySelector("#ws_scope_hint");

  /* --- Seçili pozisyon detay paneli (yalnızca mevcut veri) --- */
  function renderDetail(){
    const idx = _wsState.selected;
    const p = (idx != null) ? DATA.positions[idx] : null;
    if(!p){
      detailEl.innerHTML = `<div class="ws-detail-empty">
        ${emptyState("Detayını görmek için listeden bir pozisyon seçin.")}</div>`;
      return;
    }
    const flags = positionRiskFlags(p);
    const bench = benchStrength(p["İsim"]);
    const backups = lookupBackups(p["İsim"]);
    const ns = _nextStep(p);

    const riskRows = flags.length
      ? flags.map(f => `<div class="ws-risk-row">
            ${badge(SUCCESSION_RISK_FLAGS[f].label, SUCCESSION_RISK_FLAGS[f].tone)}
            <span class="ws-risk-desc">${esc(SUCCESSION_RISK_FLAGS[f].desc)}</span>
          </div>`).join("")
      : `<div class="ws-empty-inline">Bu pozisyon için açık yedekleme riski bulunmuyor.</div>`;

    const candList = backups.length
      ? `<ul class="ws-cand-list">${backups.map(b => {
            const ready = isReadyBackup(b);
            return `<li class="ws-cand">
              <span class="ws-cand-main">
                <span class="ws-cand-name">${esc(disp(b["Yedek_İsim"]))}</span>
                <span class="ws-cand-meta">${esc(isBlank(b["Yedek_Görev"]) ? "Görev: Kaynakta belirtilmedi" : b["Yedek_Görev"])}</span>
              </span>
              ${badge(ready ? "Göreve Hazır" : "Hazırlanıyor / değil", ready ? "success" : "warning")}
            </li>`;
          }).join("")}</ul>`
      : `<div class="ws-empty-inline">Tanımlı yedek bulunmuyor.</div>`;

    detailEl.innerHTML = `
      <div class="ws-dt-head">
        <div class="ws-dt-titles">
          <div class="ws-dt-title">${esc(disp(p["Pozisyon"]))}</div>
          <div class="ws-dt-sub">${esc(disp(p["Firma"]))} · ${esc(disp(p["Seviye"]))}
            · ${esc(disp(p["Şehir"]))}</div>
          <div class="ws-dt-sub muted">Mevcut sahip: ${esc(disp(p["İsim"]))}</div>
        </div>
        ${badge(disp(p[C.URGENCY]))}
      </div>
      <button class="btn ws-dt-cta" data-open-detail="${idx}">Karar dosyasına git →</button>

      <div class="ws-dt-block">
        <h4>Risk Özeti</h4>
        <div class="ws-dt-kv">
          <div><span>Toplam Risk</span><b>${esc(disp(p[C.RISK_TOTAL]))}</b></div>
          <div><span>Sonraki adım</span>${badge(ns[0], ns[1])}</div>
        </div>
        ${riskRows}
      </div>

      <div class="ws-dt-block">
        <h4>Yedek Havuzu</h4>
        <div class="ws-pipe">
          <div class="ws-pipe-i ready"><b>${bench.ready}</b><span>Göreve Hazır</span></div>
          <div class="ws-pipe-i other"><b>${bench.other}</b><span>Diğer aday</span></div>
          <div class="ws-pipe-i total"><b>${bench.total}</b><span>Toplam</span></div>
        </div>
        <div class="caption">Kaynakta zaman-bazlı hazırlık kademesi (1–2 yıl / 3+ yıl)
          bulunmadığından üretilmez.</div>
      </div>

      <div class="ws-dt-block">
        <h4>Yedek Adayları</h4>
        ${candList}
      </div>

      <div class="ws-dt-block">
        <h4>Açık Aksiyonlar</h4>
        <div class="ws-empty-inline">Bağlı aksiyon kaydı bulunmuyor.</div>
        <div class="caption">Kaynakta aksiyon sahibi / termin / durum alanı ve doğrulanmış
          aday↔aksiyon anahtarı yoktur.</div>
      </div>

      <div class="ws-dt-block">
        <h4>Son Kalibrasyon</h4>
        <div class="ws-empty-inline">Kalibrasyon tarihi yok.</div>
      </div>
    `;
    const cta = detailEl.querySelector("[data-open-detail]");
    if(cta) cta.onclick = () => openInDetail(Number(cta.getAttribute("data-open-detail")));
  }

  /* --- Aktif filtre chip'leri --- */
  function renderChips(){
    const chips = [];
    if(_wsState.signal) chips.push({k:"signal", t:"Sinyal: " + _DRILL_DEFS[_wsState.signal].title});
    if(_wsState.firma !== WS_ALL)  chips.push({k:"firma",  t:"Şirket: " + _wsState.firma});
    if(_wsState.seviye !== WS_ALL) chips.push({k:"seviye", t:"Seviye: " + _wsState.seviye});
    if(_wsState.risk !== WS_ALL)   chips.push({k:"risk",   t:"Risk: " + _wsState.risk});
    if(_wsState.yedek !== WS_ALL){
      const st = WS_BACKUP_STATES.find(x=>x.v===_wsState.yedek);
      if(st) chips.push({k:"yedek", t:"Yedek: " + st.label});
    }
    if(_wsState.q) chips.push({k:"q", t:"Arama: " + _wsState.q});
    chipsEl.innerHTML = chips.length
      ? `<span class="ws-chips-lbl">Aktif filtreler:</span>` + chips.map(c =>
          `<button class="ws-chip" data-chip="${c.k}">${esc(c.t)}
             <span aria-hidden="true">✕</span><span class="sr-only">filtreyi kaldır</span></button>`).join("")
        + `<button class="ws-chip-clear" data-chip="all">Filtreleri temizle</button>`
      : "";
    chipsEl.querySelectorAll("[data-chip]").forEach(b => b.onclick = () => {
      const k = b.getAttribute("data-chip");
      if(k === "all"){
        _wsState.signal = null; _wsState.firma = _wsState.seviye = WS_ALL;
        _wsState.risk = _wsState.yedek = WS_ALL; _wsState.q = "";
      } else if(k === "signal"){ _wsState.signal = null; }
      else if(k === "q"){ _wsState.q = ""; }
      else { _wsState[k] = WS_ALL; }
      syncControls();
      update();
    });
  }

  function syncControls(){
    const set = (id, v) => { const s2 = el.querySelector("#"+id); if(s2) s2.value = v; };
    set("ws_firma", _wsState.firma); set("ws_seviye", _wsState.seviye);
    set("ws_risk", _wsState.risk);   set("ws_yedek", _wsState.yedek);
    const q = el.querySelector("#ws_q"); if(q && q.value !== _wsState.q) q.value = _wsState.q;
    el.querySelectorAll("[data-signal]").forEach(b =>
      b.setAttribute("aria-pressed", _wsState.signal === b.getAttribute("data-signal") ? "true" : "false"));
  }

  /* --- Pozisyon listesi (master) --- */
  function renderList(){
    const items = _wsItems();
    hintEl.textContent = _wsState.signal
      ? `${items.length} pozisyon · ${_DRILL_DEFS[_wsState.signal].title}`
      : `Açık yedekleme riski taşıyan ${items.length} pozisyon`;

    if(!items.length){
      _wsState.selected = null;
      listEl.innerHTML = emptyState("Seçili filtrelerle eşleşen pozisyon yok. Filtreleri temizleyip yeniden deneyin.");
      renderDetail();
      return;
    }
    // Seçim geçerliliği: filtre sonrası seçili pozisyon listede yoksa ilk satıra düş.
    if(_wsState.selected == null || !items.some(o => o.idx === _wsState.selected))
      _wsState.selected = items[0].idx;

    const shown = _wsState.expanded ? items : items.slice(0, WS_PAGE);
    const rows = shown.map((o, i) => {
      const flags = o.flags.length
        ? o.flags.map(f=>badge(SUCCESSION_RISK_FLAGS[f].label, SUCCESSION_RISK_FLAGS[f].tone)).join(" ")
        : `<span class="muted">—</span>`;
      const sel = o.idx === _wsState.selected;
      return `<tr class="ws-row${sel?" is-selected":""}" data-row="${o.idx}" tabindex="0"
            role="button" aria-pressed="${sel?"true":"false"}"
            aria-label="${esc(disp(o.p["Pozisyon"]))} — detayını göster">
        <td class="ws-c-rank" data-label="Öncelik">${i+1}</td>
        <td class="ws-c-pos" data-label="Pozisyon">
          <span class="ws-pos-name">${esc(disp(o.p["Pozisyon"]))}</span>
          <span class="ws-pos-sub">${esc(disp(o.p["İsim"]))}</span></td>
        <td class="ws-c-org" data-label="Şirket / Seviye">
          <span>${esc(disp(o.p["Firma"]))}</span>
          <span class="ws-pos-sub">${esc(disp(o.p["Seviye"]))}</span></td>
        <td class="ws-c-risk" data-label="Riskler">
          ${badge(disp(o.p[C.URGENCY]))}<div class="ws-flags">${flags}</div></td>
        <td class="ws-c-rd" data-label="Yedek hazırlığı">${_wsReadiness(o.p)}</td>
      </tr>`;
    }).join("");

    listEl.innerHTML = `<div class="ws-table-wrap"><table class="ws-table">
        <thead><tr>
          <th scope="col">Öncelik</th><th scope="col">Pozisyon</th>
          <th scope="col">Şirket / Seviye</th><th scope="col">Riskler</th>
          <th scope="col" title="Göreve Hazır / diğer aday sayısı">Yedek hazırlığı</th>
        </tr></thead><tbody>${rows}</tbody></table></div>
      ${items.length > WS_PAGE
        ? `<button class="ws-more" data-more="1">${_wsState.expanded
            ? "İlk " + WS_PAGE + " pozisyonu göster"
            : "Tümünü göster (" + items.length + ")"}</button>`
        : ""}`;

    const pick = idx => { _wsState.selected = idx; renderList(); renderDetail(); };
    listEl.querySelectorAll(".ws-row").forEach(tr => {
      tr.onclick = () => pick(Number(tr.getAttribute("data-row")));
      tr.onkeydown = e => {
        if(e.key === "Enter" || e.key === " "){ e.preventDefault(); pick(Number(tr.getAttribute("data-row"))); }
      };
    });
    const more = listEl.querySelector("[data-more]");
    if(more) more.onclick = () => { _wsState.expanded = !_wsState.expanded; renderList(); };
  }

  function update(){ renderChips(); renderList(); renderDetail(); }

  // --- Olay bağlama (her render'da yeni DOM'a bir kez; onX ataması duplication üretmez) ---
  el.querySelectorAll("[data-signal]").forEach(btn => {
    const go = () => {
      const id = btn.getAttribute("data-signal");
      _wsState.signal = (_wsState.signal === id) ? null : id;   // aynı karta tekrar → kaldır
      _wsState.expanded = false; _wsState.selected = null;
      syncControls(); update();
    };
    btn.onclick = go;
  });
  [["ws_firma","firma"],["ws_seviye","seviye"],["ws_risk","risk"],["ws_yedek","yedek"]]
    .forEach(([id,key]) => {
      const sel = el.querySelector("#"+id);
      if(sel) sel.onchange = () => { _wsState[key] = sel.value; _wsState.selected = null; update(); };
    });
  const qEl = el.querySelector("#ws_q");
  if(qEl) qEl.oninput = () => { _wsState.q = qEl.value; _wsState.selected = null; update(); };

  syncControls();
  update();
}
