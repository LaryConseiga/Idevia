/**
 * Informations publiques du site et de l'éditeur.
 * Les champs à `null` doivent être complétés avant l'ouverture au public : les pages légales affichent
 * « à compléter » à leur place, pour qu'aucun oubli ne passe inaperçu.
 */
export const SITE = {
  name: "Idevia",
  /** Adresse de contact affichée sur le site (support, données personnelles). */
  contactEmail: process.env.CONTACT_EMAIL ?? null,
  /** Mis à jour à chaque changement des conditions ou de la politique de confidentialité. */
  legalUpdatedAt: "27 octobre 2026",
} as const;

export const PUBLISHER = {
  /** Nom de la personne ou raison sociale de l'entreprise qui édite Idevia. */
  name: null as string | null,
  /** Forme juridique, capital, numéro d'immatriculation (RCCM, SIREN, BCE…) s'il y a une société. */
  registration: null as string | null,
  address: null as string | null,
  /** Directeur ou directrice de la publication. */
  director: null as string | null,
  /** Pays dont le droit s'applique aux conditions d'utilisation. */
  governingLaw: null as string | null,
};

export const HOST = {
  name: "Vercel Inc.",
  address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  website: "https://vercel.com",
};
