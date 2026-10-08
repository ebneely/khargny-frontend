export const CITY_PAGE_SIZE = 24;

export function cityPageNumber(value: string | string[] | null | undefined): number {
  const number = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(number) && number > 0 && number <= 10000 ? number : 1;
}

export function cityPageHref(page: number, search = ''): string {
  const params = new URLSearchParams(search);
  if (page > 1) params.set('page', String(page));
  else params.delete('page');
  const query = params.toString();
  return query ? `?${query}` : '?';
}
