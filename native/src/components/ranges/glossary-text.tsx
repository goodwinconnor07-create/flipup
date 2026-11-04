import { router } from 'expo-router';
import { Text, type TextStyle } from 'react-native';

import { brand } from '@/theme';

import { WORDS } from './words';

/** Every way a word is written, longest first, so "bluff catcher" wins over "bluff". */
const TERMS = WORDS.flatMap((w) => [w.word.replace(/\s*\(.*\)$/, ''), ...(w.also ?? [])].map((t) => ({ t: t.toLowerCase(), key: w.key }))).sort((a, b) => b.t.length - a.t.length);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PATTERN = new RegExp(`(?<![\\w-])(${TERMS.map((x) => escape(x.t)).join('|')})(?![\\w-])`, 'gi');

/**
 * Text with its poker words linked: a dotted underline, and a tap opens what the word means. Each word is linked
 * once, and at most `max` words in all, so a paragraph never turns into a page of links.
 */
export function GlossaryText({ children, style, max = 3, link = brand.gold }: { children: string; style?: TextStyle; max?: number; link?: string }) {
  const parts: (string | { text: string; key: string })[] = [];
  const seen = new Set<string>();
  let last = 0;
  for (const m of children.matchAll(PATTERN)) {
    const key = TERMS.find((x) => x.t === m[0].toLowerCase())?.key;
    if (!key || seen.has(key) || seen.size >= max) continue;
    seen.add(key);
    parts.push(children.slice(last, m.index), { text: m[0], key });
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(children.slice(last));
  return (
    <Text maxFontSizeMultiplier={1.5} style={style}>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          p
        ) : (
          <Text
            key={i}
            accessibilityRole="link"
            accessibilityHint="What this word means"
            onPress={() => router.push({ pathname: '/range-glossary', params: { term: p.key } })}
            style={{ color: link, textDecorationLine: 'underline', textDecorationStyle: 'dotted' }}
          >
            {p.text}
          </Text>
        ),
      )}
    </Text>
  );
}
