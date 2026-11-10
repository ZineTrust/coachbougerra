import "server-only";
import { listPublicVideos } from "../videos";
import { COACHING_NOTES } from "./knowledge/coaching";
import { PRODUCT_NOTES } from "./knowledge/products";
import { SITE_NOTES } from "./knowledge/site";
import { NoteIndex, type Note } from "./search";
import { enabledNotes } from "./store";

/*
  Everything the assistant can look up, in one searchable index: the built-in notes (platform, coaching,
  products), the notes the owner wrote in the workspace, and the list of formations as they are right now.
  The index is rebuilt at most once a minute, so a note saved by the owner is used almost at once.
*/

const REFRESH_MS = 60_000;
const globalForIndex = globalThis as unknown as { __coachBougerraKnowledge?: { at: number; index: NoteIndex } };

/** The published formations, as one note (titles in both languages and the PV each one asks). */
async function formationsNote(): Promise<Note | null> {
  const videos = await listPublicVideos();
  if (videos.length === 0) return null;
  const lines = videos.slice(0, 60).map((v) => {
    const titles = v.title.fr === v.title.ar ? v.title.fr : `${v.title.fr} / ${v.title.ar}`;
    return `- ${titles} : ${v.pv > 0 ? `${v.pv} PV demandés` : "gratuite"}`;
  });
  return {
    id: "live-formations",
    title: "Formations actuellement publiées sur la plateforme",
    keywords:
      "liste des formations catalogue quelles formations disponibles titres pv gratuites " +
      "قائمة الدورات الدورات المتاحة ما هي الدورات عناوين الدورات مجانية " +
      videos.map((v) => `${v.title.fr} ${v.title.ar}`).join(" "),
    body: `Formations publiées (titre : accès) :\n${lines.join("\n")}`,
  };
}

async function build(): Promise<NoteIndex> {
  const custom = (await enabledNotes()).map(
    (n): Note => ({ id: `custom-${n.id}`, title: n.title, keywords: n.keywords, body: n.body }),
  );
  const live = await formationsNote();
  return new NoteIndex([...custom, ...(live ? [live] : []), ...SITE_NOTES, ...COACHING_NOTES, ...PRODUCT_NOTES]);
}

export async function knowledgeLibrary(): Promise<NoteIndex> {
  const cached = globalForIndex.__coachBougerraKnowledge;
  if (cached && Date.now() - cached.at < REFRESH_MS) return cached.index;
  const index = await build();
  globalForIndex.__coachBougerraKnowledge = { at: Date.now(), index };
  return index;
}

/** Forget the index (the owner just changed a note). */
export function forgetKnowledge() {
  globalForIndex.__coachBougerraKnowledge = undefined;
}
