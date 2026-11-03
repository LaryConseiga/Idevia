# Idevia — Nouveau flux des idées : de « bonne idée » à « je me vois la faire »

Proposition du 02/11/2026, après un test utilisateur.

## Pourquoi changer

Le testeur a trouvé les idées très bonnes, mais il ne se voyait pas les mettre en œuvre.

Le flux actuel est le suivant :

1. diagnostic ;
2. portrait validé ;
3. 3 idées ;
4. choix d'une idée ;
5. plan d'action.

À l'étape du choix, la personne n'a qu'un seul geste possible, « Je choisis cette idée ». Elle ne peut pas dire pourquoi une idée ne lui va pas. Idevia ne peut donc pas corriger le tir avant qu'elle abandonne.

Le nouveau flux ajoute deux choses : un moment où la personne **réagit** aux idées, et un moment où Idevia **ajuste** l'idée selon cette réaction. La personne ne valide une idée qu'une fois qu'elle se voit la faire.

## Solution retenue (03/11/2026) : réagir, puis puiser dans la réserve

L'objectif est de répondre au besoin du client sans sortir du budget zéro, c'est-à-dire sans multiplier les générations complètes.

**Le constat.** À chaque génération, deux modèles proposent 12 idées, un troisième les note, et on n'en garde que 3. Les 9 autres étaient jetées. Elles sont pourtant déjà notées et adaptées au profil de la personne.

**La solution, en trois temps :**

1. **Réactions aux idées.** La personne dit ce qu'elle pense de chaque idée. Aucun appel à un modèle d'IA.
2. **Réserve d'idées.** Les idées écartées mais bien notées sont gardées, chiffrées, avec le lot d'idées. Aucun appel à un modèle d'IA.
3. **Remplacement ou ajustement.** Selon la réaction, Idevia rédige une idée de la réserve ou une version ajustée de l'idée, en un seul appel, sur un modèle au quota large.

**Coût.** Une génération complète coûte plus de 15 appels : 12 propositions, la notation et 3 rédactions. Un remplacement en coûte un seul.

**Régénération complète.** La régénération complète ne sert plus qu'en dernier recours, quand la réserve ne suffit pas.

L'exploration des préférences est mise de côté, pour les raisons données plus bas.

## Le flux en six étapes

```
Diagnostic → Exploration des préférences → Génération → Sélection → Ajustement → Validation
```

| Étape | Ce que fait la personne | Ce que fait Idevia | Existe aujourd'hui ? |
|---|---|---|---|
| 1. Diagnostic | Répond à l'entretien adaptatif, valide son portrait | Construit le profil (`ProfileState`) | Oui |
| 2. Exploration des préférences | Dit ce qu'elle veut et ne veut pas faire | Ajoute ces préférences au profil, comme contraintes | Non |
| 3. Génération | Attend environ une minute | Propose 3 idées de natures différentes (`pipeline.ts`) | Oui |
| 4. Sélection | Réagit à chaque idée | Enregistre les réactions et décide de la suite | Non, il n'y a que le choix |
| 5. Ajustement | Lit l'idée retravaillée | Adapte l'idée selon la réaction : budget, compétences, angle | En partie (« Repenser », après le choix) |
| 6. Validation | Confirme qu'elle se voit la faire | Crée le projet et le plan d'action | Oui, c'est l'actuel « Je choisis cette idée » |

## Étape 2 : Exploration des préférences (mise de côté)

**Décision du 03/11/2026 : on ne la fait pas pour l'instant.** Trois raisons :

- **Elle répète le diagnostic.** L'entretien demande déjà le budget, le temps, les compétences et les envies.
- **Elle allonge l'attente.** Elle ajoute des écrans juste avant le moment fort, quand la personne découvre ses idées.
- **Les refus se disent mieux devant une idée concrète.** Les réactions de l'étape 4 donnent la même information, au bon moment.

À reconsidérer seulement si un même refus revient très souvent dans les réactions, par exemple plus de 40 % de « domaine ». Dans ce cas, une seule question ajoutée au diagnostic suffira.

La proposition initiale est conservée ci-dessous.

Le but est de connaître les refus **avant** de générer les idées, pour ne pas les découvrir après.

Après le portrait, la personne passe deux ou trois écrans courts, à choix multiples, avec un champ libre facultatif :

- **Façon de travailler** : seul ou en équipe, en ligne ou en face à face, au calme ou avec beaucoup de contact.
- **Domaines à éviter** : par exemple la cuisine, la vente, la technique ou le travail manuel.
- **Ce qui la freine aujourd'hui** : l'argent, le temps, les compétences, la peur de vendre ou le manque de confiance.

Contraintes :
- l'étape prend moins d'une minute et chaque question peut être passée ;
- les réponses enrichissent le profil existant, sans créer de nouveau questionnaire ;
- les domaines à éviter deviennent une **exclusion stricte** dans le prompt des générateurs ;
- les freins changent la façon dont l'idée est présentée : premier pas plus petit, budget plus bas.

## Étape 4 : Sélection, où l'utilisateur réagit

C'est la fonctionnalité la plus importante de ce changement.

Après avoir présenté les idées, Idevia demande :

> **« Parmi ces idées, laquelle pourrais-tu réellement envisager de développer ? »**

Chaque idée propose ces réactions :

| Réaction | Code | Ce qu'Idevia fait ensuite |
|---|---|---|
| Cette idée m'intéresse. | `interested` | Passe à l'ajustement, qui est facultatif, puis à la validation |
| L'idée est intéressante, mais pas pour moi. | `not_for_me` | Demande en une ligne ce qui bloque, puis propose un ajustement |
| Elle dépasse mon budget. | `budget` | Ajuste vers une version qui démarre avec moins d'argent |
| Elle nécessite des compétences que je n'ai pas. | `skills` | Ajuste vers une version sans cette compétence, ou avec un partenaire, ou avec un apprentissage court intégré au plan |
| Le domaine ne m'intéresse pas. | `domain` | Retient le domaine comme exclusion pour la suite. Pas d'ajustement de cette idée |

Une réaction propose aussi le choix global suivant :

| Réaction | Code | Ce qu'Idevia fait ensuite |
|---|---|---|
| Aucune de ces idées ne me correspond. | `none` | Demande ce qui manque, puis lance une nouvelle génération qui tient compte de toutes les réactions |

Dans tous les cas, la personne peut **expliquer librement ce qui ne lui convient pas**. Un champ texte facultatif, d'au plus 400 caractères, accompagne chaque réaction. C'est souvent là que se trouve l'information la plus utile, par exemple : « je n'ai pas de voiture », « je ne veux pas vendre à ma famille ».

### Règles d'interface

- La question s'affiche au-dessus des 3 idées.
- Les réactions apparaissent sur chaque carte d'idée et sur la fiche de l'idée (`/idees/[id]`).
- Les réactions sont des boutons larges, d'au moins 44 px de haut. Une seule réaction est possible par idée, et la personne peut la changer tant que l'idée n'est pas validée.
- Une seule réaction suffit : on n'oblige pas la personne à réagir aux 3 idées.
- Une idée verrouillée par l'offre Pro ne propose pas de réaction, puisque la personne ne la voit pas.
- La barre « Je choisis cette idée » reste en place jusqu'à l'écran de validation (étape 6).
- Le ton reste le même : tutoiement, aucun adjectif accordé au genre, aucun reproche (« pas de souci, on ajuste »).

### Données

Une nouvelle table `idea_reactions`, protégée par RLS comme les autres tables privées :

| Colonne | Type | Remarque |
|---|---|---|
| `id` | uuid | |
| `user_id` | text | Isolation par RLS |
| `idea_id` | uuid, nullable | Vide pour la réaction globale `none` |
| `batch_id` | uuid | Le lot d'idées concerné |
| `reason` | enum | `interested`, `not_for_me`, `budget`, `skills`, `domain`, `none` |
| `comment_enc` | text, nullable | Texte libre, **chiffré** comme les autres contenus personnels |
| `created_at`, `updated_at` | timestamptz | |

Une réaction au plus par idée, et une seule réaction globale par lot : contrainte unique sur (`batch_id`, `idea_id`), avec `NULLS NOT DISTINCT`.

### Réserve d'idées

La table `idea_batches` gagne une colonne `reserve_enc`, chiffrée.

- **Contenu :** les idées non retenues et non éliminées par le juge, avec leur note et l'avis du juge. On en garde 9 au plus, classées de la meilleure à la moins bonne.
- **Rédaction :** ces idées ne sont pas rédigées à l'avance. Elles le seront à la demande, à l'étape 5.
- **Suivi :** le nombre d'idées en réserve est noté dans le suivi du lot (`pipeline.reserve`).

Le texte libre est traité comme une donnée et jamais comme une instruction, comme le `<retour>` de `refine.ts`. Il passe par `scrubPersonalData` avant d'être envoyé à un modèle.

## Étape 5 : Ajustement

Le but est de transformer une réaction négative en une version de l'idée que la personne peut faire.

Deux possibilités, selon la réaction :

| Réaction | Réponse d'Idevia |
|---|---|
| `domain`, `not_for_me` | La meilleure idée de la réserve, d'un autre domaine que celui refusé, rédigée en un appel |
| `budget` | La même idée en version petit budget, ou une idée de la réserve qui démarre avec moins d'argent |
| `skills` | La même idée sans cette compétence, ou avec un partenaire, ou avec une courte formation |
| `none` | 3 idées de la réserve qui évitent ce qui a été refusé. Une nouvelle génération complète seulement si la réserve est vide, une fois par personne |

Ces rédactions passent par les modèles au quota large (gemini-flash-lite, groq), pas par Gemini Flash et ses 20 requêtes par jour.

Pour ajuster une idée elle-même :

- On réutilise `refine.ts`, qui sait déjà réécrire une fiche à partir d'un retour. On l'appelle **avant** la validation, sur l'idée proposée, alors qu'aujourd'hui il ne sert qu'après le choix.
- Le retour envoyé au modèle combine la réaction (`budget`, `skills`, etc.) et le commentaire libre.
- La fiche ajustée affiche en tête « Ce qui a changé » (le champ `changes`), puis la nouvelle version.
- La personne peut réagir de nouveau à la version ajustée, avec deux ajustements au plus par idée pour éviter les boucles.
- Le quota mensuel d'ajustements après validation (`IDEA_REFINES_MONTHLY_QUOTA`) reste séparé. Il ne faut pas pénaliser quelqu'un qui cherche encore son idée.

## Étape 6 : Validation

Le but est que la personne s'engage en connaissant les conditions.

Avant de créer le projet, Idevia résume trois choses en une phrase chacune, à partir de la fiche :

- **Budget de départ** : par exemple « environ 50 € ».
- **Temps par semaine** : par exemple « 5 heures ».
- **Premier pas, aujourd'hui** : l'action de moins de 30 minutes (`todayAction`).

Puis Idevia demande : **« Tu te vois commencer par ça cette semaine ? »**

- **« Oui, je me lance »** crée le projet et le plan. C'est le `chooseIdea` actuel, puis le passage au tableau de bord.
- **« Pas encore »** ramène à l'ajustement.

## Comment les réactions servent à la suite

- **Nouvelle génération** (réaction `none`) : les réactions du lot précédent sont résumées dans le prompt des générateurs. On y met les domaines exclus, le budget réel, les compétences absentes et les commentaires. On y ajoute la consigne de ne pas reproposer les mêmes idées.
- **Coach** : les réactions entrent dans sa mémoire, par exemple « a écarté la vente directe, budget limité ».
- **Administration** : nombre de comptes qui ont réagi et répartition des raisons. Ce sont des agrégats seulement : les commentaires restent privés et chiffrés. On saura ainsi si les idées échouent surtout sur le budget, les compétences ou le domaine.

## Contraintes du budget zéro

- Une nouvelle génération complète prend de 30 à 70 secondes et consomme le quota gratuit des modèles, dont 20 requêtes par jour chez Gemini. Il faut donc limiter la régénération à **une par lot**, puis passer par l'ajustement.
- Un ajustement est un seul appel de rédaction : il coûte bien moins qu'une génération.
- L'exploration des préférences n'appelle aucun modèle : ce sont des choix enregistrés directement.

## Mesures de succès

- Part des personnes qui valident une idée après avoir vu leurs idées : à comparer avec le taux de choix actuel.
- Part des idées validées après un ajustement.
- Part des projets dont la première tâche est cochée dans les 7 jours, ce qui indique que la personne se voit vraiment la faire.
- Répartition des raisons de refus, pour améliorer les prompts.

## Ordre de réalisation

1. **Réactions** : table `idea_reactions`, boutons de réaction, texte libre, répartition des raisons dans l'admin. Aucun appel à un modèle. *Fait le 03/11/2026.*
2. **Réserve** : les idées écartées sont gardées, chiffrées, avec chaque nouveau lot. Aucun appel à un modèle. *Fait le 03/11/2026.*
3. **Remplacement et ajustement** : rédaction à la demande d'une idée de la réserve, ou de l'idée ajustée avec `refine.ts`. Un seul appel par réaction. *Fait le 03/11/2026* (voir ci-dessous).
4. **Validation** : écran de confirmation (budget, temps, premier pas) avant `chooseIdea`.
5. **Nouvelle génération** avec les réactions, en dernier recours.
6. **Exploration des préférences** : seulement si les réactions le justifient (voir l'étape 2).

### Étape 3 telle que réalisée (03/11/2026)

- **Après une réaction négative**, la carte et la fiche de l'idée proposent :
  - « L'adapter à un petit budget » (`budget`), « L'adapter sans ces compétences » (`skills`) ou « La rapprocher de moi » (`not_for_me`). La même idée est réécrite avec `refine.ts` (`stage: "choice"`), à partir de la réaction et de la précision libre ;
  - « Une autre idée à la place », pour toutes les réactions négatives. La meilleure idée de la réserve d'une autre famille est rédigée à la même place dans le classement. Pour `domain`, elle est obligatoirement d'une autre nature.
- **« Aucune de ces idées ne me correspond »** propose « Me proposer d'autres idées ». Les idées encore modifiables sont remplacées par la réserve, les moins bien classées d'abord, en parallèle.
- **Après chaque changement**, la fiche affiche « Ce qui a changé ». La réaction à l'ancienne version est effacée, et l'idée utilisée est retirée de la réserve.
- **Limites** :
  - 2 changements au plus par idée ;
  - `IDEA_CHANGES_MONTHLY_QUOTA` changements par mois, 12 par défaut ;
  - jamais sur l'idée choisie ni sur une idée qui a porté un projet.
- **Modèles** : gemini-flash-lite d'abord, puis groq, puis Gemini Flash (`CHANGE_CHAIN`). Environ 6 à 30 secondes par changement.
- **Admin** : le nombre d'idées remplacées ou ajustées s'affiche dans « Activité ».
- **Code** : [`src/server/ideas/changes.ts`](../src/server/ideas/changes.ts) contient la partie pure ; `replaceIdea`, `adjustIdea` et `replaceAllIdeas` sont dans `service.ts`, et `applyIdeaChange` dans le DAL.

## Questions tranchées

- **Une réaction suffit-elle ?** Oui, on n'impose pas de réagir aux 3 idées.
- **Peut-on réagir à une idée verrouillée ?** Non, puisque la personne ne la voit pas.
- **Après « Aucune de ces idées ne me correspond » ?** On puise d'abord dans la réserve. La régénération complète n'arrive qu'ensuite.

## Questions ouvertes

- Combien d'idées de la réserve proposer après « Aucune » : 3 d'un coup, ou une à la fois ?
- Les lots générés avant la mise en place de la réserve n'en ont pas. Pour eux, « Aucune » mène directement à la régénération, dans la limite du quota.
