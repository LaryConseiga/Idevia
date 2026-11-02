import type { StaticImageData } from "next/image";
import hydroponie from "@/assets/photos/hydroponie.jpg";
import projet from "@/assets/photos/projet.jpg";

/**
 * Photos du site public, sous licences Creative Commons (Wikimedia Commons) : réutilisation libre, y compris
 * commerciale, à condition de citer l'auteur et la licence. Modifications : recadrage et compression.
 * Les crédits sont affichés en légende et repris dans les mentions légales.
 */

type License = { name: string; url: string };

const BY_2 = { name: "CC BY 2.0", url: "https://creativecommons.org/licenses/by/2.0/deed.fr" };
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
  hydroponie: {
    src: hydroponie,
    alt: "Des colonnes de salades poussent à la verticale dans une serre.",
    caption: "Salades en tours hydroponiques, sous serre",
    author: "Amnsalem",
    license: BY_SA_4,
    source: "https://commons.wikimedia.org/wiki/File:Leafy_greens_in_greenhouse_semi_hydroponic_towers_of_Dr._Mahmoud_Salem%27s_farm.jpg",
  },
} satisfies Record<string, Photo>;
