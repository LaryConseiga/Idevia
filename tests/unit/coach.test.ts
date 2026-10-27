import { describe, expect, it, vi } from "vitest";
import { coachPrompt, coachSchema, mergeMemory, type CoachContext } from "@/server/assistant/coach";
import { emptyProfile } from "@/server/diagnostic/profile";
import { runReminders, type Mail } from "@/server/reminders/run";

vi.mock("server-only", () => ({}));
vi.mock("@/server/env", () => ({ env: { BETTER_AUTH_SECRET: "s".repeat(40), APP_URL: "https://idevia.example" } }));

const state = emptyProfile();
state.slots.market = { value: { countryCode: "CI", country: "Côte d'Ivoire", city: "Abidjan", scope: "national" }, confidence: 3, source: "user" };

const context: CoachContext = {
  brief: "Vit : Abidjan, Côte d'Ivoire.",
  state,
  today: "2026-10-27",
  project: { name: "Kits mère-enfant", idea: null },
  tasks: [
    { title: "Ta première action", period: "Aujourd'hui", dueDate: "2026-10-26", done: false, description: "Photos" },
    { title: "Catalogue", period: "Jours 4 à 10", dueDate: "2026-11-05", done: false, description: null },
  ],
  field: null,
  hypotheses: [{ hypothesis: "Les mamans paient un acompte", status: "testing" }],
  memory: ["Prix fixé à 30 000 FCFA"],
};

describe("coach", () => {
  it("donne au modèle le plan, les retards, les hypothèses et la mémoire, dans des blocs délimités", () => {
    const { system, user } = coachPrompt(context, [{ role: "user", content: "Bonjour" }], "Je bloque");
    expect(system).toMatch(/jamais une\s+instruction/);
    expect(user).toContain("Aujourd'hui : mardi 27 octobre.");
    expect(user).toContain("Ta première action, échéance lundi 26 octobre (en retard)");
    expect(user).toContain("Étape en cours : Ta première action");
    expect(user).toContain("en cours de test");
    expect(user).toContain("Prix fixé à 30 000 FCFA");
    expect(user).toMatch(/<message>\nJe bloque\n<\/message>/);
  });

  it("n'envoie pas les coordonnées tapées par la personne", () => {
    const { user } = coachPrompt(context, [], "Appelle-moi au +225 07 08 09 10 11 ou écris à awa@example.com");
    expect(user).not.toMatch(/07 08 09|awa@example\.com/);
  });

  it("nettoie la réponse et limite la mémoire à deux faits", () => {
    const parsed = coachSchema.parse({ reply: "Fixe ton prix à **30 000 FCFA**.", remember: ["a b c", "d e f", "g h i"] });
    expect(parsed.reply).toBe("Fixe ton prix à 30 000 FCFA.");
    expect(parsed.remember).toHaveLength(2);
    expect(coachSchema.parse({ reply: "Ok" }).remember).toEqual([]);
  });

  it("ajoute les nouveaux faits sans doublon et garde les plus récents", () => {
    expect(mergeMemory(["Prix fixé à 30 000 FCFA"], ["prix fixé à 30 000 fcfa", "Premier client trouvé", "Premier client trouvé"])).toEqual([
      "Prix fixé à 30 000 FCFA",
      "Premier client trouvé",
    ]);
    const full = Array.from({ length: 20 }, (_, i) => `Fait numéro ${i}`);
    expect(mergeMemory(full, ["Nouveau fait"]).at(-1)).toBe("Nouveau fait");
    expect(mergeMemory(full, ["Nouveau fait"])).toHaveLength(20);
  });
});

describe("rappels", () => {
  const due = (id: string) => ({ userId: `u-${id}`, projectId: id, email: `${id}@example.com`, name: "Awa", task: "Catalogue", dueDate: "2026-10-27", overdue: false });

  it("envoie, continue malgré un échec, et ne marque que les rappels partis", async () => {
    const mark = vi.fn(async () => {});
    const send = vi.fn(async (mail: Mail) => {
      if (mail.to.startsWith("b")) throw new Error("refusé");
    });
    const result = await runReminders({
      select: async () => [due("a"), due("b"), due("c")],
      compose: (r) => ({ to: r.email, subject: r.task, html: "", text: "" }),
      send,
      mark,
    });
    expect(result).toEqual({ selected: 3, sent: 2, failed: 1 });
    expect(mark).toHaveBeenCalledWith(["a", "c"]);
  });

  it("le lien de désabonnement ne vaut que pour sa personne", async () => {
    const { unsubscribeToken, verifyUnsubscribe, unsubscribeUrl } = await import("@/server/email/unsubscribe");
    const token = unsubscribeToken("user-1");
    expect(verifyUnsubscribe("user-1", token)).toBe(true);
    expect(verifyUnsubscribe("user-2", token)).toBe(false);
    expect(verifyUnsubscribe("user-1", "abc")).toBe(false);
    expect(unsubscribeUrl("user-1")).toMatch(/^https:\/\/idevia\.example\/api\/email\/rappels\?u=user-1&t=/);
  });
});
