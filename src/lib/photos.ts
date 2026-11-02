import type { StaticImageData } from "next/image";
import coiffure from "@/assets/photos/coiffure.jpg";
import foodTruck from "@/assets/photos/food-truck.jpg";
import formation from "@/assets/photos/formation.jpg";
import hydroponie from "@/assets/photos/hydroponie.jpg";
import maroquinerie from "@/assets/photos/maroquinerie.jpg";
import projet from "@/assets/photos/projet.jpg";
import venteEnLigne from "@/assets/photos/vente-en-ligne.jpg";

/**
 * Photos du site public, sous licences Creative Commons (Wikimedia Commons) : réutilisation libre, y compris
 * commerciale, à condition de citer l'auteur et la licence. Modifications : recadrage et compression.
 * Les crédits sont affichés en légende et repris dans les mentions légales.
 * Choix volontaire : des activités et des lieux variés (Afrique, Europe, en ligne), pas un seul type de commerce.
 */

type License = { name: string; url: string };

const BY_2 = { name: "CC BY 2.0", url: "https://creativecommons.org/licenses/by/2.0/deed.fr" };
const BY_4 = { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/deed.fr" };
const BY_SA_4 = { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/deed.fr" };

/** `focus` : point à garder visible quand la photo est recadrée (CSS object-position). */
export type Photo = {
  src: StaticImageData;
  alt: string;
  caption: string;
  author: string;
  license: License;
  source: string;
  focus?: string;
};

export const PHOTOS = {
  projet: {
    src: projet,
    alt: "Une personne note ses idées dans un carnet, à côté d'un ordinateur portable.",
    caption: "Poser son projet sur papier",
    author: "Shixart1985",
    license: BY_2,
    source: "https://commons.wikimedia.org/wiki/File:Person_writing_in_notebook_while_using_laptop_at_a_modern_workspace.jpg",
  },
  foodTruck: {
    src: foodTruck,
    alt: "Des clients font la queue devant un food truck sous les arbres.",
    caption: "Food truck près de la tour Eiffel, Paris",
    author: "Heidi Meudt",
    license: BY_4,
    source: "https://commons.wikimedia.org/wiki/File:Eiffel_Tower_food_truck_Aug_2026.jpg",
  },
  hydroponie: {
    src: hydroponie,
    alt: "Des colonnes de salades poussent à la verticale dans une serre.",
    caption: "Salades en tours hydroponiques, sous serre",
    author: "Amnsalem",
    license: BY_SA_4,
    source: "https://commons.wikimedia.org/wiki/File:Leafy_greens_in_greenhouse_semi_hydroponic_towers_of_Dr._Mahmoud_Salem%27s_farm.jpg",
  },
  coiffure: {
    src: coiffure,
    alt: "Une coiffeuse coiffe une cliente devant un miroir, dans un salon aux couleurs vives.",
    caption: "Salon de coiffure, Côte d'Ivoire",
    author: "Melchisedek Abaka",
    license: BY_SA_4,
    source: "https://commons.wikimedia.org/wiki/File:A_hairdresser_at_work_in_Ivory_Coast.jpg",
  },
  venteEnLigne: {
    src: venteEnLigne,
    alt: "Des mains ferment un colis au ruban adhésif, devant un ordinateur portable ouvert.",
    caption: "Préparer une commande en ligne",
    author: "Meanwell Packaging",
    license: BY_2,
    source: "https://commons.wikimedia.org/wiki/File:Sealing_a_parcel_while_booking_shipping_on_a_laptop.jpg",
  },
  formation: {
    src: formation,
    alt: "Des participants travaillent sur leurs ordinateurs pendant un atelier de formation.",
    caption: "Atelier de formation, Abidjan",
    author: "Modjou",
    license: BY_SA_4,
    source: "https://commons.wikimedia.org/wiki/File:Atelier_de_formation_au_Goethe-Institut_C%C3%B4te_d%27Ivoire_01.jpg",
  },
  maroquinerie: {
    src: maroquinerie,
    alt: "Des mains guident un sac en cuir noir sous l'aiguille d'une machine à coudre.",
    caption: "Maroquinerie, Dakar",
    author: "Wuzyprod",
    license: BY_SA_4,
    source: "https://commons.wikimedia.org/wiki/File:African_tailor_sewing_a_leather_bag.jpg",
  },
} satisfies Record<string, Photo>;
