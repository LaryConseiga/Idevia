import type { Metadata } from "next";
import { PageShell, Prose, Todo } from "@/components/marketing/page-shell";
import { HOST, PUBLISHER, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Éditeur, hébergeur et contact du service Idevia.",
  alternates: { canonical: "/legal/mentions-legales" },
};

export default function LegalNoticePage() {
  return (
    <PageShell eyebrow="Légal" title="Mentions légales">
      <Prose>
        <h2>Éditeur</h2>
        <p>
          Idevia est édité par <Todo value={PUBLISHER.name} label="nom ou raison sociale" />.
          <br />
          <Todo value={PUBLISHER.registration} label="forme juridique et numéro d'immatriculation" />
          <br />
          Adresse : <Todo value={PUBLISHER.address} label="adresse" />
          <br />
          Contact : <Todo value={SITE.contactEmail} label="adresse email de contact" />
        </p>
        <p>
          Direction de la publication : <Todo value={PUBLISHER.director} label="nom" />.
        </p>

        <h2>Hébergement</h2>
        <p>
          Le site est hébergé par {HOST.name}, {HOST.address} (<a href={HOST.website}>{HOST.website.replace("https://", "")}</a>),
          sur des serveurs situés dans l&apos;Union européenne (Francfort). La base de données est hébergée par Neon,
          également à Francfort.
        </p>

        <h2>Propriété intellectuelle</h2>
        <p>
          La marque Idevia, le site, ses textes, son design et son code sont protégés. Les contenus que tu crées avec
          Idevia (réponses, idées retenues, notes, plan) t&apos;appartiennent.
        </p>

        <h2>Responsabilité</h2>
        <p>
          Idevia est un outil d&apos;aide à la réflexion et à l&apos;organisation. Les idées, plans, estimations et
          réponses du coach sont produits en partie par des modèles d&apos;intelligence artificielle et peuvent contenir
          des erreurs. Ils ne constituent ni une garantie de revenus, ni un conseil juridique, fiscal, comptable ou
          financier.
        </p>
      </Prose>
    </PageShell>
  );
}
