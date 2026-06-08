# 🌿 Carbon Footprint Awareness Platform

> PromptWars Challenge 3 — Carbon Footprint Awareness Vertical

A lightweight, single-page web app that helps individuals **understand, calculate, and reduce** their personal carbon footprint through a guided questionnaire, visualised results, and personalised reduction tips.

**Live Demo:** [https://vsaiprasadpulaparthi.github.io/carbon-footprint-platform](https://vsaiprasadpulaparthi.github.io/carbon-footprint-platform)

---

## Chosen Vertical

**Carbon Footprint Awareness Platform** — empowering individuals with personalised, data-driven insights to make low-carbon lifestyle choices.

---

## Approach & Logic

### Architecture
Pure **HTML5 + CSS3 + Vanilla JavaScript** — zero dependencies, zero build steps. Opens directly in a browser or on GitHub Pages with no server required.

### Calculation Model

Emissions are computed across four life-cycle categories:

| Category | Inputs | Emission Factor Source |
|---|---|---|
| 🚗 Transport | Car km/week, fuel type, flights, public transport | IPCC AR6 / DEFRA 2023 |
| 🏠 Home Energy | Monthly kWh, energy source, heating fuel, household size | EPA eGRID / DEFRA 2023 |
| 🍽️ Diet | Diet type (meat-heavy → vegan), food waste level | Oxford Poore & Nemecek (2018) |
| 🛍️ Shopping | Clothing items, electronics, daily streaming hours | WRAP / IEA 2023 |

**Formula (per category):**

```
CO2e = activity_volume × emission_factor × modifier
```

- Car: `km/year × kg CO₂e per km` (factor varies by fuel type: petrol 0.21, hybrid 0.11, EV 0.053)
- Flights: fixed per return trip (short-haul 255 kg, long-haul 1 500 kg including radiative forcing)
- Electricity: `annual kWh × grid intensity` (grid 0.233, renewable 0.05, coal 0.82 kg/kWh)
- Diet: annual baseline (meat-heavy 3 300 kg → vegan 900 kg) × food-waste multiplier
- Clothing: `items/month × 12 × 6 kg per garment`

Total is compared against the **global average of 4 700 kg CO₂e/year** (World Bank / IPCC).

### Tips Engine

After calculating, the app evaluates 12 conditional tip rules. Each rule fires only when the relevant activity is above a threshold (e.g. flight tips only shown if user has flights). At least 4 tips are always shown. Tips include estimated annual CO₂e savings drawn from peer-reviewed sources.

### Pledge & Share

Users can tick pledges (mapped to tips) and see the combined potential annual saving update live. The share button uses the Web Share API (mobile) or clipboard fallback (desktop) to generate a pre-filled message.

---

## Features

- 📋 Guided questionnaire — 4 categories, 14 inputs with sensible defaults
- 📊 Animated breakdown bar chart per category
- 🎯 Visual gauge showing position vs. global average
- 💡 Up to 12 personalised, conditional reduction tips
- ☑️ Pledge checkboxes with live cumulative savings display
- 📤 One-tap share via Web Share API or clipboard
- ♿ Fully accessible: ARIA labels, skip link, keyboard navigation, focus indicators
- 📱 Responsive — works on mobile, tablet, and desktop

---

## How to Run

```bash
# Clone
git clone https://github.com/vsaiprasadpulaparthi/carbon-footprint-platform.git
cd carbon-footprint-platform

# Open directly — no server needed
open index.html   # macOS
xdg-open index.html  # Linux
```

Or deploy instantly to **GitHub Pages**: Settings → Pages → Deploy from `main` branch root.

---

## File Structure

```
carbon-footprint-platform/
├── index.html   # Structure & semantic markup
├── style.css    # Styling, responsive layout, accessibility
├── app.js       # Calculation engine, tips logic, DOM rendering
└── README.md
```

---

## Assumptions

1. **Car travel** defaults to 100 km/week if left blank (approximate global average for car owners).
2. **Electricity** defaults to 250 kWh/month per household (approximate global residential average).
3. **Flights** use radiative forcing multiplier of ×2 already baked into the per-flight factor for long-haul.
4. **Household energy** is divided equally by household size to get per-person share.
5. All emission factors are global averages; results may vary by country.
6. Shopping/digital emissions (streaming, electronics) use conservative IEA 2023 lifecycle estimates.
7. The platform is for **awareness only** and not a certified carbon accounting tool.

---

## Technologies

- HTML5 · CSS3 · Vanilla JavaScript (ES6+)
- Web Share API · Clipboard API
- ARIA / WCAG 2.1 AA accessibility standards
- Deployed via GitHub Pages

---

## License

MIT
