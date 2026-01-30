#!/usr/bin/env python3
"""
Scraper A: Scrapes 17 Chinese texts from zh.wikisource.org.
Outputs raw text files to data/raw/<slug>/NNN_title.txt

Strategy: Always discover actual links from the index page first,
then scrape each linked page.
"""

import os
import sys
import json
import time
import re
import logging
import urllib.parse
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# Setup
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DIR = PROJECT_ROOT / "data" / "raw"
VERIFIED_FILE = PROJECT_ROOT / "data" / "chinese-pipeline" / "verified-texts.json"
LOG_FILE = "/tmp/chinese-processor-a.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

AGENT_A_SLUGS = [
    "huayue-hen", "sui-tang-yanyi", "taoan-mengyi", "xianqing-ouji",
    "xiaolin-guangji", "suiyuan-shihua", "shipin", "qianfu-lun",
    "rongzhai-suibi", "kunxue-jiwen", "youyang-zazu", "laoxuean-biji",
    "dongjing-menghua-lu", "chibei-outan", "shuijing-zhu", "qimin-yaoshu",
    "fenshu",
]

RATE_LIMIT = 2.1
BASE_URL = "https://zh.wikisource.org"

session = requests.Session()
session.headers.update({
    "User-Agent": "TranslationWikiBot/1.0 (academic; deltoi.com)"
})


def scrape_page_content(url):
    """Scrape text content from a wikisource page."""
    try:
        response = session.get(url, timeout=30)
        response.raise_for_status()
        response.encoding = "utf-8"
    except Exception as e:
        log.error(f"Failed to fetch {url}: {e}")
        return None

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
        "header-container", "footer-container", "headerContainer",
        "ws-noexport", "mw-heading", "sistersitebox",
    ]
    for unwanted in content_div.find_all(
        ["div", "span", "sup", "ol", "ul", "link", "style", "script"],
        class_=garbage_classes,
    ):
        unwanted.decompose()
    for small in content_div.find_all("small"):
        small.decompose()
    for es in content_div.find_all("span", class_="mw-editsection"):
        es.decompose()

    text_parts = []
    tags = content_div.find_all(["h2", "h3", "h4", "p", "dl", "dt", "dd", "div"])
    for tag in tags:
        if tag.name == "div" and "poem" not in (tag.get("class") or []):
            continue
        text = tag.get_text(strip=True)
        if text and len(text) > 0:
            if text in ("目錄", "導覽選單", "目次", "参考文献", "外部链接"):
                continue
            text_parts.append(text)

    return "\n\n".join(text_parts)


def discover_chapter_links(index_url, title_zh):
    """
    Discover chapter/volume links from the index page.
    Returns list of (title_text, full_url) tuples in page order.
    """
    try:
        response = session.get(index_url, timeout=30)
        response.raise_for_status()
        response.encoding = "utf-8"
    except Exception as e:
        log.error(f"Failed to fetch index page {index_url}: {e}")
        return []

    soup = BeautifulSoup(response.content, "html.parser")
    content_div = soup.find("div", id="mw-content-text")
    if not content_div:
        return []

    all_links = content_div.find_all("a")
    results = []
    seen_urls = set()

    for a in all_links:
        href = a.get("href", "")
        text = a.get_text(strip=True)
        if not href or not text:
            continue

        decoded = urllib.parse.unquote(href)

        # Skip external links, edit links, talk pages, etc.
        if any(x in decoded for x in ["action=edit", "Talk:", "wikipedia.org",
                                        "commons.wikimedia", "wikidata.org",
                                        "Special:", "redlink=1"]):
            continue

        # Must be a subpage of the title or closely related
        if f"/wiki/{title_zh}/" not in decoded:
            continue

        # Skip the index page itself
        if decoded.rstrip("/") == f"/wiki/{title_zh}":
            continue

        # Skip navigation text
        if text in ("编辑", "版本信息", "百科", "图册分类", "数据项"):
            continue

        full_url = BASE_URL + href if href.startswith("/") else href
        if full_url not in seen_urls:
            seen_urls.add(full_url)
            results.append((text, full_url))

    return results


def save_raw(slug, chapter_num, title, content):
    """Save raw text to file."""
    out_dir = RAW_DIR / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{chapter_num:03d}_{title}.txt"
    filename = re.sub(r'[/\\:*?"<>|]', '_', filename)
    filepath = out_dir / filename
    filepath.write_text(content, encoding="utf-8")
    return filepath


def is_leaf_chapter(link_text):
    """Check if a link is likely a leaf chapter vs. a section header."""
    # Section headers often have no numbering
    # Leaf chapters typically have 卷, 回, 部, numbers, etc.
    return True  # We'll scrape everything and check content


def scrape_text(text_info):
    """Scrape a single text by discovering links from its index page."""
    slug = text_info["slug"]
    title_zh = text_info["title_zh"]
    wiki_url = text_info["wikisource_url"]

    log.info(f"=== Scraping {slug} ({title_zh}) ===")

    # Discover links from index page
    links = discover_chapter_links(wiki_url, title_zh)
    time.sleep(RATE_LIMIT)

    if not links:
        log.warning(f"  No chapter links found for {slug}, trying single-page scrape")
        content = scrape_page_content(wiki_url)
        if content and len(content) > 200:
            save_raw(slug, 1, title_zh, content)
            log.info(f"  Saved single-page content for {slug}")
            return 1
        return 0

    log.info(f"  Found {len(links)} links for {slug}")
    for i, (text, url) in enumerate(links[:5]):
        log.info(f"    Sample: {text} -> {url}")

    # Filter out non-chapter links (序, prefaces, appendices come before chapters)
    # But keep them as they may be valid chapters
    count = 0
    for i, (link_text, url) in enumerate(links):
        content = scrape_page_content(url)
        time.sleep(RATE_LIMIT)

        if content and len(content.strip()) > 30:
            chapter_num = i + 1
            save_raw(slug, chapter_num, link_text, content)
            count += 1
            log.info(f"  [{count}/{len(links)}] {link_text} ({len(content)} chars)")
        else:
            log.warning(f"  Empty/short: {link_text} at {url}")

    log.info(f"  Done: {count}/{len(links)} chapters saved for {slug}")
    return count


def main():
    log.info("=" * 60)
    log.info("Chinese Pipeline Scraper A - Starting")
    log.info("=" * 60)

    with open(VERIFIED_FILE, "r", encoding="utf-8") as f:
        all_texts = json.load(f)

    texts = [t for t in all_texts if t["slug"] in AGENT_A_SLUGS]
    # Sort by AGENT_A_SLUGS order
    slug_order = {s: i for i, s in enumerate(AGENT_A_SLUGS)}
    texts.sort(key=lambda t: slug_order.get(t["slug"], 999))

    log.info(f"Found {len(texts)} texts for Agent A")

    total_chapters = 0
    results = {}

    for text_info in texts:
        slug = text_info["slug"]
        try:
            count = scrape_text(text_info)
            results[slug] = count
            total_chapters += count
        except Exception as e:
            log.error(f"Error scraping {slug}: {e}", exc_info=True)
            results[slug] = 0

    log.info("=" * 60)
    log.info("SCRAPING COMPLETE - Summary:")
    for slug in AGENT_A_SLUGS:
        count = results.get(slug, 0)
        expected = next((t["chapters"] for t in texts if t["slug"] == slug), "?")
        status = "OK" if count > 0 else "FAILED"
        log.info(f"  {slug}: {count}/{expected} [{status}]")
    log.info(f"Total chapters scraped: {total_chapters}")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
