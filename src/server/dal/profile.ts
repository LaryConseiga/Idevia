import "server-only";
import { eq } from "drizzle-orm";
import { profiles } from "@/server/db/schema";
import { withUser } from "./context";

export type Plan = "free" | "pro";

export function getPlan(userId: string): Promise<Plan> {
  return withUser(userId, async (tx) => {
    const [row] = await tx.select({ plan: profiles.plan }).from(profiles).where(eq(profiles.userId, userId));
    return row?.plan === "pro" ? "pro" : "free";
  });
}
