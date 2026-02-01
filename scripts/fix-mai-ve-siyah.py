#!/usr/bin/env python3
"""Fix OCR issues in Mai ve Siyah processed chapters."""

import json
import os
import re
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "processed" / "mai-ve-siyah"

# Editorial/footnote markers
EDITORIAL_MARKERS = [
    "baskılarında",
    "özgün metinde",
    "dizgi yanlışı",
    "sadeleştirmesindeki",
]

def fix_broken_spacing_ch20(text: str) -> str:
    """Fix broken word spacing in chapter 20 paragraphs."""
    replacements = {
        "duva r": "duvar",
        "Cihangi r": "Cihangir",
        "cam i ierin": "camilerin",
        "fı sk i ye": "fıskiye",
        "Üsküda r": "Üsküdar",
        "M a rma ra": "Marmara",
        "y iiksekte": "yüksekte",
        "ayrı la rak": "ayrılarak",
        "karanl ıın": "karanlığın",
        "ii rkiitiicii": "ürkütücü",
        "şekl inde": "şeklinde",
        "saklanı yor": "saklanıyor",
        "minarcierin": "minarelerin",
        "sernalara": "semalara",
        "şek linde": "şeklinde",
        "sank i": "sanki",
        "i lerliyor": "ilerliyor",
        "tiil geçi ri lmiş": "tül geçirilmiş",
        "siyahl ıklar": "siyahlıklar",
        "siyahl ığın": "siyahlığın",
        "lıakikatler": "hakikatler",
        "k üçük": "küçük",
        "bell isiz": "belirsiz",
        "yuvadana yuvadana": "yuvarlanarak yuvarlanarak",
        "yüzi.iyorla rıııı": "yüzüyorlarmış",
        "nağmcsiyle": "nağmesiyle",
        "boğu lan": "boğulan",
        "kenanndan": "kenarından",
        "kaynaa rak": "kaynayarak",
        "gürnıüyordu": "görmüyordu",
        "yokl uk": "yokluk",
        "silkin di": "silkindi",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def remove_footnote_from_paragraph(text: str) -> str:
    """Remove editorial footnote sentences from a paragraph."""
    # Chapter 5, para 4: footnote about "Büht" / "beht"
    # The footnote is: '"Büht", 1938 ve 1942 baskılarında dizgi yanlışı, özgün metinde "beht".'
    text = re.sub(r'\s*"Büht",\s*1938 ve 1942 baskılarında dizgi yanlışı, özgün metinde "beht"\.', '', text)

    # Chapter 4, para 20: footnote about "şuhka" / baskılarında embedded mid-sentence
    text = re.sub(
        r'yakışırRomanın 1938 ve 1942 baskılarında "şuhka" yazılması yazarın gözünden kaçmış bir dizgi yaniışı olsa gerek\. Eski yazı metinde "şehka-i büka" olarak geçiyor\. dı\.',
        'yakışırdı.',
        text
    )

    # Chapter 20, para 34: footnote about "sekerat"
    # Remove the footnote sentence containing sadeleştirmesindeki and sekerat
    text = re.sub(r'\s*ı\s*"Bir siyah inci yağmuru"\s*sadeleştirmesindeki\s*"sekerat"\s*kelimesinin\s*"sekerat-ı mevt"\s*gibi alınabileceği düşünülerek\.', '', text)

    return text


def scan_for_editorial_footnotes(text: str) -> list:
    """Check if text contains editorial apparatus markers."""
    found = []
    for marker in EDITORIAL_MARKERS:
        if marker in text:
            found.append(marker)
    return found


def fix_rn_to_m(text: str) -> str:
    """Fix systematic OCR 'rn' → 'm' misread: Cernil→Cemil, Nazrni→Nazmi."""
    text = text.replace("Cernil", "Cemil")
    text = text.replace("Nazrni", "Nazmi")
    text = text.replace("Nazrni", "Nazmi")  # in case of different context
    # Also catch lowercase variants
    text = text.replace("cernil", "cemil")
    return text


def main():
    total_changes = {
        "broken_spacing": 0,
        "footnotes_removed": 0,
        "rn_to_m": 0,
        "editorial_found": [],
    }

    for i in range(1, 21):
        fname = f"chapter-{i:03d}.json"
        fpath = DATA_DIR / fname
        if not fpath.exists():
            continue

        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)

        changed = False
        chapter_changes = []

        for pi, para in enumerate(data["paragraphs"]):
            original = para

            # 1. Fix rn→m across ALL chapters
            para = fix_rn_to_m(para)
            if para != original:
                total_changes["rn_to_m"] += 1
                chapter_changes.append(f"  [rn→m] para {pi}")

            # 2. Fix broken spacing (chapter 20)
            before_spacing = para
            if i == 20:
                para = fix_broken_spacing_ch20(para)
                if para != before_spacing:
                    total_changes["broken_spacing"] += 1
                    chapter_changes.append(f"  [spacing] para {pi}")

            # 3. Remove footnotes
            before_fn = para
            para = remove_footnote_from_paragraph(para)
            if para != before_fn:
                total_changes["footnotes_removed"] += 1
                chapter_changes.append(f"  [footnote] para {pi}")

            # 4. Scan for remaining editorial markers
            markers = scan_for_editorial_footnotes(para)
            if markers:
                total_changes["editorial_found"].append(
                    f"  ch{i:03d} para {pi}: {markers}"
                )

            if para != original:
                data["paragraphs"][pi] = para
                changed = True

        if changed:
            with open(fpath, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"{fname}: {len(chapter_changes)} fixes")
            for c in chapter_changes:
                print(c)
        else:
            print(f"{fname}: no changes")

    print("\n=== SUMMARY ===")
    print(f"Broken spacing fixes: {total_changes['broken_spacing']}")
    print(f"Footnotes removed: {total_changes['footnotes_removed']}")
    print(f"rn→m fixes: {total_changes['rn_to_m']}")
    if total_changes["editorial_found"]:
        print(f"Remaining editorial markers found:")
        for e in total_changes["editorial_found"]:
            print(e)
    else:
        print("No remaining editorial markers found.")


if __name__ == "__main__":
    main()
