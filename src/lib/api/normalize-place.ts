export interface PlaceFlags {
  hasMenu: boolean;
  priceVerified: boolean;
  visitedByUs: boolean;
}

export function normalizePlaceFlags<Payload extends object>(place: Payload): Payload & PlaceFlags {
  const flags = place as Partial<PlaceFlags>;
  return {
    ...place,
    hasMenu: flags.hasMenu === true,
    priceVerified: flags.priceVerified === true,
    visitedByUs: flags.visitedByUs === true,
  };
}
