# AreaIQ Mobile Layout Engine

Single source of truth for chrome, safe area, keyboard, overlays, and z-index.

## Providers

Mounted via `LayoutProvider` in `app/layout.tsx`:

| Provider | Responsibility |
|---|---|
| `ViewportProvider` | width, height, breakpoint, orientation |
| `SafeAreaProvider` | `--safe-top/right/bottom/left` |
| `KeyboardCoordinator` | `--keyboard-height` via `visualViewport` |
| `NavigationCoordinator` | route → chrome mode |
| `ChromeCoordinator` | slot registration → `--chrome-top/bottom` |
| `OverlayCoordinator` | overlay stack + ref-counted scroll lock |

## CSS variables (consume these only)

```
--safe-top | --safe-right | --safe-bottom | --safe-left
--navbar-height | --bottomnav-height | --notification-height
--sticky-height | --actionbar-height | --keyboard-height
--chrome-top | --chrome-bottom
```

Legacy aliases kept in sync: `--topbar-h`, `--bottomnav-h`, `--smart-bar-h`.

## Utility classes

| Class | Use |
|---|---|
| `pt-layout` / `pb-layout` | Content insets (`--chrome-top` / `--chrome-bottom`) |
| `top-chrome` / `bottom-chrome` | Sticky filters / FAB / toast under **full** top chrome |
| `top-navbar` | Directly under the navbar only — **NotificationBar must use this** |
| `top-shell-aside` | Seller/Connect sidebars under chrome + shell header |
| `sticky-below-nav` | Sticky filters under top chrome |
| `pt-safe` / `pb-safe` | Safe-area padding |
| `z-layout-*` | Named overlay layers |
| `touch-target` | 44×44 minimum |
| `type-display` … `type-micro` | Typography roles |

### Top chrome rules

1. Navbar / MobileTopBar register `--navbar-height` (measured).
2. NotificationBar registers `--notification-height` and positions with `top-navbar`.
3. Page content / heroes / sticky filters use `pt-layout` or `top-chrome` (full stack).
4. Never give NotificationBar `top-chrome` — that aggregate includes its own height.

## Z-index hierarchy

`sticky(20) → nav(40) → dropdown(50) → sheet(60) → drawer(65) → modal(70) → lightbox(100) → toast(110) → system(200)`

Never use raw `z-[N]`. Use `zClass` from `lib/layout/zIndex.ts` or `useOverlay(layer)`.

## Chrome registration

```tsx
useRegisterChrome("bottomnav", 64);
const ref = useChromeElement("actionbar"); // ResizeObserver
```

## Overlays

```tsx
const { zClassName } = useOverlay("modal", open, onClose);
// scroll lock + Escape handled by OverlayCoordinator
```

## Chrome modes

`public` | `portal` | `property` | `ask` | `auth` | `none`

Resolved from pathname in `lib/layout/chrome.ts`.

## Audit

```bash
npm run mobile:audit
```

## Scoring rubric

| Category | Weight |
|---|---|
| Chrome/safe-area ownership | 20 |
| Overlay stack integrity | 15 |
| Overflow / sticky / CTA visibility | 15 |
| Touch targets | 10 |
| Typography / consistency | 10 |
| Forms / keyboard | 10 |
| Gallery / gestures | 5 |
| Admin mobile | 5 |
| A11y | 5 |
| Perf / hydration / TS | 5 |
