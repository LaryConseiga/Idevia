import type { Metadata } from "next";
import { FAQS, FaqList } from "@/components/marketing/faq";
import { JsonLd } from "@/components/marketing/json-ld";
import { PageShell } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Questions fréquentes",
  description: "Gratuité, pays couverts, données personnelles, vérification terrain, coach : les réponses aux questions les plus courantes sur Idevia.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <PageShell eyebrow="FAQ" title="Questions fréquentes">
      <FaqList items={FAQS} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }}
      />
    </PageShell>
  );
}
