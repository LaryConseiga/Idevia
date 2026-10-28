import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, haveIBeenPwned, magicLink, twoFactor } from "better-auth/plugins";
import { db } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import { withSystem } from "@/server/dal/context";
import { emails } from "@/server/email/templates";
import { sendEmail } from "@/server/email/send";
import { env, isProd } from "@/server/env";
import { consume } from "@/server/ratelimit";
import { ac, roles } from "./roles";

export const ADMIN_ROLES = ["super_admin", "content", "support", "analyst"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const auth = betterAuth({
  appName: "Idevia",
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.APP_URL],

  // Les tables d'authentification ne sont pas soumises à RLS : seules elles sont accessibles ici.
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
    },
  }),

  emailAndPassword: {
    enabled: true,
    // Pas de confirmation bloquante : on entre tout de suite après l'inscription (le diagnostic débouche
    // directement sur les idées). L'email de confirmation part quand même ; il conditionne les rappels.
    requireEmailVerification: false,
    autoSignIn: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({ to: user.email, ...emails.resetPassword(url) });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      // Après confirmation, on arrive sur le tableau de bord plutôt que sur l'accueil public.
      const link = new URL(url);
      if (!link.searchParams.get("callbackURL") || link.searchParams.get("callbackURL") === "/") {
        link.searchParams.set("callbackURL", "/tableau-de-bord");
      }
      await sendEmail({ to: user.email, ...emails.verify(link.toString()) });
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 15, // actions sensibles (suppression, export) : session récente exigée
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 3600, max: 5 },
      "/sign-in/magic-link": { window: 300, max: 3 },
      "/request-password-reset": { window: 900, max: 3 },
      "/two-factor/verify-totp": { window: 300, max: 5 },
      "/two-factor/verify-backup-code": { window: 300, max: 5 },
    },
    customStorage: { consume: (key, rule) => consume(`auth:${key}`, rule) },
  },

  advanced: {
    cookiePrefix: "idevia",
    useSecureCookies: isProd,
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
  },

  // L'usurpation d'identité par un admin est désactivée : contraire au principe d'accès minimal.
  disabledPaths: ["/admin/impersonate-user", "/admin/stop-impersonating"],

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await withSystem("création du profil", (tx) =>
            tx.insert(schema.profiles).values({ userId: user.id }).onConflictDoNothing(),
          );
        },
      },
    },
  },

  plugins: [
    magicLink({
      expiresIn: 60 * 10,
      disableSignUp: false,
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({ to: email, ...emails.magicLink(url) });
      },
    }),
    twoFactor({ issuer: "Idevia" }),
    admin({
      ac,
      roles,
      defaultRole: "user",
      adminRoles: [...ADMIN_ROLES],
      bannedUserMessage: "Ce compte est suspendu.",
    }),
    haveIBeenPwned({
      customPasswordCompromisedMessage:
        "Ce mot de passe apparaît dans des fuites de données connues. Choisis-en un autre.",
    }),
    nextCookies(), // doit rester le dernier plugin
  ],
});

export type Session = typeof auth.$Infer.Session;
