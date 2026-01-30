#!/usr/bin/env python3
"""Scrape the 5 續錄 volumes of 嘯亭續錄 from zh.wikisource.org and produce processed chapter JSONs."""

import os, requests, time, json
from bs4 import BeautifulSoup

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw", "xiaoting-zalu")
PROC_DIR = os.path.join(BASE_DIR, "data", "processed", "xiaoting-zalu")

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "TranslationWikiBot/1.0 (educational project; scraping classical texts)"
})

VOLUMES = [
    ("https://zh.wikisource.org/wiki/%E5%98%AF%E4%BA%AD%E7%BA%8C%E9%8C%84/%E5%8D%B7%E4%B8%80", "卷一"),
    ("https://zh.wikisource.org/wiki/%E5%98%AF%E4%BA%AD%E7%BA%8C%E9%8C%84/%E5%8D%B7%E4%BA%8C", "卷二"),
    ("https://zh.wikisource.org/wiki/%E5%98%AF%E4%BA%AD%E7%BA%8C%E9%8C%84/%E5%8D%B7%E4%B8%89", "卷三"),
    ("https://zh.wikisource.org/wiki/%E5%98%AF%E4%BA%AD%E7%BA%8C%E9%8C%84/%E5%8D%B7%E5%9B%9B", "卷四"),
    ("https://zh.wikisource.org/wiki/%E5%98%AF%E4%BA%AD%E7%BA%8C%E9%8C%84/%E5%8D%B7%E4%BA%94", "卷五"),
]


def scrape_page(url):
    response = SESSION.get(url)
    response.raise_for_status()
    response.encoding = "utf-8"
    soup = BeautifulSoup(response.content, "html.parser")
    content_div = soup.find("div", id="mw-content-text")
    if not content_div:
        return None

    for table in content_div.find_all("table"):
        table.decompose()
    garbage_classes = [
        "navbox", "mw-editsection", "noprint", "toc",
        "licenseContainer", "printfooter", "references", "reference",
        "header-container", "footer-container",
    ]
    for unwanted in content_div.find_all(
        ["div", "span", "sup", "ol", "ul"], class_=garbage_classes
    ):
        unwanted.decompose()
    for small in content_div.find_all("small"):
        small.decompose()

    text_parts = []
    tags = content_div.find_all(["h2", "h3", "p", "dl", "dt", "div"])
    for tag in tags:
        if tag.name == "div" and "poem" not in tag.get("class", []):
            continue
        text = tag.get_text(strip=True)
        if text:
            text_parts.append(text)
    return "\n\n".join(text_parts)


def make_chapter_json(chapter_number, title, raw_text):
    paragraphs = []
    idx = 1
    for para in raw_text.split("\n\n"):
        para = para.strip()
        if para:
            paragraphs.append({"index": idx, "text": para})
            idx += 1
    return {
        "chapterNumber": chapter_number,
        "title": title,
        "sourceContent": {"paragraphs": paragraphs},
    }


def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(PROC_DIR, exist_ok=True)

    for i, (url, vol_name) in enumerate(VOLUMES):
        file_num = 11 + i
        raw_path = os.path.join(RAW_DIR, f"{file_num:03d}_{vol_name}.txt")
        proc_path = os.path.join(PROC_DIR, f"chapter-{file_num:03d}.json")

        if os.path.exists(raw_path) and os.path.getsize(raw_path) > 100:
            print(f"SKIP existing: {raw_path}")
            raw_text = open(raw_path, "r", encoding="utf-8").read()
        else:
            print(f"Fetching volume {vol_name} from {url}")
            raw_text = scrape_page(url)
            if not raw_text or len(raw_text) < 50:
                print(f"ERROR: empty content for {vol_name}")
                continue
            with open(raw_path, "w", encoding="utf-8") as f:
                f.write(raw_text)
            print(f"  Saved raw: {raw_path} ({len(raw_text)} chars)")

        # Process into chapter JSON
        chapter_json = make_chapter_json(file_num, f"續錄{vol_name}", raw_text)
        with open(proc_path, "w", encoding="utf-8") as f:
            json.dump(chapter_json, f, ensure_ascii=False, indent=2)
        print(f"  Saved processed: {proc_path} ({len(chapter_json['sourceContent']['paragraphs'])} paragraphs)")

        if i < len(VOLUMES) - 1:
            time.sleep(2.1)

    print("Done!")


if __name__ == "__main__":
    main()
