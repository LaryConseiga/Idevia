import type { Metadata } from "next";
import { PageShell, Prose, Todo } from "@/components/marketing/page-shell";
import { PUBLISHER, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Quelles données Idevia collecte, pourquoi, avec qui elles sont partagées, combien de temps elles sont gardées et comment exercer tes droits.",
  alternates: { canonical: "/legal/confidentialite" },
};

const processors = [
  { name: "Neon", role: "Base de données", where: "Union européenne (Francfort)" },
  { name: "Vercel", role: "Hébergement du site", where: "Union européenne (Francfort), société américaine" },
  { name: "Groq", role: "Modèles d'IA : entretien, coach, notation des idées", where: "États-Unis" },
  { name: "Google (Gemini)", role: "Modèles d'IA : idées, plans, rapport terrain, relais", where: "États-Unis" },
  { name: "Mistral AI", role: "Modèle d'IA de relais pour l'entretien et les idées", where: "France" },
  { name: "OpenRouter", role: "Modèle d'IA de dernier recours", where: "États-Unis" },
  { name: "Apify", role: "Collecte de données publiques de marché", where: "Union européenne (République tchèque)" },
  { name: "Resend", role: "Envoi des emails", where: "États-Unis" },
  { name: "Upstash", role: "Limitation du nombre de requêtes (anti-abus)", where: "selon la région choisie" },
];

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Légal"
      title="Ta vie privée"
      intro={<p>Ce qu&apos;Idevia sait de toi, pourquoi, et comment tu gardes la main. Mise à jour le {SITE.legalUpdatedAt}.</p>}
    >
      <Prose>
        <h2>En bref</h2>
        <ul>
          <li>On collecte ce qu&apos;il faut pour te proposer des idées et t&apos;accompagner, rien de plus.</li>
          <li>Tes réponses, tes idées, ton plan et tes échanges avec le coach sont chiffrés dans notre base de données.</li>
          <li>Les modèles d&apos;IA ne reçoivent jamais ton nom, ton email ni ton identifiant.</li>
          <li>Pas de publicité, pas de revente de données, pas de traceur publicitaire.</li>
          <li>Tu peux télécharger toutes tes données ou supprimer ton compte à tout moment, depuis ton espace.</li>
        </ul>

        <h2>Qui est responsable</h2>
        <p>
          Le responsable du traitement est <Todo value={PUBLISHER.name} label="éditeur" />, joignable à{" "}
          <Todo value={SITE.contactEmail} label="adresse email de contact" />.
        </p>

        <h2>Ce que nous collectons</h2>
        <h3>Ton compte</h3>
        <p>Ton prénom, ton adresse email et ton mot de passe (stocké sous forme d&apos;empreinte, jamais en clair).</p>
        <h3>Ton diagnostic</h3>
        <p>
          Tes réponses à l&apos;entretien (pays, ville, compétences, budget, temps disponible, motivations…) et le
          portrait qui en est tiré. Nous ne posons aucune question sur ta santé, ta religion, tes opinions ou ta vie
          privée. Un diagnostic commencé sans compte est supprimé au bout de 7 jours s&apos;il n&apos;est pas rattaché à
          un compte.
        </p>
        <h3>Ton projet</h3>
        <p>
          Les idées proposées, l&apos;idée choisie, ton plan et son avancement, les vérifications terrain, les hypothèses
          que tu testes, tes échanges avec le coach et ce qu&apos;il retient de ton projet (que tu peux consulter et
          effacer).
        </p>
        <h3>Données techniques</h3>
        <p>
          Des journaux techniques (adresse IP, appareil, erreurs) pour la sécurité, gardés 30 jours au plus. Aucune mesure
          d&apos;audience n&apos;est active aujourd&apos;hui ; si nous en ajoutons une, elle fonctionnera sans cookie et
          sans identifier les personnes, et cette page sera mise à jour.
        </p>

        <h2>Pourquoi</h2>
        <ul>
          <li>Fournir le service que tu demandes (diagnostic, idées, plan, coach) : exécution du contrat.</li>
          <li>T&apos;envoyer les emails de connexion et de sécurité : exécution du contrat.</li>
          <li>T&apos;envoyer des rappels quand une étape arrive à échéance : notre intérêt légitime à t&apos;aider à avancer, désactivable en un clic.</li>
          <li>Protéger le service contre les abus et la fraude : intérêt légitime.</li>
        </ul>

        <h2>L&apos;intelligence artificielle</h2>
        <p>
          Idevia utilise des modèles d&apos;IA de plusieurs fournisseurs pour conduire l&apos;entretien, proposer et
          rédiger les idées, lire les données de marché et faire fonctionner le coach. Avant chaque envoi, nous retirons
          ton nom, ton email, ton identifiant, et nous masquons les numéros de téléphone, adresses email et liens que tu
          aurais écrits. Les modèles reçoivent un résumé de ton profil et de ton projet.
        </p>
        <p>
          Pour rester gratuit, Idevia utilise aussi les offres gratuites de certains fournisseurs. Les conditions de
          Google (Gemini), de Mistral AI et de certains modèles d&apos;OpenRouter prévoient que les données envoyées via
          ces offres peuvent servir à améliorer leurs modèles. C&apos;est pourquoi tes échanges avec le coach, les plus
          personnels, passent d&apos;abord par Groq, dont les conditions excluent cet usage, et jamais par l&apos;offre
          gratuite de Mistral. Avec l&apos;offre Pro, nous passerons à des offres payantes qui excluent tout entraînement.
        </p>
        <p>
          Les contenus produits par l&apos;IA peuvent être inexacts : ce sont des pistes à vérifier, pas des certitudes.
        </p>

        <h2>Avec qui nous partageons</h2>
        <p>Uniquement avec les prestataires nécessaires au service, chacun pour son rôle :</p>
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Prestataire</th>
                <th className="px-4 py-2.5 font-semibold">Rôle</th>
                <th className="px-4 py-2.5 font-semibold">Lieu</th>
              </tr>
            </thead>
            <tbody>
              {processors.map((p) => (
                <tr key={p.name} className="border-t border-border">
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5">{p.role}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Certains sont situés hors de l&apos;Union européenne. Ces transferts s&apos;appuient sur les clauses
          contractuelles types de la Commission européenne ou sur le cadre de protection des données UE–États-Unis.
          Les données de marché collectées par Apify sont publiques et agrégées : elles ne contiennent aucune
          coordonnée de personne.
        </p>

        <h2>Combien de temps</h2>
        <ul>
          <li>Diagnostic sans compte : 7 jours.</li>
          <li>Données de ton compte et de ton projet : tant que ton compte existe.</li>
          <li>Suppression demandée : 30 jours pour changer d&apos;avis, puis effacement définitif. Les copies de sauvegarde de la base disparaissent d&apos;elles-mêmes dans les jours qui suivent.</li>
          <li>Données de marché (publiques) : 30 jours.</li>
          <li>Journaux techniques : 30 jours au plus.</li>
        </ul>

        <h2>Les cookies</h2>
        <p>
          Idevia n&apos;utilise que des cookies indispensables : celui de ta session de connexion, et celui qui garde
          ton diagnostic en cours avant que tu crées un compte. Aucun cookie publicitaire ni de mesure d&apos;audience :
          aucun bandeau à accepter.
        </p>

        <h2>Tes droits</h2>
        <p>
          Tu peux à tout moment consulter, corriger, télécharger (portabilité) ou effacer tes données, et t&apos;opposer
          aux rappels par email. Les deux plus courants se font en un clic depuis ton espace : « Mon compte », puis
          « Mes données » ou « Supprimer mon compte ». Pour le reste, écris-nous à{" "}
          <Todo value={SITE.contactEmail} label="adresse email de contact" /> : nous répondons sous un mois.
        </p>
        <p>
          Tu peux aussi saisir l&apos;autorité de protection des données de ton pays : la CNIL en France, l&apos;APD en
          Belgique, le PFPDT en Suisse, l&apos;ARTCI en Côte d&apos;Ivoire, la CDP au Sénégal, la CIL au Burkina Faso, le
          Commissariat à la protection de la vie privée au Canada, ou l&apos;autorité équivalente là où tu vis.
        </p>

        <h2>Sécurité</h2>
        <p>
          Connexions chiffrées (HTTPS), données sensibles chiffrées en base (AES-256), isolation stricte entre les
          comptes jusque dans la base de données, double authentification disponible, limitation des tentatives de
          connexion et vérification des mots de passe déjà divulgués.
        </p>
      </Prose>
    </PageShell>
  );
}
