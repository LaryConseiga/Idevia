import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createRouter, extractJson } from "@/server/ai/router";
import { ProviderError, type Provider, type ProviderId } from "@/server/ai/types";
import { scrubPersonalData } from "@/server/ai/scrub";
import { buildPortrait, MAX_TURNS, MIN_TURNS, nextTurn, openingQuestion } from "@/server/diagnostic/engine";
import { completeness, emptyProfile, requiredSatisfied } from "@/server/diagnostic/profile";
import type { HistoryItem } from "@/server/diagnostic/prompts";
import {
  answerSchema,
  answerToText,
  isForbidden,
  normalizeQuestion,
  validateAnswer,
  type Answer,
  type Question,
} from "@/server/diagnostic/question";

vi.mock("server-only", () => ({}));

const noModel = (async () => null) as Parameters<typeof nextTurn>[0]["generate"];
const answer = (a: Partial<Answer>): Answer => answerSchema.parse(a);

/** Simule un entretien complet en répondant toujours la première option (ou un texte). */
async function runInterview(generate: Parameters<typeof nextTurn>[0]["generate"]) {
  let state = emptyProfile();
  const history: HistoryItem[] = [];
  let question: Question | null = openingQuestion(state).question;
  while (question) {
    const a =
      question.kind === "text"
        ? answer({ text: "Je cuisine bien et on me demande souvent mes plats." })
        : question.kind === "scale"
          ? answer({ scale: 3 })
          : answer({ choices: [question.options[0].value] });
    history.push({ question, answer: answerToText(question, a) });
    const result = await nextTurn({ state, history, lastAnswer: a, generate });
    state = result.state;
    question = result.next?.question ?? null;
    if (history.length > MAX_TURNS) throw new Error("boucle infinie");
  }
  return { state, history };
}

describe("entretien sans modèle (repli déterministe)", () => {
  it("ne bloque jamais et s'arrête entre le minimum et le maximum de questions", async () => {
    const { state, history } = await runInterview(noModel);
    expect(history.length).toBeGreaterThanOrEqual(MIN_TURNS);
    expect(history.length).toBeLessThanOrEqual(MAX_TURNS);
    expect(requiredSatisfied(state)).toBe(true);
    expect(completeness(state)).toBeGreaterThan(55);
  });

  it("ne pose jamais deux fois la même question", async () => {
    const { history } = await runInterview(noModel);
    const ids = history.map((h) => h.question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("propose les budgets dans la devise du pays (euros en France)", async () => {
    let state = emptyProfile();
    state = { ...state, slots: { ...state.slots, market: { value: { countryCode: "FR", country: "France", city: null, scope: "online" }, confidence: 2, source: "user" } } };
    const { materialize, fallbackByKey } = await import("@/server/diagnostic/fallback");
    const q = materialize(fallbackByKey("resources-budget")!, "fb:resources-budget", state);
    expect(q.options[0].label).toBe("Moins de 500 €");
  });

  it("demande où sont les clients, pas seulement où vit la personne", async () => {
    const { history } = await runInterview(noModel);
    expect(history.map((h) => h.question.id)).toContain("fb:market-scope");
  });

  it("propose les montants en FCFA pour un pays de la zone franc", async () => {
    const { history } = await runInterview(noModel);
    const budget = history.find((h) => h.question.id === "fb:resources-budget");
    expect(budget?.question.options[0].label).toContain("FCFA");
  });

  it("produit un portrait factuel", async () => {
    const { state, history } = await runInterview(noModel);
    const portrait = await buildPortrait({ state, history, generate: noModel });
    expect(portrait.source).toBe("fallback");
    expect(portrait.headline).toContain("en Côte d'Ivoire");
    expect(portrait.summary).toContain("Je cuisine bien");
  });
});

describe("entretien piloté par le modèle", () => {
  it("applique l'analyse du modèle et pose sa question, avec « Je ne sais pas encore »", async () => {
    const generate = vi.fn(async () => ({
      provider: "groq_fast" as const,
      model: "test",
      data: {
        updates: {
          skills: { value: { items: ["cuisine"], experience: [] }, confidence: 2, source: "user" as const },
        },
        insights: ["On te réclame déjà tes plats."],
        contradictions: [],
        next: {
          intent: "market",
          prompt: "Tes plats, tu les vendrais plutôt où ?",
          kind: "single" as const,
          options: ["Au marché", "En livraison WhatsApp", "Au bureau"],
          allowOther: true,
          scale: null,
          placeholder: null,
          why: "Pour savoir où sont tes clients.",
        },
        done: false,
      },
    }));
    const state = emptyProfile();
    const q = openingQuestion(state).question;
    const a = answer({ text: "On me demande souvent mes plats." });
    const result = await nextTurn({
      state,
      history: [{ question: q, answer: answerToText(q, a) }],
      lastAnswer: a,
      generate: generate as never,
    });
    expect(result.next?.source).toBe("llm");
    expect(result.next?.question.prompt).toBe("Tes plats, tu les vendrais plutôt où ?");
    expect(result.next?.question.options.at(-1)?.label).toBe("Je ne sais pas encore");
    expect(result.state.slots.skills?.value.items).toEqual(["cuisine"]);
    expect(result.state.insights).toContain("On te réclame déjà tes plats.");
  });

  it("garde une réponse libre en attente quand le modèle échoue", async () => {
    const q: Question = {
      id: "q2",
      intent: "skills",
      prompt: "Raconte-moi ton dernier travail.",
      kind: "text",
      options: [],
      allowOther: false,
      scale: null,
      placeholder: null,
      why: null,
    };
    const a = answer({ text: "J'étais vendeuse au marché de Cocody." });
    const result = await nextTurn({
      state: emptyProfile(),
      history: [{ question: q, answer: answerToText(q, a) }],
      lastAnswer: a,
      generate: noModel,
    });
    expect(result.state.pending).toHaveLength(1);
    expect(result.next?.source).toBe("fallback");
  });

  it("refuse d'arrêter avant le minimum même si le modèle dit avoir fini", async () => {
    const generate = vi.fn(async () => ({
      provider: "groq_fast" as const,
      model: "t",
      data: { updates: {}, insights: [], contradictions: [], next: null, done: true },
    }));
    const state = emptyProfile();
    const q = openingQuestion(state).question;
    const a = answer({ text: "Je veux me lancer." });
    const result = await nextTurn({
      state,
      history: [{ question: q, answer: "Je veux me lancer." }],
      lastAnswer: a,
      generate: generate as never,
    });
    expect(result.next).not.toBeNull();
  });
});

describe("minimum de questions", () => {
  it("approfondit au lieu de conclure si tout est connu mais que le minimum n'est pas atteint", async () => {
    const full = emptyProfile();
    for (const d of Object.keys(full.slots) as (keyof typeof full.slots)[]) {
      (full.slots as Record<string, unknown>)[d] = { value: {}, confidence: 3, source: "user" };
    }
    const q = openingQuestion(full).question;
    const history = Array.from({ length: 5 }, (_, i) => ({ question: { ...q, id: `q${i}` }, answer: "réponse" }));
    const generate = vi.fn(async () => ({
      provider: "groq_fast" as const,
      model: "t",
      data: { updates: {}, insights: [], contradictions: [], next: null, done: true },
    }));
    const result = await nextTurn({ state: full, history, lastAnswer: answer({ text: "réponse" }), generate: generate as never });
    expect(result.next?.question.id).toMatch(/^fb:deepen-/);
  });
});

describe("garde-fous sur les questions", () => {
  it("rejette les questions sur des données sensibles", () => {
    expect(isForbidden("Quel âge as-tu ?")).toBe(true);
    expect(isForbidden("Quelle est ta religion ?")).toBe(true);
    expect(isForbidden("Es-tu mariée ?")).toBe(true);
    expect(isForbidden("Combien gagnes-tu par mois ?")).toBe(true);
  });

  it("autorise les secteurs qui contiennent des mots proches", () => {
    expect(isForbidden("Les vêtements pour enfants t'intéressent-ils ?")).toBe(false);
    expect(isForbidden("Le secteur santé et bien-être t'attire ?")).toBe(false);
  });

  it("normalise une question du modèle : options bornées, « je ne sais pas » unique", () => {
    const q = normalizeQuestion(
      {
        intent: "goal",
        prompt: "Tu vises quoi ?",
        kind: "multi",
        options: ["A", "B", "Je ne sais pas", "C", "D", "E", "F", "G", "H"],
        allowOther: null,
        scale: null,
        placeholder: null,
        why: null,
      },
      "q3",
    );
    expect(q?.options).toHaveLength(7);
    expect(q?.options.filter((o) => o.value === "unsure")).toHaveLength(1);
  });

  it("transforme en question libre une question à choix sans options", () => {
    const q = normalizeQuestion(
      { intent: "x", prompt: "Parle-moi de toi.", kind: "single", options: [], allowOther: null, scale: null, placeholder: null, why: null },
      "q4",
    );
    expect(q?.kind).toBe("text");
    expect(q?.intent).toBe("deepen");
  });

  it("refuse un choix qui n'existe pas dans la question posée", () => {
    const q = openingQuestion(emptyProfile()).question;
    const single: Question = { ...q, kind: "single", options: [{ value: "a", label: "A" }] };
    expect(validateAnswer(single, answer({ choices: ["pirate"] }))).toBe("Choix invalide.");
    expect(validateAnswer(single, answer({ choices: ["a"] }))).toBeNull();
  });
});

describe("pseudonymisation avant envoi au modèle", () => {
  it("masque aussi les numéros européens, sans toucher aux montants en euros", () => {
    const out = scrubPersonalData("Appelle-moi au +33 6 12 34 56 78 ou au 0470 12 34 56. Budget : 12 000 € ou 15 000 CHF.");
    expect(out).not.toMatch(/12 34 56/);
    expect(out).toContain("12 000 €");
    expect(out).toContain("15 000 CHF");
  });

  it("masque emails, téléphones et liens mais garde les montants", () => {
    const out = scrubPersonalData(
      "Écris-moi à awa.ouedraogo@mail.com ou au +226 70 12 34 56, voir https://x.com/awa. Budget : 1 500 000 FCFA.",
    );
    expect(out).not.toContain("awa.ouedraogo");
    expect(out).not.toContain("70 12 34 56");
    expect(out).not.toContain("https://");
    expect(out).toContain("1 500 000 FCFA");
  });
});

describe("routeur LLM", () => {
  const provider = (id: ProviderId, apiKey?: string): Provider => ({ id, url: "", model: `${id}-m`, apiKey });
  const providers = {
    groq_fast: provider("groq_fast", "k"),
    groq_reasoning: provider("groq_reasoning", "k"),
    cerebras: provider("cerebras"),
    mistral: provider("mistral"),
    gemini: provider("gemini", "k"),
    gemini_lite: provider("gemini_lite", "k"),
    openrouter: provider("openrouter", "k"),
  };
  const schema = z.object({ ok: z.literal(true) });

  it("passe au fournisseur suivant si la sortie est invalide, et trace chaque essai", async () => {
    const record = vi.fn<(usage: unknown) => Promise<void>>(async () => {});
    const call = vi
      .fn()
      .mockResolvedValueOnce({ content: "pas du json", inputTokens: 1, outputTokens: 1 })
      .mockResolvedValueOnce({ content: '```json\n{"ok": true}\n```', inputTokens: 5, outputTokens: 2 });
    const router = createRouter({ providers, call, record });
    const result = await router.generate({ task: "interview", system: "", user: "", schema, timeoutMs: 5000 });
    expect(result?.provider).toBe("gemini_lite"); // groq_fast renvoie du texte invalide, la voie suivante prend le relais
    expect(record).toHaveBeenCalledTimes(2);
    expect(record.mock.calls[0][0]).toMatchObject({ provider: "groq_fast", success: false, errorCode: "invalid_json" });
  });

  it("renvoie null quand tout échoue, puis ouvre le circuit du fournisseur défaillant", async () => {
    const call = vi.fn().mockRejectedValue(new Error("réseau"));
    const router = createRouter({ providers, call, record: async () => {} });
    for (let i = 0; i < 3; i++) {
      expect(await router.generate({ task: "interview", system: "", user: "", schema, timeoutMs: 5000 })).toBeNull();
    }
    call.mockClear();
    await router.generate({ task: "interview", system: "", user: "", schema, timeoutMs: 5000 });
    expect(call).not.toHaveBeenCalled();
  });

  it("patiente et réessaie le même modèle quand la limite de débit se lève dans quelques secondes", async () => {
    const sleep = vi.fn(async () => {});
    const call = vi
      .fn()
      .mockRejectedValueOnce(new ProviderError("rate_limited", 3, 429))
      .mockResolvedValueOnce({ content: '{"ok": true}', inputTokens: 1, outputTokens: 1 });
    const router = createRouter({ providers, call, record: async () => {}, sleep });
    const result = await router.generate({ task: "interview", system: "", user: "", schema, timeoutMs: 20000 });
    expect(sleep).toHaveBeenCalledWith(3000);
    expect(result?.provider).toBe("groq_fast");
  });

  it("passe à la voie suivante si l'attente annoncée est longue", async () => {
    const sleep = vi.fn(async () => {});
    const call = vi
      .fn()
      .mockRejectedValueOnce(new ProviderError("rate_limited", 60, 429))
      .mockResolvedValueOnce({ content: '{"ok": true}', inputTokens: 1, outputTokens: 1 });
    const router = createRouter({ providers, call, record: async () => {}, sleep });
    const result = await router.generate({ task: "interview", system: "", user: "", schema, timeoutMs: 20000 });
    expect(sleep).not.toHaveBeenCalled();
    expect(result?.provider).toBe("gemini_lite");
  });

  it("lit le délai annoncé par Gemini quand son quota journalier est épuisé", async () => {
    const { parseRetryDelay } = await import("@/server/ai/retry");
    expect(parseRetryDelay("Please retry in 19h49m56.19s.")).toBe(19 * 3600 + 49 * 60 + 57);
    expect(parseRetryDelay("Please retry in 2.5s")).toBe(3);
    expect(parseRetryDelay("autre chose")).toBeNull();
  });

  it("extrait le JSON même entouré de texte", () => {
    expect(extractJson('Voici : {"a": 1} merci')).toEqual({ a: 1 });
  });
});
