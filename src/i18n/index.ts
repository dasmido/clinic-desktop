import ar from './locales/ar.json';

// Only Arabic is supported for now; add more locale JSON files here to extend.
const messages = { ar } as const;

type Messages = typeof messages['ar'];
type DotPath<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : DotPath<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type TranslationKey = DotPath<Messages>;

const locale = 'ar';

/** Looks up a dot-separated key (e.g. "dashboard.columns.patient") in the active locale. */
export function t(key: TranslationKey): string {
  const value = key
    .split('.')
    .reduce<unknown>((acc, segment) => (acc as Record<string, unknown>)?.[segment], messages[locale]);

  return typeof value === 'string' ? value : key;
}
