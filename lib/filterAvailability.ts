export const MIN_FILTER_RESULTS = 5;

export function availableCategories<T>(
  items: T[],
  categories: string[],
  matches: (item: T, category: string) => boolean,
): string[] {
  return categories.filter(category =>
    category === 'All' || items.filter(item => matches(item, category)).length >= MIN_FILTER_RESULTS
  );
}
