import type { Theme } from './theme';

/**
 * Signature every chart module in `src/charts/<name>.ts` must export as `render`.
 *
 * The chart page calls it once the data is loaded, and again whenever the
 * container is resized or the colour scheme changes. Before each new call (and
 * when the page goes away) the returned cleanup function, if any, is invoked.
 *
 * @param container Empty element to draw into. Read `container.clientWidth` for the width.
 * @param data      Parsed content of the chart's `data.json`.
 * @param theme     Colours and fonts of the active colour scheme.
 */
export type ChartRender = (
  container: HTMLElement,
  data: unknown,
  theme: Theme,
) => void | (() => void);

export interface ChartModule {
  render: ChartRender;
}
