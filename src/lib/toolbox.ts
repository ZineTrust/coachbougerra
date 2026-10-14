/*
  The toolbox: ready-to-copy messages for building a network, in French and
  Arabic. Square brackets mark what to personalise; [Prénom] / [الاسم] is filled
  in automatically when the member types their contact's first name.

  Written to stay honest: no promise of income or results, no pressure.
  SAMPLE CONTENT: Coach Bougerra should read and adapt these in his own voice.
*/
import type { L10n } from "./data";

export const TOOLBOX_CATEGORIES = [
  "firstContact",
  "followUp",
  "objections",
  "presenting",
  "invite",
  "team",
] as const;
export type ToolboxCategory = (typeof TOOLBOX_CATEGORIES)[number];

export interface Script {
  id: string;
  category: ToolboxCategory;
  title: L10n;
  text: L10n;
  /** a line of advice on how to use it */
  tip: L10n;
}

/** The words in the scripts that get replaced by the contact's first name. */
export const NAME_PLACEHOLDER = { fr: "[Prénom]", ar: "[الاسم]" } as const;

export const SCRIPTS: Script[] = [
  /* ------------------------------ first contact ------------------------------ */
  {
    id: "reprendre-contact",
    category: "firstContact",
    title: { fr: "Reprendre contact avec chaleur", ar: "استئناف التواصل بود" },
    text: {
      fr: "Salut [Prénom] ! Ça fait un moment, j'espère que tu vas bien. J'ai pensé à toi en voyant [une chose précise : sa ville, un projet, une photo]. Comment ça se passe de ton côté en ce moment ?",
      ar: "السلام عليكم [الاسم]! مدة طويلة ما تحدثنا، أتمنى أنك بخير. تذكرتك وأنا أرى [شيئًا محددًا: مدينتك، مشروعًا، صورة]. كيف حالك هذه الأيام؟",
    },
    tip: {
      fr: "Commencez par la personne, pas par votre projet. Attendez sa réponse avant de parler d'autre chose.",
      ar: "ابدأ بالشخص لا بمشروعك، وانتظر ردّه قبل أن تتحدث عن أي شيء آخر.",
    },
  },
  {
    id: "nouveau-contact-reseaux",
    category: "firstContact",
    title: { fr: "Premier message après un échange sur les réseaux", ar: "أول رسالة بعد تفاعل على وسائل التواصل" },
    text: {
      fr: "Bonjour [Prénom], je suis tombé sur ton profil et j'ai aimé ce que tu partages sur [sujet]. Je m'intéresse aussi à ce thème. Qu'est-ce qui t'y a amené ?",
      ar: "السلام عليكم [الاسم]، وصلت إلى حسابك وأعجبني ما تشاركه عن [الموضوع]. أنا أيضًا مهتم بهذا المجال. ما الذي جعلك تهتم به؟",
    },
    tip: {
      fr: "Citez quelque chose de vrai et de précis : un message générique se reconnaît tout de suite.",
      ar: "اذكر شيئًا حقيقيًا ومحددًا: الرسالة العامة تُكتشف فورًا.",
    },
  },
  {
    id: "question-ouverte",
    category: "firstContact",
    title: { fr: "Une question simple pour ouvrir la conversation", ar: "سؤال بسيط لفتح الحوار" },
    text: {
      fr: "Question simple, sans engagement : si tu pouvais améliorer une seule chose dans ta vie ou ton activité cette année, ce serait quoi ?",
      ar: "سؤال بسيط دون أي التزام: لو استطعت تحسين شيء واحد فقط في حياتك أو عملك هذه السنة، فماذا سيكون؟",
    },
    tip: {
      fr: "Écoutez la réponse. Votre rôle est de comprendre avant de proposer.",
      ar: "أصغِ للجواب. دورك أن تفهم قبل أن تقترح.",
    },
  },

  /* --------------------------------- follow up --------------------------------- */
  {
    id: "relance-douce",
    category: "followUp",
    title: { fr: "Relance douce", ar: "متابعة لطيفة" },
    text: {
      fr: "Bonjour [Prénom] ! Je reviens vers toi comme promis. As-tu eu le temps d'y réfléchir ? Pas de pression : dis-moi simplement où tu en es et ce qui te manque pour décider.",
      ar: "السلام عليكم [الاسم]! أعود إليك كما وعدتك. هل وجدت الوقت للتفكير؟ دون أي ضغط: أخبرني فقط أين وصلت وما الذي ينقصك لتقرر.",
    },
    tip: {
      fr: "Relancez à la date promise, ni avant ni beaucoup plus tard.",
      ar: "تابع في الموعد الذي وعدت به، لا قبله ولا بعده بكثير.",
    },
  },
  {
    id: "relance-sans-reponse",
    category: "followUp",
    title: { fr: "Quand il n'y a pas de réponse", ar: "عندما لا يأتي رد" },
    text: {
      fr: "Coucou [Prénom], je ne veux pas t'embêter : je préfère savoir si ce n'est pas le bon moment plutôt que de te relancer pour rien. Tu me diras ?",
      ar: "مرحبًا [الاسم]، لا أريد إزعاجك: أفضّل أن أعرف إن لم يكن الوقت مناسبًا بدل أن أكرر الرسائل دون فائدة. هل تخبرني؟",
    },
    tip: {
      fr: "Un « non » clair vaut mieux qu'un silence. Remerciez toujours, quelle que soit la réponse.",
      ar: "«لا» واضحة أفضل من الصمت. اشكر دائمًا مهما كان الجواب.",
    },
  },
  {
    id: "apres-presentation",
    category: "followUp",
    title: { fr: "Après une présentation", ar: "بعد عرض أو لقاء" },
    text: {
      fr: "Merci pour le temps que tu m'as accordé, [Prénom]. Voici un résumé en deux lignes de ce dont on a parlé : [résumé]. Dis-moi quelle est la prochaine étape qui te semble la plus logique.",
      ar: "شكرًا على وقتك [الاسم]. هذا ملخص في سطرين لما تحدثنا عنه: [الملخص]. قل لي ما الخطوة التالية التي تراها الأنسب.",
    },
    tip: {
      fr: "Laissez la personne proposer la suite : elle s'engage mieux quand elle choisit.",
      ar: "دع الشخص يقترح الخطوة التالية: يلتزم أكثر حين يختار بنفسه.",
    },
  },

  /* ---------------------------------- objections --------------------------------- */
  {
    id: "trop-cher",
    category: "objections",
    title: { fr: "« C'est trop cher »", ar: "«إنه غالٍ»" },
    text: {
      fr: "Je comprends que le budget compte, c'est normal de bien réfléchir. Qu'est-ce qui est le plus important pour toi : le prix, ou être sûr que ça te sera utile ? On peut regarder ensemble ce qui est adapté à ta situation.",
      ar: "أتفهّم أن الميزانية مهمة، ومن الطبيعي أن تفكر جيدًا. ما الأهم بالنسبة لك: السعر، أم التأكد من أن الأمر سيفيدك؟ يمكننا أن ننظر معًا فيما يناسب وضعك.",
    },
    tip: {
      fr: "Ne défendez pas le prix : cherchez ce qui compte vraiment pour la personne.",
      ar: "لا تدافع عن السعر: ابحث عمّا يهمّ الشخص فعلًا.",
    },
  },
  {
    id: "pas-le-temps",
    category: "objections",
    title: { fr: "« Je n'ai pas le temps »", ar: "«ليس لدي وقت»" },
    text: {
      fr: "Je te comprends, on a tous des journées chargées. Ce qui compte, c'est la régularité plus que la durée. Je peux te montrer comment je m'organise, et tu vois si ça peut te convenir ?",
      ar: "أتفهّمك، لدينا جميعًا أيام مزدحمة. المهم هو الانتظام أكثر من المدة. يمكنني أن أريك كيف أنظّم وقتي، وتحكم هل يناسبك؟",
    },
    tip: {
      fr: "Restez concret : proposez une petite action, pas un gros engagement.",
      ar: "كن عمليًا: اقترح خطوة صغيرة لا التزامًا كبيرًا.",
    },
  },
  {
    id: "je-dois-reflechir",
    category: "objections",
    title: { fr: "« Je dois y réfléchir »", ar: "«أحتاج إلى التفكير»" },
    text: {
      fr: "Bien sûr, prends le temps qu'il faut. Pour t'aider à décider, qu'est-ce qui te fait hésiter exactement ? Si je peux te répondre, je le fais maintenant, sinon on se reparle quand tu veux.",
      ar: "بالطبع، خذ الوقت الذي تحتاجه. لأساعدك على القرار، ما الذي يجعلك تتردد بالضبط؟ إن كنت أستطيع الإجابة فسأفعل الآن، وإلا نتحدث متى شئت.",
    },
    tip: {
      fr: "L'hésitation cache souvent une question précise : aidez la personne à la formuler.",
      ar: "التردد يخفي غالبًا سؤالًا محددًا: ساعد الشخص على صياغته.",
    },
  },
  {
    id: "deja-essaye",
    category: "objections",
    title: { fr: "« J'ai déjà essayé, ça n'a pas marché »", ar: "«جرّبت من قبل ولم ينجح»" },
    text: {
      fr: "Merci pour ta franchise. Si tu as déjà essayé quelque chose de similaire, ça m'intéresse : qu'est-ce qui n'a pas marché pour toi ? Ça m'aide à voir si ce que je propose est différent.",
      ar: "شكرًا على صراحتك. إن كنت قد جرّبت شيئًا مشابهًا فهذا يهمّني: ما الذي لم ينجح معك؟ يساعدني ذلك على معرفة إن كان ما أقترحه مختلفًا.",
    },
    tip: {
      fr: "Respectez l'expérience de la personne : ne la contredisez pas, apprenez d'elle.",
      ar: "احترم تجربة الشخص: لا تعارضه، بل تعلّم منه.",
    },
  },

  /* ---------------------------------- presenting --------------------------------- */
  {
    id: "presenter-simplement",
    category: "presenting",
    title: { fr: "Se présenter en deux phrases", ar: "التعريف بنفسك في جملتين" },
    text: {
      fr: "En deux phrases : je travaille avec Ultimate Health & Beauty, une entreprise de produits bien-être, et j'accompagne des personnes qui veulent développer une activité à côté, à leur rythme. Si ça t'intéresse, je te montre comment ça fonctionne, sans engagement.",
      ar: "في جملتين: أعمل مع Ultimate Health & Beauty، شركة منتجات للعناية والعافية، وأرافق أشخاصًا يريدون تطوير نشاط إضافي بإيقاعهم الخاص. إن أثار اهتمامك، أريك كيف يعمل الأمر دون أي التزام.",
    },
    tip: {
      fr: "Court et clair. Laissez l'autre poser des questions plutôt que tout expliquer d'un coup.",
      ar: "قصير وواضح. دع الآخر يسأل بدل أن تشرح كل شيء دفعة واحدة.",
    },
  },
  {
    id: "proposer-un-appel",
    category: "presenting",
    title: { fr: "Proposer un court appel", ar: "اقتراح مكالمة قصيرة" },
    text: {
      fr: "Plutôt que d'écrire beaucoup, je te propose un appel de 15 minutes cette semaine pour te présenter les choses simplement. Tu préfères [jour 1] ou [jour 2] ?",
      ar: "بدل الكتابة الكثيرة، أقترح مكالمة من 15 دقيقة هذا الأسبوع لأعرض عليك الأمور ببساطة. هل تفضّل [يوم 1] أم [يوم 2]؟",
    },
    tip: {
      fr: "Proposez deux choix précis : c'est plus facile de répondre que « quand tu veux ».",
      ar: "اقترح خيارين محددين: الرد عليهما أسهل من «متى شئت».",
    },
  },
  {
    id: "etre-transparent",
    category: "presenting",
    title: { fr: "Être transparent dès le début", ar: "الشفافية من البداية" },
    text: {
      fr: "Pour être clair dès le début : il n'y a aucune promesse de résultat, tout dépend du travail de chacun. Mon rôle est de te montrer la méthode et de t'accompagner. À toi de voir si ça te convient.",
      ar: "لأكون واضحًا من البداية: لا يوجد أي وعد بنتيجة، فكل شيء يعتمد على عمل كل شخص. دوري أن أريك المنهج وأرافقك. وأنت من يقرر إن كان يناسبك.",
    },
    tip: {
      fr: "La confiance se construit sur l'honnêteté. Ne promettez jamais de revenus.",
      ar: "الثقة تُبنى على الصدق. لا تَعِد أبدًا بأرباح.",
    },
  },

  /* ------------------------------------ invite ------------------------------------ */
  {
    id: "inviter-au-live",
    category: "invite",
    title: { fr: "Inviter à un live", ar: "دعوة إلى بث مباشر" },
    text: {
      fr: "Bonjour [Prénom] ! Coach Bougerra fait un live ouvert à tous [jour] à [heure]. Il y parle de [thème]. Si ça t'intéresse, voici le lien pour réserver ta place : [lien]. Je serai connecté aussi, on pourra en discuter après.",
      ar: "السلام عليكم [الاسم]! كوتش بوقرة سيقدّم بثًا مباشرًا مفتوحًا للجميع يوم [اليوم] على الساعة [الوقت]، وسيتحدث عن [الموضوع]. إن أثار اهتمامك فهذا رابط حجز مكانك: [الرابط]. سأكون متصلًا أيضًا ويمكننا النقاش بعده.",
    },
    tip: {
      fr: "Envoyez-le 24 h avant puis 1 h avant : un rappel suffit, pas plus.",
      ar: "أرسله قبل 24 ساعة ثم قبل ساعة: تذكير واحد يكفي.",
    },
  },
  {
    id: "partager-une-formation",
    category: "invite",
    title: { fr: "Partager une formation gratuite", ar: "مشاركة دورة مجانية" },
    text: {
      fr: "Je suis tombé sur une formation gratuite qui m'a aidé à [bénéfice]. Je pense qu'elle peut te plaire : [lien]. Dis-moi ce que tu en penses après l'avoir regardée.",
      ar: "وجدت دورة مجانية ساعدتني على [الفائدة]. أظنها قد تعجبك: [الرابط]. أخبرني برأيك بعد مشاهدتها.",
    },
    tip: {
      fr: "Partagez ce qui vous a vraiment servi : l'authenticité convainc mieux que l'insistance.",
      ar: "شارك ما أفادك فعلًا: الأصالة تقنع أكثر من الإلحاح.",
    },
  },

  /* ------------------------------------- team -------------------------------------- */
  {
    id: "bienvenue-equipe",
    category: "team",
    title: { fr: "Accueillir un nouveau dans l'équipe", ar: "الترحيب بعضو جديد في الفريق" },
    text: {
      fr: "Bienvenue dans l'équipe, [Prénom] ! Je suis content de t'accompagner. Voici tes trois premières actions : 1) regarder la formation de bienvenue, 2) fixer ton objectif de la semaine, 3) m'envoyer tes questions. On fait un point [jour] ?",
      ar: "أهلًا بك في الفريق [الاسم]! يسعدني أن أرافقك. هذه خطواتك الثلاث الأولى: 1) مشاهدة دورة الترحيب، 2) تحديد هدف الأسبوع، 3) إرسال أسئلتك إليّ. هل نتحدث يوم [اليوم]؟",
    },
    tip: {
      fr: "Trois actions maximum : un début simple vaut mieux qu'une longue liste.",
      ar: "ثلاث خطوات على الأكثر: بداية بسيطة أفضل من قائمة طويلة.",
    },
  },
  {
    id: "encourager",
    category: "team",
    title: { fr: "Encourager quelqu'un de l'équipe", ar: "تشجيع عضو من الفريق" },
    text: {
      fr: "Bravo pour ton effort cette semaine, [Prénom]. Même quand les résultats tardent, la régularité compte. Qu'est-ce qui t'a le plus aidé ? Et qu'est-ce que je peux faire pour te soutenir ?",
      ar: "أحسنت على جهدك هذا الأسبوع [الاسم]. حتى عندما تتأخر النتائج فإن الانتظام هو الأهم. ما الذي ساعدك أكثر؟ وماذا أستطيع أن أفعل لدعمك؟",
    },
    tip: {
      fr: "Félicitez l'effort, pas seulement le résultat.",
      ar: "امدح الجهد لا النتيجة فقط.",
    },
  },
  {
    id: "point-hebdo",
    category: "team",
    title: { fr: "Le point de la semaine", ar: "حصيلة الأسبوع" },
    text: {
      fr: "Point rapide de la semaine : 1) ce qui a bien marché, 2) ce qui a été difficile, 3) ton objectif pour la semaine prochaine. Réponds en quelques lignes quand tu peux.",
      ar: "حصيلة سريعة للأسبوع: 1) ما الذي سار جيدًا، 2) ما الذي كان صعبًا، 3) هدفك للأسبوع القادم. أجب في بضعة أسطر حين تستطيع.",
    },
    tip: {
      fr: "Un rendez-vous régulier et court crée l'habitude mieux qu'une longue réunion occasionnelle.",
      ar: "موعد منتظم وقصير يصنع العادة أفضل من اجتماع طويل نادر.",
    },
  },
];

export const getScript = (id: string) => SCRIPTS.find((s) => s.id === id);

/** Replaces the name placeholder with the contact's first name (when given). */
export function personalise(text: string, name: string, locale: "fr" | "ar") {
  const clean = name.trim();
  return clean ? text.replaceAll(NAME_PLACEHOLDER[locale], clean) : text;
}
