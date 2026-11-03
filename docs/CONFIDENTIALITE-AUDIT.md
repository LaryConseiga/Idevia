# Idevia — Failles de confidentialité au 3 novembre 2026

Ce document dresse l'inventaire des failles de confidentialité d'Idevia à cette date, avec une étude des règles et des conditions des prestataires. Il complète le projet de politique de confidentialité ([POLITIQUE-CONFIDENTIALITE.md](POLITIQUE-CONFIDENTIALITE.md)).

**Méthode**
- J'ai relu le code (schéma de la base, envois aux modèles d'IA, rappels, journaux) et la page « Ta vie privée » publiée.
- J'ai comparé l'ensemble aux conditions publiées par chaque prestataire et aux recommandations de la CNIL.

**Légende**

Gravité :
- 🔴 critique : un engagement non tenu ou une obligation non respectée ;
- 🟠 importante ;
- 🟡 à améliorer.

Statut :
- ✅ corrigé le 3 novembre 2026 ;
- 🔧 action de ta part, sans code ;
- ❓ décision à prendre.

---

## Synthèse

| N° | Faille | Gravité | Statut |
|---|---|---|---|
| F1 | L'offre gratuite de Gemini est utilisée pour des utilisateurs européens, alors que les conditions de Google l'interdisent | 🔴 | ❓ |
| F2 | Le responsable du traitement n'est pas identifié | 🔴 | 🔧 |
| F3 | Mistral (offre gratuite) peut entraîner ses modèles sur les données envoyées | 🟠 | 🔧 |
| F4 | Groq garde des journaux jusqu'à 30 jours, aux États-Unis | 🟠 | 🔧 |
| F5 | OpenRouter (modèles gratuits) : certains hébergeurs peuvent entraîner leurs modèles | 🟠 | ❓ |
| F6 | Titres d'idées, nom du projet, étapes du plan, hypothèses et ville stockés en clair | 🟠 | ✅ code en ligne · 🔧 données existantes à rechiffrer |
| F7 | Adresses IP et identifiants de compte en clair chez Upstash et dans les sessions | 🟠 | ✅ code en ligne · 🔧 sessions existantes à pseudonymiser |
| F8 | Le journal des modèles d'IA reste lié au compte sans limite de durée | 🟠 | ✅ |
| F9 | Des données expirées ne sont jamais supprimées (marché, sessions, liens de connexion) | 🟡 | ✅ |
| F10 | La page publiée contient des affirmations inexactes | 🟠 | ✅ dans le projet de politique, à publier après ta relecture |
| F11 | Transferts hors UE non vérifiés (Groq, Upstash), région Upstash inconnue | 🟠 | 🔧 |
| F12 | Email et prénom en clair dans la base | 🟡 | ❓ |
| F13 | Les réponses libres peuvent contenir des données sensibles ou des noms de tiers | 🟡 | ❓ |
| F14 | Âge minimum absent de la politique | 🟡 | ✅ dans le projet |
| F15 | Accords de traitement (DPA) avec les prestataires non formalisés | 🟠 | 🔧 |
| F16 | Pas de registre des traitements | 🟡 | 🔧 |
| F17 | Obligations des pays africains (déclaration, transferts) non examinées | 🟠 | ❓ |
| F18 | Stockage dans le navigateur non mentionné (thème, installation) | 🟡 | ✅ dans le projet |

---

## Détail

### F1 · 🔴 Gemini : offre gratuite interdite pour les utilisateurs européens

**Le constat.** Les conditions de l'API Gemini, en vigueur depuis le 23 mars 2026, disent : « *You may use only Paid Services when making API Clients available to users in the European Economic Area, Switzerland, or the United Kingdom.* » Autrement dit, seule l'offre payante est permise pour servir des utilisateurs de l'EEE, de Suisse ou du Royaume-Uni.

Sur l'offre gratuite, Google se sert des contenus pour améliorer ses modèles, et des personnes peuvent les relire.

**Dans Idevia.** Gemini, en version Flash et Flash Lite, est partout :
- la génération et la rédaction des idées ;
- le rapport terrain ;
- le portrait ;
- les changements d'idée ;
- le relais du coach.

Une partie du public est en France, en Belgique et en Suisse. **C'est un manquement aux conditions de Google**, et les données de ces personnes peuvent servir à entraîner ses modèles.

**Options :**
- **A, sans coût.** Pour une personne dont le pays est dans l'EEE, en Suisse ou au Royaume-Uni (connu dès le diagnostic), on retire Gemini des chaînes de modèles. Il reste Groq, avec la conservation zéro activée (voir F4), et Mistral, avec l'entraînement désactivé (voir F3). Les idées seront un peu moins bien rédigées pour ces personnes.
- **B, petit coût.** On active la facturation Gemini (paiement à l'usage) pour ces personnes seulement. Sur l'offre payante, Google n'utilise pas les données pour entraîner ses modèles.
- **C, recommandé.** On fait A tout de suite, puis B quand le budget le permet.

Une précision : avant le diagnostic, Idevia ne connaît pas le pays de la personne. Les premières questions de l'entretien passent par Groq, ce qui est déjà le cas aujourd'hui.

### F2 · 🔴 Responsable du traitement non identifié

La page publiée affiche « [à compléter] ». Or le RGPD (article 13) exige l'identité et les coordonnées du responsable.

Ce qu'il te faut :
- un nom ou une raison sociale ;
- une adresse postale ;
- une adresse email de contact (idevia00@gmail.com convient).

Les mentions légales demandent aussi le ou la responsable de la publication.

### F3 · 🟠 Mistral : entraînement possible sur l'offre gratuite

Mistral indique que tu peux t'opposer à tout moment à l'utilisation de tes données. Ses pages ne disent pas clairement ce qui se passe par défaut sur l'offre gratuite. Pour en être sûr, il vaut mieux désactiver l'option toi-même.

**Action, 2 minutes :** dans la console Mistral, ouvre Admin, puis Privacy, et désactive « Anonymous improvement data ».

### F4 · 🟠 Groq : journaux conservés jusqu'à 30 jours

Groq ne garde pas les données des requêtes par défaut, mais des journaux peuvent être conservés jusqu'à 30 jours, pour le dépannage ou la lutte contre les abus, dans Google Cloud aux États-Unis. Chaque client peut activer la conservation zéro (ZDR).

**Action :** dans la console Groq, ouvre Data Controls et active Zero Data Retention. Les traitements par lots et l'affinage de modèles sont alors désactivés, mais Idevia ne s'en sert pas.

### F5 · 🟠 OpenRouter : certains hébergeurs de modèles gratuits peuvent entraîner leurs modèles

Selon une analyse récente (octobre 2026), environ la moitié des modèles gratuits d'OpenRouter sont servis par des hébergeurs qui se réservent ce droit.

OpenRouter permet d'exclure ces hébergeurs dans ses réglages de confidentialité. Mais chaque modèle gratuit n'a souvent qu'un seul hébergeur : l'exclure peut rendre le modèle indisponible.

**Proposition :** activer l'exclusion dans les réglages d'OpenRouter. Si le dernier recours ne fonctionne plus, retirer OpenRouter des chaînes, car il ne sert qu'en tout dernier secours.

### F6 · 🟠 Textes personnels en clair dans la base · ✅ corrigé

**Avant :**
- le titre et l'accroche des idées ;
- le nom du projet ;
- le titre, la description et le résultat attendu des étapes du plan ;
- les hypothèses de la vérification terrain ;
- la ville du profil.

Tous ces textes étaient stockés en clair. Ils sont pourtant propres à la personne : son projet, sa ville.

**Maintenant :** ils sont chiffrés en AES-256-GCM, comme le reste. Les rappels déchiffrent le titre de l'étape au moment d'écrire l'email, et uniquement à ce moment-là. Le code est en ligne.

**🔧 Reste à faire, une fois :** chiffrer les données déjà en base, avec la commande suivante :
```
npm run db:seal              # essai : affiche ce qui serait chiffré
npm run db:seal -- --apply   # chiffre
```

### F7 · 🟠 Adresses IP et identifiants de compte · ✅ corrigé

**Avant :**
- Upstash, qui sert à limiter les abus, recevait l'adresse IP en clair et l'identifiant du compte dans ses clés ;
- les sessions de connexion gardaient l'adresse IP en clair pendant 30 jours.

**Maintenant :**
- Upstash ne reçoit plus qu'un pseudonyme, calculé avec la clé de chiffrement d'Idevia (HMAC). Il est impossible de remonter à l'adresse sans cette clé.
- Les sessions ne gardent que ce pseudonyme.

Les sessions existantes sont converties par la même commande `npm run db:seal -- --apply`.

### F8 · 🟠 Journal des modèles d'IA lié au compte sans limite · ✅ corrigé

Le journal note, pour chaque appel à un modèle, le compte, la date, le modèle et le nombre de mots. Il ne contient aucun contenu.

Désormais, il ne reste lié au compte que pendant le mois en cours, le temps de calculer le quota du coach. Il devient ensuite anonyme, lors de la purge de chaque nuit.

### F9 · 🟡 Données expirées jamais supprimées · ✅ corrigé

La page annonçait « données de marché : 30 jours », mais rien ne les supprimait. La purge de chaque nuit supprime maintenant :
- les données de marché expirées, sauf celles citées comme sources dans une vérification terrain ;
- les sessions expirées ;
- les liens de connexion expirés.

### F10 · 🟠 Affirmations inexactes sur la page publiée · ✅ dans le projet

| La page dit | La réalité |
|---|---|
| « Tes idées, ton plan… sont chiffrés » | C'était vrai seulement en partie. Depuis F6, c'est vrai, à l'exception des statuts, dates, scores et types d'activité. |
| Resend : « États-Unis » | L'envoi se fait depuis l'Irlande (eu-west-1). Resend est une société américaine, certifiée au cadre UE–États-Unis. |
| « Données de marché : 30 jours » | Elles n'étaient pas supprimées. Corrigé par F9. |
| — | Rien sur les réactions aux idées, les commentaires, la réserve d'idées, le journal des modèles ni les pseudonymes d'adresse IP |

### F11 · 🟠 Transferts hors UE non vérifiés

| Prestataire | Lieu | Cadre UE–États-Unis | À faire |
|---|---|---|---|
| Vercel | Francfort (fra1), société américaine | Certifié, selon Vercel | Rien |
| Resend | Irlande, société américaine | Certifié depuis mars 2025, selon Resend | Rien |
| Neon | Francfort (aws-eu-central-1) | — | Rien |
| Groq | États-Unis | Non trouvé dans mes recherches | Vérifier sur dataprivacyframework.gov, sinon s'appuyer sur les clauses types de son accord de traitement (DPA) |
| Upstash | Région inconnue | Non trouvé | Vérifier la région dans la console Upstash, et son DPA de janvier 2025 |
| Google (Gemini) | États-Unis | Google est certifié | Voir F1 |
| OpenRouter | États-Unis | Non vérifié | Voir F5 |

### F12 · 🟡 Email et prénom en clair

L'email sert à se connecter : il faut pouvoir le retrouver tel quel. Le chiffrer obligerait à remplacer le fonctionnement de Better Auth, ce qui est risqué.

Le prénom, lui, pourrait être chiffré, mais Better Auth le renvoie au navigateur à chaque page. Le gain est faible pour un travail important.

Aujourd'hui, ces deux données sont protégées autrement :
- la base est chiffrée sur disque chez Neon ;
- elle n'est accessible qu'au serveur ;
- l'administration n'affiche que l'email et les dates.

**Proposition :** les laisser ainsi et le dire clairement dans la politique.

### F13 · 🟡 Réponses libres : données sensibles ou noms de tiers

L'entretien ne pose aucune question sensible. Mais une personne peut écrire d'elle-même, par exemple : « je suis malade », « ma sœur Awa ».

Avant l'envoi aux modèles, Idevia masque déjà les emails, les numéros de téléphone et les liens. En revanche, il ne masque ni les noms ni les informations de santé.

**Proposition :** ajouter sous le premier champ libre la phrase « N'écris pas d'informations sur ta santé, tes opinions ou d'autres personnes ». Elle est aussi dans le projet de politique.

### F14 · 🟡 Âge minimum

Les conditions d'utilisation fixent un âge minimum de 16 ans, ou l'accord d'un parent, mais la politique de confidentialité n'en parle pas. Le projet l'ajoute.

(Pour information, Google exige 18 ans pour le développeur qui utilise l'API Gemini, c'est-à-dire toi, pas pour tes utilisateurs.)

### F15 · 🟠 Accords de traitement (DPA)

L'article 28 du RGPD exige un contrat avec chaque sous-traitant. Chez la plupart des prestataires, ce contrat est intégré aux conditions d'utilisation et s'accepte en ligne : Vercel, Neon, Resend, Upstash et Groq.

**Action :** pour chacun, télécharge le DPA ou note sa version, et garde-le dans un dossier. C'est ce qu'on te demandera en cas de contrôle.

### F16 · 🟡 Registre des traitements

Idevia traite des données de façon régulière. Le registre de l'article 30 du RGPD est donc attendu, même pour une petite structure. Les sections « Données », « Pourquoi » et « Durées » du projet de politique en forment déjà la base.

**Action :** remplir le modèle de registre simplifié de la CNIL, environ 30 minutes.

### F17 · 🟠 Pays africains

Plusieurs pays d'Afrique francophone ont leur propre loi et leur propre autorité de protection des données, par exemple :
- le Burkina Faso : loi n° 001-2021/AN, CIL ;
- la Côte d'Ivoire : ARTCI ;
- le Sénégal : CDP.

Ces lois prévoient souvent une déclaration préalable, et une autorisation pour les transferts hors du pays, quand le responsable du traitement y est établi.

**Décision :** tout dépend du pays où l'éditeur d'Idevia est établi (voir F2). S'il est établi en Afrique de l'Ouest, il faudra probablement déclarer le traitement à l'autorité nationale. Un avis juridique local est recommandé.

### F18 · 🟡 Stockage dans le navigateur · ✅ dans le projet

Idevia garde dans le navigateur, et non dans des cookies :
- ton choix de thème clair ou sombre ;
- le fait d'avoir refusé l'installation de l'appli.

Ces informations ne quittent pas ton appareil. Le projet les mentionne.

---

## Étude externe : ce qu'il faut retenir

1. **Gemini.** L'offre gratuite est réservée aux utilisateurs hors EEE, Suisse et Royaume-Uni. Les données envoyées servent à l'amélioration des produits de Google et peuvent être relues par des personnes. Sur l'offre payante, elles ne servent pas à l'entraînement. ([conditions de l'API Gemini](https://aistudio.google.com/docs/terms), en vigueur depuis le 23 mars 2026)
2. **Groq.** Il ne conserve pas les données d'inférence par défaut. Il garde des journaux jusqu'à 30 jours, dans Google Cloud aux États-Unis, et propose la conservation zéro (ZDR) en libre-service. ([Groq, « Your Data »](https://console.groq.com/docs/your-data))
3. **Mistral.** Il permet de s'opposer à l'utilisation des données des appels à son API, depuis Admin, puis Privacy. ([aide Mistral](https://help.mistral.ai/en/articles/455207-can-i-opt-out-of-my-input-or-output-data-being-used-for-training))
4. **OpenRouter.** Une partie des modèles gratuits est servie par des hébergeurs qui peuvent entraîner leurs modèles sur les données. ([analyse TrueFoundry, octobre 2026](https://www.truefoundry.com/fr/blog/openrouter-free-models-whats-actually-free-and-what-it-costs-you))
5. **CNIL.** En février 2025, elle a publié des recommandations sur l'information des personnes et l'exercice de leurs droits face à l'IA. Il faut expliquer simplement quelles données partent vers quels modèles et à quelles fins, et faciliter l'accès et l'effacement. ([CNIL, IA et RGPD](https://www.cnil.fr/fr/ia-et-rgpd-la-cnil-publie-ses-nouvelles-recommandations))
6. **Transferts.** Vercel et Resend sont certifiés au cadre UE–États-Unis. ([Vercel](https://vercel.com/kb/guide/is-vercel-certified-under-dpf), [Resend](https://resend.com/changelog/data-privacy-framework-certification)) Pour Upstash, le DPA de janvier 2025 encadre les transferts entre régions. ([DPA Upstash](https://upstash.com/trust/dpa.pdf)) Je n'ai trouvé aucune certification pour Groq ni pour Upstash.
7. **Burkina Faso.** La loi n° 001-2021/AN du 30 mars 2021 a remplacé celle de 2004. La CIL y contrôle aussi la collecte de données de citoyens depuis l'étranger. ([texte de loi, Assemblée nationale](https://assembleenationale.bf/storage/Loi/kDsWHXOTUCQFVESChh8BlBdiZnCrdTsOpXe1rzmH.pdf))

> Je ne suis pas juriste. Ce document repère les écarts et les risques, mais ne remplace pas un avis juridique, surtout pour F1, F2 et F17.
