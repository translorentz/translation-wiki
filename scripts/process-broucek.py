#!/usr/bin/env python3
"""Process Nový epochální výlet pana Broučka from Czech Wikisource."""

import json
import re
import time
import urllib.request
import urllib.parse

BASE = "https://cs.wikisource.org/w/api.php"
SLUG = "novy-epochalni-vylet-pana-broucka"
OUT_DIR = "data/processed/novy-epochalni-vylet-pana-broucka"

ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV"]

def fetch_wikitext(subpage):
    page = f"Nový epochální výlet pana Broučka, tentokráte do XV. století/{subpage}"
    url = f"{BASE}?action=parse&page={urllib.parse.quote(page, safe='')}&prop=wikitext&format=json"
    req = urllib.request.Request(url, headers={"User-Agent": "TranslationWiki/1.0"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    return data["parse"]["wikitext"]["*"]

def clean_wikitext(text):
    # Remove templates like {{...}}
    text = re.sub(r'\{\{[^}]*\}\}', '', text)
    # Remove categories
    text = re.sub(r'\[\[Kategorie:[^\]]*\]\]', '', text)
    # Remove interwiki links
    text = re.sub(r'\[\[[a-z]{2}:[^\]]*\]\]', '', text)
    # Convert wiki links [[target|display]] -> display, [[target]] -> target
    text = re.sub(r'\[\[[^\]|]*\|([^\]]*)\]\]', r'\1', text)
    text = re.sub(r'\[\[([^\]]*)\]\]', r'\1', text)
    # Remove bold/italic markup
    text = text.replace("'''", "").replace("''", "")
    # Remove <poem> tags but keep content
    text = re.sub(r'</?poem[^>]*>', '', text)
    # Remove <br/> <br> <br />
    text = re.sub(r'<br\s*/?>', '\n', text)
    # Remove section headers == ... ==
    text = re.sub(r'^=+\s*.*?\s*=+\s*$', '', text, flags=re.MULTILINE)
    # Remove refs
    text = re.sub(r'<ref[^>]*>.*?</ref>', '', text, flags=re.DOTALL)
    text = re.sub(r'<ref[^/]*/>', '', text)
    # Remove remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Remove horizontal rules
    text = re.sub(r'^----+\s*$', '', text, flags=re.MULTILINE)
    # Normalize whitespace within lines
    lines = text.split('\n')
    cleaned_lines = [line.strip() for line in lines]

    # Group into paragraphs (blank lines separate paragraphs)
    paragraphs = []
    current = []
    for line in cleaned_lines:
        if line == '':
            if current:
                paragraphs.append(' '.join(current))
                current = []
        else:
            current.append(line)
    if current:
        paragraphs.append(' '.join(current))

    # Filter empty paragraphs
    paragraphs = [p.strip() for p in paragraphs if p.strip()]
    return paragraphs

for i, numeral in enumerate(ROMAN):
    ch_num = i + 1
    print(f"Fetching chapter {ch_num} ({numeral})...")
    wikitext = fetch_wikitext(numeral)
    paragraphs = clean_wikitext(wikitext)

    chapter = {
        "chapterNumber": ch_num,
        "title": numeral,
        "sourceContent": {
            "paragraphs": [
                {"index": idx, "text": p}
                for idx, p in enumerate(paragraphs)
            ]
        }
    }

    outfile = f"{OUT_DIR}/chapter-{ch_num:03d}.json"
    with open(outfile, 'w', encoding='utf-8') as f:
        json.dump(chapter, f, ensure_ascii=False, indent=2)

    print(f"  Chapter {ch_num}: {len(paragraphs)} paragraphs")
    time.sleep(1)

print("Done!")
