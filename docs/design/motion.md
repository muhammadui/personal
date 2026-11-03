# Motion

Micro-animations make Personal feel fast and solid. They are short, use only `transform` and `opacity` (plus colour), and are disabled under `prefers-reduced-motion`.

## Durations
| Token | Value | Use |
| --- | --- | --- |
| `--dur-instant` | 80ms | Press feedback (scale down) |
| `--dur-fast` | 140ms | Hover, focus, colour changes, segmented control |
| `--dur-base` | 200ms | Checkbox fill and tick, fades, switch |
| `--dur-slow` | 280ms | Sheets, toasts, row exit, page transitions |
| `--dur-deliberate` | 480ms | Splash mark, onboarding scenes |

## Easings
| Token | Curve | Use |
| --- | --- | --- |
| `--ease-standard` | cubic-bezier(.2,0,0,1) | Most state changes |
| `--ease-enter` | cubic-bezier(0,0,.2,1) | Things arriving (sheets, toasts, list items) |
| `--ease-exit` | cubic-bezier(.4,0,1,1) | Things leaving; exits are 20% shorter than entries |
| `--ease-spring` | cubic-bezier(.34,1.56,.64,1) | Small confirmations only: checkbox pop, switch knob, FAB |

## Recipes
- **Press**: buttons scale to 0.97, icon buttons and FAB to 0.94, over `--dur-instant`; release springs back.
- **Complete a task**: checkbox fills `brand-blue` with a pop (0.8 → 1.08 → 1, `--dur-slow`, spring); the tick draws with stroke-dashoffset (`--dur-base`, 60ms delay); a strike line grows left to right across the title (`--dur-slow`) while the title fades to `ink-faint`. After 700ms the row collapses and moves to Done (height + opacity, `--dur-slow`). Undo toast appears for 5s.
- **List enter**: items fade in and rise 6px, staggered 30ms, at most the first 8 items; later items appear at once.
- **Sheet**: slides up from 100% (`--dur-slow`, enter) over a scrim fading in; dismiss by drag or tap on scrim, exits in 220ms.
- **Toast**: rises 8px and fades in, stays 4s (5s when it has Undo), fades out.
- **Sync status**: syncing = icon rotates 1s linear; on success the cloud-check icon pops once (spring) and the label cross-fades to "Synced just now"; offline = static `warn` icon, no motion (offline is calm).
- **Reminder banner**: slides down 8px and fades in; Done collapses it upward.
- **Page change**: content cross-fades with a 4px rise (`--dur-base`); the sidebar never animates.
- **Splash**: the back page swings from 0° to 8° behind the front page while the mark scales 0.86 → 1 (`--dur-deliberate`, spring); the wordmark fades in 120ms later. Total under 700ms; skip it entirely on return visits once data is loaded.
- **Onboarding**: each scene's shapes rise in with 60ms stagger; the page indicator's active bar stretches between dots (`--dur-slow`).
- **Focus**: 2px `brand-blue` ring with 2px offset, appears instantly (no animation on focus).

## Rules
- Never animate width, height or top/left except the row-collapse and sheet recipes above.
- Nothing loops forever except the syncing spinner and the splash loading indicator.
- No parallax, no bouncing pages, no confetti.
- Under `prefers-reduced-motion: reduce` every animation becomes an instant change; opacity fades up to 120ms are allowed.
