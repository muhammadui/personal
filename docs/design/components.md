# Components

Each component maps to a class in `personal.css`, the reference stylesheet used by every screen in the UI concepts canvas. Rebuild them as React components with the same tokens, sizes and states.

| Component | Class | Spec |
| --- | --- | --- |
| Button | `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-danger` / `.btn-inverse` | 40px tall (`.btn-sm` 32, `.btn-lg` 48), `radius-md`, 14px/700 label, 8px icon gap. One primary per view. Press scale 0.97. Disabled: 40% opacity, no pointer. |
| Icon button | `.icon-btn` | 40×40 (44×44 on mobile), `radius-md`, 1px `line` border, 20px icon, `aria-label` required. |
| Text field | `.field` > `.field-label` + `.input` + `.field-hint` | 48px input, `radius-md`, 1px `line-control`; focus: `brand-blue` border + 3px 18% ring; error: `danger` border and `.field-error` text below. Labels always visible above the field. |
| Code input | `.code-input` > `.code-cell` | Six 48×56 cells, `radius-md`; filled cell `ink` border; active cell `brand-blue` ring. |
| Task checkbox | `.check` (+ `.is-on`) > `.check-box` | 20×20 box, `radius-sm`, 1.5px `line-control`; hit area 44×44. Checked: `brand-blue` fill, white tick, pop animation. |
| Task row | `.task` (+ `.is-done`) | 56px min height, checkbox, title (`body` 600), meta line (`meta`), optional right badge. Done: title `ink-faint` with animated strike. |
| List container | `.list` | `surface`, 1px `line`, `radius-lg`; rows divided by `line`. |
| Card | `.card` | `surface`, 1px `line`, `radius-lg`, 16–20px padding; hover: `shadow-md`, border `line-control`. |
| Note card | `.note-card` + colour modifier | Card with title (`title-3`), up to 3 lines of preview, meta at bottom; 196px min height in grids. |
| Nav item | `.nav-item` (+ `.is-active`) | 36px, `radius-md`, 18px icon, count right-aligned; active: `tint-blue` bg, `text-accent` label. |
| Section label | `.t-label` | Uppercase 12px, `ink-muted`; `warn` for Overdue. |
| Chip | `.chip` (+ `.is-on`) | 32px, `radius-sm`, 1px `line-control`; on: `brand-blue` fill, white text. Used for reminder presets and filters. |
| Tag | `.tag` | 24px, `radius-sm`, `tint-blue` bg, `text-accent` text, `#name`. |
| Segmented control | `.seg` > `.seg-btn` (+ `.is-on`) | Track `surface-sunken`, `radius-md`, 3px padding; selected button `surface` + `shadow-sm`. |
| Switch | `.switch` (+ `.is-on`) | 40×24, knob slides with spring. Use `role="switch"` and `aria-checked`. |
| Banner | `.banner` + `.banner-warn` / `.banner-info` / `.banner-success` / `.banner-navy` | `radius-lg`, 12–14px padding, icon + one or two lines + optional action. |
| Toast | `.toast` | `brand-navy`, white text, `radius-lg`, `shadow-lg`, optional Undo action in `brand-lavender`. Bottom centre on mobile above the tab bar; bottom left on desktop. |
| Bottom sheet | `.sheet` + `.scrim` | `radius-xl` top corners, handle 36×4, slides up. |
| Dialog / palette | `.dialog` | `surface`, `radius-xl`, `shadow-lg`, max 640px wide; command palette rows 44px with `kbd` hints. |
| Tab bar | `.tabbar` > `.tab` (+ `.is-active`) + `.fab` | 4 tabs + centre FAB (56×56, `radius-lg`, `brand-blue`). Labels `caption`. |
| Kbd | `.kbd` | JetBrains Mono 11px, 1px `line` border with 2px bottom, `radius-sm`. |
| Progress | `.progress` | 6px track, `radius-xs`, fill animates width. |
| Avatar | `.avatar` | 32/36/40px circle, initials 13px 800, `brand-navy` bg. |
| Sync status | `.sync` + `.sync-ok` / `.sync-busy` / `.sync-off` | Icon + label; see Motion for behaviour. |
| Page dots | `.dots` > `.dot-i` (+ `.is-on`) | 6×6 dots, active stretches to 20×6 (`radius-xs`). |
| PIN pad | `.pin-key` | 72×56 keys, `radius-md`, `surface-sunken`; entered digits as 12px `ink` squares. |
