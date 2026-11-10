/*
  Turning a sentence into comparable words, in French and in Arabic. Self-contained on purpose (no
  imports), so it can be tested on its own. The same steps are applied to the questions and to the
  notes they are matched against, so the two meet even when the spelling differs a little.
*/

/** Arabic short vowel marks, small signs and the stretching "tatweel". */
const AR_MARKS = /[ً-ٰٟۖ-ۭـ]/g;
const AR_LETTER = /[؀-ۿ]/;
const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/g;

/** Words that carry no topic: they would make every note look like a match. */
const STOPWORDS = new Set(
  (
    // French (accents are removed before the check)
    "le la les un une des de du d l et ou a au aux en dans pour par sur avec sans ce cet cette ces je tu il elle " +
    "on nous vous ils elles me te se mon ma mes ton ta tes son sa ses notre votre leur leurs est sont etre avoir " +
    "ai as ont fait faire comment quoi que qui quel quelle quels quelles ca cela pas ne plus tres peut peux " +
    "puis veux voudrais bonjour salut merci svp stp si mais donc car y ya " +
    // Arabic (after normalisation: alef forms merged, ta marbuta -> ha)
    "في من على الي عن ما ماذا هل كيف لماذا اين متي هو هي هم انا انت نحن ان كان هذا هذه ذلك تلك التي الذي " +
    "مع او ثم لا لم لن قد كل بعد قبل عند يمكن يمكنني اريد اود ممكن لو اذا بعض كما ايضا جدا هناك هنا " +
    "السلام عليكم شكرا من فضلك لي لك له لها " +
    // Algerian dialect question and filler words
    "واش باش نعمل ندير نحتاج بغيت نبغي نقدر كيفاش علاش وين فين شحال اش شنو راني تاع ديال كاين"
  ).split(" "),
);

/** Arabic words begin with attached particles (the, and, with, for...) that hide the word itself. */
const AR_PREFIXES = ["وال", "بال", "كال", "فال", "لل", "ال", "ول", "وب", "ب", "ل", "و", "ف"];
const AR_SUFFIXES = ["هما", "كما", "ها", "هم", "هن", "كم", "كن", "نا", "ات", "ان", "ين", "ون", "ي", "ه", "ك"];

function stemArabic(word: string): string {
  let w = word;
  for (const p of AR_PREFIXES) {
    if (w.startsWith(p) && w.length - p.length >= 3) {
      w = w.slice(p.length);
      break;
    }
  }
  for (const s of AR_SUFFIXES) {
    if (w.endsWith(s) && w.length - s.length >= 3) {
      w = w.slice(0, -s.length);
      break;
    }
  }
  return w;
}

/** Plural and feminine endings are dropped, so "formations" meets "formation". */
function stemLatin(word: string): string {
  if (word.length > 3 && (word.endsWith("s") || word.endsWith("x"))) return word.slice(0, -1);
  return word;
}

export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // French accents
    .replace(AR_MARKS, "")
    .replace(ARABIC_INDIC_DIGITS, (d) => String(d.charCodeAt(0) & 0xf)) // ٣ -> 3
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/œ/g, "oe")
    .toLowerCase();
}

/** The words of a text, normalised and stemmed, without the filler words. */
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of normalize(text).split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 2 || STOPWORDS.has(raw)) continue;
    const word = AR_LETTER.test(raw) ? stemArabic(raw) : stemLatin(raw);
    if (word.length >= 2 && !STOPWORDS.has(word)) out.push(word);
  }
  return out;
}

/** True when the text is mostly Arabic letters. */
export function isArabic(text: string): boolean {
  let arabic = 0;
  let latin = 0;
  for (const ch of text) {
    if (AR_LETTER.test(ch)) arabic += 1;
    else if (/[A-Za-zÀ-ÿ]/.test(ch)) latin += 1;
  }
  return arabic > latin;
}
