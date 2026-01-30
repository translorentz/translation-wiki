#!/usr/bin/env python3
"""
Scraper C: Scrape 16 Chinese texts (indices 34-49) from zh.wikisource.org.
Texts: sushui-jiwen, tang-zhiyan, beimeng-suoyan, xijing-zaji, yeyu-qiudeng-lu,
       wuzazu, shiyi-ji, xihu-mengxun, zhinang, qingshi, gaiyu-congkao,
       tang-caizi-zhuan, gujin-tangai, yehangchuan, qijian-shisan-xia, xiaoting-zalu
"""

import os, requests, time, re, json, sys
from bs4 import BeautifulSoup
import urllib.parse
import logging

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
LOG_FILE = "/tmp/chinese-processor-c.log"

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
with open(os.path.join(BASE_DIR, "data", "chinese-pipeline", "verified-texts.json"), "r") as f:
    ALL_TEXTS = json.load(f)

MY_TEXTS = ALL_TEXTS[34:50]  # indices 34-49

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "TranslationWikiBot/1.0 (educational project; scraping classical texts)"
})


def scrape_page(url):
    """Scrape text content from a wikisource page."""
    response = SESSION.get(url)
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
    """Find chapter/volume links from the index page."""
    log.info(f"Fetching index page: {index_url}")
    response = SESSION.get(index_url)
    response.raise_for_status()
    response.encoding = "utf-8"
    soup = BeautifulSoup(response.content, "html.parser")
    content_div = soup.find("div", id="mw-content-text")
    if not content_div:
        log.error(f"No content div found for {slug}")
        return []

    links = []
    all_links = content_div.find_all("a")

    # Encoded title for URL matching
    title_encoded = urllib.parse.quote(title_zh, safe="")

    # Collect all internal links that reference this text
    for a in all_links:
        href = a.get("href", "")
        if not href:
            continue
        # Must be a wiki link related to this text
        if f"/wiki/{title_encoded}" not in href and f"/wiki/{title_zh}" not in href:
            continue
        # Skip the index page itself
        if href.endswith(title_encoded) or href.endswith(title_zh):
            continue
        # Skip edit/action links
        if "action=" in href or "redlink=1" in href:
            continue

        full_url = urllib.parse.urljoin("https://zh.wikisource.org", href)
        link_text = a.get_text(strip=True)
        if link_text and full_url not in [l[0] for l in links]:
            links.append((full_url, link_text))

    log.info(f"  Found {len(links)} chapter links for {slug} (expected ~{expected_chapters})")
    return links


def scrape_text(text_info):
    """Scrape all chapters of a text."""
    slug = text_info["slug"]
    title_zh = text_info["title_zh"]
    url = text_info["wikisource_url"]
    expected = text_info["chapters"]

    out_dir = os.path.join(RAW_DIR, slug)
    os.makedirs(out_dir, exist_ok=True)

    # Check if already scraped
    existing = [f for f in os.listdir(out_dir) if f.endswith(".txt")] if os.path.exists(out_dir) else []
    if len(existing) >= expected:
        log.info(f"SKIP {slug}: already have {len(existing)} files (expected {expected})")
        return True

    time.sleep(2.1)
    chapter_links = find_chapter_links(url, title_zh, slug, expected)

    if not chapter_links:
        log.warning(f"NO LINKS found for {slug} — trying alternative patterns")
        # Try scraping the index page itself (some short texts have all content on one page)
        time.sleep(2.1)
        content = scrape_page(url)
        if content and len(content) > 200:
            filepath = os.path.join(out_dir, f"001_{title_zh}.txt")
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            log.info(f"  Saved single-page content for {slug}")
            return True
        log.error(f"FAILED {slug}: no links and no single-page content")
        return False

    # Deduplicate while preserving order
    seen = set()
    unique_links = []
    for url_link, text in chapter_links:
        if url_link not in seen:
            seen.add(url_link)
            unique_links.append((url_link, text))
    chapter_links = unique_links

    success_count = 0
    for i, (chapter_url, link_text) in enumerate(chapter_links, 1):
        # Clean filename
        safe_title = re.sub(r'[/\\:*?"<>|]', '_', link_text)[:80]
        filepath = os.path.join(out_dir, f"{i:03d}_{safe_title}.txt")

        if os.path.exists(filepath) and os.path.getsize(filepath) > 100:
            log.info(f"  SKIP existing: {filepath}")
            success_count += 1
            continue

        time.sleep(2.1)
        try:
            content = scrape_page(chapter_url)
            if content and len(content) > 50:
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)
                log.info(f"  [{i}/{len(chapter_links)}] Saved: {safe_title} ({len(content)} chars)")
                success_count += 1
            else:
                log.warning(f"  [{i}/{len(chapter_links)}] Empty/short content for {chapter_url}")
        except Exception as e:
            log.error(f"  [{i}/{len(chapter_links)}] Error scraping {chapter_url}: {e}")

    log.info(f"DONE {slug}: {success_count}/{len(chapter_links)} chapters scraped")
    return success_count > 0


def main():
    log.info(f"=== Scraper C starting: {len(MY_TEXTS)} texts ===")
    for i, text_info in enumerate(MY_TEXTS):
        log.info(f"\n--- [{i+1}/{len(MY_TEXTS)}] {text_info['slug']} ({text_info['title_zh']}, {text_info['chapters']} chapters) ---")
        try:
            scrape_text(text_info)
        except Exception as e:
            log.error(f"FATAL error on {text_info['slug']}: {e}")
            import traceback
            traceback.print_exc()
    log.info("=== Scraper C complete ===")


if __name__ == "__main__":
    main()
