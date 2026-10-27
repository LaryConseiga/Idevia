import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, Prose, Todo } from "@/components/marketing/page-shell";
import { PUBLISHER, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Les règles d'utilisation d'Idevia : ce que le service fait, ce qu'il ne promet pas, et tes engagements.",
  alternates: { canonical: "/legal/conditions" },
};

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Légal"
      title="Conditions d'utilisation"
      intro={<p>En vigueur depuis le {SITE.legalUpdatedAt}. En créant un compte, tu acceptes ces conditions.</p>}
    >
      <Prose>
        <h2>1. Le service</h2>
        <p>
          Idevia t&apos;aide à trouver une idée de business adaptée à ton profil, à la vérifier avec des données de
          marché publiques, à la découper en plan d&apos;action et à avancer avec un coach. Idevia est édité par{" "}
          <Todo value={PUBLISHER.name} label="éditeur" />.
        </p>

        <h2>2. Ce qu&apos;Idevia ne promet pas</h2>
        <p>
          Les idées, plans, chiffres, rapports terrain et réponses du coach sont produits en partie par des modèles
          d&apos;intelligence artificielle, à partir de ce que tu as dit et de données publiques. Ils peuvent être
          incomplets ou faux. Ce sont des pistes à vérifier : Idevia ne garantit aucun revenu ni aucun résultat, et ne
          remplace pas l&apos;avis d&apos;un professionnel du droit, de la fiscalité, de la comptabilité ou de la finance.
          Les décisions que tu prends restent les tiennes.
        </p>

        <h2>3. Ton compte</h2>
        <ul>
          <li>Il faut avoir au moins 16 ans, ou l&apos;accord d&apos;un parent.</li>
          <li>Tu donnes des informations exactes et tu gardes ton mot de passe pour toi. La double authentification est conseillée.</li>
          <li>Un compte est personnel : une personne, un compte.</li>
        </ul>

        <h2>4. Ce que tu t&apos;engages à ne pas faire</h2>
        <ul>
          <li>Utiliser Idevia pour une activité illégale, frauduleuse ou dangereuse, ou pour tromper des clients.</li>
          <li>Tenter d&apos;accéder aux données d&apos;autres personnes, de contourner les limites d&apos;usage ou de perturber le service.</li>
          <li>Détourner le coach de son rôle (lui faire produire des contenus haineux, illégaux ou trompeurs).</li>
          <li>Extraire automatiquement le contenu du service ou le revendre.</li>
        </ul>

        <h2>5. Offre gratuite et limites d&apos;usage</h2>
        <p>
          Idevia est gratuit. Pour que le service reste gratuit pour tout le monde, chaque compte dispose d&apos;un nombre
          mensuel de générations d&apos;idées, de vérifications terrain et d&apos;échanges avec le coach, indiqué dans
          l&apos;application et sur la page <Link href="/tarifs">Tarifs</Link>. Une offre payante pourra s&apos;y
          ajouter : elle ne s&apos;appliquera qu&apos;à qui la choisit, et rien de ce qui est gratuit aujourd&apos;hui ne
          deviendra payant sans que tu en sois prévenu à l&apos;avance.
        </p>

        <h2>6. Tes contenus</h2>
        <p>
          Ce que tu écris et ce qu&apos;Idevia produit pour toi t&apos;appartient : tu peux l&apos;utiliser librement. Tu
          nous autorises seulement à le traiter pour faire fonctionner le service, comme décrit dans la{" "}
          <Link href="/legal/confidentialite">politique de confidentialité</Link>.
        </p>

        <h2>7. Disponibilité</h2>
        <p>
          Nous faisons notre possible pour que le service fonctionne en continu, mais il dépend de fournisseurs extérieurs
          (hébergement, modèles d&apos;IA, données de marché) et peut être interrompu, ralenti ou modifié. Une fonction peut
          être temporairement indisponible, notamment quand les quotas gratuits de nos fournisseurs sont atteints.
        </p>

        <h2>8. Fin d&apos;utilisation</h2>
        <p>
          Tu peux supprimer ton compte à tout moment depuis « Mon compte ». Nous pouvons suspendre un compte qui ne respecte
          pas ces conditions, après t&apos;avoir prévenu sauf en cas d&apos;abus grave.
        </p>

        <h2>9. Responsabilité</h2>
        <p>
          Dans les limites permises par la loi, Idevia n&apos;est pas responsable des décisions prises sur la base de ses
          suggestions, ni des pertes qui pourraient en découler. Rien dans ces conditions ne limite tes droits de
          consommateur.
        </p>

        <h2>10. Changements et droit applicable</h2>
        <p>
          Si ces conditions changent de façon importante, tu en seras informé par email ou dans l&apos;application avant
          leur entrée en vigueur. Elles sont soumises au droit de <Todo value={PUBLISHER.governingLaw} label="pays" />.
          Pour toute question : <Todo value={SITE.contactEmail} label="adresse email de contact" />.
        </p>
      </Prose>
    </PageShell>
  );
}
