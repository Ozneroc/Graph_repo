import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import type { Loader } from 'astro/loaders';
import { z } from 'astro/zod';

// One folder per chart: src/content/charts/<slug>/index.md
const chartFiles = glob({ pattern: '*/index.md', base: './src/content/charts' });

// The site is meant to build cleanly with zero charts, so the glob loader's
// "No files found" warning is dropped. Every other message goes through.
const chartsLoader: Loader = {
  ...chartFiles,
  load: (context) => {
    const logger = Object.create(context.logger) as typeof context.logger;
    logger.warn = (message: string) => {
      if (!message.startsWith('No files found')) context.logger.warn(message);
    };
    return chartFiles.load({ ...context, logger });
  },
};

const charts = defineCollection({
  loader: chartsLoader,
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      subtitle: z.string().min(1),
      /** Publication date. */
      date: z.coerce.date(),
      tags: z.array(z.string().min(1)),
      source: z.string().min(1),
      /** Link to the Reddit post, once published. */
      redditUrl: z.url().optional(),
      /** Static image posted on Reddit, relative to index.md. */
      preview: image(),
      /** Name of the module in src/charts/ (without extension). */
      chart: z.string().min(1),
      /** Drafts are never included in the production build. */
      draft: z.boolean().default(false),
    }),
});

export const collections = { charts };
