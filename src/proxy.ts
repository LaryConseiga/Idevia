import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (ex-middleware) :
 * 1. CSP : nonce strict sur les espaces privés (rendus dynamiquement), politique statique sur le site public ;
 * 2. noindex sur tout ce qui n'est pas du contenu public ;
 * 3. redirection optimiste vers /connexion sans cookie de session.
 *    Ce n'est PAS le contrôle d'accès : chaque page et action revérifie la session côté serveur (DAL).
 */

const AUTHENTICATED = ["/tableau-de-bord", "/projets", "/assistant", "/compte", "/admin"];
const PRIVATE = [...AUTHENTICATED, "/diagnostic", "/connexion", "/inscription", "/mot-de-passe", "/verification"];

const startsWithAny = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));

const isDev = process.env.NODE_ENV === "development";

// Neon Realtime (WebSocket) : seule origine externe à laquelle le navigateur peut se connecter.
const realtimeOrigin = process.env.NEON_REALTIME_URL ? new URL(process.env.NEON_REALTIME_URL).origin : null;

function csp(scriptSrc: string, styleSrc: string) {
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src ${styleSrc}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${realtimeOrigin ? ` ${realtimeOrigin}` : ""}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPrivate = startsWithAny(pathname, PRIVATE);

  if (startsWithAny(pathname, AUTHENTICATED) && !getSessionCookie(request, { cookiePrefix: "idevia" })) {
    const url = new URL("/connexion", request.url);
    url.searchParams.set("suivant", pathname + search);
    return NextResponse.redirect(url);
  }

  let policy: string;
  const requestHeaders = new Headers(request.headers);

  if (isPrivate) {
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
    // Les attributs style="" générés par React restent nécessaires : 'unsafe-inline' pour les styles uniquement.
    policy = csp(`'self' 'nonce-${nonce}' 'strict-dynamic'`, "'self' 'unsafe-inline'");
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", policy);
  } else {
    // Pages publiques statiques : aucun contenu saisi par un utilisateur n'y est rendu.
    policy = csp("'self' 'unsafe-inline'", "'self' 'unsafe-inline'");
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  if (isPrivate) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
