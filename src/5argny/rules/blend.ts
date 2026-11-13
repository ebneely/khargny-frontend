// Feed and stories ranking with paid places blended in (app.js blend; DIRECTION "Ad blending algorithm"). One function for both.
export type BlendPlace = {
  id: string; cat: string; city: string; area?: string | null;
  promoted: boolean; // paid; never labelled on the card
  views30: number; likes30: number; go30: number;
  photos: number; hasHours: boolean; amenities: number; badges: number;
  freshness: number; // 0..1, from days since added or updated
};
export type BlendContext = {
  affinity: Record<string, number>; // the person's interest by category, from their likes, saves and opens
  city: string | null; area: string | null; // the location bar
  seen: ReadonlySet<string>; // ads already shown this session
  shownToday: Readonly<Record<string, number>>; // ad shows per place to this person in the last 24 h
};
export type Blended = { p: BlendPlace; ad: boolean; score: number };

export const RULES = { social: { first: 2, per: 10, max: 2, gap: 4 }, stories: { first: 1, per: 8, max: 2, gap: 3 } } as const;
export const RELEVANCE_FLOOR = 0.8; // an ad takes a slot only if at least 80% as relevant as the organic item it pushes down
export const FREQUENCY_CAP = 3; // ad shows per person per day
export const WEIGHTS = { interest: 0.4, popularity: 0.25, quality: 0.2, freshness: 0.15 } as const;

export const affinityOf = (p: BlendPlace, ctx: BlendContext) => {
  const tot = Object.values(ctx.affinity).reduce((a, b) => a + b, 0);
  return tot ? (ctx.affinity[p.cat] ?? 0) / tot : 0;
};
export const quality = (p: BlendPlace) => Math.min(1, (p.photos / 5) * 0.5 + (p.hasHours ? 0.25 : 0) + (p.amenities ? 0.15 : 0) + (p.badges ? 0.1 : 0));
// 1 in the chosen area (or no location), 0.4 elsewhere in the city, 0.15 in another city
export const locationFit = (p: BlendPlace, ctx: BlendContext) => (p.city === ctx.city || !ctx.city ? (!ctx.area || p.area === ctx.area ? 1 : 0.4) : 0.15);

export const organicScore = (p: BlendPlace, ctx: BlendContext, maxViews: number) =>
  (WEIGHTS.interest * affinityOf(p, ctx) + WEIGHTS.popularity * (p.views30 / maxViews) + WEIGHTS.quality * quality(p) + WEIGHTS.freshness * p.freshness) * locationFit(p, ctx);

// price x expected tap rate x relevance x quality; price is flat (1) until bidding
export const adScore = (p: BlendPlace, ctx: BlendContext, price = 1) =>
  price * ((p.likes30 + p.go30 + 1) / (p.views30 + 30)) * (0.5 + affinityOf(p, ctx) + locationFit(p, ctx)) * (0.5 + quality(p));

// never two places of the same category back to back, when another category is left
export function diversify<T extends { cat: string }>(list: T[]): T[] {
  const out: T[] = [], rest = [...list];
  while (rest.length) {
    const prev = out[out.length - 1];
    const i = rest.findIndex((x) => !prev || x.cat !== prev.cat);
    out.push(rest.splice(i < 0 ? 0 : i, 1)[0]!);
  }
  return out;
}

// The caller counts the shows it renders (items with ad: true) into shownToday and seen.
export function blend(surface: keyof typeof RULES, pool: BlendPlace[], n: number, ctx: BlendContext): Blended[] {
  const R = RULES[surface];
  const maxViews = Math.max(1, ...pool.map((p) => p.views30));
  const org = (p: BlendPlace) => organicScore(p, ctx, maxViews);
  const ads = pool
    .filter((p) => p.promoted && locationFit(p, ctx) > 0.3 && !ctx.seen.has(p.id) && (ctx.shownToday[p.id] ?? 0) < FREQUENCY_CAP)
    .map((p) => ({ p, s: adScore(p, ctx) })).sort((a, b) => b.s - a.s);
  const organic = diversify(pool.filter((p) => !p.promoted).map((p) => ({ p, s: org(p), cat: p.cat })).sort((a, b) => b.s - a.s));
  const out: Blended[] = [];
  let sinceAd: number = R.gap, used = 0;
  for (const { p, s } of organic) {
    if (out.length >= n) break;
    const ad = ads[0];
    const slotOk = ad && out.length >= R.first && sinceAd >= R.gap && used < R.max * Math.ceil((out.length + 1) / R.per)
      && (!out.length || out[out.length - 1]!.p.cat !== ad.p.cat);
    if (slotOk && org(ad.p) >= s * RELEVANCE_FLOOR) { out.push({ p: ad.p, ad: true, score: ad.s }); ads.shift(); used++; sinceAd = 0; }
    out.push({ p, ad: false, score: s });
    sinceAd++;
  }
  return out.slice(0, n);
}
