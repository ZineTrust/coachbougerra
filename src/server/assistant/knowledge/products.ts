import type { Note } from "../search";
import products from "../products.json";

/*
  The Ultimate products, from the official catalogue (name, category, pack format and the catalogue's own
  description). What is NOT here on purpose: dosage, steps of use and "who it is for", which only the
  packaging and a consultant or doctor can give. The assistant says so when asked.
*/

interface Product {
  n: string;
  k: string;
  f: string;
  d: string;
}

/** French label of each category, and the words people use for it in French and in Arabic. */
const KINDS: Record<string, { label: string; keywords: string }> = {
  tisane: { label: "Tisanes (gamme Herbal Therapy)", keywords: "tisane tisanes infusion plantes the herbal therapy شاي اعشاب مشروبات عشبية" },
  complement: { label: "Compléments alimentaires", keywords: "complement complements alimentaires capsules gelules vitamines supplement مكملات غذائية كبسولات فيتامينات" },
  nutrition: { label: "Nutrition sportive", keywords: "nutrition sportive proteine whey mass gainer musculation sport تغذية رياضية بروتين وي رياضة" },
  pack: { label: "Packs", keywords: "pack packs coffret cure programme minceur slimming c21 باقة باقات عرض برنامج تنحيف" },
  visage: { label: "Soins du visage (peau)", keywords: "visage creme peau serum anti age collagene eclaircissante hydratante nettoyant العناية بالوجه كريم بشرة" },
  corps: { label: "Soins du corps", keywords: "corps creme anti cellulite vergeture gel amincissant exfoliant pieds العناية بالجسم كريم سيلوليت ترهلات تقشير" },
  cheveux: { label: "Soins capillaires (cheveux)", keywords: "cheveux capillaire shampoing masque huile anti chute pousse argan الشعر شامبو تساقط الشعر ماسك زيت" },
  hygiene: { label: "Hygiène (gels douche, savons)", keywords: "hygiene gel douche savon bain corps nettoyant صابون جل الاستحمام نظافة" },
  bebe: { label: "Bébé", keywords: "bebe enfant nourrisson lavant lotion الطفل رضيع اطفال" },
  parfum: { label: "Parfums", keywords: "parfum eau de parfum femme homme fragrance edp عطر عطور رجالي نسائي" },
  maquillage: { label: "Maquillage", keywords: "maquillage fond de teint mascara eyeliner rouge a levres primer correcteur مكياج ماكياج احمر شفاه ماسكارا" },
  maison: { label: "Maison (parfums d'ambiance, entretien)", keywords: "maison parfum d'ambiance diffuseur desodorisant nettoyant canape المنزل معطر جو منظف" },
  huile: { label: "Huiles essentielles", keywords: "huile essentielle menthe lavande eucalyptus citron girofle arbre a the زيوت اساسية نعناع لافندر" },
  accessoire: { label: "Accessoires", keywords: "accessoire shaker coffret cadeau gift box اكسسوار شيكر هدية" },
};

const list = products as Product[];

const kindOf = (k: string) => KINDS[k] ?? { label: k, keywords: k };

/** One note per category (to answer "what do you have for hair?"), then one note per product. */
export const PRODUCT_NOTES: Note[] = [
  ...Object.entries(KINDS)
    .map(([kind, info]): Note | null => {
      const names = list.filter((p) => p.k === kind).map((p) => p.n);
      if (names.length === 0) return null;
      return {
        id: `product-category-${kind}`,
        title: `Produits Ultimate : ${info.label}`,
        keywords: `${info.keywords} produits gamme catalogue liste منتجات المنتجات الكتالوج`,
        body: `Catégorie « ${info.label} » du catalogue Ultimate, ${names.length} produits : ${names.join(", ")}. Pour la description d'un produit précis, demandez-moi son nom.`,
      };
    })
    .filter((n): n is Note => n !== null),
  ...list.map(
    (p, i): Note => ({
      id: `product-${i}`,
      title: p.n,
      keywords: `${kindOf(p.k).label} ${kindOf(p.k).keywords} produit منتج`,
      body: `${p.n} (${kindOf(p.k).label}${p.f ? `, ${p.f}` : ""}). Selon le catalogue Ultimate : ${p.d}`,
    }),
  ),
];
