// Text normalisation before TTS (spec 8.2): numbers the way they should be spoken, caption-only punctuation
// removed, and local respellings applied.

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES: [number, string][] = [
  [1e9, 'billion'],
  [1e6, 'million'],
  [1e3, 'thousand'],
];

const under100 = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ''));
const under1000 = (n: number) => {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return under100(r);
  return `${ONES[h]} hundred${r ? ` and ${under100(r)}` : ''}`;
};

/** 1978 -> "one thousand nine hundred and seventy-eight" (cardinal). */
export const numberToWords = (n: number): string => {
  if (!Number.isFinite(n)) return String(n);
  if (n < 0) return `minus ${numberToWords(-n)}`;
  if (!Number.isInteger(n)) {
    const [i, d] = String(n).split('.');
    return `${numberToWords(Number(i))} point ${d.split('').map((c) => ONES[Number(c)]).join(' ')}`;
  }
  if (n < 1000) return under1000(n);
  const parts: string[] = [];
  let rest = n;
  for (const [v, name] of SCALES) {
    if (rest >= v) {
      parts.push(`${under1000(Math.floor(rest / v))} ${name}`);
      rest %= v;
    }
  }
  if (rest) parts.push(rest < 100 ? `and ${under100(rest)}` : under1000(rest));
  return parts.join(' ');
};

/** Years are spoken in pairs: 1978 -> "nineteen seventy-eight", 1905 -> "nineteen oh five", 2005 -> "two thousand and five". */
export const yearToWords = (y: number): string => {
  if (y >= 2000 && y < 2010) return y === 2000 ? 'two thousand' : `two thousand and ${ONES[y - 2000]}`;
  const hi = Math.floor(y / 100);
  const lo = y % 100;
  if (lo === 0) return `${under100(hi)} hundred`;
  return `${under100(hi)} ${lo < 10 ? `oh ${ONES[lo]}` : under100(lo)}`;
};

const ORDINAL_IRREGULAR: Record<string, string> = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
export const ordinalWords = (n: number) => {
  const w = numberToWords(n);
  const m = /([a-z]+)$/.exec(w)!;
  const last = m[1];
  const ord = ORDINAL_IRREGULAR[last] ?? (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`);
  return w.slice(0, m.index) + ord;
};

const CURRENCY: Record<string, [string, string]> = { '£': ['pound', 'pounds'], $: ['dollar', 'dollars'], '₹': ['rupee', 'rupees'], '€': ['euro', 'euros'] };

/** Expand numbers, currency, ordinals and percentages into words. */
export const expandNumbers = (text: string): string =>
  text
    // currency: £200, $1,500, ₹10,000
    .replace(/([£$₹€])\s?(\d[\d,]*(?:\.\d+)?)/g, (_, sym: string, num: string) => {
      const n = Number(num.replace(/,/g, ''));
      const [one, many] = CURRENCY[sym];
      return `${numberToWords(n)} ${n === 1 ? one : many}`;
    })
    // ordinals: 1st, 22nd, 3rd, 18th
    .replace(/\b(\d+)(st|nd|rd|th)\b/gi, (_, num: string) => ordinalWords(Number(num)))
    // percent
    .replace(/\b(\d+(?:\.\d+)?)\s?%/g, (_, num: string) => `${numberToWords(Number(num))} percent`)
    // decades: 1970s -> nineteen seventies
    .replace(/\b(1[1-9]|20)(\d)0s\b/g, (_, c: string, d: string) => {
      const tens = TENS[Number(d)] || (d === '0' ? 'hundreds' : '');
      return `${under100(Number(c))} ${tens.replace(/y$/, 'ies')}`;
    })
    // grouped numbers: 10,000
    .replace(/\b\d{1,3}(?:,\d{3})+\b/g, (m) => numberToWords(Number(m.replace(/,/g, ''))))
    // years (4 digits, 1100–2099) vs other integers / decimals
    .replace(/\b\d+(?:\.\d+)?\b/g, (m) => {
      const n = Number(m);
      return /^\d{4}$/.test(m) && n >= 1100 && n < 2100 ? yearToWords(n) : numberToWords(n);
    });

/** Remove punctuation that only makes sense on screen. */
export const stripCaptionPunctuation = (text: string) =>
  text
    .replace(/[“”«»"]/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/[()[\]{}*#_~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Whole-word, case-insensitive respellings ("Dahmer" -> "Dah-mer"). */
export const applyRespellings = (text: string, dict: Record<string, string>) =>
  Object.entries(dict).reduce(
    (t, [from, to]) => t.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), to),
    text,
  );

export const normaliseForSpeech = (text: string, respell: Record<string, string> = {}) =>
  applyRespellings(expandNumbers(stripCaptionPunctuation(text)), respell);

export const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
