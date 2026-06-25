/* quality.js — Ekran 6: Veri Kalitesi
   Referans: views.render_data_quality_view + Teyitli Firma Override izleri. */

function _fmtSize(n){
  if(n === null || n === undefined || n < 0) return "—";
  let v = Number(n);
  const units = ["B","KB","MB","GB"];
  for(const u of units){ if(v<1024) return (u==="B"?v.toFixed(0):v.toFixed(1))+" "+u; v/=1024; }
  return v.toFixed(1)+" TB";
}

const _SEV_BADGE = {ERROR:["🔴 ERROR","danger"],WARNING:["🟠 WARNING","warning"],INFO:["🔵 INFO","info"]};

function renderQuality(el){
  const q = DATA.quality;
  const c = q.counts;

  const loadBlocks = q.load.map(wb => {
    const sheetRows = wb.sheets.map(s => ({
      "Sayfa": s.name,
      "Tip": s.kind,
      "Bulundu": s.exists ? "✅" : "❌",
      "Başlık satırı": s.header_row,
      "Aktif kayıt": s.active_row_count==null ? "—" : s.active_row_count,
      "Ham satır": s.raw_row_count==null ? "—" : s.raw_row_count,
      "Kolon sayısı": s.columns_count,
    }));
    const sheetTable = buildTable(
      ["Sayfa","Tip","Bulundu","Başlık satırı","Aktif kayıt","Ham satır","Kolon sayısı"]
        .map(k=>({key:k,label:k})), sheetRows);
    return `<details class="expander" open><summary>📄 ${esc(wb.label)} — ${esc(wb.filename)}</summary>
      <div class="ex-body">
        <div class="caption"><b>Dosya:</b> ${esc(wb.filename)} ·
          <b>Boyut:</b> ${_fmtSize(wb.size_bytes)} · <b>Değişiklik:</b> ${esc(wb.modified||"—")}</div>
        ${sheetTable}
      </div></details>`;
  }).join("");

  // Override izleri
  let overrideBlock = "";
  if(q.overrides && q.overrides.length){
    const ovRows = q.overrides.map(o => ({
      "Durum": o.status==="applied" ? "Uygulandı" : o.status,
      "Sayfa": o.sheet, "Kolon": o.col,
      "Ham Değer": disp(o.raw), "Etkin Değer": disp(o.effective), "Açıklama": o.note,
    }));
    overrideBlock = `<h3>Teyitli Firma Override</h3>
      ${note("info", `İş tarafından teyit edilen <b>tek tek kayıtlar</b> için kaynağa
        dokunmadan uygulanan dar override katmanı. Ham değer korunur; kaynak Excel
        salt-okunur kalır.`)}
      ${buildTable(["Durum","Sayfa","Kolon","Ham Değer","Etkin Değer","Açıklama"]
        .map(k=>({key:k,label:k,cls:k==="Açıklama"?"wrap-cell":""})), ovRows)}`;
  }

  // Bulgular
  const issueRows = q.issues.map(i => ({
    "Önem": i.severity, "Kategori": i.category, "Kaynak": i.workbook, "Sayfa": i.sheet,
    "Kolon": i.column, "Adet": i.count || "", "Açıklama": i.message,
    "Örnek": (i.sample||[]).join(", "),
  }));
  const issueTable = buildTable([
    {key:"Önem",label:"Önem",rawFmt:v=>{const b=_SEV_BADGE[v]||[v,"neutral"];return badge(b[0],b[1]);}},
    {key:"Kategori",label:"Kategori"},{key:"Kaynak",label:"Kaynak"},{key:"Sayfa",label:"Sayfa"},
    {key:"Kolon",label:"Kolon"},{key:"Adet",label:"Adet"},
    {key:"Açıklama",label:"Açıklama",cls:"wrap-cell"},{key:"Örnek",label:"Örnek",cls:"wrap-cell"},
  ], issueRows);

  el.innerHTML = `
    <h2>Veri Yükleme Durumu</h2>
    <div class="metric-grid">
      ${metricCard("🔴 ERROR", c.error)}
      ${metricCard("🟠 WARNING", c.warning)}
      ${metricCard("🔵 INFO", c.info)}
    </div>
    ${c.error===0
      ? note("ok","Kritik (ERROR) yapı/başlık sorunu yok — veri yüklenebilir.")
      : note("err","Kritik yapı/başlık sorunları var; aşağıdaki ERROR satırlarına bakın.")}

    ${loadBlocks}
    ${overrideBlock}

    <h3>Veri Kalite Bulguları</h3>
    ${issueRows.length ? issueTable : emptyState("Herhangi bir bulgu yok.")}
    <div class="caption">Not: Kayıt sayısı değişimleri INFO; bilinmeyen/yeni kategorik
      etiketler ve yinelenen İsim/position_key WARNING olarak gösterilir. Yeni dönem
      verisi hata sayılmaz.</div>
  `;
}
