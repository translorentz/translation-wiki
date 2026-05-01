#!/usr/bin/env python3
"""Process Zongqiulun (Discourse on Releasing Prisoners) by Ouyang Xiu.

Source: https://zh.wikisource.org/wiki/縱囚論
Output: data/processed/zongqiulun/chapter-001.json

The essay is a single argumentative piece (~516 chars classical Chinese)
naturally falling into 5 paragraphs in the Wikisource transcription.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_FILE = os.path.join(ROOT, "data", "raw", "zongqiulun", "zongqiulun-wikisource.html")
OUTPUT_DIR = os.path.join(ROOT, "data", "processed", "zongqiulun")


def html_to_text(s):
    s = re.sub(r"<[^>]+>", "", s)
    s = s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    s = s.replace("&quot;", '"').replace("&#39;", "'")
    s = s.replace("&nbsp;", " ").replace("&#160;", " ")
    return s.strip()


def is_pd_notice(text):
    if "Public domain" in text:
        return True
    if "公有领域" in text or "公有領域" in text:
        return True
    if "超过100年" in text or "超過100年" in text:
        return True
    return False


def main():
    if not os.path.exists(RAW_FILE):
        print("ERROR: raw file missing: " + RAW_FILE, file=sys.stderr)
        return 1
    with open(RAW_FILE, "r", encoding="utf-8") as f:
        html = f.read()
    print("Read {} chars from raw HTML".format(len(html)))

    m = re.search(r'<div class="mw-parser-output">(.*?)<!--\s*\nNewPP', html, re.DOTALL)
    if not m:
        m = re.search(r'<div class="mw-parser-output">(.*)', html, re.DOTALL)
    if not m:
        print("ERROR: mw-parser-output not found", file=sys.stderr)
        return 1
    body = m.group(1)

    body = re.sub(r'<span class="pagenum"[^>]*>.*?</span>', "", body, flags=re.DOTALL)
    body = re.sub(r'<sup[^>]*class="reference"[^>]*>.*?</sup>', "", body, flags=re.DOTALL)
    body = re.sub(r'<table[^>]*>.*?</table>', "", body, flags=re.DOTALL)

    raw_paras = re.findall(r"<p[^>]*>(.*?)</p>", body, re.DOTALL)
    cleaned = []
    for raw in raw_paras:
        text = html_to_text(raw)
        if not text:
            continue
        if is_pd_notice(text):
            print("  SKIP (PD notice): {!r}".format(text[:60]))
            continue
        cleaned.append(text)

    if not cleaned:
        print("ERROR: no paragraphs extracted", file=sys.stderr)
        return 2

    total = sum(len(p) for p in cleaned)
    print("Extracted {} paragraphs, {} chars total".format(len(cleaned), total))
    print("First: {!r}".format(cleaned[0][:30]))
    print("Last:  {!r}".format(cleaned[-1][-30:]))
    if not cleaned[-1].endswith(("。", "」", "！", "？", "．")):
        print("WARNING: last paragraph does not end with terminal punctuation",
              file=sys.stderr)

    chapter = {
        "title": "縱囚論 (Discourse on Releasing Prisoners)",
        "paragraphs": [{"index": i, "text": t} for i, t in enumerate(cleaned)],
    }
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out = os.path.join(OUTPUT_DIR, "chapter-001.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(chapter, f, ensure_ascii=False, indent=2)
    print("Wrote {}".format(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
