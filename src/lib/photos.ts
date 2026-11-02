import type { StaticImageData } from "next/image";
import beignets from "@/assets/photos/beignets.jpg";
import marche from "@/assets/photos/marche.jpg";
import maroquinerie from "@/assets/photos/maroquinerie.jpg";
import recolte from "@/assets/photos/recolte.jpg";
import reparation from "@/assets/photos/reparation.jpg";

/**
 * Photos du site public, toutes sous licence CC BY-SA 4.0 (Wikimedia Commons) : réutilisation libre,
 * y compris commerciale, à condition de citer l'auteur et la licence. Modifications : recadrage et compression.
 * Les crédits sont affichés en légende et repris dans les mentions légales.
 */

/** `focus` : point à garder visible quand la photo est recadrée (CSS object-position). */
export type Photo = { src: StaticImageData; alt: string; caption: string; author: string; source: string; focus?: string };

const BY_SA = "CC BY-SA 4.0";
export const PHOTO_LICENSE = { name: BY_SA, url: "https://creativecommons.org/licenses/by-sa/4.0/deed.fr" };

export const PHOTOS = {
  recolte: {
    src: recolte,
    alt: "Une commerçante éclate de rire derrière ses bassines d'arachides, au marché.",
    caption: "Vente d'arachides au marché",
    author: "4toscenethesis",
    source: "https://commons.wikimedia.org/wiki/File:An_Harvest_of_Joy.jpg",
    focus: "50% 20%",
  },
  maroquinerie: {
    src: maroquinerie,
    alt: "Des mains guident un sac en cuir noir sous l'aiguille d'une machine à coudre.",
    caption: "Maroquinerie au village artisanal de Soumbédioune, Dakar",
    author: "Wuzyprod",
    source: "https://commons.wikimedia.org/wiki/File:African_tailor_sewing_a_leather_bag.jpg",
  },
  reparation: {
    src: reparation,
    alt: "Un réparateur penché sur un téléphone ouvert, entouré d'appareils démontés.",
    caption: "Réparation de téléphones",
    author: "Karim Diarra",
    source: "https://commons.wikimedia.org/wiki/File:R%C3%A9parateur-d%C3%A9panneur_de_t%C3%A9l%C3%A9phones_mobiles_2.jpg",
  },
  beignets: {
    src: beignets,
    alt: "Un vendeur pousse sa charrette de beignets sur une plage de sable.",
    caption: "Vente de beignets, plage de Tonghor, Dakar",
    author: "Julien Saison",
    source: "https://commons.wikimedia.org/wiki/File:Vendeur_de_beignets,_plage_de_Tonghor,_Yoff,_Dakar,_S%C3%A9n%C3%A9gal.jpg",
  },
  marche: {
    src: marche,
    alt: "Une commerçante trie sa marchandise dans des paniers tressés, à son étal.",
    caption: "Commerce de rue",
    author: "Sanghesenegalafrica",
    source: "https://commons.wikimedia.org/wiki/File:Street_trader.jpg",
  },
} satisfies Record<string, Photo>;
