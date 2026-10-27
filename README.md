# Idevia

De ton idée à ton premier projet concret. SaaS francophone d'accompagnement entrepreneurial,
priorité Afrique francophone. Architecture : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
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

En développement sans `RESEND_API_KEY`, les emails (vérification, lien magique) s'affichent dans la console.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `typecheck` / `test` | Qualité (exécutés en CI) |
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
