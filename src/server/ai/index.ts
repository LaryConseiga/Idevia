import "server-only";
import { withSystem } from "@/server/dal/context";
import { aiUsage } from "@/server/db/schema";
import { callChat, providers } from "./providers";
import { createRouter } from "./router";

export type { Task } from "./router";
export { scrubPersonalData } from "./scrub";

/** Instance unique du routeur, câblée sur les vrais fournisseurs et la table ai_usage. */
export const ai = createRouter({
  providers,
  call: callChat,
  record: (usage) =>
    withSystem("ai-usage", async (tx) => {
      await tx.insert(aiUsage).values({
        userId: usage.userId,
        feature: usage.task,
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        success: usage.success,
        errorCode: usage.errorCode,
        latencyMs: usage.latencyMs,
      });
    }),
});
