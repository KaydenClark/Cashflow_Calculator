# Cashflow design system

The accepted concepts are stored under `design/concepts/`.

## Visual tokens

- Canvas: cool near-white `#f7f9fa`
- Surface: true white `#ffffff`
- Sidebar: charcoal navy `#0f1c24`
- Text: `#142129`
- Muted text: `#64747c`
- Positive margin: forest green `#2f7541`
- Negative margin: brick red `#c93f31`
- Attention / incomplete: amber `#bc6a05`
- Forecast: cool slate `#61727b`
- Borders: `#dfe6e9`
- Typography: local system sans-serif with tabular numerals; no remote font request
- Geometry: 7–9px UI radius, 1px borders, nearly flat shadow treatment

## Component families

- Quiet dark sidebar with exactly six product destinations
- Open KPI rail rather than isolated dashboard tiles
- Table-first reporting with sticky headings and inline period expansion
- Status cues combine text, icon, and line pattern so meaning never depends on color alone
- Forecast continuation uses dotted or dashed treatment
- Desktop sidebar becomes a touch-friendly drawer and bottom navigation on mobile

## Responsive behavior

- Desktop tables scroll inside their own frame instead of widening the page
- KPI metrics become a swipeable rail below 820px
- Overview category composition becomes a ranked bar list on small screens
- Forecast assumptions stack below charts on tablet and mobile
- Minimum touch target is 40–44px for primary controls
