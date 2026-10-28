import { COUNTRIES, countryByCode, currencyLabel } from "@/lib/countries";
import {
  confidenceOf,
  DIMENSIONS,
  REQUIRED,
  type Dimension,
  type ProfileState,
  type Slot,
  missingResources,
  type SlotUpdates,
} from "./profile";
import { UNSURE, type Answer, type Option, type Question } from "./question";

/**
 * Banque de secours : utilisée quand aucun modèle ne répond à temps (ou renvoie une sortie invalide).
 * Chaque question sait mettre à jour le profil sans modèle (`apply`), l'entretien ne bloque donc jamais.
 * Ce n'est pas le parcours normal : en temps normal, chaque question est générée à partir des réponses.
 */

type FallbackQuestion = Omit<Question, "id" | "allowOther" | "scale" | "placeholder" | "why"> &
  Partial<Pick<Question, "allowOther" | "scale" | "placeholder" | "why">> & {
    key: string;
    intent: Dimension;
    apply: (answer: Answer, state: ProfileState, question: Question) => SlotUpdates;
  };

const opts = (labels: string[]): Option[] => [
  ...labels.map((label, i) => ({ value: `f${i + 1}`, label })),
  { ...UNSURE },
];

const labelsOf = (q: Question, a: Answer) =>
  a.choices.filter((c) => c !== UNSURE.value).map((c) => q.options.find((o) => o.value === c)?.label ?? c);

const withOther = (q: Question, a: Answer) => [...labelsOf(q, a), ...(a.text ? [a.text] : [])];

function slot<D extends Dimension>(state: ProfileState, d: D): Slot<D>["value"] | null {
  return (state.slots[d] as Slot<D> | null)?.value ?? null;
}

/** Première question, fixe : ouverte, elle donne au modèle la matière pour personnaliser la suite. */
export const OPENING: FallbackQuestion = {
  key: "opening",
  intent: "motivations",
  kind: "text",
  options: [],
  prompt: "Pour commencer, raconte-moi avec tes mots : qu'est-ce qui te donne envie d'entreprendre en ce moment ?",
  placeholder: "Ex. : je veux un revenu à côté de mon travail, je cuisine bien et on me demande souvent mes plats…",
  why: "Ta réponse oriente toutes les questions suivantes : il n'y a pas de bonne ou de mauvaise réponse.",
  apply: (a) => ({ motivations: { value: { why: a.text.slice(0, 400), values: [] }, confidence: 1, source: "user" } }),
};

/** Un échantillon large : Afrique, Europe et Amérique francophones (« Autre » reste possible). */
const PICKED = ["CI", "SN", "CM", "BF", "BJ", "TG", "ML", "GN", "CD", "MA", "FR", "BE", "CH", "CA"];
const COUNTRY_OPTIONS = PICKED.map((code) => COUNTRIES.find((c) => c.code === code)!).map((c) => ({ value: c.code, label: c.name }));

const BANK: FallbackQuestion[] = [
  {
    key: "market-country",
    intent: "market",
    kind: "single",
    prompt: "Dans quel pays vis-tu aujourd'hui ?",
    why: "Pour parler dans ta monnaie et tenir compte des démarches de ton pays. Tes idées ne seront pas limitées à cet endroit.",
    options: [...COUNTRY_OPTIONS, { ...UNSURE }],
    allowOther: true,
    apply: (a, state) => {
      const country = countryByCode(a.choices[0]);
      const prev = slot(state, "market");
      return {
        market: {
          value: {
            ...prev,
            countryCode: country?.code ?? prev?.countryCode ?? null,
            country: country?.name ?? (a.text || prev?.country || null),
            city: prev?.city ?? null,
            scope: prev?.scope ?? null,
          },
          // Le terrain n'est clair qu'une fois connue aussi la portée visée (près de chez soi, en ligne…).
          confidence: (country || a.text) && prev?.scope ? 2 : 1,
          source: "user",
        },
      };
    },
  },
  {
    key: "market-scope",
    intent: "market",
    kind: "single",
    prompt: "Tes futurs clients, tu les imagines plutôt…",
    options: opts([
      "Près de chez moi",
      "Partout dans mon pays",
      "En ligne, n'importe où",
      "Entre deux pays (diaspora, import-export…)",
    ]),
    apply: (a, state) => {
      const scope =
        ({ f1: "local", f2: "national", f3: "online", f4: "cross_border" } as const)[a.choices[0] as "f1"] ?? null;
      const prev = slot(state, "market");
      return {
        market: {
          value: {
            countryCode: prev?.countryCode ?? null,
            country: prev?.country ?? null,
            city: a.text || prev?.city || null,
            scope,
          },
          confidence: Math.max(confidenceOf(state, "market"), 2),
          source: "user",
        },
      };
    },
  },
  {
    key: "goal-type",
    intent: "goal",
    kind: "single",
    prompt: "Aujourd'hui, ce projet serait plutôt…",
    options: opts(["Un complément de revenu", "Mon activité principale", "Une entreprise que je veux faire grandir"]),
    apply: (a, state) => ({
      goal: {
        value: {
          ...slot(state, "goal"),
          type: ({ f1: "complement", f2: "principal", f3: "scale" } as const)[a.choices[0] as "f1"] ?? "unsure",
        },
        confidence: 2,
        source: "user",
      },
    }),
  },
  {
    key: "skills",
    intent: "skills",
    kind: "multi",
    prompt: "Qu'est-ce que tu sais déjà bien faire ? Choisis tout ce qui te correspond.",
    options: opts([
      "Cuisine et transformation",
      "Couture, mode, beauté",
      "Informatique et numérique",
      "Vente et négociation",
      "Enseigner, former, expliquer",
      "Agriculture et élevage",
    ]),
    allowOther: true,
    apply: (a, state, q) => ({
      skills: {
        value: { items: withOther(q, a), experience: slot(state, "skills")?.experience ?? [] },
        confidence: 2,
        source: "user",
      },
    }),
  },
  {
    key: "interests",
    intent: "interests",
    kind: "multi",
    prompt: "Quels domaines t'attirent le plus ?",
    options: opts([
      "Alimentation et boissons",
      "Mode et beauté",
      "Agriculture",
      "Services en ligne",
      "Éducation",
      "Commerce et distribution",
    ]),
    allowOther: true,
    apply: (a, state, q) => ({
      interests: {
        value: { sectors: withOther(q, a), excluded: slot(state, "interests")?.excluded ?? [] },
        confidence: 2,
        source: "user",
      },
    }),
  },
  {
    key: "resources-budget",
    intent: "resources",
    kind: "single",
    prompt: "Combien pourrais-tu investir pour démarrer, sans te mettre en difficulté ?",
    options: [], // calculé selon la devise du pays (voir `materialize`)
    allowOther: true,
    apply: (a, state, q) => {
      const prev = slot(state, "resources");
      return {
        resources: {
          value: {
            budgetRange: labelsOf(q, a)[0] ?? (a.text || "à préciser"),
            hoursPerWeek: prev?.hoursPerWeek ?? null,
            assets: prev?.assets ?? [],
          },
          confidence: Math.max(confidenceOf(state, "resources"), 2),
          source: "user",
        },
      };
    },
  },
  {
    key: "resources-time",
    intent: "resources",
    kind: "single",
    prompt: "Combien d'heures par semaine peux-tu y consacrer ?",
    options: opts(["Moins de 5 heures", "5 à 10 heures", "10 à 20 heures", "Plus de 20 heures"]),
    allowOther: true,
    apply: (a, state) => {
      const prev = slot(state, "resources");
      // Réponse libre (« le week-end seulement ») : on garde un nombre s'il y en a un, sinon une estimation prudente.
      const typed = a.text ? Number(a.text.match(/\d+/)?.[0] ?? NaN) : NaN;
      const hours =
        ({ f1: 4, f2: 8, f3: 15, f4: 30 } as Record<string, number>)[a.choices[0]] ?? (Number.isFinite(typed) ? typed : a.text ? 6 : null);
      return {
        resources: {
          value: { budgetRange: prev?.budgetRange ?? null, hoursPerWeek: hours, assets: prev?.assets ?? [] },
          confidence: Math.max(confidenceOf(state, "resources"), 2),
          source: "user",
        },
      };
    },
  },
  {
    key: "resources-assets",
    intent: "resources",
    kind: "multi",
    prompt: "Qu'as-tu déjà sous la main pour te lancer ?",
    options: opts([
      "Un smartphone",
      "Un ordinateur",
      "Une moto ou une voiture",
      "Un local ou un espace chez moi",
      "Une machine ou des outils de métier",
      "Un terrain",
      "Rien de particulier pour l'instant",
    ]),
    allowOther: true,
    apply: (a, state, q) => {
      const prev = slot(state, "resources");
      return {
        resources: {
          value: { budgetRange: prev?.budgetRange ?? null, hoursPerWeek: prev?.hoursPerWeek ?? null, assets: withOther(q, a) },
          confidence: Math.max(confidenceOf(state, "resources"), 2),
          source: "user",
        },
      };
    },
  },
  {
    key: "motivations-values",
    intent: "motivations",
    kind: "multi",
    prompt: "Qu'est-ce qui compte le plus pour toi dans ce projet ?",
    options: opts([
      "Être libre de mon temps",
      "Gagner en sécurité financière",
      "Être utile à ma communauté",
      "Créer quelque chose à moi",
      "Transmettre un savoir-faire",
    ]),
    allowOther: true,
    apply: (a, state, q) => ({
      motivations: {
        value: { why: slot(state, "motivations")?.why ?? null, values: withOther(q, a) },
        confidence: 2,
        source: "user",
      },
    }),
  },
  {
    key: "preferences-channel",
    intent: "preferences",
    kind: "single",
    prompt: "Tu te vois plutôt vendre…",
    options: opts(["En ligne (WhatsApp, réseaux sociaux…)", "En direct, sur le terrain", "Un peu des deux"]),
    apply: (a, state, q) => ({
      preferences: {
        value: { ...slot(state, "preferences"), channel: labelsOf(q, a)[0] ?? null },
        confidence: 2,
        source: "user",
      },
    }),
  },
  {
    key: "preferences-sales",
    intent: "preferences",
    kind: "scale",
    prompt: "Aller vers des inconnus pour leur proposer ton offre, ça te met à l'aise ?",
    options: [],
    scale: { min: "Pas du tout", max: "Tout à fait" },
    apply: (a, state) => ({
      preferences: {
        value: { ...slot(state, "preferences"), salesComfort: a.scale },
        confidence: Math.max(confidenceOf(state, "preferences"), 2),
        source: "user",
      },
    }),
  },
  {
    key: "constraints",
    intent: "constraints",
    kind: "text",
    options: [],
    prompt: "Y a-t-il quelque chose qui pourrait te freiner (temps, famille, lieu, matériel…) ?",
    placeholder: "Ex. : je ne peux travailler que le soir, je n'ai pas de local…",
    apply: (a) => ({ constraints: { value: { items: [a.text.slice(0, 140)] }, confidence: 2, source: "user" } }),
  },
];

const BUDGETS: Record<string, string[]> = {
  FCFA: ["Moins de 50 000 FCFA", "50 000 à 250 000 FCFA", "250 000 à 1 000 000 FCFA", "Plus de 1 000 000 FCFA"],
  "€": ["Moins de 500 €", "500 à 2 000 €", "2 000 à 10 000 €", "Plus de 10 000 €"],
  CHF: ["Moins de 500 CHF", "500 à 2 000 CHF", "2 000 à 10 000 CHF", "Plus de 10 000 CHF"],
  "$ CA": ["Moins de 750 $ CA", "750 à 3 000 $ CA", "3 000 à 15 000 $ CA", "Plus de 15 000 $ CA"],
};

function budgetOptions(state: ProfileState): Option[] {
  const unit = currencyLabel(countryByCode(state.slots.market?.value.countryCode)?.currency);
  if (unit && BUDGETS[unit]) return opts(BUDGETS[unit]);
  return opts(["Presque rien", "Un petit budget", "Un budget moyen", "Un budget important"]);
}

/** Transforme une entrée de la banque en question affichable. */
export function materialize(entry: FallbackQuestion, id: string, state: ProfileState): Question {
  return {
    id,
    intent: entry.intent,
    prompt: entry.prompt,
    kind: entry.kind,
    options: entry.key === "resources-budget" ? budgetOptions(state) : entry.options,
    allowOther: entry.allowOther ?? false,
    scale: entry.scale ?? null,
    placeholder: entry.placeholder ?? null,
    why: entry.why ?? null,
  };
}

/** Questions d'approfondissement : ce qui rend la personne unique, quand l'essentiel est déjà connu. */
const DEEPEN: FallbackQuestion[] = [
  {
    key: "deepen-proud",
    intent: "skills",
    kind: "text",
    options: [],
    prompt: "Raconte-moi une chose que tu as réussie et dont tu es fier ou fière, même petite.",
    placeholder: "Ex. : j'ai organisé le mariage de ma cousine, j'ai appris à coder un site par moi-même…",
    apply: (a, state) => ({
      skills: {
        value: {
          items: slot(state, "skills")?.items ?? [],
          experience: [...(slot(state, "skills")?.experience ?? []), a.text.slice(0, 140)],
        },
        confidence: Math.max(confidenceOf(state, "skills"), 2),
        source: "user",
      },
    }),
  },
  {
    key: "deepen-asked",
    intent: "skills",
    kind: "text",
    options: [],
    prompt: "Qu'est-ce que les gens autour de toi te demandent souvent de faire pour eux ?",
    placeholder: "Ex. : coiffer, réparer un téléphone, relire un CV, cuisiner pour une fête…",
    apply: (a, state) => ({
      skills: {
        value: { items: [...(slot(state, "skills")?.items ?? []), a.text.slice(0, 80)], experience: slot(state, "skills")?.experience ?? [] },
        confidence: Math.max(confidenceOf(state, "skills"), 2),
        source: "user",
      },
    }),
  },
  {
    key: "deepen-never",
    intent: "interests",
    kind: "text",
    options: [],
    prompt: "À l'inverse, qu'est-ce que tu ne voudrais surtout pas faire dans ton activité ?",
    apply: (a, state) => ({
      interests: {
        value: { sectors: slot(state, "interests")?.sectors ?? [], excluded: [...(slot(state, "interests")?.excluded ?? []), a.text.slice(0, 80)] },
        confidence: Math.max(confidenceOf(state, "interests"), 2),
        source: "user",
      },
    }),
  },
];

export const fallbackByKey = (key: string) =>
  key === OPENING.key ? OPENING : (BANK.find((q) => q.key === key) ?? DEEPEN.find((q) => q.key === key) ?? null);

export const pickDeepen = (askedKeys: string[]) => DEEPEN.find((q) => !askedKeys.includes(q.key)) ?? null;

/**
 * Choisit la prochaine question de secours : dimension indispensable la moins renseignée d'abord,
 * jamais deux fois la même question, jamais sur une dimension déjà suffisamment connue.
 */
const RESOURCE_KEYS = { budget: "resources-budget", time: "resources-time", assets: "resources-assets" } as const;

export function pickFallback(state: ProfileState, askedKeys: string[]): FallbackQuestion | null {
  const below = (d: Dimension) => (REQUIRED.includes(d) ? 0 : 1);
  // Les moyens restent à compléter tant que budget, temps et matériel ne sont pas tous connus : une question à la fois.
  const resourcesMissing = missingResources(state).filter((m) => !askedKeys.includes(RESOURCE_KEYS[m]));
  const order = DIMENSIONS.filter((d) => confidenceOf(state, d) < 2 || (d === "resources" && resourcesMissing.length > 0)).sort(
    (a, b) => below(a) - below(b) || confidenceOf(state, a) - confidenceOf(state, b),
  );
  for (const d of order) {
    if (d === "resources" && resourcesMissing.length) {
      const key = RESOURCE_KEYS[resourcesMissing[0]];
      return BANK.find((q) => q.key === key) ?? null;
    }
    const next = BANK.find((q) => q.intent === d && !askedKeys.includes(q.key));
    if (next) return next;
  }
  return null;
}
