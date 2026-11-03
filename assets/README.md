# Brand assets

Put the exported logo files in `assets/brand/`:

| File | Size | Notes |
| --- | --- | --- |
| `logo-mark.svg` | vector | The icon alone (stacked pages), transparent background |
| `logo-full.svg` | vector | Icon + "Personal" wordmark |
| `icon-1024.png` | 1024 × 1024 | Square, solid background; source for `npx tauri icon` |
| `icon-512.png` | 512 × 512 | PWA manifest |
| `icon-192.png` | 192 × 192 | PWA manifest |
| `icon-maskable-512.png` | 512 × 512 | Mark inside the centre 80% so Android cropping doesn't cut it |
| `apple-touch-icon.png` | 180 × 180 | Solid background (iPhone icons can't be transparent) |
| `favicon.svg` + `favicon-32.png` | 32 × 32 | Use a simplified mark if the three lines blur at this size |

Brand colours: put the exact hex values of the blue, navy and light lavender here so the app's Tailwind theme uses them:

- Primary blue: `#______`
- Navy: `#______`
- Lavender (back page): `#______`
