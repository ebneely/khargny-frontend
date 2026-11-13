import type { Metadata } from "next";
import { PrivacyPolicyContent } from "@/components/privacy/PrivacyPolicyContent";
import { alternatesFor, currentLocale, ogLocale, urlFor } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const isAr = locale === "ar";
  const title = isAr ? "سياسة الخصوصية" : "Privacy policy";
  const description = isAr
    ? "خرجني بيتعامل إزاي مع بياناتك: إحنا بنحفظ إيه، وليه، وإنت بتتحكم فيها إزاي."
    : "How Khargny handles your data — what is stored, why, and how you control it.";

  return {
    title,
    description,
    alternates: alternatesFor("/privacy", locale),
    openGraph: {
      type: "website",
      title,
      description,
      url: urlFor("/privacy", locale),
      locale: ogLocale(locale),
    },
  };
}

export default function PrivacyPolicy() {
  return <PrivacyPolicyContent />;
}
