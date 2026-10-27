import { describe, expect, it, vi } from "vitest";
import { emptyProfile } from "@/server/diagnostic/profile";
import type { IdeaContent } from "@/server/ideas/schemas";
import { FieldCheckError, runFieldCheck, stripCitations, type CollectedSignal } from "@/server/market/field-check";
import { ads, cacheKeyOf, maps, search, sourcesFor, type SignalQuery } from "@/server/market/sources";
import { periodEndDay, tasksFromIdea } from "@/server/projects/tasks";

vi.mock("server-only", () => ({}));

const query: SignalQuery = { maps: "couturière", search: "tenue mère fille wax", ads: "couture wax", countryCode: "CI", countryName: "Côte d'Ivoire", city: "Abidjan" };

describe("sources de marché", () => {
  it("Google Maps : ne garde que des agrégats, jamais de téléphone ni d'adresse", () => {
    const payload = maps.normalize(
      [
        { title: "Atelier Awa", categoryName: "Tailleur", totalScore: 4.6, reviewsCount: 40, neighborhood: "Cocody", phone: "+225 07 00 00 00", street: "Rue 12" },
        { title: "Kiki couture", categoryName: "Tailleur", totalScore: 4, reviewsCount: 2, neighborhood: "Marcory" },
        { title: "Sans avis", categoryName: "Magasin de vêtements", totalScore: null, reviewsCount: null },
        { title: "Fermé", permanentlyClosed: true },
      ],
      query,
    );
    expect(payload.count).toBe(3);
    expect(payload.rated).toBe(2);
    expect(payload.averageRating).toBe(4.3);
    expect(payload.categories[0]).toEqual({ name: "Tailleur", count: 2 });
    expect(payload.places[0].name).toBe("Atelier Awa");
    expect(JSON.stringify(payload)).not.toMatch(/225|Rue 12/);
  });

  it("Recherche Google : écarte les liens internes de Google et masque les numéros", () => {
    const payload = search.normalize(
      [
        {
          relatedQueries: [{ title: "Tenue mère fille wax" }, { title: "tenue mère fille wax" }, { title: "Robe wax cérémonie" }],
          peopleAlsoAsk: [{ question: "Où acheter du wax à Abidjan ?" }],
          paidResults: [{}, {}],
          organicResults: [
            { title: "Etsy", url: "https://www.etsy.com/fr/market/x", description: "Appelez le 07 07 07 07 07" },
            { title: "Carte", url: "https://www.google.com/search?q=x" },
          ],
        },
      ],
      query,
    );
    expect(payload.related).toEqual(["tenue mère fille wax", "Robe wax cérémonie"]);
    expect(payload.adsCount).toBe(2);
    expect(payload.results).toHaveLength(1);
    expect(payload.results[0].domain).toBe("etsy.com");
    expect(payload.results[0].snippet).not.toMatch(/07 07/);
  });

  it("Publicités Meta : dédoublonne et ne garde que les liens de la bibliothèque publicitaire", () => {
    const ad = { page_name: "Bandama", start_date_formatted: "2026-10-09 07:00:00", ad_library_url: "https://www.facebook.com/ads/library/?id=1", snapshot: { body: { text: "Ensembles wax" } } };
    const payload = ads.normalize([ad, ad, { ...ad, page_name: "Autre", ad_library_url: "https://evil.example" }], query);
    expect(payload.count).toBe(2);
    expect(payload.advertisers).toBe(2);
    expect(payload.ads[0].since).toBe("2026-10-09");
    expect(payload.ads[1].url).toBeNull();
  });

  it("choisit les sources selon la portée de l'idée", () => {
    expect(sourcesFor("local", "Abidjan")).toContain("local_competition");
    expect(sourcesFor("online", "Lyon")).not.toContain("local_competition");
    expect(sourcesFor("national", null)).not.toContain("local_competition");
  });

  it("partage le cache entre requêtes équivalentes", () => {
    expect(cacheKeyOf("search_demand", query)).toBe(cacheKeyOf("search_demand", { ...query, search: "  Tenue MÈRE fille  wax " }));
    expect(cacheKeyOf("search_demand", query)).not.toBe(cacheKeyOf("search_demand", { ...query, countryCode: "SN" }));
  });
});

const content: IdeaContent = {
  title: "Tenues assorties en wax",
  hook: "Des familles assorties.",
  summary: "Tu couds des ensembles assortis parent-enfant.",
  whyYou: "Tu couds depuis huit ans.",
  offer: { what: "Ensembles", forWhom: "Jeunes mamans", price: "25 000 FCFA", where: "Abidjan" },
  numbers: { startBudget: "60 000 FCFA", timePerWeek: "12 h", firstGoal: "5 commandes" },
  plan: [
    { period: "Jours 1 à 3", title: "Montrer", story: "Couds deux ensembles.", milestone: "Deux photos" },
    { period: "Jours 4 à 10", title: "Tester", story: "Envoie les photos.", milestone: "Cinq avis" },
    { period: "Semaine 3", title: "Vendre", story: "Prends des acomptes.", milestone: "Trois commandes" },
    { period: "Fin du mois", title: "Livrer", story: "Livre.", milestone: "Premier client payant" },
  ],
  todayAction: "Liste dix mamans de ton réseau.",
  watchouts: [],
};

describe("plan en tâches", () => {
  it("lit la fin de chaque période", () => {
    expect(periodEndDay("Jours 4 à 10", 1)).toBe(10);
    expect(periodEndDay("Semaine 3", 2)).toBe(21);
    expect(periodEndDay("Fin du mois", 3)).toBe(28);
    expect(periodEndDay("Jours 25 à 45", 4)).toBe(30);
  });

  it("commence par l'action du jour, puis une tâche datée par étape", () => {
    const list = tasksFromIdea(content, new Date("2026-10-27T15:00:00Z"));
    expect(list.map((t) => [t.title, t.dueDate])).toEqual([
      ["Ta première action", "2026-10-27"],
      ["Montrer", "2026-10-29"],
      ["Tester", "2026-11-05"],
      ["Vendre", "2026-11-16"],
      ["Livrer", "2026-11-23"],
    ]);
    expect(list[1].expectedResult).toBe("Deux photos");
  });
});

describe("vérification terrain", () => {
  const state = emptyProfile();
  state.slots.market = { value: { countryCode: "CI", country: "Côte d'Ivoire", city: "Abidjan", scope: "national" }, confidence: 3, source: "user" };
  const idea = { title: content.title, summary: content.summary, offer: content.offer, reach: "national" as const };

  const signal = (kind: CollectedSignal["kind"]): CollectedSignal => ({
    id: kind,
    kind,
    query: "q",
    sourceUrl: "https://example.org",
    limits: "limites",
    collectedAt: "2026-10-27T10:00:00.000Z",
    cached: kind === "ads",
    payload:
      kind === "local_competition"
        ? { count: 3, rated: 0, averageRating: null, totalReviews: 0, categories: [], places: [] }
        : kind === "search_demand"
          ? { related: ["tenue wax"], questions: [], adsCount: 0, results: [] }
          : { count: 0, advertisers: 0, ads: [] },
  });

  function fakeGenerate(reportOk = true) {
    return vi.fn(async (options: { schema: { parse: (v: unknown) => unknown }; maxTokens?: number }) => {
      if (options.maxTokens === 300) return { data: { maps: "couturière", search: "tenue wax", ads: "wax" }, provider: "groq_fast" as const, model: "m" };
      if (!reportOk) return null;
      const data = {
        headline: "Le terrain est prometteur.",
        demand: { level: "moyenne", text: "On cherche des tenues assorties." },
        competition: { level: "forte", text: "Beaucoup d'ateliers." },
        findings: [{ text: "Des recherches associées existent.", source: 2 }, { text: "Source inventée.", source: 9 }],
        angle: "Les délais.",
        hypotheses: [{ hypothesis: "Les mamans paient un acompte.", test: "Propose à dix mamans.", success: "Trois acomptes." }],
        caveat: "Données partielles.",
      };
      return { data: options.schema.parse(data), provider: "groq_reasoning" as const, model: "r" };
    });
  }

  it("collecte les signaux selon la portée, retire les sources inventées et n'estime que le coût hors cache", async () => {
    const collect = vi.fn(async (kind: CollectedSignal["kind"]) => signal(kind));
    const result = await runFieldCheck({ idea, state, generate: fakeGenerate() as never, collect, userId: "u1" });
    expect(collect).toHaveBeenCalledTimes(3);
    expect(result.report.findings).toHaveLength(1);
    expect(result.trace.estimatedCostUsd).toBeCloseTo(maps.estimatedCostUsd + search.estimatedCostUsd);
  });

  it("continue avec les sources disponibles, échoue proprement sans aucune", async () => {
    const partial = vi.fn(async (kind: CollectedSignal["kind"]) => {
      if (kind === "ads") throw new Error("down");
      return signal(kind);
    });
    const ok = await runFieldCheck({ idea, state, generate: fakeGenerate() as never, collect: partial, userId: "u1" });
    expect(ok.signals).toHaveLength(2);
    expect(ok.trace.sources.find((s) => s.kind === "ads")?.ok).toBe(false);

    const none = vi.fn(async () => {
      throw new Error("down");
    });
    await expect(runFieldCheck({ idea, state, generate: fakeGenerate() as never, collect: none, userId: "u1" })).rejects.toBeInstanceOf(
      FieldCheckError,
    );
  });

  it("retire les renvois de sources glissés dans le texte", () => {
    expect(stripCitations("Des acteurs établis comme Popcarte [1, 2]. Et Etsy [3].")).toBe("Des acteurs établis comme Popcarte. Et Etsy.");
  });

  it("refuse sans pays connu", async () => {
    await expect(
      runFieldCheck({ idea, state: emptyProfile(), generate: fakeGenerate() as never, collect: vi.fn(), userId: "u1" }),
    ).rejects.toMatchObject({ code: "no_location" });
  });
});
