/* data.js — JSON veri paketlerinin yüklenmesi + ortak gösterim yardımcıları.
   Kaynak: tools/generate_data.py çıktısı (data/*.json). Salt-okunur. */

const DATA = {
  positions: [], backups: [], talent: [],
  quality: null, meta: null,
};

const BLANK = "Belirtilmedi";

/* Boş/None kontrolü (Python _is_blank karşılığı). */
function isBlank(v){
  if(v === null || v === undefined) return true;
  if(typeof v === "string") return v.trim() === "";
  return false;
}

/* Tek değer gösterimi: boş -> 'Belirtilmedi'. */
function disp(v){ return isBlank(v) ? BLANK : v; }

/* HTML kaçışı. */
function esc(v){
  const s = (v === null || v === undefined) ? "" : String(v);
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
          .replace(/"/g,"&quot;");
}

/* Türkçe ondalık sayı: 9.3 -> '9,3'. Boş -> 'Belirtilmedi'. */
function trNumber(v, decimals=1){
  if(isBlank(v)) return BLANK;
  const f = Number(v);
  if(Number.isNaN(f)) return String(v);
  return f.toFixed(decimals).replace(".", ",");
}

/* Türkçe yüzde: 27.7 -> '27,7'. */
function trPct(v){ return Number(v).toFixed(1).replace(".", ","); }

/* Rol kıdemi: 2.1739 -> '2,2 yıl'. */
function formatYears(v){
  if(isBlank(v)) return BLANK;
  const f = Number(v);
  if(Number.isNaN(f)) return BLANK;
  return f.toFixed(1).replace(".", ",") + " yıl";
}

/* F-faktör açıklamasını sadeleştirir (teknik lejant/■/önek atılır).
   Python views._clean_factor_text karşılığı. */
function cleanFactorText(v){
  if(isBlank(v)) return BLANK;
  let text = String(v).split("\n", 1)[0];      // teknik [..] lejandını at
  if(text.includes("|")) text = text.split("|").slice(1).join("|"); // '15/35 |' önekini at
  text = text.replace(/■/g, "").trim();
  return text || BLANK;
}

/* Normalize değer (Python normalize_value): NFC + boşluk sadeleştir + casefold. */
function normalizeValue(v){
  if(v === null || v === undefined) return "";
  let s = String(v).normalize("NFC");
  s = s.replace(/\s+/g, " ").trim();
  return s.toLocaleLowerCase("tr");
}

/* Sayısal çevrim (çevrilemeyen -> NaN). */
function num(v){
  if(isBlank(v)) return NaN;
  const f = Number(v);
  return Number.isNaN(f) ? NaN : f;
}

/* --- Yükleme --- */
async function loadAllData(){
  const files = ["positions","backups","talent_pool","quality","meta"];
  const [positions, backups, talent, quality, meta] = await Promise.all(
    files.map(f => fetch(`data/${f}.json`, {cache:"no-store"}).then(r => {
      if(!r.ok) throw new Error(`data/${f}.json yüklenemedi (${r.status})`);
      return r.json();
    }))
  );
  DATA.positions = positions;
  DATA.backups = backups;
  DATA.talent = talent;
  DATA.quality = quality;
  DATA.meta = meta;
  return DATA;
}
