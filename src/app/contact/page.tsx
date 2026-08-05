import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { alternatesFor, currentLocale, ogLocale, urlFor } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const isAr = locale === "ar";
  const title = isAr ? "تواصل معنا" : "Contact us";
  const description = isAr
    ? "اقترح مكانًا، أبلغ عن معلومة غير دقيقة، أو تواصل مع فريق خرجني."
    : "Suggest a place, report something inaccurate, or get in touch with the Khargny team.";

  return {
    title,
    description,
    alternates: alternatesFor("/contact", locale),
    openGraph: {
      type: "website",
      title,
      description,
      url: urlFor("/contact", locale),
      locale: ogLocale(locale),
    },
  };
}

export default function ContactPage() {
  return <ContactForm />;
}
