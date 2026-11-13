// Meta bubbles = the two halves of the question, what (category) and where (area). Picking one in its sheet keeps the other half,
// sets the location bar to the place's city, and opens Explore on the new question (app.js meta-pick).
export type MetaPlace = { cat: string; city: string; area?: string | null };
export const metaSwap = (p: MetaPlace, kind: 'cat' | 'area', value: string) => ({
  city: p.city,
  area: kind === 'area' ? value : p.area || null,
  cat: kind === 'cat' ? value : p.cat,
});
