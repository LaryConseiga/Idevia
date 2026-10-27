/** Ce que le navigateur reçoit pour la page du coach. */
export type CoachView = {
  projectName: string;
  messages: { id: string; role: "user" | "assistant"; content: string }[];
  memory: string[];
  quota: { percentLeft: number; messagesLeft: number; exhausted: boolean };
  suggestions: string[];
};
