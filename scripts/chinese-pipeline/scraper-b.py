#!/usr/bin/env python3
"""
Scraper B: Scrapes 17 Chinese texts (indices 17-33) from zh.wikisource.org.
Outputs raw text files to data/raw/<slug>/NNN_title.txt
"""

import os
import sys
import json
import time
import re
import logging
import requests
from bs4 import BeautifulSoup
import urllib.parse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
LOG_FILE = "/tmp/chinese-processor-b.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# Load verified texts
with open(os.path.join(BASE_DIR, "data", "chinese-pipeline", "verified-texts.json"), "r", encoding="utf-8") as f:
    all_texts = json.load(f)

MY_TEXTS = all_texts[17:34]  # indices 17-33 inclusive

session = requests.Session()
session.headers.update({
    "User-Agent": "TranslationWikiBot/1.0 (educational project; https://deltoi.com)"
})


def scrape_page(url):
    """Scrape text content from a wikisource page."""
    time.sleep(2.1)
    log.info(f"  Fetching: {url}")
    response = session.get(url)
    response.raise_for_status()
    response.encoding = "utf-8"
    soup = BeautifulSoup(response.content, "html.parser")
    content_div = soup.find("div", id="mw-content-text")
    if not content_div:
        return None

    # Remove garbage
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


def find_chapter_links(index_url, title_zh, slug, expected_chapters):
    """
    Fetch the index page and find chapter/volume links.
    Returns list of (chapter_number, title, url).
    """
    time.sleep(2.1)
    log.info(f"Fetching index: {index_url}")
    response = session.get(index_url)
    response.raise_for_status()
    response.encoding = "utf-8"
    soup = BeautifulSoup(response.content, "html.parser")
    content_div = soup.find("div", id="mw-content-text")
    if not content_div:
        log.error(f"  No content div found for {slug}")
        return []

    links = content_div.find_all("a")
    chapter_links = []

    # Determine the base wiki path for this text
    parsed = urllib.parse.urlparse(index_url)
    # The wiki title is everything after /wiki/
    wiki_title = urllib.parse.unquote(parsed.path.replace("/wiki/", ""))

    # Collect all internal links
    all_links = []
    for a in links:
        href = a.get("href", "")
        text = a.get_text(strip=True)
        if not href or not text:
            continue
        if href.startswith("/wiki/"):
            full_url = f"https://zh.wikisource.org{href}"
            all_links.append((text, full_url, href))

    # Strategy 1: Links containing 回 pattern (novels)
    hui_novels = [
        "luye-xianzong", "yesou-puyan", "qilu-deng", "dangkou-zhi",
        "sanxia-wuyi", "niehai-hua", "feilong-quanzhuan", "nuxian-waishi",
        "xingshi-yan", "hedian",
    ]

    # Strategy 2: Links containing 卷 pattern (scholarly texts)
    juan_texts = [
        "mingru-xuean", "yuewei-caotang-biji", "yuchu-xinzhi",
        "mengliang-lu", "wulin-jiushi", "qidong-yeyu", "helin-yulu",
    ]

    if slug in hui_novels:
        chapter_links = find_hui_links(all_links, title_zh, wiki_title, expected_chapters)
    elif slug in juan_texts:
        chapter_links = find_juan_links(all_links, title_zh, wiki_title, expected_chapters, slug)
    else:
        log.warning(f"  Unknown slug pattern for {slug}, trying generic approach")
        chapter_links = find_generic_links(all_links, title_zh, wiki_title, expected_chapters)

    log.info(f"  Found {len(chapter_links)} chapter links for {slug} (expected {expected_chapters})")
    return chapter_links


def find_hui_links(all_links, title_zh, wiki_title, expected):
    """Find 回-based chapter links."""
    results = []
    seen = set()
    for text, url, href in all_links:
        # Match links that reference 回 chapters
        decoded = urllib.parse.unquote(href)
        # Check if this link is a sub-page of our text
        if wiki_title not in decoded and title_zh not in decoded:
            continue
        # Look for 第X回 pattern in link text or URL
        m = re.search(r'第([零一二三四五六七八九十百千\d]+)回', text) or re.search(r'第([零一二三四五六七八九十百千\d]+)回', decoded)
        if m and url not in seen:
            seen.add(url)
            results.append((text, url))

    if not results:
        # Fallback: just find all sub-page links
        for text, url, href in all_links:
            decoded = urllib.parse.unquote(href)
            if (wiki_title + "/") in decoded or (title_zh + "/") in decoded:
                if url not in seen and "回" in (text + decoded):
                    seen.add(url)
                    results.append((text, url))

    # Sort by chapter number
    def extract_num(item):
        text = item[0]
        m = re.search(r'第(\d+)回', text)
        if m:
            return int(m.group(1))
        m = re.search(r'第([零一二三四五六七八九十百千]+)回', text)
        if m:
            return cn_num_to_int(m.group(1))
        return 0

    results.sort(key=extract_num)
    return [(i + 1, t, u) for i, (t, u) in enumerate(results)]


def find_juan_links(all_links, title_zh, wiki_title, expected, slug):
    """Find 卷-based chapter links."""
    results = []
    seen = set()
    for text, url, href in all_links:
        decoded = urllib.parse.unquote(href)
        if wiki_title not in decoded and title_zh not in decoded:
            continue
        # Look for 卷 or 巻 pattern
        if re.search(r'[卷巻]', text + decoded) and url not in seen:
            seen.add(url)
            results.append((text, url))

    if not results:
        # Fallback: all sub-page links
        for text, url, href in all_links:
            decoded = urllib.parse.unquote(href)
            if (wiki_title + "/") in decoded or (title_zh + "/") in decoded:
                if url not in seen:
                    seen.add(url)
                    results.append((text, url))

    # For mingru-xuean, chapters are numbered differently
    return [(i + 1, t, u) for i, (t, u) in enumerate(results)]


def find_generic_links(all_links, title_zh, wiki_title, expected):
    """Generic fallback for finding chapter links."""
    results = []
    seen = set()
    for text, url, href in all_links:
        decoded = urllib.parse.unquote(href)
        if (wiki_title + "/") in decoded or (title_zh + "/") in decoded:
            if url not in seen:
                seen.add(url)
                results.append((text, url))
    return [(i + 1, t, u) for i, (t, u) in enumerate(results)]


def cn_num_to_int(s):
    """Convert simple Chinese numeral to integer."""
    digits = {"零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
              "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
              "百": 100, "千": 1000}
    if not s:
        return 0
    # Simple cases
    result = 0
    current = 0
    for ch in s:
        if ch in digits:
            val = digits[ch]
            if val >= 10:
                if current == 0:
                    current = 1
                result += current * val
                current = 0
            else:
                current = val
    result += current
    return result


def scrape_text(text_info):
    """Scrape all chapters for a single text."""
    slug = text_info["slug"]
    title_zh = text_info["title_zh"]
    url = text_info["wikisource_url"]
    expected = text_info["chapters"]

    out_dir = os.path.join(RAW_DIR, slug)
    os.makedirs(out_dir, exist_ok=True)

    # Check how many files already exist
    existing = [f for f in os.listdir(out_dir) if f.endswith(".txt")] if os.path.exists(out_dir) else []
    if len(existing) >= expected:
        log.info(f"SKIP {slug}: already have {len(existing)} files (expected {expected})")
        return True

    log.info(f"=== Scraping {slug} ({title_zh}) — {expected} chapters ===")

    chapters = find_chapter_links(url, title_zh, slug, expected)
    if not chapters:
        log.error(f"  FAILED: No chapter links found for {slug}")
        return False

    success_count = len(existing)
    for ch_num, ch_title, ch_url in chapters:
        filename = f"{ch_num:03d}_{ch_title[:50].replace('/', '_')}.txt"
        filepath = os.path.join(out_dir, filename)
        if os.path.exists(filepath) and os.path.getsize(filepath) > 100:
            log.info(f"  Skip ch {ch_num}: already exists")
            success_count += 1
            continue

        try:
            content = scrape_page(ch_url)
            if content and len(content) > 50:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                success_count += 1
                log.info(f"  OK ch {ch_num}: {len(content)} chars")
            else:
                log.warning(f"  EMPTY ch {ch_num}: {ch_url}")
        except Exception as e:
            log.error(f"  ERROR ch {ch_num}: {e}")

    log.info(f"  Done {slug}: {success_count}/{expected} chapters")
    return success_count > 0


def main():
    log.info(f"=== Scraper B: {len(MY_TEXTS)} texts ===")
    results = {}
    for text_info in MY_TEXTS:
        try:
            ok = scrape_text(text_info)
            results[text_info["slug"]] = "OK" if ok else "FAILED"
        except Exception as e:
            log.error(f"FATAL ERROR for {text_info['slug']}: {e}")
            results[text_info["slug"]] = f"ERROR: {e}"

    log.info("=== SUMMARY ===")
    for slug, status in results.items():
        log.info(f"  {slug}: {status}")


if __name__ == "__main__":
    main()
