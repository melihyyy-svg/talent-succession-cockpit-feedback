/* app.js — önyükleme, marka başlığı, sekme yönlendirme. */

const TABS = [
  {id:"exec",     label:"Yönetici Karar Özeti", render:renderExec},
  {id:"heatmap",  label:"Halefiyet Sağlığı", render:renderHeatmap},
  {id:"detail",   label:"Pozisyon & Yedek Detayı", render:renderDetail},
  {id:"talent",   label:"Talent Pool & 9-Box Explorer", render:renderTalent},
  {id:"discovery",label:"Aday Keşfi", render:renderDiscovery},
  {id:"actions",  label:"Aksiyon Takip", render:renderActions},
];

function renderBrand(){
  const q = DATA.quality.counts;
  document.getElementById("brand").innerHTML = `
    <div class="eks-brand">
      <div>
        <div class="eks-lockup">EKSİM AKADEMİ</div>
        <div class="eks-product">Talent &amp; Succession Cockpit</div>
        <div class="eks-sub">Kritik pozisyon, yedeklilik ve aksiyon karar desteği ·
          public geri bildirim demosu · salt-okunur</div>
      </div>
      <div class="eks-chips">
        <span class="eks-chip">Salt-okunur kaynak</span>
        <span class="eks-chip">Public demo</span>
        <span class="eks-chip">Veri Kalitesi: ${q.error} hata · ${q.warning} uyarı · ${q.info} bilgi</span>
      </div>
    </div>`;
}

function renderTabs(active){
  const bar = document.getElementById("tabbar");
  bar.innerHTML = TABS.map(t =>
    `<button data-id="${t.id}" class="${t.id===active?"active":""}">${esc(t.label)}</button>`).join("");
  bar.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => activate(btn.getAttribute("data-id"));
  });
}

function activate(id){
  const tab = TABS.find(t=>t.id===id) || TABS[0];
  renderTabs(tab.id);
  const view = document.getElementById("view");
  view.innerHTML = "";
  try { tab.render(view); }
  catch(err){ view.innerHTML = `<div class="note err">Ekran çizilemedi: ${esc(err.message)}</div>`;
              console.error(err); }
  window.scrollTo({top:0, behavior:"instant"});
  if(history.replaceState) history.replaceState(null,"","#"+tab.id);
}

/* KPI drill-down → belirli pozisyonu Pozisyon & Yedek Detayı'nda aç. */
function openInDetail(positionIndex){
  window.__pendingDetail = positionIndex;
  window.__detailContext = null;
  activate("detail");
}

/* Heatmap drill-down → temsil pozisyonu + geldiğimiz Firma/Seviye/lens bağlamı. */
function openInDetailContext(ctx){
  window.__pendingDetail = ctx.positionIndex;
  window.__detailContext = ctx;   // {firma, seviye, lens, positionIndex}
  activate("detail");
}

async function boot(){
  try {
    await loadAllData();
  } catch(err){
    document.getElementById("view").innerHTML =
      `<div class="note err">Veri yüklenemedi: ${esc(err.message)}<br>
       Yerel test için <code>python -m http.server</code> ile çalıştırın (file:// üzerinden fetch engellenir).</div>`;
    console.error(err);
    return;
  }
  renderBrand();
  const initial = (location.hash || "").replace("#","");
  activate(TABS.some(t=>t.id===initial) ? initial : "exec");
}

document.addEventListener("DOMContentLoaded", boot);
