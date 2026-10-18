/**
 * "Les 7 erreurs du débutant !" -> "les-7-erreurs-du-debutant". Letters with accents lose them;
 * a title with no Latin letters at all (Arabic only) gives "" and the caller picks a fallback.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}
