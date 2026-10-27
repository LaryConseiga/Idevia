/** Pays francophones (Afrique, Europe, Amériques, océan Indien) et leur devise ISO 4217. */
export const COUNTRIES = [
  { code: "BJ", name: "Bénin", currency: "XOF" },
  { code: "BF", name: "Burkina Faso", currency: "XOF" },
  { code: "CI", name: "Côte d'Ivoire", currency: "XOF" },
  { code: "GW", name: "Guinée-Bissau", currency: "XOF" },
  { code: "ML", name: "Mali", currency: "XOF" },
  { code: "NE", name: "Niger", currency: "XOF" },
  { code: "SN", name: "Sénégal", currency: "XOF" },
  { code: "TG", name: "Togo", currency: "XOF" },
  { code: "CM", name: "Cameroun", currency: "XAF" },
  { code: "CF", name: "Centrafrique", currency: "XAF" },
  { code: "CG", name: "Congo", currency: "XAF" },
  { code: "GA", name: "Gabon", currency: "XAF" },
  { code: "GQ", name: "Guinée équatoriale", currency: "XAF" },
  { code: "TD", name: "Tchad", currency: "XAF" },
  { code: "CD", name: "RD Congo", currency: "CDF" },
  { code: "GN", name: "Guinée", currency: "GNF" },
  { code: "MG", name: "Madagascar", currency: "MGA" },
  { code: "BI", name: "Burundi", currency: "BIF" },
  { code: "RW", name: "Rwanda", currency: "RWF" },
  { code: "DJ", name: "Djibouti", currency: "DJF" },
  { code: "KM", name: "Comores", currency: "KMF" },
  { code: "MR", name: "Mauritanie", currency: "MRU" },
  { code: "MA", name: "Maroc", currency: "MAD" },
  { code: "TN", name: "Tunisie", currency: "TND" },
  { code: "DZ", name: "Algérie", currency: "DZD" },
  { code: "HT", name: "Haïti", currency: "HTG" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "BE", name: "Belgique", currency: "EUR" },
  { code: "CH", name: "Suisse", currency: "CHF" },
  { code: "LU", name: "Luxembourg", currency: "EUR" },
  { code: "MC", name: "Monaco", currency: "EUR" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "MU", name: "Maurice", currency: "MUR" },
  { code: "SC", name: "Seychelles", currency: "SCR" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];

export const countryByCode = (code: string | null | undefined) =>
  COUNTRIES.find((c) => c.code === code?.toUpperCase()) ?? null;

/** Libellé lisible d'une devise, tel qu'on l'écrit au quotidien (null si le pays est inconnu). */
export function currencyLabel(currency: string | null | undefined): string | null {
  if (!currency) return null;
  return ({ XOF: "FCFA", XAF: "FCFA", EUR: "€", CHF: "CHF", CAD: "$ CA" } as Record<string, string>)[currency] ?? currency;
}

/** « au Bénin », « en Côte d'Ivoire », « à Madagascar », « aux Comores ». */
export function inCountry(name: string): string {
  const special: Record<string, string> = {
    Madagascar: "à",
    Djibouti: "à",
    Monaco: "à",
    Maurice: "à",
    Comores: "aux",
    Seychelles: "aux",
    "RD Congo": "en",
    Haïti: "en",
    "Guinée-Bissau": "en",
  };
  const prep = special[name] ?? (/^[aeiouyéèê]/i.test(name) || /e$/.test(name) ? "en" : "au");
  return `${prep} ${name}`;
}
