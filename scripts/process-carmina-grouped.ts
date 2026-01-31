/**
 * Splits the Carmina Graeca master (21 chapters) into 16 grouped texts.
 *
 * 3 grouped texts (multi-chapter):
 *   - carmina-sachlikis: master ch 5,6
 *   - carmina-beast-fables: master ch 8,9,10,11,12
 *   - carmina-belisarius: master ch 19,20,21
 *
 * 13 standalone texts (single chapter each):
 *   master ch 1,2,3,4,7,13,14,15,16,17,18
 */

import fs from "fs";
import path from "path";

const MASTER_DIR = path.resolve(__dirname, "../data/processed/carmina-graeca-master");
const OUTPUT_BASE = path.resolve(__dirname, "../data/processed");

interface GroupDef {
  slug: string;
  masterChapters: number[];
}

const GROUPS: GroupDef[] = [
  // Standalone
  { slug: "carmina-alexios-komnenos", masterChapters: [1] },
  { slug: "carmina-tamerlane-lament", masterChapters: [2] },
  { slug: "carmina-plague-of-rhodes", masterChapters: [3] },
  { slug: "carmina-misfortune-of-crete", masterChapters: [4] },
  { slug: "carmina-sachlikis", masterChapters: [5, 6] },
  { slug: "carmina-old-man-and-girl", masterChapters: [7] },
  { slug: "carmina-beast-fables", masterChapters: [8, 9, 10, 11, 12] },
  { slug: "carmina-on-living-abroad", masterChapters: [13] },
  { slug: "carmina-to-venice", masterChapters: [14] },
  { slug: "carmina-pikatorios-lament", masterChapters: [15] },
  { slug: "carmina-penitential-alphabet", masterChapters: [16] },
  { slug: "carmina-apollonius-of-tyre", masterChapters: [17] },
  { slug: "carmina-life-of-wise-elder", masterChapters: [18] },
  { slug: "carmina-belisarius", masterChapters: [19, 20, 21] },
];

function padNum(n: number): string {
  return String(n).padStart(3, "0");
}

function main() {
  console.log("=== Processing Carmina Graeca into grouped texts ===\n");

  let totalFiles = 0;

  for (const group of GROUPS) {
    const outDir = path.join(OUTPUT_BASE, group.slug);
    fs.mkdirSync(outDir, { recursive: true });

    for (let i = 0; i < group.masterChapters.length; i++) {
      const masterCh = group.masterChapters[i];
      const masterFile = path.join(MASTER_DIR, `chapter-${padNum(masterCh)}.json`);
      const data = JSON.parse(fs.readFileSync(masterFile, "utf-8"));

      const newChapterNumber = i + 1;
      const output = {
        chapterNumber: newChapterNumber,
        title: data.title,
        sourceContent: data.sourceContent,
      };

      const outFile = path.join(outDir, `chapter-${padNum(newChapterNumber)}.json`);
      fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
      totalFiles++;
    }

    console.log(`  ${group.slug}: ${group.masterChapters.length} chapter(s)`);
  }

  console.log(`\nTotal: ${totalFiles} files across ${GROUPS.length} texts`);
}

main();
