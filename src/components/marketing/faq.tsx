/** Questions fréquentes : affichées sur l'accueil (les premières) et en entier sur /faq. */
export const FAQS = [
  {
    q: "Est-ce que c'est gratuit ?",
    a: "Oui. Le diagnostic, les idées, le plan d'action, la vérification terrain et un quota mensuel d'échanges avec le coach sont gratuits, sans carte bancaire. Une offre Pro viendra plus tard pour aller plus loin.",
  },
  {
    q: "Je n'ai aucune idée de départ, est-ce pour moi ?",
    a: "Oui, c'est même le point de départ le plus courant. L'échange part de ce que tu sais faire, de ce qui t'intéresse et de tes moyens réels.",
  },
  {
    q: "Et si j'ai déjà une idée ?",
    a: "Dis-le dès le début : Idevia t'aidera à la confronter à ton profil et à ton marché, puis à la tester avant d'engager de l'argent.",
  },
  {
    q: "Idevia garantit-il que mon business va marcher ?",
    a: "Non, et personne ne peut le garantir. Idevia t'aide à réfléchir, à tester tes hypothèses à petit coût et à décider. Il ne remplace pas un conseil juridique, comptable ou financier.",
  },
  {
    q: "Que faites-vous de mes réponses ?",
    a: "Elles servent uniquement à te conseiller. Elles sont chiffrées, ne sont jamais vendues, et l'IA ne reçoit ni ton nom ni ton email. Tu peux exporter ou supprimer tes données à tout moment.",
  },
  {
    q: "Dans quels pays Idevia fonctionne-t-il ?",
    a: "Partout où l'on parle français : Afrique de l'Ouest et centrale, Maghreb, océan Indien, France, Belgique, Suisse, Luxembourg, Canada… Ton pays fixe la monnaie et les démarches, mais tes idées ne sont pas limitées à ta ville : elles peuvent viser ton pays entier, la vente en ligne ou la diaspora.",
  },
  {
    q: "D'où viennent les données de la vérification terrain ?",
    a: "De sources publiques consultées au moment où tu la lances : les commerces visibles sur Google Maps, la première page de résultats Google et les publicités actives sur Facebook et Instagram. Chaque constat indique sa source et sa date, et les limites de ces données sont précisées : le commerce informel, par exemple, y apparaît peu.",
  },
  {
    q: "Le coach, c'est une vraie personne ?",
    a: "Non, c'est une intelligence artificielle qui connaît ton profil, ton plan et ce qu'a montré le terrain. Elle peut se tromper : vérifie ce qui compte, et pour le droit, la fiscalité ou la comptabilité, adresse-toi à un professionnel.",
  },
  {
    q: "Faut-il installer une application ?",
    a: "Non. Idevia fonctionne dans le navigateur de ton téléphone ou de ton ordinateur. Tu peux aussi l'ajouter à ton écran d'accueil pour l'ouvrir comme une application.",
  },
  {
    q: "Comment supprimer mon compte ?",
    a: "Depuis « Mon compte », puis « Supprimer mon compte ». Tu as 30 jours pour changer d'avis, ensuite tout est effacé définitivement.",
  },
];

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-border rounded-card border border-border bg-card">
      {items.map((item) => (
        <details key={item.q} className="group px-5 py-1">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
            {item.q}
            <span aria-hidden className="text-xl text-muted-foreground transition-transform duration-200 group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="pb-4 leading-relaxed text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
