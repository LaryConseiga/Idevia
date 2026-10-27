/**
 * Vérifie chaque fournisseur IA configuré dans .env.local (aucune clé n'est affichée).
 * Usage : npm run ai:check
 */
import { callChat, providers } from "@/server/ai/providers";
import { extractJson } from "@/server/ai/router";

const request = {
  messages: [
    { role: "system" as const, content: 'Réponds uniquement en JSON : {"ok": true, "phrase": "<une phrase d\'accueil en français>"}' },
    { role: "user" as const, content: "Bonjour" },
  ],
  temperature: 0,
  maxTokens: 200,
};

for (const provider of Object.values(providers)) {
  if (!provider.apiKey) {
    console.log(`- ${provider.id.padEnd(10)} non configuré`);
    continue;
  }
  const started = Date.now();
  try {
    const result = await callChat(provider, request, AbortSignal.timeout(20_000));
    const json = extractJson(result.content) as { phrase?: string };
    console.log(`✓ ${provider.id.padEnd(10)} ${provider.model} · ${Date.now() - started} ms · « ${json.phrase ?? "?"} »`);
  } catch (error) {
    const detail = error instanceof Error ? `${error.message}${"status" in error && error.status ? ` (${error.status})` : ""}` : "erreur";
    console.log(`✗ ${provider.id.padEnd(10)} ${provider.model} · ${detail}`);
  }
}
