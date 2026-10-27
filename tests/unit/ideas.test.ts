import { describe, expect, it, vi } from "vitest";
import { emptyProfile } from "@/server/diagnostic/profile";
import { isLocked } from "@/server/ideas/access";
import { dedupe, IdeasPipelineError, runIdeasPipeline, select, weightedScore } from "@/server/ideas/pipeline";
import type { Candidate, IdeaContent, Judgement } from "@/server/ideas/schemas";

vi.mock("server-only", () => ({}));

const candidate = (title: string, family: string): Candidate => ({
  title,
  pitch: `${title} pour les gens du quartier.`,
  customer: "Les employés de bureau",
  offer: "Des repas",
  revenueModel: "Vente à l'unité",
  startCost: "50 000 FCFA",
  family,
  whyFit: "Tu cuisines bien.",
});

const judge = (index: number, value: number, family: string, eliminate = false): Judgement => ({
  index,
  skills: value,
  demand: value,
  resources: value,
  motivation: value,
  speed: value,
  risk: value,
  family,
  eliminate,
  note: "",
});

const content = (title: string): IdeaContent => ({
  title,
  hook: "Une idée qui te ressemble.",
  summary: "Tu prépares des repas et tu les livres aux bureaux du quartier.",
  whyYou: "Tu cuisines déjà pour ton entourage et on te réclame tes plats : c'est une clientèle qui t'attend.",
  offer: { what: "Repas du midi", forWhom: "Employés", price: "1 500 FCFA", where: "Bureaux de Ouaga 2000" },
  numbers: { startBudget: "environ 40 000 FCFA", timePerWeek: "10 h", firstGoal: "10 clients réguliers" },
  plan: [1, 2, 3, 4].map((n) => ({
    period: `Semaine ${n}`,
    title: `Étape ${n}`,
    story: "Tu fais goûter tes plats à cinq collègues et tu notes leurs retours sans rien dépenser.",
    milestone: "Cinq avis",
  })),
  todayAction: "Écris la liste des dix personnes qui t'ont déjà demandé tes plats.",
  watchouts: [{ risk: "Les impayés", answer: "Fais payer à la commande par mobile money." }],
});

describe("score et sélection", () => {
  it("calcule un score sur 100 à partir des six critères pondérés", () => {
    expect(weightedScore(judge(0, 10, "x"))).toBe(100);
    expect(weightedScore(judge(0, 5, "x"))).toBe(50);
  });

  it("garde 3 idées de familles différentes, classées de la plus à la moins pertinente", () => {
    const candidates = [
      candidate("Traiteur bureaux", "repas"),
      candidate("Plats livrés midi", "repas"),
      candidate("Jus de bissap", "boissons"),
      candidate("Cours de cuisine", "formation"),
      candidate("Épices en sachet", "transformation"),
    ];
    const { picked } = select(candidates, [
      judge(0, 9, "repas"),
      judge(1, 8.5, "repas"),
      judge(2, 7, "boissons"),
      judge(3, 6, "formation"),
      judge(4, 8, "transformation"),
    ]);
    expect(picked.map((p) => p.candidate.title)).toEqual(["Traiteur bureaux", "Épices en sachet", "Jus de bissap"]);
    expect(picked.map((p) => p.score)).toEqual([90, 80, 70]);
  });

  it("écarte les idées éliminées par le juge, même bien notées", () => {
    const candidates = [candidate("A", "a"), candidate("B", "b"), candidate("C", "c"), candidate("D", "d")];
    const { picked, eliminated } = select(candidates, [judge(0, 10, "a", true), judge(1, 7, "b"), judge(2, 6, "c"), judge(3, 5, "d")]);
    expect(picked.map((p) => p.candidate.title)).toEqual(["B", "C", "D"]);
    expect(eliminated).toBe(1);
  });

  it("complète avec la même famille s'il n'y a pas assez de diversité", () => {
    const candidates = [candidate("A", "repas"), candidate("B", "repas"), candidate("C", "repas")];
    expect(select(candidates, null).picked).toHaveLength(3);
  });

  it("fusionne les doublons proposés par les deux générateurs", () => {
    expect(dedupe([candidate("Livraison de repas aux bureaux", "x"), candidate("Repas livrés aux bureaux", "y")])).toHaveLength(1);
  });
});

describe("orchestration complète", () => {
  function fakeGenerate(overrides: { judgeFails?: boolean; writerFails?: boolean } = {}) {
    return vi.fn(async (options: { task: string; user: string }) => {
      const ok = <T,>(data: T) => ({ data, provider: "groq" as const, model: options.task });
      switch (options.task) {
        case "ideation":
          return ok({ ideas: [candidate("Traiteur bureaux", "repas"), candidate("Jus de bissap", "boissons"), candidate("Cours de cuisine", "formation")] });
        case "ideation_alt":
          return ok({ ideas: [candidate("Épices en sachet", "transformation"), candidate("Box repas abonnement", "abonnement")] });
        case "judge":
          return overrides.judgeFails
            ? null
            : ok({
                scores: [
                  judge(0, 6, "repas"),
                  judge(1, 9, "transformation"),
                  judge(2, 5, "boissons"),
                  judge(3, 8, "abonnement"),
                  judge(4, 4, "formation"),
                ],
              });
        case "plan": {
          if (overrides.writerFails) return null;
          const title = options.user.match(/n°\d sur 3 pour cette personne\) :\n([^.]+)\./)?.[1] ?? "?";
          return ok(content(title));
        }
      }
      return null;
    });
  }

  it("produit 3 idées classées avec leur plan, et trace les modèles utilisés", async () => {
    const generate = fakeGenerate();
    const { ideas, trace } = await runIdeasPipeline({ state: emptyProfile(), portrait: null, generate: generate as never, userId: "u1" });
    expect(ideas.map((i) => [i.rank, i.content.title])).toEqual([
      [1, "Épices en sachet"],
      [2, "Box repas abonnement"],
      [3, "Traiteur bureaux"],
    ]);
    expect(ideas[0].breakdown?.skills).toBe(90);
    expect(trace.candidates).toBe(5);
    expect(generate).toHaveBeenCalledTimes(2 + 1 + 3);
  });

  it("reste fonctionnelle sans juge (scores absents, ordre des générateurs)", async () => {
    const { ideas } = await runIdeasPipeline({
      state: emptyProfile(),
      portrait: null,
      generate: fakeGenerate({ judgeFails: true }) as never,
      userId: "u1",
    });
    expect(ideas).toHaveLength(3);
    expect(ideas[0].score).toBeNull();
  });

  it("échoue proprement si la rédaction n'aboutit pas", async () => {
    await expect(
      runIdeasPipeline({ state: emptyProfile(), portrait: null, generate: fakeGenerate({ writerFails: true }) as never, userId: "u1" }),
    ).rejects.toBeInstanceOf(IdeasPipelineError);
  });
});

describe("offre payante", () => {
  it("désactivée : tout est visible", () => {
    expect([1, 2, 3].map((r) => isLocked(r, "free", "off"))).toEqual([false, false, false]);
  });

  it("activée : un compte gratuit ne voit que la moins pertinente, un compte Pro voit tout", () => {
    expect([1, 2, 3].map((r) => isLocked(r, "free", "on"))).toEqual([true, true, false]);
    expect([1, 2, 3].map((r) => isLocked(r, "pro", "on"))).toEqual([false, false, false]);
  });
});
