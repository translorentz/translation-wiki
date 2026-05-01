#!/usr/bin/env python3
import json, os, re, time, urllib.parse, urllib.request

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
RAW_DIR = "data/raw/ouyangxiu-ji"
OUT_DIR = "data/processed/ouyangxiu-ji"
JUAN_URL = "https://zh.wikisource.org/wiki/" + urllib.parse.quote("歐陽修集/卷")

_ZH_DIGITS = "〇一二三四五六七八九"

def _zh_num(n):
    if n < 10:
        return _ZH_DIGITS[n]
    if n < 20:
        return chr(21313) if n == 10 else chr(21313) + _ZH_DIGITS[n - 10]
    if n < 100:
        tens, ones = divmod(n, 10)
        s = _ZH_DIGITS[tens] + chr(21313)
        if ones:
            s += _ZH_DIGITS[ones]
        return s
    if n == 100:
        return chr(30334)
    h, rem = divmod(n, 100)
    s = _ZH_DIGITS[h] + chr(30334)
    if rem:
        s += _zh_num(rem)
    return s

LABELS = json.load(open(os.path.join(os.path.dirname(__file__), "lib", "ouyangxiu-ji", "juan-labels.json")))

def juan_metadata(n):
    row = LABELS.get(str(n))
    if row is None:
        return ("", "", "essay")
    return (row[0], row[1], row[2])

def fetch(url, cache_path):
    if os.path.exists(cache_path) and os.path.getsize(cache_path) > 1000:
        with open(cache_path, "r", encoding="utf-8") as fh:
            return fh.read()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as resp:
        html = resp.read().decode("utf-8")
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as fh:
        fh.write(html)
    time.sleep(0.4)
    return html

def strip_tags(html):
    html = re.sub(r"<rt[^>]*>.*?</rt>", "", html, flags=re.DOTALL)
    html = re.sub(r"<rp[^>]*>.*?</rp>", "", html, flags=re.DOTALL)
    html = re.sub(r'<sup[^>]*class="reference"[^>]*>.*?</sup>', "", html, flags=re.DOTALL)
    html = re.sub(r'<sup[^>]*>\[\d+\]</sup>', "", html, flags=re.DOTALL)
    html = re.sub(r'<span[^>]*class="mw-cite-backlink"[^>]*>.*?</span>', "", html, flags=re.DOTALL)
    html = re.sub(r'<span[^>]*class="mw-editsection"[^>]*>.*?</span>', "", html, flags=re.DOTALL)
    html = re.sub(r'<span[^>]*class="pagenum[^"]*"[^>]*>.*?</span>', "", html, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", "", html)
    text = (text.replace("&nbsp;", chr(12288))
            .replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
            .replace('&quot;', chr(34)).replace('&#160;', chr(12288)))
    return text.strip()

def isolate_content(html):
    m = re.search(r'<div class="mw-content-ltr mw-parser-output"[^>]*>(.*)', html, re.DOTALL)
    body = m.group(1) if m else html
    # Cut at the EARLIEST appearance of any footer/license marker
    cut = len(body)
    for marker in (
        '<!-- ' + chr(10) + 'NewPP',
        '<div class="printfooter',
        '<div id="catlinks"',
        '<div class="licenseContainer',
    ):
        idx = body.find(marker)
        if idx > 0 and idx < cut:
            cut = idx
    body = body[:cut]
    body = re.sub(r'<table[^>]*class="[^"]*headerbox[^"]*"[^>]*>.*?</table>', "", body, flags=re.DOTALL)
    body = re.sub(r'<table[^>]*class="[^"]*header_notes[^"]*"[^>]*>.*?</table>', "", body, flags=re.DOTALL)
    return body

def extract_blocks(body):
    blocks = []
    for m in re.finditer(r"<(h[1-6]|p)([^>]*)>(.*?)</\1>", body, re.DOTALL):
        tag = m.group(1).lower()
        inner = m.group(3)
        text = strip_tags(inner)
        if not text:
            continue
        if "前一卷" in text or "后一卷" in text or "後一卷" in text:
            continue
        if text.startswith("@media") or text.startswith(".mw-parser-output"):
            continue
        kind = "h" if tag.startswith("h") else "p"
        if kind == "h" and text in {"目录", "目錄", "目次", "Contents"}:
            continue
        blocks.append((kind, text))
    return blocks

def build_paragraphs(blocks):
    paragraphs = []
    for _, text in blocks:
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            paragraphs.append(text)
    return paragraphs

def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    written = 0
    skipped = 0
    issues = []
    for n in range(1, 154):
        sub_zh, en_label, genre = juan_metadata(n)
        nnn = f"{n:03d}"
        url = JUAN_URL + nnn
        cache_path = os.path.join(RAW_DIR, f"juan-{nnn}.html")
        try:
            html = fetch(url, cache_path)
        except Exception as ex:
            issues.append(f"juan {n}: fetch error {ex}")
            skipped += 1
            continue
        body = isolate_content(html)
        blocks = extract_blocks(body)
        paragraphs = build_paragraphs(blocks)
        if not paragraphs:
            issues.append(f"juan {n}: no paragraphs extracted")
            skipped += 1
            continue
        zh_juan = _zh_num(n)
        title = f"卷{zh_juan} {sub_zh} (Juan {n}: {en_label})"
        out = {
            "title": title,
            "genre": genre,
            "subCollection": sub_zh,
            "paragraphs": [{"index": i, "text": p} for i, p in enumerate(paragraphs)],
        }
        out_path = os.path.join(OUT_DIR, f"chapter-{nnn}.json")
        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(out, fh, ensure_ascii=False, indent=2)
        written += 1
    print(f"Written: {written}, Skipped: {skipped}")
    if issues:
        print("Issues:")
        for x in issues:
            print(" -", x)

if __name__ == "__main__":
    main()
