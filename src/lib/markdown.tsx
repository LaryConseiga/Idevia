import type { ReactNode } from "react";

/**
 * Markdown minimal pour les articles du blog, rendu en éléments React : aucun HTML brut n'est jamais injecté,
 * donc un article ne peut pas exécuter de script. Pris en charge : titres (##, ###), paragraphes, listes à puces
 * et numérotées, citations, **gras**, *italique*, `code` et liens [texte](https://… ou /chemin).
 */

type Block =
  | { kind: "h2" | "h3" | "p" | "quote"; text: string }
  | { kind: "ul" | "ol"; items: string[] };

export function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join(" ") });
    paragraph = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    const quote = line.match(/^>\s?(.*)$/);
    if (heading) {
      flush();
      // Le titre de l'article est le seul h1 de la page : « # » devient un h2.
      blocks.push({ kind: heading[1].length === 3 ? "h3" : "h2", text: heading[2] });
    } else if (bullet || numbered) {
      flush();
      const kind = bullet ? "ul" : "ol";
      const last = blocks.at(-1);
      const item = (bullet ?? numbered)![1];
      if (last && last.kind === kind) last.items.push(item);
      else blocks.push({ kind, items: [item] });
    } else if (quote) {
      flush();
      const last = blocks.at(-1);
      if (last?.kind === "quote") last.text += ` ${quote[1]}`;
      else blocks.push({ kind: "quote", text: quote[1] });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

/** Seuls les liens http(s) et les chemins internes sont gardés ; javascript:, data: et les autres deviennent du texte. */
export function safeHref(href: string): string | null {
  if (/^\/(?!\/)/.test(href)) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

export function renderInline(text: string, keyPrefix = ""): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={key}>{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      if (!href) return link[1];
      const external = !href.startsWith("/");
      return (
        <a key={key} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
          {link[1]}
        </a>
      );
    }
    return part;
  });
}

export function Markdown({ source }: { source: string }) {
  return (
    <>
      {parseBlocks(source).map((block, i) => {
        switch (block.kind) {
          case "h2":
            return <h2 key={i}>{renderInline(block.text, `${i}-`)}</h2>;
          case "h3":
            return <h3 key={i}>{renderInline(block.text, `${i}-`)}</h3>;
          case "quote":
            return <blockquote key={i}>{renderInline(block.text, `${i}-`)}</blockquote>;
          case "ul":
          case "ol": {
            const List = block.kind;
            return (
              <List key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item, `${i}-${j}-`)}</li>
                ))}
              </List>
            );
          }
          default:
            return <p key={i}>{renderInline(block.text, `${i}-`)}</p>;
        }
      })}
    </>
  );
}

/** Texte brut, pour la description par défaut d'un article et l'estimation du temps de lecture. */
export function plainText(source: string): string {
  return source
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*`_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
