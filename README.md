# Idevia

De ton idée à ton premier projet concret. SaaS francophone d'accompagnement entrepreneurial,
pour les francophones d'Afrique, d'Europe et d'ailleurs. Architecture : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
Design system : [design-system/idevia/MASTER.md](design-system/idevia/MASTER.md).

## Démarrer

Prérequis : Node 22+ et la CLI Neon (`npm i -g neon`). Le projet est lié au projet Neon `aged-violet-60283264`
(fichiers `.neon` et `neon.ts`, branche `production`, région Francfort).

```bash
npm install
cp .env.example .env.local      # puis générer les secrets (voir commentaires du fichier)
neon deploy                     # Postgres + Realtime, écrit DATABASE_URL, NEON_REALTIME_* dans .env.local
npm run db:app-role             # rôle applicatif idevia_app (sans BYPASSRLS) → DATABASE_APP_URL
npm run db:migrate              # schéma + Row-Level Security
npm run dev
```

Pour développer sans toucher à la branche `production` : `neon checkout dev --create` (branche copiée,
expirée au bout de 7 jours), puis `npm run db:app-role -- --rotate`. Hors ligne : `npm run db:up` lance
un Postgres local (Docker) ; renseigner alors `DATABASE_URL` (idevia_owner) et `DATABASE_APP_URL` (idevia_app).

### Emails en local

Trois modes, dans cet ordre de priorité :

1. **Un compte Gmail ordinaire** (recommandé pour tester avec de vraies boîtes) : active la validation en deux étapes
   sur le compte, crée un mot de passe d'application sur myaccount.google.com/apppasswords, puis renseigne
   `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER` et `SMTP_PASSWORD` dans `.env.local`. Ignoré en production.
2. **Resend** (`RESEND_API_KEY`) : sans domaine vérifié, Resend n'écrit qu'à l'adresse du compte Resend.
3. **Rien** : les emails (vérification, lien magique, rappels) s'affichent dans la console.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` / `test` | Qualité (exécutés en CI) |
| `npm run test:isolation` | Isolation entre comptes contre une vraie base (RLS) : crée puis supprime deux comptes temporaires |
| `npm run test:e2e` | Sécurité HTTP, pages publiques, liens, référencement (lance `npm start` si besoin ; `BASE_URL=…` pour une autre adresse) |
| `npm run db:generate` | Génère une migration depuis `src/server/db/schema` |
| `npm run db:migrate` | Applique les migrations (rôle propriétaire, connexion directe `DATABASE_URL_UNPOOLED`) |
| `npm run db:app-role` | Crée le rôle applicatif `idevia_app` (sans BYPASSRLS) et écrit `DATABASE_APP_URL` |
| `npm run ai:check` | Vérifie chaque fournisseur IA configuré (sans afficher les clés) |
| `npm run icons` | Régénère les icônes PWA |

## Règles de sécurité du code

- Aucun accès direct à la base hors de `src/server/dal` : utiliser `withUser(userId, …)` ou `withSystem(raison, …)`
  (règle ESLint). La base applique en plus la RLS : sans contexte, une table privée ne renvoie rien.
- Les champs sensibles sont chiffrés (`src/server/crypto.ts`, colonnes `*_enc`).
- Toute page ou action privée revérifie la session côté serveur (`requireUser` / `requireAdmin`) :
  le proxy ne fait qu'une redirection optimiste.
- Aucun secret avec le préfixe `NEXT_PUBLIC_`.

## Mise en ligne (Vercel)

1. **Informations légales** : compléter `PUBLISHER` dans `src/lib/site.ts` et `CONTACT_EMAIL` (les pages légales
   affichent « à compléter » tant que ce n'est pas fait).
2. **Projet Vercel** relié au dépôt GitHub, région des fonctions `fra1` (Francfort, à côté de Neon).
3. **Variables d'environnement** Vercel (Production) : toutes celles de `.env.example` sauf `SMTP_*`, avec
   `APP_URL=https://<sous-domaine>`, un `CRON_SECRET` long et aléatoire, et `EMAIL_FROM` sur le sous-domaine.
4. **Domaine** : ajouter le sous-domaine dans Vercel, puis chez name.com un seul enregistrement
   `CNAME <sous-domaine> → cname.vercel-dns.com` (ne pas toucher au domaine principal ni à ses autres enregistrements).
5. **Resend** : ajouter le sous-domaine comme domaine d'envoi et créer les enregistrements DNS demandés (SPF, DKIM).
6. **Neon Realtime** : ajouter `https://<sous-domaine>` à `allowedOrigins` dans `neon.ts`, puis `neon deploy`.
7. **Vérifier** : `BASE_URL=https://<sous-domaine> npm run test:e2e`, puis une inscription complète depuis un téléphone.

