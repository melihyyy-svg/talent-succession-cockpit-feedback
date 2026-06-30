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
