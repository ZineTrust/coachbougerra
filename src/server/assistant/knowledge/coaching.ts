import type { Note } from "../search";

/*
  Practical network-marketing know-how, in the spirit of the platform: honest, simple, built on
  relationships and regular action, never on promises of income or of results. These notes are general
  good practice: they are not Ultimate's official rules (those come from Ultimate or from the team).
  The team can add its own methods and examples in the assistant's notes page of the workspace.
*/
export const COACHING_NOTES: Note[] = [
  {
    id: "coach-demarrer",
    title: "Bien démarrer ses 30 premiers jours",
    keywords:
      "debuter demarrer commencer debutant nouveau premiers jours par ou commencer plan de depart start " +
      "البداية ابدأ مبتدئ جديد اول 30 يوم من اين ابدأ خطة البداية",
    body:
      "Les 30 premiers jours servent à poser des habitudes, pas à tout réussir. Plan simple : 1) connaître 2 ou 3 produits que vous utilisez vraiment ; 2) suivre les formations gratuites de la plateforme ; 3) écrire votre liste de contacts ; 4) fixer 2 ou 3 actions par jour (par exemple 3 conversations sincères, 1 suivi, 10 minutes de formation) ; 5) noter vos actions chaque soir. " +
      "La régularité compte plus que l'intensité : peu, mais tous les jours.",
  },
  {
    id: "coach-liste-contacts",
    title: "Faire sa liste de contacts",
    keywords:
      "liste de contacts liste de noms prospects qui contacter reseau relations connaissances famille amis " +
      "قائمة الاسماء قائمة الاتصالات من اتصل به معارف عائلة اصدقاء عملاء محتملين",
    body:
      "Écrivez 50 à 100 noms sans trier ni juger : famille, voisins, collègues, anciens camarades, contacts de WhatsApp et des réseaux sociaux, personnes rencontrées par le travail ou les loisirs. Classez ensuite : ceux qui pourraient aimer les produits, ceux qui cherchent un complément d'activité, ceux qui pourraient connaître quelqu'un. " +
      "Ne décidez jamais à la place d'une personne si elle est intéressée : laissez-lui le choix. Complétez la liste chaque semaine.",
  },
  {
    id: "coach-premier-contact",
    title: "Premier contact et invitation sans pression",
    keywords:
      "premier contact inviter invitation approche message d'approche prospecter abordez contacter proposer sans pression " +
      "التواصل الاول دعوة دعوة شخص اسلوب الاقتراب رسالة اولى استقطاب بدون ضغط",
    body:
      "Un bon premier message est court, personnel et offre un choix : on montre de la curiosité pour la personne avant de parler de soi. " +
      "Exemple : « Salut [Prénom], j'ai commencé un projet qui m'enthousiasme dans le bien-être. J'ai pensé à toi parce que tu [raison sincère]. Tu aurais 10 minutes cette semaine pour que je te montre, sans engagement ? » " +
      "Pas de pression, pas de faux prétexte : dites clairement de quoi il s'agit. Si la personne dit non, remerciez-la et gardez la relation.",
  },
  {
    id: "coach-presentation",
    title: "Structurer une présentation (en personne ou en ligne)",
    keywords:
      "presentation presenter l'opportunite plan business structure expliquer pitch rendez-vous visio zoom " +
      "عرض تقديم الفرصة شرح المشروع هيكلة العرض اجتماع زوم",
    body:
      "Une présentation efficace tient en 15 à 20 minutes : 1) écouter d'abord (pourquoi la personne a accepté ce rendez-vous, ce qu'elle cherche) ; 2) votre histoire courte et vraie ; 3) ce que vous proposez (produits ou activité) en lien avec ce qu'elle a dit ; 4) comment vous démarrez concrètement ; 5) proposer une prochaine étape simple, avec une date. " +
      "Évitez le jargon et les chiffres de gains. Laissez la personne poser ses questions.",
  },
  {
    id: "coach-ecoute-questions",
    title: "Écouter : les bonnes questions à poser",
    keywords:
      "ecouter questions ouvertes besoins decouvrir ce que cherche la personne dialogue conversation " +
      "الاستماع اسئلة مفتوحة الاحتياجات فهم الشخص حوار",
    body:
      "Posez des questions ouvertes et écoutez plus que vous ne parlez : « Qu'est-ce qui vous plairait de changer cette année ? », « Si vous aviez une heure de plus par jour, que feriez-vous ? », « Qu'avez-vous déjà essayé pour votre santé/votre forme ? », « Qu'est-ce qui compte le plus pour vous dans un projet ? ». " +
      "Reformulez ce que vous avez compris avant de proposer quoi que ce soit.",
  },
  {
    id: "coach-objection-pyramide",
    title: "Répondre à « C'est une pyramide ? »",
    keywords:
      "pyramide objection arnaque escroquerie c'est legal est ce legal mlm reseau marketing confiance suspect " +
      "هرمي هرم احتيال نصب هل هو قانوني تسويق شبكي شك اعتراض",
    body:
      "Répondez calmement et honnêtement, sans vous vexer : la question est légitime. Idées : une activité sérieuse vend de vrais produits à de vrais clients, rémunère le travail de vente et d'accompagnement et ne demande pas d'« entrée » élevée sans produit en face ; une pyramide, elle, vit de l'argent des nouveaux arrivants. " +
      "Invitez la personne à se renseigner par elle-même : lire le plan de rémunération officiel, vérifier le statut de la société et les règles locales. Ne donnez pas d'avis juridique, ne promettez rien, et acceptez qu'elle ne soit pas convaincue.",
  },
  {
    id: "coach-objections-courantes",
    title: "Objections courantes : pas le temps, pas d'argent, je ne sais pas vendre",
    keywords:
      "objections pas le temps pas d'argent je ne sais pas vendre je vais reflechir mari femme pas interesse ca ne marche pas " +
      "اعتراضات ليس لدي وقت ليس لدي مال لا اعرف البيع ساتفكر زوجي زوجتي غير مهتم",
    body:
      "Principe : écoutez, reconnaissez la préoccupation, puis posez une question plutôt que de plaider. « Pas le temps » : « Je comprends. Si je vous montrais comment démarrer avec 30 minutes par jour, ça vaudrait la peine d'en parler ? » " +
      "« Pas d'argent » : ne poussez jamais quelqu'un à dépenser ce qu'il n'a pas ; proposez de commencer petit ou d'en reparler plus tard. « Je ne sais pas vendre » : « Personne ne naît vendeur ; on apprend ensemble avec des formations et des messages prêts. » " +
      "« Je dois réfléchir » : « Bien sûr. Qu'est-ce qui vous aiderait à décider ? On se reparle jeudi ? ». « Je dois en parler à mon conjoint » : proposez une présentation à deux.",
  },
  {
    id: "coach-suivi-relance",
    title: "Le suivi et les relances",
    keywords:
      "suivi relance relancer follow up pas de reponse ghost rappeler cadence message de relance " +
      "المتابعة اعادة التواصل لا يرد تذكير رسالة متابعة",
    body:
      "Le suivi est la partie la plus négligée. Rythme conseillé : un message après 1 jour, un autre après 3 à 4 jours, puis un dernier après 10 jours, chaque fois avec une valeur nouvelle (une information utile, une question, une invitation à une formation) plutôt que « Alors, tu as réfléchi ? ». " +
      "Exemple : « Salut [Prénom], j'ai pensé à toi en voyant [chose utile]. Je te l'envoie si ça t'intéresse. » Après 3 relances sans réponse, arrêtez poliment et gardez la porte ouverte.",
  },
  {
    id: "coach-duplication",
    title: "Duplication : transmettre un système simple",
    keywords:
      "duplication dupliquer systeme equipe former nouveaux membres simple reproductible accompagner demarrage " +
      "الاستنساخ نظام بسيط تدريب الفريق اعضاء جدد تكرار",
    body:
      "Un système se duplique s'il est simple : 3 ou 4 actions que n'importe quel débutant peut répéter. Montrez l'exemple, faites-les ensemble les premières fois (appel à deux, présentation commentée), puis laissez la personne faire seule avec votre soutien. " +
      "Donnez à chaque nouveau le même démarrage : liste de contacts, 3 formations, 3 messages prêts, un rendez-vous hebdomadaire. Ne créez pas de dépendance : le but est que chacun devienne autonome.",
  },
  {
    id: "coach-leadership",
    title: "Leadership : accompagner son équipe",
    keywords:
      "leadership leader chef equipe motiver accompagner mentor coach reconnaissance exemple team " +
      "قيادة قائد فريق تحفيز مرافقة قدوة تقدير مدرب",
    body:
      "Un bon leader sert son équipe : il donne l'exemple, clarifie les attentes, écoute, reconnaît les efforts en public et corrige en privé. Habitudes utiles : un point individuel court chaque semaine avec chaque nouveau, une réunion d'équipe régulière (30 minutes, ordre du jour clair), célébrer les petites victoires, former d'autres leaders plutôt que tout faire soi-même. " +
      "Soyez cohérent : ne demandez jamais à vos équipiers ce que vous ne faites pas vous-même.",
  },
  {
    id: "coach-reunion-equipe",
    title: "Animer une réunion d'équipe ou une visio",
    keywords:
      "reunion equipe visio zoom animer ordre du jour meeting appel d'equipe formation hebdomadaire " +
      "اجتماع الفريق زوم ادارة الاجتماع جدول الاعمال لقاء اسبوعي",
    body:
      "Format de 30 minutes : 5 min de bienvenue et de victoires, 10 min de formation sur un seul thème, 10 min d'échange (questions, cas concrets), 5 min d'engagements (chacun dit son action de la semaine). Commencez et finissez à l'heure, enregistrez-vous des idées à suivre, et envoyez un petit récapitulatif écrit après.",
  },
  {
    id: "coach-objectifs-actions",
    title: "Fixer des objectifs et suivre ses actions",
    keywords:
      "objectifs fixer objectif hebdomadaire actions quotidiennes suivi indicateurs resultats mesurer discipline " +
      "اهداف تحديد الهدف اسبوعي اعمال يومية متابعة قياس النتائج",
    body:
      "Fixez des objectifs d'ACTIONS que vous contrôlez (conversations par jour, présentations par semaine, suivis effectués) plus que des objectifs de résultats que vous ne contrôlez pas. Notez-les chaque soir, faites un bilan le dimanche et ajustez. " +
      "Sur la plateforme, la carte « Objectif du mois » sert à suivre vos PV. Un objectif réaliste et regardé souvent vaut mieux qu'un grand objectif oublié.",
  },
  {
    id: "coach-gestion-temps",
    title: "Gérer son temps quand on a un autre travail",
    keywords:
      "temps organisation emploi travail etudes planning horaires priorites concilier disponibilite " +
      "الوقت تنظيم الوقت عمل دراسة جدول اولويات التوفيق",
    body:
      "Réservez des créneaux fixes, même courts (par exemple 1 heure le soir et 2 heures le week-end), et protégez-les comme des rendez-vous. Consacrez-les d'abord aux actions qui font avancer (parler à des personnes, suivre, se former), avant les tâches secondaires (logo, cartes, réglages). Préparez la veille ce que vous ferez le lendemain.",
  },
  {
    id: "coach-reseaux-sociaux",
    title: "Utiliser WhatsApp et les réseaux sociaux avec respect",
    keywords:
      "reseaux sociaux whatsapp facebook instagram tiktok statut publication contenu spam message groupe prospecter en ligne " +
      "وسائل التواصل واتساب فيسبوك انستغرام تيك توك حالة منشور محتوى رسائل جماعية",
    body:
      "En ligne, partagez de la valeur plutôt que de faire de la publicité : votre histoire vraie, des conseils utiles, votre routine, les coulisses. Demandez la permission avant d'envoyer une proposition, évitez les messages en masse copiés-collés et les ajouts de personnes à des groupes sans leur accord. " +
      "N'utilisez jamais de faux témoignages, de photos avant/après trompeuses ou de promesses de gains ou de guérison.",
  },
  {
    id: "coach-rejet",
    title: "Gérer le refus et le découragement",
    keywords:
      "refus rejet non decouragement abandonner demotivation motivation echec doute baisse de moral stress " +
      "الرفض لا الاحباط الاستسلام فقدان الحماس الفشل الشك التحفيز",
    body:
      "Un « non » parle de la situation de l'autre personne à ce moment-là, pas de votre valeur. Cherchez ce qui peut s'améliorer (approche, timing, écoute), puis passez à la conversation suivante. Gardez des petites victoires visibles (conversations tenues, apprentissages), parlez à votre équipe ou à votre mentor, reposez-vous. " +
      "Les résultats arrivent à des rythmes différents ; l'important est de continuer à apprendre et à agir régulièrement.",
  },
  {
    id: "coach-qui-inviter",
    title: "Qui inviter, et comment recruter sans forcer",
    keywords:
      "recruter recrutement qui inviter profil ideal choisir personnes motivees parrainer equipe construire " +
      "توظيف استقطاب من ادعو الشخص المناسب بناء الفريق",
    body:
      "Invitez largement, sans décider à l'avance qui dira oui. Les personnes qui réussissent le mieux sont souvent celles qui sont motivées, curieuses d'apprendre et prêtes à agir régulièrement, pas forcément celles qui parlent le mieux. " +
      "Ne forcez personne, ne surestimez jamais les résultats possibles et soyez clair sur l'effort demandé : une équipe construite sur la confiance dure plus longtemps.",
  },
  {
    id: "coach-ethique",
    title: "Éthique et conformité : ce qu'on dit et ce qu'on ne dit pas",
    keywords:
      "ethique conformite regles legal promesse de revenus gains garantie reclamation sante medical honnetete verite interdit " +
      "اخلاقيات التزام قواعد وعود الارباح ضمان ادعاءات صحية الصدق ممنوع قانوني",
    body:
      "À éviter : promettre des revenus ou un « succès garanti », montrer des gains non représentatifs, affirmer qu'un produit guérit ou prévient une maladie, mettre la pression sur ses proches, dénigrer d'autres sociétés ou personnes. " +
      "À faire : parler honnêtement de l'effort et du temps nécessaires, présenter les produits avec les mots prudents du catalogue et votre expérience personnelle, renvoyer vers un médecin pour toute question de santé, respecter la loi et les règles de la société.",
  },
  {
    id: "coach-clients-fidelisation",
    title: "Servir ses clients et les fidéliser",
    keywords:
      "clients service apres vente fidelisation suivi client avis recommandation satisfaction reachat " +
      "زبائن عملاء خدمة ما بعد البيع ولاء رضا اعادة الشراء توصية",
    body:
      "Un client satisfait revient et recommande. Après une vente : prenez des nouvelles au bout de quelques jours, rappelez l'utilisation indiquée sur l'emballage, répondez vite, et proposez le réassort un peu avant la fin du produit. Écoutez les remarques et ne vendez jamais plus que ce dont la personne a besoin.",
  },
  {
    id: "coach-premiere-vente",
    title: "Réussir sa première vente ou son premier client",
    keywords:
      "premiere vente premier client vendre comment vendre produit conclure proposer commande " +
      "اول عملية بيع اول زبون كيف ابيع المنتج اغلاق الصفقة طلب",
    body:
      "Commencez par des personnes proches qui ont un besoin réel. 1) Demandez ce qu'elles cherchent (forme, peau, énergie...). 2) Présentez un ou deux produits adaptés avec le descriptif du catalogue et votre propre expérience si vous en avez une. 3) Donnez le prix et la façon de commander. 4) Laissez le temps de choisir. 5) Prenez des nouvelles quelques jours après. Pas de pression, pas de promesse de résultat.",
  },
  {
    id: "coach-produits-parler",
    title: "Parler des produits honnêtement",
    keywords:
      "parler produits presenter un produit arguments avantages benefices temoignage experience personnelle conseil sante " +
      "الحديث عن المنتجات عرض منتج فوائد تجربة شخصية شهادة نصيحة صحية",
    body:
      "Présentez un produit avec trois éléments : à quoi il sert selon le catalogue, comment vous l'utilisez vous-même (votre expérience, sans généraliser), et la façon de le prendre indiquée sur l'emballage. " +
      "Ne comparez pas aux médicaments, ne promettez pas de résultat chiffré, et pour une personne enceinte, allaitante, malade, sous traitement, allergique ou pour un enfant, recommandez d'abord l'avis d'un médecin ou d'un pharmacien.",
  },
  {
    id: "coach-habitudes",
    title: "Habitudes, discipline et développement personnel",
    keywords:
      "habitudes discipline routine matin lecture croissance personnelle mindset etat d'esprit concentration productivite " +
      "عادات انضباط روتين صباحي قراءة تطوير الذات عقلية تركيز انتاجية",
    body:
      "Construisez une routine courte que vous tenez même les mauvais jours : réveil à heure fixe, 10 minutes de lecture ou de formation, une action d'abord (avant les réseaux sociaux), bilan le soir. Un partenaire de motivation (une personne à qui vous rendez compte chaque semaine) multiplie vos chances de tenir. " +
      "Prenez soin de votre sommeil et de votre santé : on ne coache bien les autres que si on se coache soi-même.",
  },
  {
    id: "coach-histoire-personnelle",
    title: "Raconter son histoire (son « pourquoi »)",
    keywords:
      "histoire personnelle pourquoi storytelling raconter ma raison motivation parler en public prise de parole confiance " +
      "قصتي لماذا سرد القصة الدافع التحدث امام الجمهور الثقة",
    body:
      "Votre histoire en 3 minutes : où vous en étiez, ce qui vous a fait chercher autre chose, ce que vous avez commencé et ce que vous apprenez, ce que vous souhaitez pour la suite. Soyez vrai et précis, sans exagérer. " +
      "Pour la confiance à l'oral : préparez 3 idées (pas un texte appris), entraînez-vous devant un ami, enregistrez-vous au téléphone et réécoutez-vous.",
  },
  {
    id: "coach-budget",
    title: "Argent et budget : bonnes pratiques générales",
    keywords:
      "budget argent depenses investir reinvestir stock achat dettes emprunter finances personnelles capital " +
      "ميزانية مال مصاريف استثمار مخزون دين اقتراض مالية شخصية",
    body:
      "Informations générales, pas un conseil financier personnalisé : n'empruntez pas et ne dépensez pas ce que vous ne pouvez pas perdre pour démarrer ; n'achetez pas plus de produits que ce que vous pouvez utiliser ou vendre ; séparez l'argent de l'activité de vos dépenses personnelles et notez les entrées et sorties. " +
      "Pour une décision importante (crédit, déclaration, fiscalité), demandez l'avis d'un professionnel.",
  },
  {
    id: "coach-culture-equipe",
    title: "Faire vivre un groupe d'équipe (WhatsApp, etc.)",
    keywords:
      "groupe equipe whatsapp animation regles du groupe communication ambiance conflit discipline membres " +
      "مجموعة الفريق واتساب قواعد المجموعة التواصل جو الفريق خلاف",
    body:
      "Fixez 3 ou 4 règles claires dès le début (respect, pas de spam ni de publicité hors sujet, horaires, confidentialité des conversations privées). Alternez contenus utiles, victoires et rendez-vous. Réglez un désaccord en privé, avec calme, et félicitez en public. Un petit rituel (message du matin, point du dimanche) crée l'habitude.",
  },
];
