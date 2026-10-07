export type PriceLevel = 1 | 2 | 3 | 4;

export const PRICE_LEVELS = [1, 2, 3, 4] as const;

const PRICE_BANDS = {
  ar: ["١ – ١٠٠ جنيه", "١٠٠ – ٥٠٠ جنيه", "٥٠٠ – ١٬٠٠٠ جنيه", "١٬٠٠٠ – ٥٬٠٠٠+ جنيه"],
  en: ["1 – 100 EGP", "100 – 500 EGP", "500 – 1,000 EGP", "1,000 – 5,000+ EGP"],
} as const;

export function priceBandLabel(level: number | null | undefined, locale: string = "ar"): string | null {
  if (typeof level !== "number" || !Number.isInteger(level) || level < 1 || level > 4) return null;
  return PRICE_BANDS[locale === "en" ? "en" : "ar"][level - 1];
}

export function formatMenuPrice(price: string, locale: string = "ar"): string {
  const amount = price.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  if (locale === "en") return `${amount} EGP`;
  const arabicAmount = amount.replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]).replace(".", "٫");
  return `${arabicAmount} جنيه`;
}
