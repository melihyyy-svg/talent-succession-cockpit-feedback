"""Statik veri üretici — Talent & Succession Cockpit · Public Feedback.

Bu betik, mevcut Streamlit MVP'sinin (`talent_succession_cockpit_mvp`) SALT-OKUNUR
yükleme ve doğrulama katmanını yeniden kullanarak, statik web demosunun ihtiyaç
duyduğu JSON veri paketlerini üretir.

İlkeler
-------
* Kaynak Excel dosyaları YALNIZCA salt-okunur açılır (MVP `data_loader` üzerinden).
  Hiçbir yazma/kopyalama/taşıma yapılmaz; kaynaklar değişmez.
* Risk / 9-Box değerleri YENİDEN HESAPLANMAZ — kaynaktaki değerler taşınır.
* Çıktıda kişisel dosya yolu (C:\\Users\\...) sızdırılmaz; yalnızca dosya adı tutulur.
* Yalnızca uygulamanın render ettiği sayfalar (Pozisyon Verisi, Yedek Verisi,
  Yetenek Havuzu) taşınır; sunum/Gantt/Dashboard sayfaları taşınmaz.

Çalıştırma (MVP venv ile):
    cd talent_succession_cockpit_mvp
    .\\.venv\\Scripts\\python.exe ..\\talent_succession_cockpit_public_feedback\\tools\\generate_data.py
"""

from __future__ import annotations

import json
import sys
from datetime import date, datetime
from pathlib import Path

import pandas as pd

# --- Yollar -----------------------------------------------------------------
HERE = Path(__file__).resolve()
PUBLIC_ROOT = HERE.parents[1]                      # talent_succession_cockpit_public_feedback
PROJECTS_ROOT = HERE.parents[2]                    # Melih-AI-Projeleri
MVP_ROOT = PROJECTS_ROOT / "talent_succession_cockpit_mvp"
DATA_OUT = PUBLIC_ROOT / "data"

if not MVP_ROOT.exists():
    sys.exit(f"HATA: Referans MVP klasörü bulunamadı: {MVP_ROOT}")

# MVP paketini içe aktarabilmek için yolu ekle (namespace package: `src`).
sys.path.insert(0, str(MVP_ROOT))

from src import data_loader, schema, validation  # noqa: E402


# --- Hücre temizleme (JSON-güvenli) -----------------------------------------

def clean(value):
    """Tek hücreyi JSON-güvenli Python değerine çevirir.
    NaN/NaT/boş -> None; numpy skaler -> python; tarih -> ISO; metin -> strip."""
    if value is None:
        return None
    # pandas/numpy NA
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    # numpy skalerleri (.item) güvenli çevrim
    item = getattr(value, "item", None)
    if callable(item):
        try:
            value = value.item()
        except (ValueError, TypeError):
            pass
    if isinstance(value, str):
        return value.strip()
    return value


def df_records(df: pd.DataFrame | None) -> list[dict]:
    """DataFrame'i JSON-güvenli kayıt listesine çevirir (tüm kolonlar)."""
    if df is None or df.empty:
        return []
    out: list[dict] = []
    for _, row in df.iterrows():
        out.append({str(col): clean(row[col]) for col in df.columns})
    return out


def get_sheet_df(result, source_id: str, sheet_name: str) -> pd.DataFrame | None:
    wb = result.workbooks.get(source_id)
    if not wb or not wb.exists or wb.error:
        return None
    sheet = wb.sheets.get(sheet_name)
    if not sheet or sheet.dataframe is None:
        return None
    return sheet.dataframe


# --- Doğrulama bulgularını serileştir ---------------------------------------

def issue_to_dict(i) -> dict:
    return {
        "severity": i.severity,
        "workbook": i.workbook,
        "sheet": i.sheet,
        "category": i.category,
        "message": i.message,
        "count": int(i.count) if i.count else 0,
        "column": i.column,
        "sample": [str(s) for s in (i.sample or [])],
    }


def override_to_dict(a: dict) -> dict:
    ov = a.get("override", {})
    return {
        "status": a.get("status"),
        "count": a.get("count", 0),
        "col": a.get("col", ""),
        "raw": clean(a.get("raw")),
        "effective": a.get("effective"),
        "note": ov.get("note", ""),
        "sheet": ov.get("sheet", ""),
    }


def workbook_load_summary(result) -> list[dict]:
    """Veri Yükleme Durumu ekranı için yükleme özeti (yol SIZDIRILMAZ)."""
    out = []
    for wb_contract in schema.WORKBOOKS:
        load = result.workbooks.get(wb_contract.source_id)
        if load is None:
            continue
        sheets = []
        for contract in wb_contract.sheets:
            sheet = load.sheets.get(contract.name)
            exists = bool(sheet and sheet.exists)
            sheets.append({
                "name": contract.name,
                "kind": "tablo" if contract.kind == schema.TABLE else "sunum/yapısal",
                "exists": exists,
                "header_row": contract.header_row,
                "active_row_count": (sheet.active_row_count
                                     if sheet and sheet.dataframe is not None else None),
                "raw_row_count": (sheet.raw_row_count
                                  if sheet and sheet.dataframe is not None else None),
                "columns_count": len(sheet.columns) if sheet else 0,
            })
        out.append({
            "label": wb_contract.label,
            "filename": Path(load.path).name,          # yalnızca dosya adı
            "exists": load.exists,
            "size_bytes": load.size_bytes,
            "modified": load.modified.strftime("%Y-%m-%d") if load.modified else None,
            "error": load.error or "",
            "sheets": sheets,
        })
    return out


# --- 9-Box referans sabitleri (statik; kişisel veri değil) ------------------

def ninebox_reference() -> dict:
    return {
        "potential_order": list(schema.NINEBOX_POTENTIAL_ORDER),
        "performance_order": list(schema.NINEBOX_PERFORMANCE_ORDER),
        # (Potansiyel, Performans) -> etiket  ==>  "Potansiyel|Performans": etiket
        "grid": {f"{pot}|{perf}": label
                 for (pot, perf), label in schema.NINEBOX_GRID.items()},
        "meaning": dict(schema.NINEBOX_CELL_MEANING),
        "tone": dict(schema.NINEBOX_CELL_TONE),
    }


# --- Ana akış ---------------------------------------------------------------

def main() -> None:
    DATA_OUT.mkdir(parents=True, exist_ok=True)

    print("Excel dosyaları salt-okunur yükleniyor…")
    result = data_loader.load_all()
    issues = validation.run_all(result)

    positions = get_sheet_df(result, "succession", "Pozisyon Verisi")
    backups = get_sheet_df(result, "succession", "Yedek Verisi")
    talent = get_sheet_df(result, "talent", schema.TALENT_POOL_SHEET)

    datasets = {
        "positions.json": df_records(positions),
        "backups.json": df_records(backups),
        "talent_pool.json": df_records(talent),
    }

    quality = {
        "issues": [issue_to_dict(i) for i in issues],
        "overrides": [override_to_dict(a) for a in (result.firma_overrides or [])],
        "load": workbook_load_summary(result),
        "counts": {
            "error": sum(1 for i in issues if i.severity == validation.ERROR),
            "warning": sum(1 for i in issues if i.severity == validation.WARNING),
            "info": sum(1 for i in issues if i.severity == validation.INFO),
        },
    }

    meta = {
        "app_title": "Talent & Succession Cockpit — Public Feedback",
        "generated_at": date.today().isoformat(),
        "read_only_source": True,
        "ninebox": ninebox_reference(),
        "row_counts": {
            "positions": len(datasets["positions.json"]),
            "backups": len(datasets["backups.json"]),
            "talent_pool": len(datasets["talent_pool.json"]),
        },
        "sources": [
            {"label": wb["label"], "filename": wb["filename"],
             "size_bytes": wb["size_bytes"], "modified": wb["modified"]}
            for wb in quality["load"]
        ],
    }

    def dump(name: str, obj) -> None:
        path = DATA_OUT / name
        with path.open("w", encoding="utf-8") as fh:
            json.dump(obj, fh, ensure_ascii=False, separators=(",", ":"))
        print(f"  yazıldı: data/{name}  ({path.stat().st_size:,} bayt)")

    for name, obj in datasets.items():
        dump(name, obj)
    dump("quality.json", quality)
    dump("meta.json", meta)

    print("\nÖzet:")
    print(f"  Pozisyon kaydı : {meta['row_counts']['positions']}")
    print(f"  Yedek kaydı    : {meta['row_counts']['backups']}")
    print(f"  Talent kaydı   : {meta['row_counts']['talent_pool']}")
    print(f"  Veri kalitesi  : {quality['counts']['error']} hata · "
          f"{quality['counts']['warning']} uyarı · {quality['counts']['info']} bilgi")
    print("Tamamlandı.")


if __name__ == "__main__":
    main()
