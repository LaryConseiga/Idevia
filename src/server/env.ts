import "server-only";
import { z } from "zod";

/**
 * Variables d'environnement serveur, validées au démarrage.
 * Aucune de ces valeurs ne doit être exposée au navigateur (pas de préfixe NEXT_PUBLIC_).
 * Les fournisseurs optionnels (IA, Apify, Redis, Resend) dégradent proprement s'ils sont absents.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),

  /**
   * Rôle applicatif sans BYPASSRLS (connexion poolée). DATABASE_URL, géré par Neon, est celui du propriétaire :
   * il ne sert qu'aux migrations (drizzle.config.ts).
   */
  DATABASE_APP_URL: z.string().min(1),

  /** Neon Realtime (requêtes en direct) : facultatif, la page fonctionne sans. */
  NEON_REALTIME_URL: z.url().optional(),
  NEON_REALTIME_SECRET: z.string().min(16).optional(),

  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET doit faire au moins 32 caractères"),

  /** Clés de chiffrement des champs sensibles : "v1:base64key,v2:base64key". La dernière sert au chiffrement. */
  DATA_ENCRYPTION_KEYS: z.string().min(1),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Idevia <onboarding@resend.dev>"),

  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  CEREBRAS_API_KEY: z.string().optional(),
  /** Identifiants de modèles : modifiables sans toucher au code quand un fournisseur fait évoluer son offre gratuite. */
  AI_MODEL_GROQ: z.string().default("llama-3.3-70b-versatile"),
  AI_MODEL_GEMINI: z.string().default("gemini-2.5-flash"),
  AI_MODEL_OPENROUTER: z.string().default("meta-llama/llama-3.3-70b-instruct:free"),
  AI_MODEL_CEREBRAS: z.string().default("gpt-oss-120b"),

  APIFY_TOKEN: z.string().optional(),

  /**
   * Offre payante (désactivée au lancement) : quand elle est active, un compte gratuit ne voit en entier que
   * la 3e idée (la moins pertinente) ; les deux meilleures et le suivi sont réservés à l'offre Pro.
   */
  IDEAS_PAYWALL: z.enum(["on", "off"]).default("off"),
  /** Générations d'idées par mois et par compte (chacune coûte une dizaine d'appels aux modèles). */
  IDEAS_MONTHLY_QUOTA: z.coerce.number().int().min(1).max(50).default(3),

  /** Sel du hachage quotidien des visiteurs (analytics sans cookie). */
  ANALYTICS_SALT: z.string().min(16),

  /** Secret des tâches planifiées (purge des données expirées). */
  CRON_SECRET: z.string().min(16).optional(),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuration invalide :\n${fields}`);
  }
  return parsed.data;
}

export const env = load();
export const isProd = env.NODE_ENV === "production";
