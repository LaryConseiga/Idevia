/**
 * Fond animé de la page d'accueil, uniquement en CSS (aucun JavaScript) : halos de couleur qui dérivent,
 * grille discrète et symboles qui flottent. Décoratif : ignoré par les lecteurs d'écran, figé si l'appareil
 * demande moins d'animations.
 */

const SYMBOLS = [
  { text: "FCFA", top: "8%", left: "8%", delay: "0s", duration: "16s" },
  { text: "€", top: "14%", left: "86%", delay: "-3s", duration: "14s" },
  { text: "+1 client", top: "30%", left: "4%", delay: "-6s", duration: "18s" },
  { text: "✓", top: "24%", left: "93%", delay: "-2s", duration: "12s" },
  { text: "30 j", top: "46%", left: "91%", delay: "-8s", duration: "17s" },
  { text: "%", top: "52%", left: "6%", delay: "-4s", duration: "13s" },
  { text: "$ CA", top: "64%", left: "89%", delay: "-10s", duration: "19s" },
  { text: "→", top: "72%", left: "10%", delay: "-1s", duration: "15s" },
  { text: "CHF", top: "84%", left: "84%", delay: "-7s", duration: "16s" },
  { text: "idée", top: "90%", left: "14%", delay: "-5s", duration: "20s" },
];

export function HomeBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="home-grid absolute inset-0" />
      <div className="home-orb home-orb-a" />
      <div className="home-orb home-orb-b" />
      <div className="home-orb home-orb-c" />
      {SYMBOLS.map((s) => (
        <span
          key={s.text}
          className="home-symbol absolute font-mono text-sm text-muted-foreground/40 select-none max-md:hidden"
          style={{ top: s.top, left: s.left, animationDelay: s.delay, animationDuration: s.duration }}
        >
          {s.text}
        </span>
      ))}
    </div>
  );
}
