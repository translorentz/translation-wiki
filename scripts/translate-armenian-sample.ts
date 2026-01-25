/**
 * Translates a sample Armenian chapter using DeepSeek API.
 * Saves the original and translation to separate files for quality review.
 */
import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";

// Load environment variables from .env.local manually
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        process.env[key] = value.replace(/^['"]|['"]$/g, "");
      }
    }
  }
}

const REVIEW_DIR = path.join(process.cwd(), "data/armenian-sample-review");

async function main() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error("DEEPSEEK_API_KEY environment variable not set");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });

  // Read the source file
  const sourcePath = path.join(REVIEW_DIR, "kaitser-ch1-original.txt");
  const sourceText = fs.readFileSync(sourcePath, "utf-8");

  console.log(`Read source file: ${sourceText.length} characters`);

  const systemPrompt = `You are a scholarly translator working on 19th century Armenian literature for academic study.

This is from "Kaitser" (The Sparks) by Raffi (Hakob Melik-Hakobian, 1835-1888), an important Armenian novelist. This is the first chapter titled "Family" ( DELAYS) - an autobiographical section describing the narrator's childhood memories.

Translation guidelines:
- Preserve the emotional depth and nostalgic literary tone
- Keep proper names with these transliterations:
  - Shushan (the grandmother)
  - Nigyar (the mother)
  - Farhat (the narrator)
  - Sahak (the father)
  - Mariam and Magtagh (the twin sisters)
  - Haji-Baba (the moneylender)
  - Meron (the dog) and Nazlu (the cat)
- Maintain the first-person narrative voice
- The Armenian colon-like symbol (։) functions as a period
- Preserve literary imagery and metaphors
- This is a tender, melancholic memoir of childhood - capture that mood
- Produce fluent, literary English appropriate for scholarly publication
- The text deals with historical themes of poverty and hardship in 19th century Armenia - translate faithfully`;

  const userPrompt = `Translate the following Armenian text to English. This is a literary memoir about childhood memories from Raffi's novel "Kaitser" (The Sparks).

${sourceText}`;

  console.log("Calling DeepSeek API...");

  const response = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 8192,
  });

  const translation = response.choices[0]?.message?.content;
  if (!translation) {
    console.error("No translation received from API");
    console.error("Response:", JSON.stringify(response, null, 2));
    process.exit(1);
  }

  console.log(`Received translation: ${translation.length} characters`);

  // Save the translation
  const translationPath = path.join(REVIEW_DIR, "kaitser-ch1-translation.txt");
  fs.writeFileSync(translationPath, translation, "utf-8");
  console.log(`Saved translation to: ${translationPath}`);

  // Count words in translation
  const wordCount = translation.split(/\s+/).filter((w) => w.length > 0).length;

  // Create info file
  const info = `# Kaitser Chapter 1 Translation Info

## Source
- File: data/raw/kaitser/Vol1_001_Ա.txt
- Language: Armenian (hy)
- Author: Raffi (Hakob Melik-Hakobian, 1835-1888)
- Chapter: 1 - DELAYS (Family)

## Statistics
- Original character count: ${sourceText.length}
- Translation word count: ${wordCount}

## Translation Settings
- Model: deepseek-chat (DeepSeek V3)
- Temperature: 0.3
- Date: ${new Date().toISOString()}

## Notes
- This is a sample translation for quality review
- The chapter describes childhood memories in a tender, melancholic tone
- Key characters: Shushan (grandmother), Nigyar (mother), Farhat (narrator), Sahak (father), Mariam and Magtagh (twin sisters), Haji-Baba (moneylender)
- Note: Gemini API blocked this content as "PROHIBITED_CONTENT" due to historical themes; DeepSeek was used instead
`;

  const infoPath = path.join(REVIEW_DIR, "translation-info.md");
  fs.writeFileSync(infoPath, info, "utf-8");
  console.log(`Saved info to: ${infoPath}`);

  console.log("\nDone!");
  console.log(`Original: ${sourceText.length} characters`);
  console.log(`Translation: ${wordCount} words`);
}

main().catch(console.error);
