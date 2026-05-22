# [Now We Try It My Way](https://nowwetry.it)

A personal recipe collection built with [Astro](https://astro.build) and [CookLang](https://cooklang.org). Recipes are plain `.cook` text files; the site renders them with interactive ingredient scaling, per-step timers, and a step checklist.

## Features

- Ingredient scaler — adjust servings and all quantities update live
- Step timers — start a countdown directly from any timed step
- Step checklist — check off steps as you cook

## Adding a recipe

1. Create a `.cook` file in `src/content/recipes/`.
2. Add metadata comments at the top of the file:

```cook
>> title: Pasta Carbonara
>> description: Classic Roman pasta with eggs, guanciale, and Pecorino.
>> category: Pasta
>> servings: 2
>> prepTime: 10 mins
>> cookTime: 20 mins
>> photo: /images/pasta-carbonara.jpg
```

3. Write the recipe body in CookLang syntax. The parser picks up `@ingredients{}`, `#cookware{}`, and `~timers{}` automatically.

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
