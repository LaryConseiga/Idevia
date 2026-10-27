import { ImageResponse } from "next/og";

/** Image de partage (WhatsApp, Facebook, LinkedIn…) commune à tout le site public. */
export const alt = "Idevia — Trouve ton idée de business et passe à l'action";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#FFFBF5",
          color: "#1C1917",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#0B5D46", display: "flex" }} />
          <span style={{ fontSize: 44, fontWeight: 700, color: "#0B5D46" }}>Idevia</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <span style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, maxWidth: 980 }}>
            Trouve ton idée de business et passe à l&apos;action
          </span>
          <span style={{ fontSize: 32, color: "#57534E", maxWidth: 960 }}>
            3 idées faites pour toi, vérifiées sur le terrain, un plan de 30 jours et un coach. Gratuit.
          </span>
        </div>
        <div style={{ display: "flex", height: 12, borderRadius: 6, background: "#C2410C", width: 220 }} />
      </div>
    ),
    size,
  );
}
