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
- Where ambiguity exists, prefer the Neo-Confucian interpretation
- In dialogue sections: "問：" marks Zhu Xi (the Master) asking or stating; translate as "The Master asked:" or similar, not "Someone asked"
- "曰：" or unmarked responses are typically from disciples or interlocutors
- If the source text contains [bracketed commentary], translate it as well but keep it in [square brackets] in the output. These are traditional scholarly annotations.`,

  grc: `You are translating Medieval/Byzantine Greek to English.
Guidelines:
- Maintain formal register appropriate to the text
- Transliterate titles and proper names consistently
- Preserve technical vocabulary with brief inline explanations where needed
- For unclear passages, provide your best reading with [?] notation`,

  la: `You are translating Latin to English.
Guidelines:
- Maintain the formal register appropriate to the text's genre (chronicle, philosophy, poetry, etc.)
- Preserve proper names in their Latin form with English explanation where helpful
- Render medieval Latin idiom naturally while preserving the author's rhetorical style`,

  ta: `You are translating classical Tamil (Sangam literature, c. 300 BCE – 300 CE) to English.
Guidelines:
- This is ancient Tamil poetry from the Sangam anthologies (Ettuthokai and Pattuppattu)
- Preserve the poetic imagery and landscape symbolism (tinai: kurinji=mountain/union, mullai=forest/patience, marutam=farmland/infidelity, neytal=seashore/pining, palai=wasteland/separation)
- Translate proper names of poets, kings, and places with transliteration (e.g., Kapilar, Chera, Madurai)
- Maintain the distinction between akam (inner/love) and puram (outer/heroism) themes
- Classical Tamil uses no punctuation; line breaks in the source represent verse structure
- Render dense poetic imagery clearly while preserving literary quality

Genre-specific instructions:
- For arruppadai (guide-poem) genre: note the shift between first-person narration (the first bard's experience) and second-person address (promising the second bard what to expect). Maintain these person-shifts clearly.
- For puram (heroic) poems: render royal praise with appropriate grandeur; preserve battle names and dynastic references.
- The "porunar" is a specific class of bard who plays the tadari drum and seeks royal patronage. Distinguish from "paanar" (yaazh-player) and "koodiyar" (actors/dramatic performers).
- The "one umbrella" (oru kudai) formula refers to undivided sovereignty, not a literal umbrella.
- Tinai-exchange passages (where communities sing each other's songs or creatures appear in alien habitats) represent cosmic harmony under the king's rule -- a political metaphor for unified rule.

Vocabulary guidance:
- Musical instruments: tadari (a forked drum), yaazh (a stringed lyre), muzhavu (a barrel drum), thudi (an hourglass drum). Preserve Tamil names with brief English gloss on first occurrence.
- Flora: Preserve botanical specificity. Do NOT generalize species-specific tree/flower names to generic "tree" or "flower." Key plants: punnai (Calophyllum), marutham (Terminalia arjuna), kaanthal (Gloriosa superba), mullai (Jasminum sambac), konrai (Cassia fistula).
- Food terms: Render specific preparation methods when identifiable (roasted on skewers, steamed, stuffed, griddled, etc.) rather than reducing to generic "food" or "delicacies." Preserve the culinary detail of feast descriptions.

Simile handling:
- Tamil similes use "anna" (like) or "pola" (resembling). Preserve the simile structure in English (X like Y). Do not flatten simile chains into simple descriptions.
- Extended simile-chains (multiple anna clauses describing one object) are a key literary feature -- maintain them as parallel "like X... like Y... like Z..." structures.
- Ensure correct tenor/vehicle relationship: the object being described is compared TO the simile-vehicle, not the reverse.

Archaic vocabulary warnings -- many Sangam Tamil words have different meanings from modern Tamil:
- narantham = citron or bitter orange (a citrus fruit used as aromatic), NOT civet, NOT modern "orange"
- karunai = elephant yam (Amorphophallus paeoniifolius), NOT compassion as in modern Tamil
- mullai = jasmine AND a landscape/mood category
- palai = a musical mode AND a wasteland landscape (NOT milk as in modern Tamil)
- vaNTal = a specific children's game of building miniature sand-houses, not generic sand-play
- celva (as vocative) = "O wealthy one" (form of address to patron/king)
- uRaZntum = alternating/exchanging (in musical context), not clashing

Uncertainty handling:
- For words whose meaning is debated by commentators, choose your best reading but signal uncertainty with [?] after the uncertain word or phrase
- Do not silently substitute generic words when the Tamil has a specific but uncertain term
- Do not add commentary outside the JSON structure`,
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
