import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

/**
 * Droits sur les endpoints d'administration de Better Auth (gestion des comptes).
 * L'accès aux pages /admin est contrôlé séparément par requireAdmin() selon le rôle.
 * Personne ne peut usurper un compte (« impersonate ») : endpoints désactivés.
 */
export const ac = createAccessControl(defaultStatements);

export const roles = {
  user: ac.newRole({ user: [], session: [] }),
  super_admin: ac.newRole({
    user: ["create", "list", "set-role", "ban", "delete", "get", "update"],
    session: ["list", "revoke", "delete"],
  }),
  support: ac.newRole({ user: ["list", "get", "ban"], session: ["list", "revoke"] }),
  content: ac.newRole({ user: [], session: [] }),
  analyst: ac.newRole({ user: [], session: [] }),
};
