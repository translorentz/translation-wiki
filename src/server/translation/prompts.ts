interface TranslationPromptParams {
  sourceLanguage: string;
  paragraphs: { index: number; text: string }[];
}

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  zh: `You are translating Classical Chinese (文言文) to English.
Guidelines:
- Preserve philosophical terminology accurately (e.g., 理 = "principle", 氣 = "vital force/qi", 心 = "mind-heart")
- Maintain the conversational tone of recorded dialogues
- Use standard academic transliteration for proper names
- Where ambiguity exists, prefer the Neo-Confucian interpretation`,

  grc: `You are translating Ancient Greek (specifically Byzantine Greek) to English.
Guidelines:
- This is a court ceremonial text; maintain formal register
- Transliterate titles and ranks consistently (e.g., βασιλεύς = "emperor", πατρίκιος = "patrikios")
- Preserve technical ceremonial vocabulary with brief inline explanations where needed
- For unclear OCR passages, provide your best reading with [?] notation`,

  la: `You are translating Latin to English.
Guidelines:
- This is a formal, technical text describing court ceremonies
- Maintain the formal register appropriate to official documentation
- Preserve proper names in their Latin form with English explanation where helpful`,
};

export function buildTranslationPrompt({
  sourceLanguage,
  paragraphs,
}: TranslationPromptParams): { system: string; user: string } {
  const langInstructions =
    LANGUAGE_INSTRUCTIONS[sourceLanguage] ??
    `You are translating from ${sourceLanguage} to English.`;

  const system = `${langInstructions}

You will receive numbered paragraphs of source text. Translate each paragraph to English, maintaining the same paragraph numbering. Return ONLY a JSON array of objects with "index" and "text" fields matching the input indices.

Important:
- Translate every paragraph, even if the meaning is unclear
- Do not merge or split paragraphs
- Do not add commentary outside the JSON structure
- Output must be valid JSON`;

  const formattedParagraphs = paragraphs
    .map((p) => `[${p.index}] ${p.text}`)
    .join("\n\n");

  const user = `Translate the following paragraphs:\n\n${formattedParagraphs}`;

  return { system, user };
}
