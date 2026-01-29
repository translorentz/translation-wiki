#!/usr/bin/env python3
"""
Trial translation tester - sends sample paragraphs to DeepSeek API
and checks for gibberish/contamination in translation output.
"""

import json
import os
import random
import sys
from pathlib import Path

try:
    import openai
except ImportError:
    print("Error: openai package not installed. Run: pip install openai", file=sys.stderr)
    sys.exit(1)

def get_random_paragraphs(n: int = 5, seed: int = 42) -> list:
    """Get n random paragraphs from the cleaned files."""
    random.seed(seed)
    base_dir = Path('/Users/bryancheong/claude_projects/translation-wiki/data/processed/epitome-of-histories-clean')

    all_paragraphs = []
    for chapter_num in range(13, 19):
        filepath = base_dir / f'chapter-{chapter_num:03d}.json'
        if not filepath.exists():
            continue

        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        paragraphs = data.get('sourceContent', {}).get('paragraphs', [])
        for para in paragraphs:
            all_paragraphs.append({
                'chapter': chapter_num,
                'index': para.get('index', -1),
                'text': para.get('text', ''),
            })

    return random.sample(all_paragraphs, min(n, len(all_paragraphs)))

def translate_text(client, text: str) -> str:
    """Translate Byzantine Greek to English using DeepSeek."""
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{
            "role": "user",
            "content": f"Translate this Byzantine Greek text to English. Provide only the translation, no explanations:\n\n{text}"
        }],
        max_tokens=2000,
        temperature=0.3,
    )
    return response.choices[0].message.content

def check_translation_quality(translation: str) -> dict:
    """Check translation for signs of contamination/gibberish."""
    issues = []

    # Check for untranslated sigla
    sigla_patterns = ['Rwp', 'Dwp', 'RwpJDi', 'CDi', 'Owp', 'Bwp']
    for sig in sigla_patterns:
        if sig.lower() in translation.lower():
            issues.append(f"Untranslated sigla: {sig}")

    # Check for Latin editorial terms translated literally
    latin_terms = ['subscript', 'omisso', 'constanter', 'transponit', 'typotheta']
    for term in latin_terms:
        if term.lower() in translation.lower():
            issues.append(f"Latin apparatus term: {term}")

    # Check for obvious gibberish markers
    gibberish_markers = ['[?]', '???', 'unintelligible', 'unclear']
    for marker in gibberish_markers:
        if marker.lower() in translation.lower():
            issues.append(f"Gibberish marker: {marker}")

    # Check for page marker artifacts
    if any(f"page {i}" in translation.lower() and "manuscript" not in translation.lower()
           for i in range(300, 500)):
        issues.append("Possible page marker artifact")

    return {
        'has_issues': len(issues) > 0,
        'issues': issues,
        'confidence': 'LOW' if len(issues) > 2 else ('MEDIUM' if len(issues) > 0 else 'HIGH'),
    }

def main():
    api_key = os.environ.get('DEEPSEEK_API_KEY')
    if not api_key:
        print("Error: DEEPSEEK_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    n = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 42

    client = openai.OpenAI(
        base_url="https://api.deepseek.com",
        api_key=api_key,
    )

    paragraphs = get_random_paragraphs(n, seed)

    print(f"=== TRIAL TRANSLATION TEST ({n} paragraphs, seed={seed}) ===\n")

    results = {
        'total': len(paragraphs),
        'clean_translations': 0,
        'problematic_translations': 0,
        'details': [],
    }

    for i, para in enumerate(paragraphs, 1):
        print(f"--- Test {i}: Chapter {para['chapter']}, Para {para['index']} ---")
        print(f"Source: {para['text'][:200]}...")

        try:
            translation = translate_text(client, para['text'][:1500])  # Limit length
            print(f"Translation: {translation[:300]}...")

            quality = check_translation_quality(translation)
            print(f"Quality: {quality['confidence']}")
            if quality['issues']:
                print(f"Issues: {', '.join(quality['issues'])}")
                results['problematic_translations'] += 1
            else:
                results['clean_translations'] += 1

            results['details'].append({
                'chapter': para['chapter'],
                'index': para['index'],
                'quality': quality,
            })

        except Exception as e:
            print(f"Error: {e}")
            results['problematic_translations'] += 1

        print()

    # Summary
    clean_rate = results['clean_translations'] / results['total'] * 100 if results['total'] > 0 else 0
    print(f"\n=== SUMMARY ===")
    print(f"Total tested: {results['total']}")
    print(f"Clean translations: {results['clean_translations']} ({clean_rate:.1f}%)")
    print(f"Problematic: {results['problematic_translations']}")

    return results['problematic_translations'] == 0

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
