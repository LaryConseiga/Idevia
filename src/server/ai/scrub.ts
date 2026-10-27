/**
 * Pseudonymisation avant envoi à un fournisseur tiers :
 * les emails, numéros de téléphone et liens saisis par l'utilisateur ne quittent pas nos serveurs.
 */

// Numéros par paires (« 70 12 34 56 », « +226 70123456 », « +33 6 12 34 56 78 », « 0470 12 34 56 »)
// mais pas les montants (« 1 500 000 FCFA », « 12 000 € »).
const PHONE =
  /(?<!\d)(?:\+\d{2,3}[\s.-]?(?:\(0\))?\d?[\s.-]?)?(?:\d{2}[\s.-]?){3,4}\d{2}(?!\d)(?!\s*(?:fcfa|cfa|f\b|francs?|xof|xaf|€|euros?|chf|\$|dollars?))/gi;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const URL = /https?:\/\/\S+/gi;

export function scrubPersonalData(text: string): string {
  return text.replace(EMAIL, "[email]").replace(URL, "[lien]").replace(PHONE, "[téléphone]");
}
