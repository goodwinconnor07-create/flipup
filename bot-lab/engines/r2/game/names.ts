// A light filter for player names, which everyone in an online game sees. It catches slurs and
// obvious sexual or abusive words, including l33t spellings and spaced-out letters, without
// tripping on ordinary names (Scunthorpe, Dickson, Cassidy). Hosts can still remove a player.

/** Matched anywhere, once the name is squashed to letters: distinctive enough to never be part of a real name. */
const ANYWHERE = [
  'nigger',
  'nigga',
  'faggot',
  'retard',
  'tranny',
  'spastic',
  'wetback',
  'beaner',
  'fuck',
  'whore',
  'blowjob',
  'handjob',
  'rimjob',
  'cumshot',
  'pussy',
  'penis',
  'vagina',
  'dildo',
  'porn',
  'molest',
  'hitler',
  'killyourself',
];

/** Matched only as a whole word: they turn up inside ordinary names (Dickson, Cassidy, Scunthorpe, Kikelomo). */
const WHOLE_WORD = [
  'fag',
  'dick',
  'cock',
  'shit',
  'ass',
  'arse',
  'bitch',
  'slut',
  'twat',
  'wank',
  'tits',
  'cum',
  'cunt',
  'rape',
  'rapist',
  'pedo',
  'nazi',
  'kys',
  'coon',
  'spic',
  'gook',
  'kike',
  'chink',
];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', $: 's', '7': 't', '8': 'b' };

function letters(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[0-9!@$]/g, (c) => LEET[c] ?? c);
}

/** Collapses repeats ("fuuuck") so stretched spellings still match. */
const squeeze = (s: string) => s.replace(/(.)\1+/g, '$1');

/** True when a name shouldn't be shown to other players. */
export function isNameBlocked(name: string): boolean {
  const plain = letters(name);
  const joined = plain.replace(/[^a-z]/g, '');
  if (ANYWHERE.some((w) => joined.includes(w) || squeeze(joined).includes(w))) return true;
  const words = plain.split(/[^a-z]+/).filter(Boolean);
  // Also check single letters run together ("s h i t").
  const spaced = words.every((w) => w.length === 1) ? [words.join('')] : [];
  return [...words, ...spaced].some(
    (w) => WHOLE_WORD.includes(w) || WHOLE_WORD.includes(squeeze(w)) || WHOLE_WORD.includes(w.replace(/s$/, '')),
  );
}

export const NAME_BLOCKED = 'Pick a different name.';
