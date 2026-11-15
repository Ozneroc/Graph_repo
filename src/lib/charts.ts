import { getCollection, type CollectionEntry } from 'astro:content';

export type ChartEntry = CollectionEntry<'charts'>;

/** Drafts are visible only in `astro dev` with SHOW_DRAFTS=true (npm run dev:drafts). */
const showDrafts = import.meta.env.DEV && import.meta.env.SHOW_DRAFTS === 'true';

// Only the keys are used: lets us skip the collection query (and Astro's
// "collection is empty" warning) while there are no charts at all.
const chartFiles = import.meta.glob('/src/content/charts/*/index.md');

const dataFiles = import.meta.glob<unknown>('/src/content/charts/*/data.json', {
  eager: true,
  import: 'default',
});

// Only the keys are used here, to check that a chart's module exists.
const chartModules = import.meta.glob([
  '/src/charts/*.ts',
  '!/src/charts/theme.ts',
  '!/src/charts/types.ts',
]);

/** Published charts (plus drafts when enabled), newest first. */
export async function getCharts(): Promise<ChartEntry[]> {
  if (Object.keys(chartFiles).length === 0) return [];
  const entries = await getCollection('charts', ({ data }) => showDrafts || !data.draft);
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Folder of a chart relative to the project root, e.g. `src/content/charts/my-chart`. */
function chartDir(entry: ChartEntry): string {
  return (entry.filePath ?? `src/content/charts/${entry.id}/index.md`).replace(/\/[^/]+$/, '');
}

/** Parsed `data.json` of a chart. Fails the build if the file is missing. */
export function getChartData(entry: ChartEntry): unknown {
  const key = `/${chartDir(entry)}/data.json`;
  if (!(key in dataFiles)) {
    throw new Error(`Chart "${entry.id}": missing data file ${key.slice(1)}`);
  }
  return dataFiles[key];
}

/** Fails the build if the `chart` field does not match a module in src/charts/. */
export function assertChartModule(entry: ChartEntry): void {
  const file = `/src/charts/${entry.data.chart}.ts`;
  if (!(file in chartModules)) {
    throw new Error(
      `Chart "${entry.id}": frontmatter says chart: "${entry.data.chart}" but ${file.slice(1)} does not exist`,
    );
  }
}

/** URL-safe version of a tag: "Public Health" -> "public-health". */
export function tagSlug(tag: string): string {
  return tag
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface TagInfo {
  slug: string;
  label: string;
  count: number;
}

/** All tags used by the given charts, most used first, then alphabetical. */
export function getTags(charts: ChartEntry[]): TagInfo[] {
  const tags = new Map<string, TagInfo>();
  for (const chart of charts) {
    for (const label of chart.data.tags) {
      const slug = tagSlug(label);
      if (!slug) continue;
      const tag = tags.get(slug) ?? { slug, label, count: 0 };
      tag.count += 1;
      tags.set(slug, tag);
    }
  }
  return [...tags.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Prefixes a site-internal path with the configured `base`: url('about/') -> '/charts/about/'. */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

const dateFormat = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export function formatDate(date: Date): string {
  return dateFormat.format(date);
}
