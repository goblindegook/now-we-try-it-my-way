# [Now We Try It My Way](https://nowwetry.it)

A personal recipe collection built with [Astro](https://astro.build) and [CookLang](https://cooklang.org). Recipes are plain `.cook` text files; the site renders them with interactive ingredient scaling, per-step timers, and a step checklist.

## Features

- Ingredient scaler
- Multiple step timers
- Step checklist
- Keep screen on while you cook

## Adding a recipe

1. Create a `.cook` file in `src/content/recipes/`.
2. Add YAML frontmatter at the top of the file:

```cook
---
title: Pasta Carbonara
description: Classic Roman pasta with eggs, guanciale, and Pecorino.
category: Mains
cuisine: Italian
tags:
  - pasta
  - quick
servings: 2
image: pasta-carbonara.jpeg
prep time: 10 minutes
cook time: 20 minutes
created: 2026-05-24
updated: 2026-05-24
---
```

3. Write recipe body in Cooklang syntax:

```cook
Bring salted water to boil in #pot{}.
Cook @spaghetti{200%g} for ~{10%minutes}.
Toss with @pecorino romano{50%g} and @black pepper{}.
```

`@ingredient{quantity%unit}` defines ingredients, `#cookware{}` defines cookware, and `~{time%unit}` defines timers.

## Development

```sh
npm install
npm run dev        # dev server at localhost:4321
npm run build      # production build to ./dist/
npm run preview    # preview the production build
npm run lint       # check with Biome
npm run lint:fix   # auto-fix lint issues
npm run test       # unit tests (Vitest) + E2E tests (Playwright)
npm run test:unit
npm run test:e2e
```

Requires Node >= 22.12.0.

## License

MIT
