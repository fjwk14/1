# Meridian UI — design-sync notes

Repo-specific gotchas for future syncs.

## Build / environment
- `shape: package` (no Storybook). Build with `npm run build` (tsup → `dist/index.js` ESM + `dist/index.d.ts`, then copies `src/styles.css` → `dist/styles.css`). The converter entry is `--entry ./dist/index.js`, `--node-modules ./node_modules`.
- CSS: `cfg.cssEntry = dist/styles.css` holds BOTH the `--mrd-*` design tokens and all component styles. `_ds_bundle.css` is a placeholder in this shape (components use classNames + external stylesheet, not JS-imported CSS) — this is expected, not an error.
- Fonts: system font stack only (`--mrd-font-sans`), so no `@font-face` ships and no `[FONT_MISSING]` should fire. Nothing to do.
- Render check needs playwright + chromium. Chromium **build 1194** is pre-installed at `/opt/pw-browsers`; the matching release is **playwright@1.56.0** — install it into `.ds-sync/` with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`. A different playwright version fails with "Executable doesn't exist".

## Components
- 10 components, all in the `general` group: Button, Input, Textarea, Select, Checkbox, Switch, Badge, Avatar, Card, Alert.
- All previews authored in `.design-sync/previews/*.tsx`, graded good. No floor cards remain.
- Two type interfaces (`Card`, `Alert`) `Omit<HTMLAttributes, "title">` because they redefine `title` as `ReactNode` — required or the tsup dts build fails TS2430.

## Known render warns
- None outstanding. (First sync: `[RENDER_BLANK]` fired for Input/Textarea only while they were floor cards — resolved once real previews were authored.)

## Avatar previews
- The `Image`/`Square` cells use inline `data:image/svg+xml` portraits so cards render deterministically offline (no network image fetch). If you swap to real URLs, expect blank images in the headless render check.

## Re-sync risks
- Preview content is composition data authored by hand — if a component's prop API changes, re-check the matching `.design-sync/previews/<Name>.tsx` against the fresh `.d.ts`.
- `conventions.md` enumerates real `--mrd-*` token names and component names. If tokens are renamed/removed in `src/styles.css`, the conventions validation must be re-run (grep the names against the built `_ds_bundle.css`) and drift reported.
- Nothing here fetches from the network at build time except npm installs.
