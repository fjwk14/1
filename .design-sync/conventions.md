# Building with Meridian UI

Meridian is a calm, professional React design system: slate neutrals, a muted
indigo accent, sharp corners, restrained elevation. Compose the shipped
components — never re-implement them — and use Meridian's design tokens for any
layout glue you write, so everything stays on-brand.

## Setup

No provider or context wrapper is required. The single requirement is that the
design system's stylesheet is loaded (it always is in this environment via the
`styles.css` import closure). All components are plain React and render styled
out of the box:

```tsx
import { Button, Card, Badge } from "meridian-ui";

<Card title="Project status" action={<Badge tone="success" dot>Active</Badge>}>
  <p style={{ color: "var(--mrd-slate-600)" }}>All services operating normally.</p>
  <Button variant="primary">View details</Button>
</Card>
```

## Styling idiom — use the tokens, not the internal classes

Meridian components carry their own styles. You do **not** add class names to
them. The component-level classes in the stylesheet are prefixed `mrd-*`
(e.g. `mrd-btn`, `mrd-card`) and are **internal** — do not hand-write them.

For your **own** layout and surrounding markup, style with Meridian's CSS
custom properties (all prefixed `--mrd-`) so your work matches the system.
The real token families are:

| Family | Real names (examples) | Use for |
|---|---|---|
| Neutrals | `--mrd-slate-50` … `--mrd-slate-900` | text, borders, muted surfaces |
| Accent | `--mrd-primary-50/100/500/600/700`, `--mrd-accent`, `--mrd-accent-hover` | brand/interactive color |
| Semantic | `--mrd-success-*`, `--mrd-warning-*`, `--mrd-danger-*`, `--mrd-info-*` (each `-50/-200/-600/-700`) | status |
| Roles | `--mrd-bg`, `--mrd-surface`, `--mrd-surface-muted`, `--mrd-text`, `--mrd-text-muted`, `--mrd-border`, `--mrd-border-strong` | page/surface roles |
| Spacing | `--mrd-space-1` (4px) … `--mrd-space-8` (32px) | gap, padding, margin |
| Radius | `--mrd-radius-sm/md/lg/full` | corners (keep them sharp — sm/md) |
| Type | `--mrd-font-sans`, `--mrd-text-xs/sm/base/md/lg/xl`, `--mrd-weight-medium/semibold` | text |
| Elevation | `--mrd-shadow-sm/md/lg` | shadows (use sparingly) |

Example of on-brand layout glue:

```tsx
<div style={{ display: "grid", gap: "var(--mrd-space-4)", padding: "var(--mrd-space-6)",
  background: "var(--mrd-surface-muted)", borderRadius: "var(--mrd-radius-lg)" }}>
  {/* Meridian components go here */}
</div>
```

## Components (all in the `general` group)

- **Actions** — `Button` (`variant`: primary/secondary/ghost/danger, `size`, `loading`)
- **Forms** — `Input`, `Textarea`, `Select` (all take `label`/`hint`/`error`/`required`;
  Select also `options`/`placeholder`), `Checkbox` (`indeterminate`, `description`),
  `Switch` (`label`, `labelPosition`)
- **Data display** — `Badge` (`tone`, `dot`, `square`), `Avatar` (`src`, `name`, `size`, `status`, `square`)
- **Layout** — `Card` (`title`/`subtitle`/`action`/`footer`, `raised`, `interactive`, `flush`)
- **Feedback** — `Alert` (`tone`: info/success/warning/danger, `title`)

## Where the truth lives

Read `styles.css` (and its `@import`ed `_ds_bundle.css`) for the full token
definitions before styling. Each component's exact prop contract is in its
`<Name>.d.ts`, and usage guidance is in its `<Name>.prompt.md`.
