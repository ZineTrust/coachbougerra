import type { Note } from "../search";

/*
  What the assistant knows about the platform itself. The body is written in French (the assistant answers
  in the member's language); the keywords add the words members actually use, in French and in Arabic, so
  a question in either language finds the note. When a feature of the site changes, change its note here.
*/
export const SITE_NOTES: Note[] = [
  {
    id: "site-presentation",
    title: "Qu'est-ce que la plateforme Coach Bougerra ?",
    keywords:
      "presentation plateforme site application quoi service a quoi sert coach bougerra ultimate " +
      "ما هي المنصة الموقع التطبيق كوتش بوقرة عن المنصة ماذا تقدم",
    body:
      "Coach Bougerra est une plateforme en français et en arabe de formations vidéo, de coaching et de lives en marketing de réseau et en leadership, avec Coach Bougerra, présenté comme consultant n°1 Ultimate Health & Beauty. " +
      "Les membres y trouvent des formations (gratuites, ou à débloquer avec leurs PV du mois), un parcours avec points et badges, une boîte à outils de messages prêts à envoyer, des groupes de discussion, un calendrier de lives, un objectif du mois et un lien d'invitation personnel. Il n'y a aucun paiement sur le site.",
  },
  {
    id: "site-inscription",
    title: "Créer un compte et se connecter",
    keywords:
      "inscription inscrire creer compte connexion se connecter login code membre email telephone code ultimate rang " +
      "تسجيل انشاء حساب تسجيل الدخول كود العضوية رقم العضوية الايميل كود اولتيميت",
    body:
      "L'inscription est gratuite : adresse e-mail, mot de passe (8 caractères minimum), téléphone, votre code consultant Ultimate et votre rang (Consultant, Manager, Senior Manager ou Director). " +
      "À la fin, vous recevez votre code membre personnel (il commence à 101 pour le premier inscrit). Ensuite vous pouvez vous connecter avec votre e-mail OU votre code membre, avec votre mot de passe. Le code seul ne suffit jamais : le mot de passe reste obligatoire.",
  },
  {
    id: "site-mot-de-passe",
    title: "Mot de passe oublié, compte suspendu",
    keywords:
      "mot de passe oublie mdp password reinitialiser changer suspendu bloque acces impossible connexion probleme " +
      "نسيت كلمة السر كلمة المرور نسيت تغيير كلمة المرور حسابي موقوف محظور لا استطيع الدخول",
    body:
      "Il n'y a pas encore de réinitialisation automatique par e-mail : si vous avez oublié votre mot de passe, utilisez le bouton « Contacter l'équipe » ou contactez Coach Bougerra, qui peut vous donner un mot de passe temporaire que vous changerez ensuite dans Mon compte. " +
      "Pour changer votre mot de passe en étant connecté : Mon compte, carte « Mot de passe ». Si votre compte est suspendu, contactez l'équipe. L'équipe ne vous demande jamais votre mot de passe.",
  },
  {
    id: "site-formations",
    title: "Les formations : où les trouver et comment les suivre",
    keywords:
      "formation formations videos bibliotheque cours gratuit gratuite categorie recherche regarder visionner apprendre " +
      "دورات دورة الدورات فيديو مجانية مكتبة مشاهدة تعلم دروس تصنيف بحث",
    body:
      "La page Formations liste toutes les formations publiées, avec un filtre par catégorie (marketing de réseau, leadership, prospection, mindset, produits), un filtre gratuit / à PV et une recherche. " +
      "Certaines sont gratuites pour tout le monde, d'autres demandent un certain nombre de PV du mois pour être débloquées. Sur la page d'une formation vous voyez la vidéo, la description, et le bouton « Marquer comme terminée » (+30 points).",
  },
  {
    id: "site-debloquer-pv",
    title: "Débloquer une formation avec ses PV",
    keywords:
      "debloquer deblocage pv points volume demande verrouille verrouillee cadenas acces formation payante gratuit prix " +
      "فتح دورة فتح الدورة نقاط pv طلب مقفلة مقفل الوصول كيف افتح",
    body:
      "Il n'y a pas de paiement : une formation à PV se débloque avec les PV que vous avez faits CE MOIS-CI sur Ultimate. " +
      "Étapes : ouvrez la formation, saisissez le nombre de PV de votre compte Ultimate (au moins le nombre demandé) et envoyez la demande, avec un petit message facultatif. L'équipe vérifie ce chiffre sur votre compte Ultimate : un chiffre qui ne correspond pas est refusé. Dès que la demande est acceptée, vous recevez une notification et la formation s'ouvre. Vous suivez vos demandes dans Mon compte, carte « Mes déblocages ce mois-ci ».",
  },
  {
    id: "site-pv-mois",
    title: "Pourquoi une formation redevient verrouillée au nouveau mois",
    keywords:
      "pv mois remise a zero nouveau mois expire expiration refaire demande valable jusqu'a fin du mois cadeau acces permanent " +
      "نقاط الشهر شهر جديد تنتهي صلاحية اعادة الطلب صالح حتى نهاية الشهر هدية مقفلة مقفل اقفلت من جديد " +
      "verrouillee a nouveau redevenue bloquee encore",
    body:
      "Les PV d'un consultant Ultimate repartent de zéro chaque mois ; le déblocage suit la même règle : une demande acceptée est valable jusqu'à la fin de ce mois (heure d'Alger), puis il faut refaire une demande le mois suivant. Rien n'est à faire de la part de l'équipe, la remise à zéro est automatique. " +
      "Une demande restée sans réponse à la fin du mois ne peut plus être traitée. L'équipe peut aussi offrir l'accès à une formation à un membre : ce cadeau, lui, n'expire pas.",
  },
  {
    id: "site-pv-definition",
    title: "Que sont les PV ?",
    keywords: "pv points volume definition signification c'est quoi نقاط pv ما هي النقاط معنى",
    body:
      "Les PV sont les points de volume générés par votre activité Ultimate, et ils repartent de zéro chaque mois. Le chiffre qui fait foi est celui de votre compte Ultimate. " +
      "Pour les règles précises (comment les PV sont calculés, les paliers, le plan de rémunération), référez-vous à la documentation officielle d'Ultimate ou demandez à votre sponsor ou à l'équipe : je ne dois pas les inventer.",
  },
  {
    id: "site-plan-remuneration",
    title: "Plan de rémunération, commissions, prix et règles officielles d'Ultimate",
    keywords:
      "plan de remuneration compensation commission commissions gains gagner combien revenu revenus salaire bonus paliers pourcentage " +
      "prix tarif cout pack de demarrage kit inscription regles officielles quick start rang qualification par mois mensuel " +
      "شهر شهري شهريا في الشهر " +
      "عمولة عمولات ارباح اربح نربح تربح نكسب اكسب كسب كم ربح مكافاة مكافات بونص دخل راتب نسبة نسب خطة التعويضات التعويض سعر اسعار ثمن تكلفة باقة البداية شروط ترقية",
    body:
      "L'assistant n'a pas le plan de rémunération officiel d'Ultimate, ni les prix, pourcentages, paliers ou conditions de qualification exacts. Si une note de l'équipe sur ce sujet figure plus bas dans les connaissances, elle fait foi. " +
      "Sinon : dis franchement que tu n'as pas cette information, ne donne aucun chiffre, pourcentage ni exemple de gains, et n'estime rien. Tu peux expliquer les principes généraux : en marketing de réseau les revenus viennent de la vente des produits et de la construction d'une équipe, ils dépendent de l'effort et de la régularité, et rien n'est garanti. " +
      "Oriente vers la documentation officielle d'Ultimate, le sponsor ou le bouton « Contacter l'équipe ».",
  },
  {
    id: "site-lecture-protegee",
    title: "Lecture protégée, écran noir pendant la vidéo",
    keywords:
      "lecture protegee ecran noir image noire pause capture ecran enregistrement filigrane nom numero fenetre onglet " +
      "حماية الفيديو شاشة سوداء توقف تسجيل الشاشة لقطة شاشة اسم ورقم العضوية",
    body:
      "Les formations à PV sont protégées : votre numéro et votre nom se déplacent doucement sur la vidéo, et l'image devient noire (la vidéo se met en pause) dès que vous quittez la fenêtre, changez d'onglet ou appuyez sur une touche de capture d'écran. Revenez simplement sur la page pour continuer. " +
      "Cette protection décourage la copie mais ne peut pas empêcher une personne de filmer son écran avec un autre téléphone : le nom affiché permet de retrouver l'origine d'une fuite. Merci de ne pas partager ces vidéos.",
  },
  {
    id: "site-video-probleme",
    title: "La vidéo ne se lance pas ou coupe",
    keywords:
      "video ne charge pas ne se lance pas coupe lag lent bug erreur chargement bientot disponible reessayer connexion internet " +
      "الفيديو لا يعمل لا يشتغل يتقطع بطيء خطأ تحميل قريبا اعادة المحاولة الانترنت",
    body:
      "Si la vidéo ne charge pas : vérifiez votre connexion (le Wi-Fi est préférable, une vidéo est lourde), rechargez la page, puis utilisez le bouton « Réessayer » s'il apparaît. Le message « Vidéo bientôt disponible » signifie que l'équipe n'a pas encore ajouté la vidéo de cette formation. " +
      "Si le problème continue, écrivez à l'équipe avec le bouton « Contacter l'équipe » en précisant la formation et votre téléphone.",
  },
  {
    id: "site-parcours",
    title: "Mon parcours : étapes, niveaux et badges",
    keywords:
      "parcours etapes progression niveau niveaux badge badges mon parcours prochaine etape anneau " +
      "مساري المسار خطوات مستوى مستويات شارات الشارات تقدم الخطوة التالية",
    body:
      "Mon parcours propose des étapes choisies pour votre rang (compléter son profil, suivre des formations, utiliser des scripts, réserver un live), avec une barre de progression, vos points, votre niveau et vos badges. " +
      "Niveaux : Nouveau (0), Explorateur (100 points), Bâtisseur (250), Leader (500), Mentor (1000). Badges : Profil complet, Premier pas (1 formation terminée), Studieux (5), Bien équipé (3 scripts), Communicant (10 scripts), Prêt pour le live (1 place réservée), Régulier (3 lives réservés).",
  },
  {
    id: "site-points",
    title: "Comment gagner des points",
    keywords:
      "points gagner comment score classement pts points gagnes " +
      "نقاط كيف اربح النقاط اكتساب النقاط",
    body:
      "Profil complété (nom et ville) : +20 points. Formation marquée comme terminée : +30 chacune. Script de la boîte à outils copié : +5 par script différent. Place réservée à un live : +10. " +
      "Les points sont calculés automatiquement à partir de ce que vous faites ; ils ne s'achètent pas et ne remplacent pas les PV Ultimate (qui servent à débloquer des formations).",
  },
  {
    id: "site-classement",
    title: "Le classement des membres",
    keywords: "classement leaderboard rang top apparaitre visible nom classement ترتيب الترتيب لوحة الصدارة الظهور",
    body:
      "Le classement du parcours est facultatif : seuls les membres qui l'ont accepté y apparaissent. Pour apparaître (ou disparaître) : Mon compte, carte « Mon profil », option d'affichage dans le classement. Il montre votre nom, votre ville et vos points.",
  },
  {
    id: "site-objectif",
    title: "L'objectif du mois (suivi de ses PV)",
    keywords:
      "objectif du mois objectif pv suivi barre progression jours restants cible but mensuel " +
      "هدف الشهر هدفي هدف نقاط تتبع شريط التقدم الايام المتبقية",
    body:
      "La carte « Mon objectif du mois » (dans Mon compte et Mon parcours) vous permet de fixer le nombre de PV visé ce mois-ci, puis de noter les PV déjà faits : une barre se remplit, avec les PV restants, les jours restants du mois et la prochaine formation que vous pourriez demander. " +
      "C'est un suivi personnel : il ne débloque rien. Pour débloquer une formation, faites une demande sur sa page. Le mois suivant repart à zéro (le résultat du mois passé reste affiché en petit).",
  },
  {
    id: "site-inviter",
    title: "Inviter des amis : lien personnel et QR code",
    keywords:
      "inviter invitation parrainer lien qr code partager whatsapp ami nouveau membre filleul recruter " +
      "دعوة دعوة الاصدقاء رابط رمز qr مشاركة واتساب صديق عضو جديد ادعو ادعوا ارسل رابط الدعوة صديقي",
    body:
      "Menu de votre compte, « Inviter » : vous avez un lien personnel et un QR code (téléchargeable en image). Envoyez le lien par WhatsApp (un message prêt est proposé), ou montrez le QR code à quelqu'un pour qu'il le scanne avec l'appareil photo de son téléphone. " +
      "Quand la personne crée son compte avec votre lien, vous recevez une notification et vous la retrouvez dans la liste « Inscrits avec votre lien ». Cette liste n'est visible que par vous.",
  },
  {
    id: "site-groupes",
    title: "Les groupes de discussion",
    keywords:
      "groupe groupes discussion chat creer groupe inviter code membre accepter refuser admin amis messagerie " +
      "مجموعة مجموعات محادثة انشاء مجموعة دعوة كود العضوية قبول رفض مشرف اصدقاء",
    body:
      "Dans Groupes, vous pouvez créer jusqu'à 5 groupes d'amis (50 personnes au maximum par groupe) et inviter des membres avec leur CODE MEMBRE ; la personne invitée reçoit une notification et accepte ou refuse. Le créateur est l'admin : il invite, renomme, retire des personnes ou supprime le groupe ; les autres peuvent quitter le groupe. " +
      "La discussion se met à jour toute seule toutes les quelques secondes. Vous pouvez supprimer vos propres messages.",
  },
  {
    id: "site-messages-vocaux",
    title: "Les messages vocaux dans les groupes",
    keywords:
      "message vocal vocaux audio micro microphone enregistrer voix parler note vocale " +
      "رسالة صوتية رسائل صوتية تسجيل صوت ميكروفون صوت",
    body:
      "Dans un groupe, quand la zone de texte est vide, le bouton micro permet d'enregistrer un message vocal (3 minutes au maximum) : appuyez, parlez, puis envoyez (la corbeille annule). Le navigateur demande l'autorisation d'utiliser le micro la première fois. " +
      "Les messages vocaux se lisent sur tous les téléphones. Si le bouton micro n'apparaît pas, la fonction n'est pas encore activée sur le site.",
  },
  {
    id: "site-lives",
    title: "Lives, calendrier et réservation",
    keywords:
      "live lives direct calendrier agenda reserver place reservation rappel zoom heure alger en direct bandeau " +
      "لايف بث مباشر تقويم موعد حجز مكان تذكير توقيت الجزائر",
    body:
      "Les pages Lives et Calendrier présentent les rendez-vous annoncés (heure d'Alger). Vous pouvez réserver votre place, puis l'ajouter à l'agenda de votre téléphone. Quand un live est en cours, un bandeau « EN DIRECT » apparaît sur le site. " +
      "Certains lives sont à accès réservé : l'équipe donne l'accès aux membres un par un. La salle de live interactive est en cours de préparation.",
  },
  {
    id: "site-boite-outils",
    title: "La boîte à outils : messages prêts à envoyer",
    keywords:
      "boite a outils scripts messages prets modeles prospecter relancer objection copier prenom contact whatsapp " +
      "صندوق الادوات رسائل جاهزة نصوص نموذج مراسلة نسخ اسم الشخص",
    body:
      "La boîte à outils contient des messages prêts à copier, en français et en arabe, pour prospecter, relancer, répondre aux objections et accompagner son équipe. Saisissez le prénom de votre contact : il remplace [Prénom] dans le message ; puis copiez et envoyez. " +
      "Chaque script différent copié rapporte 5 points. Les messages sont écrits pour rester honnêtes, simples et respectueux : adaptez-les à votre façon de parler.",
  },
  {
    id: "site-contact-equipe",
    title: "Contacter l'équipe",
    keywords:
      "contacter equipe contact support aide message probleme question bouton flottant repondre coach " +
      "تواصل الفريق اتصال مساعدة رسالة مشكلة سؤال زر الدردشة",
    body:
      "Quand vous êtes connecté, un bouton rond « Contacter l'équipe » est en bas de chaque page : il ouvre une conversation avec l'équipe (texte, 2000 caractères maximum). Les réponses apparaissent sur ce même bouton, avec un compteur de réponses non lues. " +
      "Pour une question que cet assistant ne peut pas régler (compte, déblocage refusé, information officielle d'Ultimate), c'est le bon chemin.",
  },
  {
    id: "site-notifications",
    title: "Notifications et alertes sur le téléphone",
    keywords:
      "notification notifications cloche alerte push telephone activer prevenir " +
      "اشعارات اشعار الجرس تنبيه تفعيل الهاتف",
    body:
      "La cloche en haut de la page affiche vos notifications (déblocage accepté, nouveau message, invitation…). Pour les recevoir aussi sur votre téléphone quand le site est fermé : Mon compte, carte « Sur votre téléphone », bouton d'activation, puis acceptez la demande du navigateur. " +
      "Sur iPhone, ajoutez d'abord le site à l'écran d'accueil (voir « Installer l'application »), sinon les alertes ne sont pas disponibles.",
  },
  {
    id: "site-installer-app",
    title: "Installer le site comme une application",
    keywords:
      "installer application app ecran d'accueil raccourci telephone android iphone pwa icone " +
      "تثبيت التطبيق الشاشة الرئيسية اندرويد ايفون ايقونة اضافة اثبت ثبت التطبيق على الهاتف",
    body:
      "Android (Chrome) : menu ⋮, puis « Installer l'application » ou « Ajouter à l'écran d'accueil ». iPhone (Safari) : bouton Partager, puis « Sur l'écran d'accueil ». L'icône s'ouvre ensuite comme une application, sans barre d'adresse.",
  },
  {
    id: "site-apparence-langue",
    title: "Mode sombre, taille du texte et langue",
    keywords:
      "mode sombre dark clair theme taille texte police grand gros lisible langue arabe francais traduire apparence " +
      "الوضع الداكن مظلم فاتح حجم الخط النص كبير اللغة العربية الفرنسية المظهر",
    body:
      "Le bouton soleil/lune en haut de la page (et la carte « Apparence » dans Mon compte) permet de choisir le thème Clair, Sombre ou Auto (celui du téléphone), et la taille du texte : normale, grande ou très grande. Votre choix est gardé sur cet appareil. " +
      "Le bouton « العربية / Français » en haut change la langue du site entier ; en arabe, la page s'affiche de droite à gauche.",
  },
  {
    id: "site-profil",
    title: "Mon profil : photo, nom, ville",
    keywords:
      "profil photo nom ville avatar modifier informations compte " +
      "الملف الشخصي صورة اسم مدينة تعديل معلومات حسابي",
    body:
      "Dans Mon compte, carte « Mon profil » : ajoutez une photo (carrée, de votre visage de préférence), votre nom complet et votre ville. Compléter le profil rapporte 20 points. Vous pouvez aussi y choisir d'apparaître ou non dans le classement. Votre e-mail, téléphone, code Ultimate et rang sont affichés à droite.",
  },
  {
    id: "site-rangs",
    title: "Les rangs Consultant, Manager, Senior Manager, Director",
    keywords:
      "rang grade titre consultant manager senior manager director changer rang promotion " +
      "رتبة مستوى مستشار مدير مدير اول ديريكتور تغيير الرتبة",
    body:
      "Vous choisissez votre rang Ultimate à l'inscription (Consultant, Manager, Senior Manager, Director). Il sert à adapter les étapes de Mon parcours. Pour le faire changer après une promotion, contactez l'équipe avec le bouton « Contacter l'équipe ».",
  },
  {
    id: "site-limites-assistant",
    title: "Cet assistant : ce qu'il sait et ses limites",
    keywords:
      "assistant ia intelligence artificielle robot chatbot limite questions par jour fiable se tromper " +
      "المساعد الذكاء الاصطناعي روبوت حد الاسئلة اليومية يخطئ",
    body:
      "Je suis une IA : je réponds à partir des informations de la plateforme, de bonnes pratiques de marketing de réseau et du catalogue des produits Ultimate, et je peux me tromper. Pour les informations officielles d'Ultimate (plan de rémunération, prix, règles) ou les problèmes de compte, l'équipe fait foi. " +
      "Le nombre de questions par jour est limité (affiché sous la zone de saisie).",
  },
];
