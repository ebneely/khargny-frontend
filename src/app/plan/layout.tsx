import type { Metadata } from "next";
import { alternatesFor, currentLocale } from "@/lib/seo";

/**
 * The plan is one guest's saved list, keyed to their cookie. There is nothing here for a
 * search result to point at, and indexing it would publish a stranger's page under a
 * shared URL. robots.txt disallows it as well; this is the in-page half of the same rule.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const isAr = locale === "ar";

  return {
    title: isAr ? "خطتي" : "My plan",
    description: isAr
      ? "الأماكن اللي حفظتها، مترتبة حسب اليوم."
      : "Every place you saved, grouped by the day you planned.",
    alternates: alternatesFor("/plan", locale),
    robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
  };
}

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
