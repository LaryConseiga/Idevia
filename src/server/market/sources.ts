import { z } from "zod";
import { scrubPersonalData } from "@/server/ai/scrub";

/**
 * Signaux de marché (docs/ARCHITECTURE.md §5.3) : une liste blanche d'actors Apify, et pour chacun
 * la construction de l'entrée et la réduction de la sortie à des agrégats publics.
 * Aucune coordonnée (téléphone, site, adresse précise, e-mail) n'est conservée.
 * Module pur : testé sans réseau.
 */

export type SourceKind = "local_competition" | "search_demand" | "ads";

export type SignalQuery = {
  /** Ce qu'on tape sur Google Maps pour trouver un concurrent (« couturière »). */
  maps: string;
  /** Ce qu'un client taperait sur Google. */
  search: string;
  /** Deux ou trois mots pour la bibliothèque publicitaire de Meta. */
  ads: string;
  countryCode: string;
  /** Nom du pays : Google Maps géolocalise bien mieux « Abidjan, Côte d'Ivoire » que « Abidjan, CI ». */
  countryName: string;
  city: string | null;
};

type Spec<P> = {
  kind: SourceKind;
  actor: string;
  /** Coût estimé d'un run, en dollars (tarifs Apify relevés le 27/10/2026). */
  estimatedCostUsd: number;
  query: (q: SignalQuery) => string;
  input: (q: SignalQuery) => Record<string, unknown>;
  normalize: (items: unknown[], q: SignalQuery) => P;
  sourceUrl: (q: SignalQuery) => string;
  limits: string;
};

// ---------------------------------------------------------------- Google Maps

const placeSchema = z.object({
  title: z.string(),
  categoryName: z.string().nullish(),
  totalScore: z.number().nullish(),
  reviewsCount: z.number().nullish(),
  neighborhood: z.string().nullish(),
  permanentlyClosed: z.boolean().nullish(),
});

export type MapsPayload = {
  count: number;
  rated: number;
  averageRating: number | null;
  totalReviews: number;
  categories: { name: string; count: number }[];
  places: { name: string; category: string | null; rating: number | null; reviews: number; area: string | null }[];
};

const MAPS_PLACES = 20;

export const maps: Spec<MapsPayload> = {
  kind: "local_competition",
  // L'extracteur (1 Go) reste dans les délais là où le crawler complet (4 Go) dépasse souvent 2 minutes.
  actor: "compass~google-maps-extractor",
  estimatedCostUsd: MAPS_PLACES * 0.005 + 0.001,
  query: (q) => `${q.maps} · ${q.city}`,
  input: (q) => ({
    searchStringsArray: [q.maps],
    locationQuery: `${q.city}, ${q.countryName}`,
    maxCrawledPlacesPerSearch: MAPS_PLACES,
    language: "fr",
    skipClosedPlaces: true,
  }),
  normalize: (items) => {
    const places = items.flatMap((i) => {
      const p = placeSchema.safeParse(i);
      return p.success && !p.data.permanentlyClosed ? [p.data] : [];
    });
    const rated = places.filter((p) => typeof p.totalScore === "number" && (p.reviewsCount ?? 0) > 0);
    const categories = new Map<string, number>();
    for (const p of places) if (p.categoryName) categories.set(p.categoryName, (categories.get(p.categoryName) ?? 0) + 1);
    return {
      count: places.length,
      rated: rated.length,
      averageRating: rated.length
        ? Math.round((rated.reduce((sum, p) => sum + p.totalScore!, 0) / rated.length) * 10) / 10
        : null,
      totalReviews: places.reduce((sum, p) => sum + (p.reviewsCount ?? 0), 0),
      categories: [...categories].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
      places: places
        .sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0))
        .slice(0, 8)
        .map((p) => ({
          name: p.title.slice(0, 80),
          category: p.categoryName ?? null,
          rating: p.totalScore ?? null,
          reviews: p.reviewsCount ?? 0,
          area: p.neighborhood?.slice(0, 60) ?? null,
        })),
    };
  },
  sourceUrl: (q) => `https://www.google.com/maps/search/${encodeURIComponent(`${q.maps} ${q.city}`)}`,
  limits:
    "Google Maps ne recense pas tous les commerces, surtout l'informel : le nombre réel de concurrents est souvent plus élevé.",
};

// ---------------------------------------------------------------- Recherche Google

const serpSchema = z.object({
  relatedQueries: z.array(z.object({ title: z.string() })).nullish(),
  peopleAlsoAsk: z.array(z.object({ question: z.string() })).nullish(),
  paidResults: z.array(z.unknown()).nullish(),
  organicResults: z
    .array(z.object({ title: z.string(), url: z.string(), description: z.string().nullish() }))
    .nullish(),
});

export type SearchPayload = {
  related: string[];
  questions: string[];
  adsCount: number;
  results: { title: string; domain: string; url: string; snippet: string | null }[];
};

const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

export const search: Spec<SearchPayload> = {
  kind: "search_demand",
  actor: "apify~google-search-scraper",
  estimatedCostUsd: 0.005,
  query: (q) => q.search,
  input: (q) => ({
    queries: q.search,
    countryCode: q.countryCode.toLowerCase(),
    languageCode: "fr",
    maxPagesPerQuery: 1,
    resultsPerPage: 10,
  }),
  normalize: (items) => {
    const pages = items.flatMap((i) => {
      const p = serpSchema.safeParse(i);
      return p.success ? [p.data] : [];
    });
    const unique = (list: string[]) => [...new Map(list.map((s) => [s.toLowerCase(), s])).values()];
    return {
      related: unique(pages.flatMap((p) => p.relatedQueries?.map((r) => r.title) ?? [])).slice(0, 8),
      questions: unique(pages.flatMap((p) => p.peopleAlsoAsk?.map((r) => r.question) ?? [])).slice(0, 5),
      adsCount: pages.reduce((sum, p) => sum + (p.paidResults?.length ?? 0), 0),
      results: pages
        .flatMap((p) => p.organicResults ?? [])
        .flatMap((r) => {
          const domain = domainOf(r.url);
          // Les liens internes de Google (carte, images) ne sont pas des concurrents.
          if (!domain || domain === "google.com" || !/^https?:/.test(r.url)) return [];
          return [{ title: r.title.slice(0, 120), domain, url: r.url.slice(0, 300), snippet: r.description ? scrubPersonalData(r.description).slice(0, 200) : null }];
        })
        .slice(0, 8),
    };
  },
  sourceUrl: (q) =>
    `https://www.google.com/search?q=${encodeURIComponent(q.search)}&gl=${q.countryCode.toLowerCase()}&hl=fr`,
  limits: "Une seule page de résultats, vue depuis le pays visé : elle montre qui est visible, pas le volume de recherche.",
};

// ---------------------------------------------------------------- Publicités Meta

const adSchema = z.object({
  page_name: z.string().nullish(),
  start_date_formatted: z.string().nullish(),
  ad_library_url: z.string().nullish(),
  snapshot: z
    .object({
      title: z.string().nullish(),
      body: z.object({ text: z.string().nullish() }).nullish(),
    })
    .nullish(),
});

export type AdsPayload = {
  count: number;
  advertisers: number;
  ads: { advertiser: string; text: string; since: string | null; url: string | null }[];
};

export const ads: Spec<AdsPayload> = {
  kind: "ads",
  actor: "curious_coder~facebook-ads-library-scraper",
  estimatedCostUsd: 30 * 0.00075 + 0.001,
  query: (q) => q.ads,
  input: (q) => ({
    urls: [{ url: adsLibraryUrl(q) }],
    count: 30,
  }),
  normalize: (items) => {
    const list = items.flatMap((i) => {
      const a = adSchema.safeParse(i);
      return a.success && a.data.page_name ? [a.data] : [];
    });
    const seen = new Set<string>();
    const unique = list.filter((a) => {
      const key = `${a.page_name}|${a.snapshot?.body?.text?.slice(0, 60)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return {
      count: unique.length,
      advertisers: new Set(unique.map((a) => a.page_name)).size,
      ads: unique.slice(0, 10).map((a) => ({
        advertiser: a.page_name!.slice(0, 80),
        text: scrubPersonalData([a.snapshot?.title, a.snapshot?.body?.text].filter(Boolean).join(" · ").replace(/\s+/g, " ")).slice(0, 220),
        since: a.start_date_formatted?.slice(0, 10) ?? null,
        url: a.ad_library_url?.startsWith("https://www.facebook.com/ads/library/") ? a.ad_library_url : null,
      })),
    };
  },
  sourceUrl: (q) => adsLibraryUrl(q),
  limits:
    "Annonces actives trouvées par mots-clés : certaines peuvent être hors sujet, et les vendeurs qui ne font pas de publicité n'y figurent pas.",
};

function adsLibraryUrl(q: SignalQuery) {
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${q.countryCode.toUpperCase()}&q=${encodeURIComponent(q.ads)}&search_type=keyword_unordered`;
}

export const SOURCES = { local_competition: maps, search_demand: search, ads } as const;

/** Les concurrents proches n'ont de sens que pour une idée qui vend près de chez soi ou dans son pays. */
export function sourcesFor(reach: string | null, city: string | null): SourceKind[] {
  const local = (reach === "local" || reach === "national") && Boolean(city);
  return local ? ["local_competition", "search_demand", "ads"] : ["search_demand", "ads"];
}

const normalizeText = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Clé du cache partagé : même source, même requête, même lieu = même signal pendant 30 jours. */
export function cacheKeyOf(kind: SourceKind, q: SignalQuery): string {
  const spec = SOURCES[kind];
  return [spec.actor, normalizeText(spec.query(q)), q.countryCode.toUpperCase(), normalizeText(q.city ?? "")].join("|");
}
