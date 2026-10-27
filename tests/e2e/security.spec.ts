import { expect, test } from "@playwright/test";

const PRIVATE_PAGES = ["/tableau-de-bord", "/idees", "/projet", "/assistant", "/compte", "/compte/donnees", "/compte/suppression", "/admin", "/admin/utilisateurs"];
const PUBLIC_PAGES = ["/", "/comment-ca-marche", "/tarifs", "/faq", "/contact", "/blog", "/legal/conditions", "/legal/confidentialite", "/legal/mentions-legales"];

test.describe("espace privé", () => {
  for (const path of PRIVATE_PAGES) {
    test(`${path} renvoie vers la connexion sans session`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect([302, 307]).toContain(response.status());
      expect(response.headers().location).toContain(`/connexion?suivant=${encodeURIComponent(path)}`);
    });
  }

  test("les pages de connexion ne sont ni indexées ni mises en cache", async ({ request }) => {
    const response = await request.get("/connexion");
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  });
});

test.describe("API", () => {
  test("l'export des données exige une session", async ({ request }) => {
    expect((await request.get("/api/compte/export")).status()).toBe(401);
  });

  for (const path of ["/api/cron/purge", "/api/cron/reminders"]) {
    test(`${path} exige le secret des tâches planifiées`, async ({ request }) => {
      expect((await request.get(path)).status()).toBe(401);
      expect((await request.get(path, { headers: { authorization: "Bearer mauvais-secret" } })).status()).toBe(401);
    });
  }

  test("un lien de désabonnement falsifié ne désabonne personne", async ({ request }) => {
    const get = await request.get("/api/email/rappels?u=quelqu-un&t=faux", { maxRedirects: 0 });
    expect(get.status()).toBe(303);
    expect(get.headers().location).toMatch(/\/compte$/);
    expect((await request.post("/api/email/rappels?u=quelqu-un&t=faux")).status()).toBe(400);
  });
});

test.describe("site public", () => {
  test("en-têtes de sécurité", async ({ request }) => {
    const headers = (await request.get("/")).headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
  });

  for (const path of PUBLIC_PAGES) {
    test(`${path} répond, avec un titre et une description`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      expect(await page.title()).toMatch(/Idevia/);
      expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
      expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBeTruthy();
    });
  }

  test("aucun lien interne cassé depuis l'en-tête, le pied de page et les pages publiques", async ({ page, request }) => {
    const links = new Set<string>();
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      for (const href of await page.locator("a[href^='/']").evaluateAll((els) => els.map((a) => a.getAttribute("href")!))) {
        links.add(href.split("#")[0]);
      }
    }
    const broken: string[] = [];
    for (const href of links) {
      if (href.startsWith("/api/")) continue;
      const status = (await request.get(href)).status();
      if (status >= 400) broken.push(`${href} → ${status}`);
    }
    expect(broken).toEqual([]);
  });

  test("référencement : robots, sitemap, image de partage, données structurées", async ({ page, request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    for (const path of ["/projet", "/assistant", "/compte", "/api/"]) expect(robots).toContain(`Disallow: ${path}`);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/faq");
    expect(sitemap).not.toContain("/tableau-de-bord");
    const og = await request.get("/opengraph-image");
    expect(og.headers()["content-type"]).toContain("image/png");
    await page.goto("/faq");
    const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
    expect(jsonLd["@type"]).toBe("FAQPage");
    expect(jsonLd.mainEntity.length).toBeGreaterThan(5);
  });
});
