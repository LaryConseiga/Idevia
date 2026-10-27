import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown, parseBlocks, plainText, safeHref } from "@/lib/markdown";

const html = (source: string) => renderToStaticMarkup(<Markdown source={source} />);

describe("markdown du blog", () => {
  it("rend titres, listes, citations et mises en forme", () => {
    const out = html("# Titre\n\nUn **gras** et un *italique*.\n\n- un\n- deux\n\n1. premier\n2. second\n\n> une citation");
    expect(out).toBe(
      "<h2>Titre</h2><p>Un <strong>gras</strong> et un <em>italique</em>.</p><ul><li>un</li><li>deux</li></ul><ol><li>premier</li><li>second</li></ol><blockquote>une citation</blockquote>",
    );
  });

  it("n'injecte jamais de HTML ni de lien dangereux", () => {
    const out = html('<script>alert(1)</script> <img src=x onerror=alert(1)> [clic](javascript:alert(1)) [ok](https://exemple.org)');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("javascript:");
    expect(out).toContain('&lt;script&gt;');
    expect(out).toContain('<a href="https://exemple.org/" target="_blank" rel="noopener noreferrer nofollow">ok</a>');
  });

  it("n'accepte que les liens http(s) et les chemins internes", () => {
    expect(safeHref("/tarifs")).toBe("/tarifs");
    expect(safeHref("//evil.example")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
    expect(safeHref("javascript:alert(1)")).toBeNull();
  });

  it("regroupe les lignes d'un même paragraphe et donne un texte brut", () => {
    expect(parseBlocks("ligne un\nligne deux")).toEqual([{ kind: "p", text: "ligne un ligne deux" }]);
    expect(plainText("## Titre\n\nVoir [ici](https://x.org) **vite**")).toBe("Titre Voir ici vite");
  });
});
