/**
 * Downloads De Ceremoniis text from the Internet Archive.
 *
 * Usage: pnpm acquire:archive
 *
 * Downloads the DjVuTXT (plain text OCR extraction) of the Reiske edition
 * of De Ceremoniis (bub_gb_OFpFAAAAYAAJ). This edition contains Greek text
 * with parallel Latin translation.
 *
 * Source: https://archive.org/details/bub_gb_OFpFAAAAYAAJ
 */

import fs from "fs";
import path from "path";

const ITEM_ID = "bub_gb_OFpFAAAAYAAJ";
const TEXT_FILENAME = `${ITEM_ID}_djvu.txt`;
const DOWNLOAD_URL = `https://archive.org/download/${ITEM_ID}/${TEXT_FILENAME}`;
const OUTPUT_DIR = path.resolve("data/raw/de-ceremoniis");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "full-text.txt");

// Also try to get the metadata for reference
const METADATA_URL = `https://archive.org/metadata/${ITEM_ID}`;

async function downloadFile(url: string, outputPath: string): Promise<void> {
  console.log(`Downloading: ${url}`);
  console.log(`Output: ${outputPath}\n`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    console.log(`File size: ${(parseInt(contentLength) / 1024 / 1024).toFixed(1)} MB`);
  }

  const text = await response.text();
  fs.writeFileSync(outputPath, text, "utf-8");

  const stats = fs.statSync(outputPath);
  console.log(`Written: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Lines: ${text.split("\n").length}`);
}

async function downloadMetadata(): Promise<void> {
  const metadataFile = path.join(OUTPUT_DIR, "metadata.json");
  if (fs.existsSync(metadataFile)) {
    console.log("Metadata already downloaded, skipping.\n");
    return;
  }

  try {
    const response = await fetch(METADATA_URL);
    if (response.ok) {
      const metadata = await response.json();
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), "utf-8");
      console.log(`Metadata saved to ${metadataFile}\n`);
    }
  } catch {
    console.warn("Could not fetch metadata (non-critical), continuing...\n");
  }
}

async function main() {
  // Check if already downloaded
  if (fs.existsSync(OUTPUT_FILE)) {
    const stats = fs.statSync(OUTPUT_FILE);
    if (stats.size > 100000) {
      // More than 100KB — probably complete
      console.log(`Already downloaded: ${OUTPUT_FILE} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
      console.log("Delete the file to re-download.");
      return;
    }
  }

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Download metadata first (for reference)
  await downloadMetadata();

  // Download the full text
  await downloadFile(DOWNLOAD_URL, OUTPUT_FILE);

  console.log("\nDe Ceremoniis text downloaded successfully.");
  console.log("Next step: run 'pnpm process:texts' to clean and structure the text.");
}

main().catch(console.error);
