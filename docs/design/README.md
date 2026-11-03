# Personal — design guide for Claude Code

Read this before building or changing any UI. The goal: every screen looks like the approved designs, not like a generic AI-generated app.

## Files in this folder
| File | What it is | How to use it |
| --- | --- | --- |
| `tokens.json` | Every colour (light + dark), type style, spacing step, radius and shadow | The source of truth. Never use a value that is not here. |
| `personal.css` | The reference stylesheet: tokens as CSS variables, every component class, every animation | Copy the `:root` and `[data-theme="dark"]` blocks into `apps/app/src/styles/tokens.css` as-is. Rebuild each component class as a React component with the same values. |
| `tailwind-theme.css` | Tailwind v4 `@theme` mapping onto the CSS variables | Import after `tokens.css` so `bg-brand-blue`, `rounded-md`, `text-ink-muted` etc. use the tokens. |
| `components.md` | Every component, its class, sizes and states | Build these in `packages/ui` first, before any screen. |
| `motion.md` | Durations, easings and exact recipes for each interaction | Follow the recipes exactly. |
| `screens/*.dc.html` | The approved screen designs (HTML reference) | Match their layout, spacing, copy and hierarchy. Ignore `<x-dc>`, `<sc-for>`, `<sc-if>`, `<dc-import>` and `{{…}}`: those belong to the design tool. The class names and inline styles are what matter. |
| `screens.md` | Which screen is which route, and what it uses | Use it to plan UI tasks. |

## Non-negotiable UI rules
1. Only token values. No raw hex, no new font sizes, no new radii, no new shadows. Dark mode works by swapping the CSS variables, so components never check the theme themselves.
2. Radii: 4px (checkbox, tag, chip), 6px (button, input, nav item, list), 8px (card, banner, toast, note card), 12px only for sheets, dialogs and the command palette. No pills except avatars, switches and status dots. No `rounded-2xl`, `rounded-3xl`, `rounded-full` on cards or buttons.
3. One primary (`brand-blue`) button per view. Everything else is secondary or ghost.
4. Font: Plus Jakarta Sans 400–800 for all UI; JetBrains Mono only for keyboard hints and code. Use the type styles in `tokens.json`; headings use their negative letter-spacing.
5. Icons: `lucide-react`, stroke width 2, sizes 16/18/20/24 as in `components.md`. No emoji anywhere in the UI.
6. Touch targets at least 44×44 on mobile. Task rows 56px. The checkbox's hit area is 44×44 even though the box is 20×20.
7. Motion: only the recipes in `motion.md`. Transform and opacity only. Everything respects `prefers-reduced-motion`.
8. Offline and unsynced states use `warn` colours, never `danger`. Copy says what will happen: "Saved on this phone. Will sync when you're back online."
9. Copy: sentence case, short and specific, no exclamation marks except "You're all set".
10. No gradients, glassmorphism, coloured left borders on cards, drop shadows other than the three tokens, or decorative illustrations beyond the logo's page shapes.
11. Accessibility: real `<button>` and `<a>`, visible labels on every field, `aria-label` on icon-only buttons, focus ring = 2px `brand-blue` outline with 2px offset, text contrast as in the tokens (already checked for both themes).

## Logo
Use the exported logo files in `assets/brand/`. The screens draw the mark inline only as a stand-in. Never redraw or restyle it.

## Workflow
- UI tasks start by listing which components from `components.md` they need. Build missing components in `packages/ui` with a small story or test page first.
- After building a screen, compare it with its file in `screens/` and list any differences in the task summary.
