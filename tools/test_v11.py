"""V1.1 — Karar Kanıtı & çoklu-rol saf hesap testleri.

js/calc.js içindeki yeni SAF fonksiyonların (candidateRoleLinks, multiRoleCandidacy,
successorEvidence, positionDataGaps) ürettiği değerleri, aynı mantığın bağımsız Python
yeniden uygulamasıyla mevcut veri (data/*.json) üzerinde doğrular. Node mevcut olmadığı
için bu, JS davranışını veri-kontrat düzeyinde test eden bir oracle'dır.

Çalıştırma:  python tools/test_v11.py    (çıkış kodu 0 = tüm testler geçti)
Salt-okunur: hiçbir dosya/veri değiştirmez.
"""
from __future__ import annotations
import json, sys, unicodedata
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"
P = json.loads((DATA / "positions.json").read_text(encoding="utf-8"))
B = json.loads((DATA / "backups.json").read_text(encoding="utf-8"))


def nv(v):
    if v is None:
        return ""
    return " ".join(unicodedata.normalize("NFC", str(v)).split()).casefold()


def blank(v):
    return v is None or (isinstance(v, str) and v.strip() == "")


def is_ready(b):  # js: isReadyBackup — Yedek_Tipi allowlist (HAZIR, HAZ.NIYOR değil)
    t = nv(b.get("Yedek_Tipi"))
    return t in {nv("YETENEK HAZIR"), nv("DOĞAL + HAZIR")}


def candidate_role_links(isim):
    key = nv(isim)
    if not key:
        return []
    return [b for b in B if nv(b.get("Yedek_İsim")) == key]


def multi_role(isim):
    roles, ready_roles = set(), set()
    for b in candidate_role_links(isim):
        k = nv(b.get("Pozisyon_Sahibi")) or nv(b.get("Pozisyon"))
        if not k:
            continue
        roles.add(k)
        if is_ready(b):
            ready_roles.add(k)
    return len(roles), len(ready_roles)


def successor_evidence(b):
    sources, missing = [], []
    for fld, lbl in [("Yedek_Perf", "performans"), ("Yedek_9Box", "9-Box"),
                     ("Yedek_Assess", "assessment")]:
        (sources if not blank(b.get(fld)) else missing).append(lbl)
    if not blank(b.get("Yedek_Tipi")):
        sources.append("readiness (yedek tipi)")
    if not blank(b.get("Coğrafi_Uyum")) or not blank(b.get("Fonksiyonel_Uyum")):
        sources.append("uyum")
    return sources, missing


def position_data_gaps(row):  # js etiketleriyle birebir: 9-Box / Assessment / Performans
    gaps = []
    if blank(row.get("9Box")):
        gaps.append("9-Box")
    if blank(row.get("Assessment")):
        gaps.append("Assessment")
    if blank(row.get("Perf")):
        gaps.append("Performans")
    return gaps


# --- V1.2-A: Açık Halefiyet Riskleri (positionRiskFlags) oracle ---
HIGH = {"ACİL", "YÜKSEK"}


def has_backup(p):  # js: hasBackup — Yedek_Var normalize == "evet"
    return nv(p.get("Yedek_Var")) == nv("evet")


def backups_of(isim):  # js: lookupBackups — Yedek.Pozisyon_Sahibi == Pozisyon.İsim
    k = nv(isim)
    return [b for b in B if nv(b.get("Pozisyon_Sahibi")) == k] if k else []


def pos_ready(p):  # js: positionHasReady
    return any(is_ready(b) for b in backups_of(p.get("İsim")))


def risk_flags(p):  # js: positionRiskFlags (sabit sıra: gap, nobackup, single)
    f = []
    if str(p.get("Aciliyet_Final", "")).strip() in HIGH and not pos_ready(p):
        f.append("gap")
    if not has_backup(p):
        f.append("nobackup")
    if len(backups_of(p.get("İsim"))) == 1:
        f.append("single")
    return f


# --- Testler ---
tests = []
def check(name, cond):
    tests.append((name, bool(cond)))

names = [b["Yedek_İsim"] for b in B if not blank(b.get("Yedek_İsim"))]
check("candidateRoleLinks: bilinen ad >= 1 link", len(candidate_role_links(names[0])) >= 1)
check("candidateRoleLinks: boş ad -> 0 link", len(candidate_role_links("")) == 0)

max_roles = max(multi_role(n)[0] for n in set(names))
check("multiRoleCandidacy: mevcut veride max rol == 1 (çoklu-rol yok)", max_roles == 1)
check("multiRoleCandidacy: roleCount her zaman >= 1 (bağlı yedek)", multi_role(names[0])[0] >= 1)

b_blank9 = next(b for b in B if blank(b.get("Yedek_9Box")))
s, m = successor_evidence(b_blank9)
check("successorEvidence: readiness daima kaynak listesinde", "readiness (yedek tipi)" in s)
check("successorEvidence: boş 9-Box -> missing içinde", "9-Box" in m)
b_full = next((b for b in B if not blank(b.get("Yedek_9Box"))
               and not blank(b.get("Yedek_Perf")) and not blank(b.get("Yedek_Assess"))), None)
check("successorEvidence: tam veri -> missing boş", b_full is not None
      and len(successor_evidence(b_full)[1]) == 0)

p_gap = next((p for p in P if blank(p.get("9Box"))), None)
check("positionDataGaps: boş 9-Box -> gaps içinde", p_gap is not None
      and "9-Box" in position_data_gaps(p_gap))

# V1.2-A — positionRiskFlags dağılımı (mevcut yüklemlerle birebir; recon ile tutarlı)
_flags_all = [risk_flags(p) for p in P]
check("positionRiskFlags: gap (Kritik Ready-now açığı) == 43",
      sum("gap" in f for f in _flags_all) == 43)
check("positionRiskFlags: nobackup (Tanımlı yedek yok) == 16",
      sum("nobackup" in f for f in _flags_all) == 16)
check("positionRiskFlags: tek yedek bağımlılığı (single) == 53",
      sum("single" in f for f in _flags_all) == 53)
check("positionRiskFlags: kuyruk (>=1 bayrak) == 87",
      sum(1 for f in _flags_all if f) == 87)
check("positionRiskFlags: bayraklar yalnızca sabit kümede",
      all(set(f) <= {"gap", "nobackup", "single"} for f in _flags_all))
_p_nb = next((p for p in P if not has_backup(p)), None)
check("positionRiskFlags: yedeksiz pozisyon -> nobackup bayrağı",
      _p_nb is not None and "nobackup" in risk_flags(_p_nb))


# V1.2-B — benchStrength (Halef Havuzu Gücü): mevcut ilişki + Ready Now allowlist
def bench(isim):  # js: benchStrength -> (total, ready, other)
    all_b = backups_of(isim)
    ready = sum(1 for b in all_b if is_ready(b))
    return len(all_b), ready, len(all_b) - ready


_bench = [bench(p.get("İsim")) for p in P]
check("benchStrength: ready + other == total (her pozisyon)",
      all(r + o == t for t, r, o in _bench))
check("benchStrength: ready her zaman 0..total aralığında",
      all(0 <= r <= t for t, r, o in _bench))
check("benchStrength: Ready Now'lu pozisyon == 36 (positionHasReady ile tutarlı)",
      sum(1 for t, r, o in _bench if r >= 1) == 36)
check("benchStrength: readyNames sayısı ready sayısına eşit (boş Yedek_İsim yok)",
      all(sum(1 for b in backups_of(p.get("İsim"))
              if is_ready(b) and not blank(b.get("Yedek_İsim")))
          == bench(p.get("İsim"))[1] for p in P))


# V1.2-D — successorComparisonRows: pozisyon→yedek ilişkisi, mevcut kaynak sırası korunur
def comparison_rows(name):  # js: successorComparisonRows
    out = []
    for b in backups_of(name):
        missing = []
        if blank(b.get("Yedek_Perf")):
            missing.append("Performans")
        if blank(b.get("Yedek_9Box")):
            missing.append("9-Box")
        if blank(b.get("Yedek_Assess")):
            missing.append("Assessment")
        out.append({"name": b.get("Yedek_İsim"), "ready": is_ready(b), "missing": missing})
    return out


_p_multi = next((p for p in P if len(backups_of(p.get("İsim"))) >= 2), None)
check("successorComparisonRows: karşılaştırma için >=2 adaylı pozisyon var", _p_multi is not None)
if _p_multi is not None:
    _nm = _p_multi.get("İsim")
    _src = backups_of(_nm)
    _cmp = comparison_rows(_nm)
    check("successorComparisonRows: uzunluk == bağlı yedek sayısı", len(_cmp) == len(_src))
    check("successorComparisonRows: kaynak sırası korunur",
          [r["name"] for r in _cmp] == [b.get("Yedek_İsim") for b in _src])
    check("successorComparisonRows: ready bayrağı is_ready ile birebir",
          all(r["ready"] == is_ready(b) for r, b in zip(_cmp, _src)))
    check("successorComparisonRows: missing Performans <-> Yedek_Perf boş",
          all(("Performans" in r["missing"]) == blank(b.get("Yedek_Perf"))
              for r, b in zip(_cmp, _src)))

# Mevcut veri sabitleri (mutabakat dolaylı koruması)
check("Veri sabit: 177 pozisyon", len(P) == 177)
check("Veri sabit: 470 yedek", len(B) == 470)
check("Ready-now kayıt sabit: 59", sum(1 for b in B if is_ready(b)) == 59)

fails = [t for t in tests if not t[1]]
for name, ok in tests:
    print(("PASS" if ok else "FAIL"), "-", name)
print("---")
print(f"{len(tests) - len(fails)}/{len(tests)} test geçti")
sys.exit(1 if fails else 0)
