/* detail.js — Ekran 2: Pozisyon & Yedek Detayı
   Referans: views.render_position_detail_view
   Firma -> Ünvan -> Mevcut Pozisyon Sahibi cascade; salt-okunur. */

/* Kaynakta olmayan/boş alan için çıkarım üretme: 'Kaynakta belirtilmedi'. */
function _dispSrc(v){ return isBlank(v) ? "Kaynakta belirtilmedi" : v; }

/* === V1.1: Hızlı Halef Kartı (sağdan açılan drawer) === */
let _currentRow = null;        // aktif pozisyon (drawer başlığı için)
let _currentBackups = [];      // aktif pozisyonun yedekleri: Ready-now önce, sonra hazırlananlar
let _drawerIdx = -1;

function _ensureDrawer(){
  if(document.getElementById("succ_overlay")) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = `<div class="succ-overlay" id="succ_overlay" hidden>
      <aside class="succ-drawer" id="succ_drawer" role="dialog" aria-modal="true" aria-label="Hızlı Halef Kartı">
        <div class="sd-head">
          <div><div class="sd-eyebrow">HIZLI HALEF KARTI</div>
            <div class="sd-target" id="sd_target"></div></div>
          <button class="sd-close" id="sd_close" aria-label="Kapat" title="Kapat (Esc)">✕</button>
        </div>
        <div class="sd-nav" id="sd_nav"></div>
        <div class="sd-body" id="sd_body"></div>
        <div class="sd-note">Bu kart mevcut Yedek Verisi kaydını gösterir. Nihai hazır oluşluk
          ve görevlendirme değerlendirmesi yönetici ve İK kalibrasyonunda yapılır.</div>
      </aside></div>`;
  document.body.appendChild(wrap.firstElementChild);
  const overlay = document.getElementById("succ_overlay");
  overlay.addEventListener("click", e => { if(e.target === overlay) _closeDrawer(); });
  document.getElementById("sd_close").onclick = _closeDrawer;
}

function _drawerKeydown(e){ if(e.key === "Escape") _closeDrawer(); }

function _kvRow(label, valueHtml){
  return `<div><span>${esc(label)}</span><div class="sd-val">${valueHtml}</div></div>`;
}

function _highlightBk(){
  document.querySelectorAll(".bk-card").forEach(c =>
    c.classList.toggle("active", Number(c.getAttribute("data-bk")) === _drawerIdx));
}

function _renderDrawer(){
  const b = _currentBackups[_drawerIdx];
  if(!b) return;
  const ready = isReadyBackup(b);
  document.getElementById("sd_target").innerHTML =
    `Hedef pozisyon: <b>${esc(disp(_currentRow["Pozisyon"]))}</b> · ${esc(disp(_currentRow["Firma"]))}`;
  const nav = document.getElementById("sd_nav");
  nav.innerHTML = _currentBackups.length > 1
    ? `<button class="btn secondary small" id="sd_prev" ${_drawerIdx===0?"disabled":""}>‹ Önceki</button>
       <span class="sd-count">${_drawerIdx+1} / ${_currentBackups.length} halef</span>
       <button class="btn secondary small" id="sd_next" ${_drawerIdx===_currentBackups.length-1?"disabled":""}>Sonraki ›</button>`
    : "";
  const assess = isBlank(b["Yedek_Assess"]) ? "Kaynakta belirtilmedi" : trNumber(b["Yedek_Assess"],2);
  document.getElementById("sd_body").innerHTML = `<div class="sd-kv">
    ${_kvRow("Yedek adı", `<b>${esc(disp(b["Yedek_İsim"]))}</b>`)}
    ${_kvRow("Mevcut görev", esc(_dispSrc(b["Yedek_Görev"])))}
    ${_kvRow("Yedek firma", esc(_dispSrc(b["Yedek_Firma"])))}
    ${_kvRow("Yedek şehir", esc(_dispSrc(b["Yedek_Şehir"])))}
    ${_kvRow("Yedek tipi", esc(_dispSrc(b["Yedek_Tipi"])))}
    ${_kvRow("Ready-now durumu", badge(ready?"Hazır":"Hazırlanıyor / değil", ready?"success":"warning"))}
    ${_kvRow("Assessment", `<b>${esc(assess)}</b>`)}
    ${_kvRow("Performans", esc(_dispSrc(b["Yedek_Perf"])))}
    ${_kvRow("9-Box", badge(_dispSrc(b["Yedek_9Box"]), nineboxTone(b["Yedek_9Box"])))}
    ${_kvRow("Coğrafi uyum", esc(_dispSrc(b["Coğrafi_Uyum"])))}
    ${_kvRow("Fonksiyonel uyum", esc(_dispSrc(b["Fonksiyonel_Uyum"])))}
    ${_kvRow("Ayrılma riski", esc(_dispSrc(b["Ayrılma_Riski"])))}
    ${_kvRow("Çoklu yedek", esc(_dispSrc(b["Çoklu_Yedek"])))}
  </div>`;
  if(_currentBackups.length > 1){
    const prev = document.getElementById("sd_prev"), next = document.getElementById("sd_next");
    if(prev) prev.onclick = () => { if(_drawerIdx>0){ _drawerIdx--; _renderDrawer(); _highlightBk(); } };
    if(next) next.onclick = () => { if(_drawerIdx<_currentBackups.length-1){ _drawerIdx++; _renderDrawer(); _highlightBk(); } };
  }
}

function _openDrawer(idx){
  _ensureDrawer();
  _drawerIdx = idx;
  _renderDrawer();
  _highlightBk();
  const overlay = document.getElementById("succ_overlay");
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("open"));
  document.addEventListener("keydown", _drawerKeydown);
  const c = document.getElementById("sd_close"); if(c) c.focus();
}

function _closeDrawer(){
  const overlay = document.getElementById("succ_overlay");
  if(!overlay || overlay.hidden) return;
  overlay.classList.remove("open");
  document.removeEventListener("keydown", _drawerKeydown);
  setTimeout(() => { overlay.hidden = true; }, 220);
  document.querySelectorAll(".bk-card.active").forEach(c => c.classList.remove("active"));
}

/* Karar dosyası gövdesindeki halef kartlarını drawer'a bağlar (tüm kart tıklanabilir). */
function _wireBackupCards(scope){
  scope.querySelectorAll(".bk-card[data-bk]").forEach(card => {
    const open = () => _openDrawer(Number(card.getAttribute("data-bk")));
    card.onclick = open;
    card.onkeydown = e => { if(e.key==="Enter"||e.key===" "){ e.preventDefault(); open(); } };
  });
}

/* Pozisyon durum etiketi (mevcut risk + tanımlı yedek + Ready-now'dan kural-bazlı).
   Öncelik: Korunaklı > Kritik Açık (yüksek aciliyet + hazır yok) > Yedeksiz > Hazır Halef Açığı. */
function _positionStatus(row){
  const ready = positionHasReady(row);
  const has = hasBackup(row);
  const high = C.HIGH_RISK.includes(String(row[C.URGENCY]).trim());
  if(ready) return {label:"Korunaklı", tone:"success"};
  if(high) return {label:"Kritik Açık", tone:"danger"};
  if(!has) return {label:"Yedeksiz", tone:"neutral"};
  return {label:"Hazır Halef Açığı", tone:"warning"};
}

/* Bu pozisyona bağlı yedekler (mevcut ilişki) ve Ready-now alt kümesi. */
function _positionBackups(isim){
  const all = lookupBackups(isim);
  const ready = all.filter(isReadyBackup);
  const prep = all.filter(b => !isReadyBackup(b));
  return {all, ready, prep};
}

/* 1) Karar başlığı (Position Decision Header). */
function _decisionHeader(row, st, bk){
  const aci = disp(row["Aciliyet_Final"]);
  let summary;
  if(bk.ready.length) summary = `Bu pozisyon <b>${esc(aci)}</b> aciliyet seviyesinde ve `
    + `<b>${bk.ready.length} hazır halefi</b> bulunuyor.`;
  else if(bk.all.length) summary = `Bu pozisyon <b>${esc(aci)}</b> aciliyet seviyesinde; `
    + `<b>${bk.all.length} tanımlı yedeği</b> var ancak <b>hazır halefi bulunmuyor</b>.`;
  else summary = `Bu pozisyon <b>${esc(aci)}</b> aciliyet seviyesinde ve `
    + `<b>tanımlı yedeği bulunmuyor</b>.`;
  return `<div class="pdh">
    <div class="pdh-top">
      <div class="pdh-main">
        <div class="pdh-eyebrow">POZİSYON KARAR DOSYASI</div>
        <div class="pdh-title">${esc(disp(row["Pozisyon"]))}</div>
        <div class="pdh-meta">Firma: <b>${esc(disp(row["Firma"]))}</b> ·
          Seviye: ${esc(disp(row["Seviye"]))} · Şehir: ${esc(disp(row["Şehir"]))} ·
          Sahip: <b>${esc(disp(row["İsim"]))}</b></div>
      </div>
      <span class="pdh-status badge t-${st.tone}"><span class="dot"></span>${esc(st.label)}</span>
    </div>
    <div class="pdh-row">${badge(aci)}
      <span class="pdh-risk">Toplam Risk <b>${esc(disp(row["Toplam_Risk"]))}</b></span></div>
    <div class="pdh-summary">${summary}</div>
  </div>`;
}

/* 2A) Risk ve İş Etkisi. */
function _riskModule(row){
  const fchips = C.F_FACTOR_PAIRS.map(([code,name,puanCol]) =>
    `<span class="fchip">${code} · ${esc(name)}: <b>${esc(disp(row[puanCol]))}</b></span>`).join("");
  const rc = riskComponentRows(row);
  const rcTable = buildTable([
    {key:"Bileşen",label:"Bileşen"},
    {key:"Puan",label:"Puan",fmt:v=>disp(v)},
    {key:"Açıklama",label:"Açıklama",cls:"wrap-cell",fmt:v=>cleanFactorText(v)},
  ], rc);
  return `<div class="panel decision-mod">
    <h4>Risk ve İş Etkisi</h4>
    <div class="kv">
      <div><span>Toplam Risk</span><b>${esc(disp(row["Toplam_Risk"]))}</b></div>
      <div><span>Aciliyet</span>${badge(disp(row["Aciliyet_Final"]))}</div>
      <div><span>Temel Risk</span><b>${esc(disp(row["Temel_Risk"]))}</b></div>
      <div><span>Kritik Bilgi</span><b>${esc(_dispSrc(row["Kritik_Bilgi"]))}</b></div>
      <div><span>Bilgi Etkisi</span><b>${esc(disp(row["Bilgi_Etkisi"]))}</b></div>
    </div>
    <div class="fchips">${fchips}</div>
    <details class="expander"><summary>Risk gerekçeleri (F1–F5 açıklamaları)</summary>
      <div class="ex-body">${rcTable}
        <div class="caption">Puanlar ve açıklamalar kaynaktan okunur; risk formülleri
          yeniden hesaplanmaz.</div></div></details>
  </div>`;
}

/* 2B) Halefiyet Sağlığı. */
function _successionModule(row, st, bk){
  const has = hasBackup(row);
  const gap = (bk.all.length>0 && bk.ready.length===0) ? "Evet"
            : (bk.ready.length>0 ? "Hayır" : "Tanımlı yedek yok");
  return `<div class="panel decision-mod">
    <h4>Halefiyet Sağlığı</h4>
    <div class="kv">
      <div><span>Tanımlı yedek</span><b>${bk.all.length}</b></div>
      <div><span>Ready-now halef</span><b>${bk.ready.length}</b></div>
      <div><span>Yedek kapsama</span>${badge(has?"Var":"Yok", has?"success":"danger")}</div>
      <div><span>Ready-now durumu</span>${badge(bk.ready.length?"Var":"Yok", bk.ready.length?"success":"warning")}</div>
      <div><span>Hazır halef açığı</span><b>${esc(gap)}</b></div>
      <div><span>Durum</span>${badge(st.label, st.tone)}</div>
    </div>
    <div class="cov-gap" style="margin-top:10px">
      <b>Tanımlı yedek bulunması ≠ Hazır halef bulunması.</b>
      ${bk.all.length} tanımlı yedek · ${bk.ready.length} hazır halef
      (YETENEK HAZIR / DOĞAL + HAZIR).</div>
  </div>`;
}

/* 3) Tanımlı halef kartı (tıklanınca Hızlı Halef Kartı drawer'ı açılır). */
function _backupCard(b, idx){
  const ready = isReadyBackup(b);
  return `<div class="bk-card t-${ready?"success":"neutral"}" data-bk="${idx}" role="button"
       tabindex="0" aria-label="${esc(disp(b["Yedek_İsim"]))} — hızlı halef kartını aç">
    <div class="bk-head"><b>${esc(disp(b["Yedek_İsim"]))}</b>
      ${badge(ready?"Ready-now (Hazır)":"Hazırlanıyor / değil", ready?"success":"warning")}</div>
    <div class="bk-sub">${esc(_dispSrc(b["Yedek_Görev"]))} · ${esc(_dispSrc(b["Yedek_Firma"]))} ·
      ${esc(_dispSrc(b["Yedek_Şehir"]))}</div>
    <div class="bk-tags">
      <span>Tip: <b>${esc(_dispSrc(b["Yedek_Tipi"]))}</b></span>
      <span>Coğrafi uyum: <b>${esc(_dispSrc(b["Coğrafi_Uyum"]))}</b></span>
      <span>Fonksiyonel uyum: <b>${esc(_dispSrc(b["Fonksiyonel_Uyum"]))}</b></span>
      <span>9-Box: ${badge(_dispSrc(b["Yedek_9Box"]), nineboxTone(b["Yedek_9Box"]))}</span>
      <span>Assessment: <b>${esc(isBlank(b["Yedek_Assess"])?"Kaynakta belirtilmedi":trNumber(b["Yedek_Assess"],2))}</b></span>
      <span>Performans: <b>${esc(_dispSrc(b["Yedek_Perf"]))}</b></span>
      <span>Ayrılma riski: <b>${esc(_dispSrc(b["Ayrılma_Riski"]))}</b></span>
      <span>Çoklu yedek: <b>${esc(_dispSrc(b["Çoklu_Yedek"]))}</b></span>
    </div>
    <div class="bk-open">Hızlı halef kartı →</div></div>`;
}

function _backupComparison(bk){
  if(!bk.all.length){
    return note("warn", `Bu pozisyon için <b>tanımlı yedek bulunmuyor</b>. Yedek kapsamı
      kalibrasyonda değerlendirilebilir; Talent Pool &amp; 9-Box veya Aday Keşfi
      sekmelerinden aday görünürlüğü incelenebilir.`);
  }
  // Index = _currentBackups (Ready-now + hazırlananlar) dizisindeki konum.
  let k = 0;
  const readyCards = bk.ready.map(b => _backupCard(b, k++)).join("");
  const prepCards = bk.prep.map(b => _backupCard(b, k++)).join("");
  const readyBlock = bk.ready.length
    ? `<div class="bk-group-h">Ready-now halefler (${bk.ready.length})</div>
       <div class="bk-grid">${readyCards}</div>`
    : `<div class="bk-group-h">Ready-now halefler (0)</div>
       ${emptyState("Bu pozisyon için Ready-now (hazır) halef bulunmuyor.")}`;
  const prepBlock = bk.prep.length
    ? `<div class="bk-group-h">Hazırlanan / Ready-now olmayan halefler (${bk.prep.length})</div>
       <div class="bk-grid">${prepCards}</div>`
    : "";
  return readyBlock + prepBlock +
    `<div class="caption">İlişki: Yedek Verisi.Pozisyon_Sahibi → Pozisyon Verisi.İsim.
      Yalnızca kaynaktaki alanlar gösterilir; boş alanlar 'Kaynakta belirtilmedi'.</div>`;
}

/* 4) Kalibrasyonda İncelenebilecek Konular (mevcut kurallardan nötr türetim). */
function _calibrationTopics(row, bk){
  const topics = [];
  if(!bk.all.length)
    topics.push("Pozisyon için tanımlı yedek kapsamı kalibrasyonda değerlendirilebilir.");
  else if(!bk.ready.length)
    topics.push("Mevcut yedeklerin hazır oluşluk ve gelişim ihtiyaçları değerlendirilebilir.");
  if(bk.ready.length)
    topics.push("Hazır halef kapasitesinin sürekliliği ve olası zincir etkileri değerlendirilebilir.");
  if(!isBlank(row["Kritik_Bilgi"]) || num(row["Bilgi_Etkisi"]) > 0)
    topics.push("Kritik bilgi bağımlılığı ve bilgi transferi ihtiyacı değerlendirilebilir.");
  return `<ul class="topics">${topics.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>
    <div class="caption">Bu yönlendirmeler mevcut risk, yedek ve Ready-now verisinden kural
      bazlı türetilir. Nihai değerlendirme yönetici ve İK kalibrasyonunda yapılır.</div>`;
}

function _renderDetailBody(row){
  if(!row) return emptyState("Gösterilecek pozisyon yok.");
  _closeDrawer();                                  // pozisyon değişince açık drawer'ı kapat
  const st = _positionStatus(row);
  const bk = _positionBackups(row["İsim"]);
  _currentRow = row;                               // drawer bağlamı
  _currentBackups = bk.ready.concat(bk.prep);      // Ready-now önce, sonra hazırlananlar
  const ambiguity = nameOccurrenceCount(row["İsim"]) > 1
    ? note("info", `Bu isim birden fazla pozisyonda görünüyor; yedek eşleşmesi isim
        üzerinden yapıldığından bazı adaylar başka bir pozisyona ait olabilir
        (ayrıntı: Veri Kalitesi).`) : "";

  return `
    ${_decisionHeader(row, st, bk)}

    <div class="section-head" style="margin-top:18px"><h3>Rol risk profili</h3></div>
    <div class="decision-cols">
      ${_riskModule(row)}
      ${_successionModule(row, st, bk)}
    </div>

    <div class="section-head" style="margin-top:18px"><h3>Tanımlı halefler karşılaştırması</h3></div>
    ${ambiguity}
    ${_backupComparison(bk)}

    <div class="section-head" style="margin-top:18px"><h3>Kalibrasyonda İncelenebilecek Konular</h3></div>
    ${_calibrationTopics(row, bk)}

    ${note("info", `Bu görünüm mevcut Pozisyon ve Yedek verilerindeki kayıtlarla sınırlıdır.
      Talent Pool ile Yedek Verisi arasında doğrulanmış ortak kişi anahtarı bulunmadığı için
      kişi bazında ek halefiyet eşleştirmesi yapılmaz.`)}
  `;
}

/* Heatmap seçimindeki (Firma+Seviye+lens) pozisyon listesi — bağlam bandı altında kalır.
   onPick(idx): seçilen pozisyona göre cascade + detay kartı güncellenir. */
function _renderDetailGroupList(host, ctx, onPick){
  const items = (ctx.matchIndices || []).map(i => ({i, p: DATA.positions[i]}));
  const header = `${disp(ctx.firma)} · ${disp(ctx.seviye)} · ${disp(ctx.lensLabel)} — `
    + `${items.length} / ${ctx.groupTotal} pozisyon`;
  let body;
  if(!items.length){
    body = emptyState("Bu lens koşulunu sağlayan pozisyon yok; aşağıdaki seçimle grupta gezinebilirsiniz.");
  } else {
    // Tüm kart tıklanabilir (büyük hedef + a11y); "Detayı aç" yalnızca görsel ipucu.
    body = `<div class="grouplist">` + items.map(({i,p}) => {
      const ready = positionHasReady(p), has = hasBackup(p);
      return `<div class="gl-card" data-card="${i}" role="button" tabindex="0"
          aria-label="${esc(disp(p["Pozisyon"]))} — ${esc(disp(p["İsim"]))} detayını aç">
        <div class="gl-main"><b>${esc(disp(p["Pozisyon"]))}</b>
          <span>${esc(disp(p["İsim"]))} · ${esc(disp(p["Firma"]))} · ${esc(disp(p["Şehir"]))}</span></div>
        <div class="gl-meta">
          ${badge(disp(p["Aciliyet_Final"]))}
          <span class="gl-risk">Risk ${esc(disp(p["Toplam_Risk"]))}</span>
          ${badge(has?"Yedek var":"Yedek yok", has?"success":"danger")}
          ${badge(ready?"Hazır halef var":"Hazır halef yok", ready?"success":(has?"warning":"danger"))}
          <span class="gl-open">Detayı aç →</span>
        </div></div>`;
    }).join("") + `</div>`;
  }
  host.innerHTML = `<div class="section-head" style="margin-top:6px">
      <h3>Bu heatmap seçimi içinde incelenebilecek pozisyonlar</h3></div>
    <div class="caption">${esc(header)}</div>${body}`;

  // Event delegation: kart üzerinde herhangi bir yere tıklama/Enter/Space seçer.
  const list = host.querySelector(".grouplist");
  function _pick(card){
    if(!card) return;
    const idx = Number(card.getAttribute("data-card"));
    list.querySelectorAll(".gl-card").forEach(c => c.classList.toggle("active", c === card));
    onPick(idx);
  }
  if(list){
    list.addEventListener("click", e => _pick(e.target.closest(".gl-card")));
    list.addEventListener("keydown", e => {
      if(e.key === "Enter" || e.key === " "){
        const card = e.target.closest(".gl-card");
        if(card){ e.preventDefault(); _pick(card); }
      }
    });
  }
}

function renderDetail(el){
  // Heatmap'ten gelindiyse bağlam bandı (hangi Firma/Seviye/lens kapsamından).
  const ctx = window.__detailContext;
  window.__detailContext = null;
  const initial = (typeof window.__pendingDetail === "number") ? window.__pendingDetail : null;
  window.__pendingDetail = null;

  const ctxBanner = ctx
    ? note("info", `Geldiğiniz bağlam — <b>Halefiyet Sağlığı</b>: Firma
        <b>${esc(disp(ctx.firma))}</b> · Seviye <b>${esc(disp(ctx.seviye))}</b> ·
        Lens <b>${esc(disp(ctx.lensLabel))}</b>. Aşağıdaki listeden bu gruptaki tüm
        ilgili pozisyonları inceleyebilirsiniz.`)
    : "";

  // Standart breadcrumb (yalnızca heatmap bağlamı varsa) — gerçek seçili Firma/Seviye/lens.
  const breadcrumb = ctx
    ? `<nav class="breadcrumb" aria-label="Bağlam">Halefiyet Sağlığı
        <i>→</i> ${esc(disp(ctx.firma))} <i>→</i> ${esc(disp(ctx.seviye))}
        <i>→</i> ${esc(disp(ctx.lensLabel))}</nav>`
    : "";

  el.innerHTML = `
    ${breadcrumb}
    <h2>Pozisyon &amp; Yedek Detayı</h2>
    ${ctxBanner}
    <div id="detail_grouplist"></div>
    <div class="caption">🔎 Pozisyon seç: Firma → Ünvan → Mevcut Pozisyon Sahibi</div>
    <div id="detail_cascade"></div>
    <div id="detail_body"></div>
  `;
  const cascadeMount = document.getElementById("detail_cascade");
  const body = document.getElementById("detail_body");

  function selectPosition(idx){
    renderCascade(cascadeMount, DATA.positions, "detail",
      row => { body.innerHTML = _renderDetailBody(row); _wireBackupCards(body); }, idx);
  }

  // Heatmap grubu listesi (varsa) — bağlam bandının hemen altında, kalıcı.
  if(ctx && Array.isArray(ctx.matchIndices)){
    _renderDetailGroupList(document.getElementById("detail_grouplist"), ctx, selectPosition);
  }
  selectPosition(initial);
}
