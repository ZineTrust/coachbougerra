import { tokenize } from "./text";

/*
  Finding the notes that answer a question: BM25, the classic word-matching score (a word counts more
  when it is rare among the notes and when the note is short). Nothing leaves the server and nothing
  is paid for: with a few hundred notes it runs in a millisecond. Every note carries its words in both
  languages (title, keywords, body), so a question in Arabic finds a note written in French.
*/

export interface Note {
  id: string;
  title: string;
  /** extra words people may use for this topic, French and Arabic */
  keywords: string;
  body: string;
}

export interface Hit {
  note: Note;
  score: number;
  /** share of the question's words that this note contains, 0 to 1 */
  coverage: number;
}

const K1 = 1.2;
const B = 0.75;
/** A title word counts like this many body words; keywords count a little less. */
const TITLE_WEIGHT = 3;
const KEYWORD_WEIGHT = 2;

interface Doc {
  note: Note;
  /** word -> how many (weighted) times it appears */
  terms: Map<string, number>;
  length: number;
}

export class NoteIndex {
  private readonly docs: Doc[];
  private readonly idf = new Map<string, number>();
  private readonly avgLength: number;

  constructor(notes: Note[]) {
    this.docs = notes.map((note) => {
      const terms = new Map<string, number>();
      let length = 0;
      const add = (text: string, weight: number) => {
        for (const word of tokenize(text)) {
          terms.set(word, (terms.get(word) ?? 0) + weight);
          length += weight;
        }
      };
      add(note.title, TITLE_WEIGHT);
      add(note.keywords, KEYWORD_WEIGHT);
      add(note.body, 1);
      return { note, terms, length };
    });

    this.avgLength = this.docs.reduce((sum, d) => sum + d.length, 0) / Math.max(1, this.docs.length);
    const frequency = new Map<string, number>();
    for (const d of this.docs) for (const word of d.terms.keys()) frequency.set(word, (frequency.get(word) ?? 0) + 1);
    const n = this.docs.length;
    for (const [word, df] of frequency) this.idf.set(word, Math.log(1 + (n - df + 0.5) / (df + 0.5)));
  }

  get size() {
    return this.docs.length;
  }

  /** The best notes for a question, best first (notes that share no word with it are left out). */
  search(question: string, limit: number): Hit[] {
    const words = [...new Set(tokenize(question))];
    if (words.length === 0) return [];

    const hits: Hit[] = [];
    for (const doc of this.docs) {
      let score = 0;
      let matched = 0;
      for (const word of words) {
        const tf = doc.terms.get(word);
        if (!tf) continue;
        matched += 1;
        const idf = this.idf.get(word) ?? 0;
        score += (idf * tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.length) / this.avgLength));
      }
      if (matched > 0) hits.push({ note: doc.note, score, coverage: matched / words.length });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
