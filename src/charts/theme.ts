/**
 * Shared visual theme for every chart and for the site itself.
 *
 * The site's CSS variables are generated from this file (see `themeCss`), so
 * colours are defined in exactly one place.
 */
import type { PlotOptions } from '@observablehq/plot';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  /** Page and chart background. */
  background: string;
  /** Raised surfaces: cards, tooltips, table headers. */
  surface: string;
  /** Primary text. */
  text: string;
  /** Secondary text: axis labels, captions, metadata. */
  textSecondary: string;
  /** Grid lines and hairline borders. */
  grid: string;
  /** Main colour: single-series charts, links. */
  accent: string;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  /** Colours for multiple series. Assign in this order, never shuffled. */
  palette: readonly string[];
  fonts: {
    /** Titles. Always set in uppercase. */
    heading: string;
    /** Everything else. */
    body: string;
  };
  /** Stroke width for line marks, in px. */
  lineWidth: number;
}

const fonts = {
  heading: "'Oswald', 'Arial Narrow', sans-serif",
  body: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#FBFAF7',
    surface: '#FFFFFF',
    text: '#1D1D1F',
    textSecondary: '#6E6E73',
    grid: '#E4E2DC',
    accent: '#2F6FDE',
  },
  palette: [
    '#2a78d6',
    '#eb6834',
    '#1baf7a',
    '#eda100',
    '#e87ba4',
    '#008300',
    '#6250d6',
    '#e34948',
    '#8a5a2e',
    '#3a3a3a',
  ],
  fonts,
  lineWidth: 1.5,
};

/** Dark mode has its own colours, re-stepped for a dark surface (not inverted). */
export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#1A1A19',
    surface: '#242423',
    text: '#F0EFEC',
    textSecondary: '#A8A7A0',
    grid: '#383835',
    accent: '#5B9BF0',
  },
  palette: [
    '#3987e5',
    '#d95926',
    '#199e70',
    '#c98500',
    '#d55181',
    '#0ca30c',
    '#9085e9',
    '#e66767',
    '#8f6a4a',
    '#b9b8b1',
  ],
  fonts,
  lineWidth: 1.5,
};

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Theme of the colour scheme currently active in the browser. */
export function getTheme(): Theme {
  const dark = typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches;
  return dark ? darkTheme : lightTheme;
}

/** Calls `callback` when the OS colour scheme changes. Returns an unsubscribe function. */
export function onThemeChange(callback: (theme: Theme) => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  const listener = () => callback(getTheme());
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

/* -------------------------------------------------------------------------- */
/* Observable Plot defaults                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Default Plot options: horizontal grid only, no tick marks, no axis lines, no
 * frame, palette as the colour range. Pass your own options to override or
 * extend; `style`, `x`, `y` and `color` are merged one level deep.
 *
 * Grid and tick-label colours come from CSS (`.chart-container` rules in
 * `global.css`), so they follow the active colour scheme automatically.
 *
 *   Plot.plot(plotOptions(theme, { width, marks: [...] }))
 */
export function plotOptions(theme: Theme, options: PlotOptions = {}): PlotOptions {
  const { style, x, y, color, ...rest } = options;
  return {
    marginTop: 28,
    marginRight: 16,
    marginBottom: 36,
    marginLeft: 44,
    ...rest,
    style: {
      background: 'transparent',
      color: theme.colors.text,
      fontFamily: theme.fonts.body,
      fontSize: '12px',
      overflow: 'visible',
      ...(typeof style === 'object' ? style : {}),
    },
    x: { tickSize: 0, tickPadding: 8, grid: false, labelArrow: 'none', ...x },
    y: { ticks: 6, tickSize: 0, tickPadding: 8, grid: true, labelArrow: 'none', ...y },
    color: { range: [...theme.palette], ...color },
  };
}

/* -------------------------------------------------------------------------- */
/* Tooltip                                                                     */
/* -------------------------------------------------------------------------- */

export interface TooltipContent {
  /** First line, shown in bold. */
  title: string;
  /** Key/value rows shown under the title. */
  rows?: ReadonlyArray<readonly [key: string, value: string | number]>;
}

/**
 * Uniform tooltip for every chart: bold title, then key/value rows.
 *
 * It follows Plot's pointer interaction, so the plot needs at least one mark
 * using `Plot.pointer`, `Plot.pointerX` or `Plot.pointerY` (that mark also
 * works as the hover highlight). `format` receives the hovered datum.
 *
 *   const plot = Plot.plot(...);
 *   container.append(plot);
 *   const detach = attachTooltip(container, plot, (d: Row) => ({
 *     title: d.name,
 *     rows: [['Value', d.value]],
 *   }));
 *
 * Returns a function that removes the tooltip and its listeners.
 */
export function attachTooltip<Datum>(
  container: HTMLElement,
  plot: Element,
  format: (datum: Datum) => TooltipContent,
): () => void {
  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.setAttribute('aria-hidden', 'true');
  tooltip.hidden = true;
  container.append(tooltip);

  let pointerX = 0;
  let pointerY = 0;

  const place = () => {
    if (tooltip.hidden) return;
    const gap = 14;
    const maxLeft = container.clientWidth - tooltip.offsetWidth;
    // Right of the pointer when there is room, otherwise left of it.
    let left = pointerX + gap;
    if (left > maxLeft) left = pointerX - gap - tooltip.offsetWidth;
    left = Math.max(0, Math.min(left, maxLeft));
    const top = Math.max(0, pointerY - tooltip.offsetHeight - gap);
    tooltip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  };

  const onPointerMove = (event: PointerEvent) => {
    const box = container.getBoundingClientRect();
    pointerX = event.clientX - box.left;
    pointerY = event.clientY - box.top;
    place();
  };

  const onInput = () => {
    const datum = (plot as Element & { value?: Datum | null }).value;
    if (datum == null) {
      tooltip.hidden = true;
      return;
    }
    const { title, rows = [] } = format(datum);
    const heading = document.createElement('strong');
    heading.className = 'chart-tooltip-title';
    heading.textContent = title;
    const list = document.createElement('dl');
    for (const [key, value] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = key;
      const dd = document.createElement('dd');
      dd.textContent = String(value);
      list.append(dt, dd);
    }
    tooltip.replaceChildren(heading, ...(rows.length ? [list] : []));
    tooltip.hidden = false;
    place();
  };

  // Capture phase: record the pointer position before Plot emits `input`.
  container.addEventListener('pointermove', onPointerMove, true);
  container.addEventListener('pointerdown', onPointerMove, true);
  plot.addEventListener('input', onInput);

  return () => {
    container.removeEventListener('pointermove', onPointerMove, true);
    container.removeEventListener('pointerdown', onPointerMove, true);
    plot.removeEventListener('input', onInput);
    tooltip.remove();
  };
}

/* -------------------------------------------------------------------------- */
/* Site CSS variables                                                          */
/* -------------------------------------------------------------------------- */

function cssVariables(theme: Theme): string {
  const { colors, palette } = theme;
  return [
    `--bg:${colors.background}`,
    `--surface:${colors.surface}`,
    `--text:${colors.text}`,
    `--text-secondary:${colors.textSecondary}`,
    `--grid:${colors.grid}`,
    `--accent:${colors.accent}`,
    ...palette.map((color, i) => `--series-${i + 1}:${color}`),
  ].join(';');
}

/** CSS custom properties for both colour schemes, inlined in the page `<head>`. */
export function themeCss(): string {
  return (
    `:root{color-scheme:light dark;` +
    `--font-heading:${fonts.heading};--font-body:${fonts.body};` +
    `${cssVariables(lightTheme)}}` +
    `@media (prefers-color-scheme:dark){:root{${cssVariables(darkTheme)}}}`
  );
}
