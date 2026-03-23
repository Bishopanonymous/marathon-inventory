# Marathon Inventory UI — Claude Code Context

## What this is
A game inventory screen prototype for a sci-fi extraction shooter (Marathon-inspired).
Single-file HTML/CSS/JS. No framework, no build step.

## Design system
- Fonts: Barlow Condensed (display), Rajdhani (UI), Share Tech Mono (mono)
- Accent green: #b5ff2e
- Rarity colors: common #4a5268 / uncommon #2ecc71 / rare #3b9eff / epic #a855f7 / legendary #f59e0b
- All colors defined as CSS custom properties in :root

## Key data structures
- `leftItems[]` — 10 slots (weapons, equip, shield, cores, implants)
- `backpackItems[]` — 16 slots
- `crateData{}` — vault, keyed by section (green/blue/grey/red)
- `weaponModSlots[][]` — 2 weapons × 4 mod slots

## Navigation model
- `focusMode`: 'main' | 'mod'
- Left panel nav follows NAV_LEFT_SEQ (linear sequence including mod rows)
- Cross-panel nav via crossTo() using Y-position matching

## PS button icon system
- psKey(type, wrapClass, isLong) — renders PS-style button icons
- Colors: triangle=green, cross=blue, square=pink, circle=red
- Long-press actions show a rounded-square frame around the button

## Controls (keyboard)
- Arrow keys: navigate
- Enter/Space: primary action
- X: context menu
- Q: move mod to backpack
- Esc: close modals

## Known areas for improvement
- Item icons are emoji placeholders (swap for real SVGs)
- No persistence (all state is in-memory)
- Gamepad tested against PS5 browser API
