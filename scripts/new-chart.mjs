#!/usr/bin/env node
// Scaffolds a new chart:  npm run new-chart <slug>
//
//   src/content/charts/<slug>/index.md     frontmatter + text (draft: true)
//   src/content/charts/<slug>/data.json    empty array
//   src/content/charts/<slug>/preview.png  placeholder image
//   src/charts/<slug>.ts                   chart module with the render() signature

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv[2];
const RESERVED = ['theme', 'types'];

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

if (!slug) fail('missing slug.\nUsage: npm run new-chart <slug>   (example: npm run new-chart coffee-prices)');
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  fail(`"${slug}" is not a valid slug. Use lowercase letters, digits and single hyphens (example: coffee-prices).`);
}
if (RESERVED.includes(slug)) fail(`"${slug}" is reserved (src/charts/${slug}.ts is a shared file).`);

const contentDir = join(root, 'src/content/charts', slug);
const moduleFile = join(root, 'src/charts', `${slug}.ts`);

if (existsSync(contentDir)) fail(`${relative(root, contentDir)} already exists.`);
if (existsSync(moduleFile)) fail(`${relative(root, moduleFile)} already exists.`);

const title = slug
  .split('-')
  .map((word) => word[0].toUpperCase() + word.slice(1))
  .join(' ');
const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time

const indexMd = `---
title: "${title}"
subtitle: "One sentence saying what the chart shows"
date: ${today}
tags: []
source: "Where the data comes from"
# redditUrl: https://www.reddit.com/r/dataisbeautiful/comments/...
preview: ./preview.png
chart: ${slug}
draft: true
---

## Highlights

- First takeaway.

## Method

How the data was collected and processed.

## Notes

Caveats and anything else worth knowing.
`;

const moduleTs = `import * as Plot from '@observablehq/plot';
import { attachTooltip, plotOptions } from './theme';
import type { ChartRender } from './types';

/** Shape of one row of src/content/charts/${slug}/data.json. Adjust to your data. */
interface Row {
  label: string;
  value: number;
}

export const render: ChartRender = (container, data, theme) => {
  const rows = data as Row[];
  const width = container.clientWidth;

  // ---------------------------------------------------------------------
  // Write the chart here.
  //
  // - plotOptions(theme, {...}) adds the shared defaults (fonts, grid, axes).
  // - theme.colors.accent is the main colour; theme.palette is for multiple
  //   series, in order.
  // - render() runs again on resize and on light/dark change, so always use
  //   \`width\` and \`theme\` instead of fixed values.
  // - For the tooltip, the plot needs one mark using Plot.pointerX /
  //   Plot.pointerY / Plot.pointer (it doubles as the hover highlight).
  // ---------------------------------------------------------------------
  const plot = Plot.plot(
    plotOptions(theme, {
      width,
      height: Math.max(280, Math.min(480, width * 0.56)),
      marks: [
        // Example:
        // Plot.barY(rows, { x: 'label', y: 'value', fill: theme.colors.accent }),
        // Plot.barY(rows, Plot.pointerX({ x: 'label', y: 'value', fill: theme.colors.text, fillOpacity: 0.15 })),
        Plot.ruleY([0], { stroke: theme.colors.textSecondary }),
      ],
    }),
  );
  container.append(plot);

  const detachTooltip = attachTooltip(container, plot, (d: Row) => ({
    title: d.label,
    rows: [['Value', d.value.toLocaleString('en-US')]],
  }));

  // Cleanup: called before the next render and when the page is closed.
  return () => {
    detachTooltip();
    plot.remove();
  };
};
`;

/** Minimal PNG encoder (RGB, 8 bit) for the placeholder preview: no dependencies. */
function placeholderPng(width, height) {
  const background = [0xfb, 0xfa, 0xf7];
  const grid = [0xe4, 0xe2, 0xdc];
  const accent = [0x2f, 0x6f, 0xde];
  const baseline = Math.round(height * 0.78);
  const bars = [0.3, 0.52, 0.4, 0.68, 0.58].map((share, i) => ({
    x0: Math.round(width * (0.2 + i * 0.125)),
    x1: Math.round(width * (0.2 + i * 0.125 + 0.085)),
    y0: Math.round(baseline - height * 0.6 * share),
    color: i === 3 ? accent : grid,
  }));

  const stride = width * 3 + 1; // +1 filter byte per row
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride + 1;
    for (let x = 0; x < width; x++) {
      let color = background;
      if (y >= baseline && y < baseline + 3 && x > width * 0.15 && x < width * 0.85) color = grid;
      for (const bar of bars) {
        if (x >= bar.x0 && x < bar.x1 && y >= bar.y0 && y < baseline) color = bar.color;
      }
      raw.set(color, rowStart + x * 3);
    }
  }

  const chunk = (type, body) => {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(body.length);
    const data = Buffer.concat([Buffer.from(type, 'ascii'), body]);
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE(crc32(data));
    return Buffer.concat([head, data, tail]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8 bit, RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(contentDir, { recursive: true });
writeFileSync(join(contentDir, 'index.md'), indexMd);
writeFileSync(join(contentDir, 'data.json'), '[]\n');
writeFileSync(join(contentDir, 'preview.png'), placeholderPng(1200, 675));
writeFileSync(moduleFile, moduleTs);

const contentPath = relative(root, contentDir);
console.log(`
Created chart "${slug}":
  ${contentPath}/index.md      text and frontmatter (draft: true)
  ${contentPath}/data.json     put your data here
  ${contentPath}/preview.png   replace with the image posted on Reddit
  ${relative(root, moduleFile)}    write the chart here

Next: npm run dev:drafts  ->  http://localhost:4321/charts/charts/${slug}/
`);
