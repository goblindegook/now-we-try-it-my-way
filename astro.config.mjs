import { defineConfig } from 'astro/config';
import lit from "@astrojs/lit";
import image from "@astrojs/image";
import sitemap from "@astrojs/sitemap";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [lit(), image(), sitemap(), tailwind()]
});