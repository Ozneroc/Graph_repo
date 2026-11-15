// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages project site: https://<user>.github.io/charts/
// Change GITHUB_USER if your GitHub username is different, and REPO_NAME if
// you rename the repository.
const GITHUB_USER = 'ozneroc';
const REPO_NAME = 'charts';

export default defineConfig({
  site: `https://${GITHUB_USER}.github.io`,
  base: `/${REPO_NAME}`,
  trailingSlash: 'always',
});
