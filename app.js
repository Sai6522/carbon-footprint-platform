/**
 * Carbon Footprint Awareness Platform
 * Emission factors from IPCC AR6, EPA & DEFRA 2023 guidelines (kg CO2e)
 */

// ── Emission factors ──────────────────────────────────────────────────────────

const EF = {
  car: { petrol: 0.21, hybrid: 0.11, electric: 0.053, none: 0 }, // kg CO2e per km
  flight: { short: 255, long: 1500 },   // kg CO2e per return flight
  bus_train: 0.04,                       // kg CO2e per km
  electricity: { grid: 0.233, renewable: 0.05, coal: 0.82 }, // per kWh
  heating: { gas: 2.04, electric: 0.5, oil: 2.52, none: 0 }, // per month (base unit, scaled by size)
  diet: { 'meat-heavy': 3300, average: 2500, 'low-meat': 1900, pescatarian: 1600, vegetarian: 1200, vegan: 900 },
  food_waste: { high: 1.25, medium: 1.0, low: 0.85 },
  clothing: 6,        // kg CO2e per garment
  electronics: 300,   // kg CO2e per device
  streaming: 0.036,   // kg CO2e per hour
};

const GLOBAL_AVG = 4700; // kg CO2e / year

// ── DOM helpers ───────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);
const val = id => parseFloat($( id).value) || 0;
const sel = id => $(id).value;

// ── Calculate ─────────────────────────────────────────────────────────────────

function calculate() {
  const hhSize = Math.max(1, val('household-size') || 3);

  const transport = (() => {
    const carKm   = (val('car-km') || 100) * 52;
    const carEF   = EF.car[sel('car-type')];
    const car     = carKm * carEF;
    const flights = (val('flights-short') || 0) * EF.flight.short + (val('flights-long') || 0) * EF.flight.long;
    const pt      = (val('public-transport') || 0) * 52 * EF.bus_train;
    return car + flights + pt;
  })();

  const home = (() => {
    const kwh  = (val('electricity') || 250) * 12;
    const elec = kwh * EF.electricity[sel('energy-source')];
    const heat = EF.heating[sel('heating')] * 12 / hhSize;
    return elec + heat;
  })();

  const diet = (() => {
    const base = EF.diet[sel('diet')];
    return base * EF.food_waste[sel('food-waste')];
  })();

  const shopping = (() => {
    const clothes = (val('clothing') || 3) * 12 * EF.clothing;
    const tech    = (val('electronics') || 1) * EF.electronics;
    const stream  = (val('streaming') || 4) * 365 * EF.streaming;
    return clothes + tech + stream;
  })();

  const total = transport + home + diet + shopping;
  return { total, transport, home, diet, shopping };
}

// ── Render Results ────────────────────────────────────────────────────────────

function renderResults(data) {
  const { total, transport, home, diet, shopping } = data;

  $('total-co2').textContent = Math.round(total).toLocaleString();

  // Status
  let statusLabel, statusDesc, statusColor;
  if (total < GLOBAL_AVG * 0.5) {
    statusLabel = '🌟 Excellent'; statusDesc = 'Well below global average'; statusColor = '#2e9e5b';
  } else if (total < GLOBAL_AVG) {
    statusLabel = '✅ Good'; statusDesc = 'Below global average'; statusColor = '#2e9e5b';
  } else if (total < GLOBAL_AVG * 1.5) {
    statusLabel = '⚠️ Average'; statusDesc = 'Near global average'; statusColor = '#e6a817';
  } else if (total < GLOBAL_AVG * 2) {
    statusLabel = '🔴 High'; statusDesc = 'Above global average'; statusColor = '#d94f3b';
  } else {
    statusLabel = '🚨 Very High'; statusDesc = `${(total / GLOBAL_AVG).toFixed(1)}× global average`; statusColor = '#d94f3b';
  }
  $('status-label').textContent = statusLabel;
  $('status-label').style.color = statusColor;
  $('status-desc').textContent = statusDesc;

  // Breakdown bars
  const categories = [
    { name: '🚗 Transport', value: transport },
    { name: '🏠 Home Energy', value: home },
    { name: '🍽️ Diet', value: diet },
    { name: '🛍️ Shopping', value: shopping },
  ];
  const maxVal = Math.max(...categories.map(c => c.value), 1);
  const barsEl = $('breakdown-bars');
  barsEl.innerHTML = '';
  categories.forEach(({ name, value }) => {
    const pct = Math.round((value / maxVal) * 100);
    const intensityClass = pct > 66 ? 'high' : pct > 33 ? 'medium' : '';
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.setAttribute('role', 'listitem');
    row.innerHTML = `
      <span class="bar-label">${name}</span>
      <div class="bar-track" role="img" aria-label="${name}: ${Math.round(value).toLocaleString()} kg">
        <div class="bar-fill ${intensityClass}" style="width:${pct}%"></div>
      </div>
      <span class="bar-value">${Math.round(value).toLocaleString()} kg</span>`;
    barsEl.appendChild(row);
  });

  // Gauge – clamp at 200% of global avg
  const gaugePct = Math.min(100, (total / (GLOBAL_AVG * 2)) * 100);
  $('gauge-fill').style.width = gaugePct + '%';

  $('calculator').hidden = true;
  $('results').hidden = false;
  $('insights').hidden = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Tips engine ───────────────────────────────────────────────────────────────

const ALL_TIPS = [
  { category: 'transport', condition: d => d.transport > 1500,
    icon: '🚗', text: 'Drive less: switch 2 car trips/week to cycling or walking.',
    saving: '~250 kg CO₂e/yr', pledge: 'Drive less, cycle more' },
  { category: 'transport', condition: d => sel('car-type') === 'petrol' && val('car-km') > 50,
    icon: '⚡', text: 'Consider switching to an electric or hybrid vehicle.',
    saving: '~1,000 kg CO₂e/yr', pledge: 'Switch to EV or hybrid' },
  { category: 'transport', condition: d => val('flights-long') > 0,
    icon: '✈️', text: 'Replace one long-haul flight with a train or video call.',
    saving: '~1,500 kg CO₂e/yr', pledge: 'Reduce long-haul flights' },
  { category: 'transport', condition: d => val('flights-short') > 2,
    icon: '🚆', text: 'Take the train instead of short-haul flights.',
    saving: '~500 kg CO₂e/yr', pledge: 'Train over short flights' },
  { category: 'home', condition: d => sel('energy-source') !== 'renewable',
    icon: '☀️', text: 'Switch to a renewable energy tariff — many are cost-neutral.',
    saving: '~350 kg CO₂e/yr', pledge: 'Switch to green energy' },
  { category: 'home', condition: d => d.home > 1200,
    icon: '🌡️', text: 'Lower your thermostat by 1°C and insulate drafts.',
    saving: '~200 kg CO₂e/yr', pledge: 'Reduce home heating' },
  { category: 'home', condition: d => val('electricity') > 300,
    icon: '💡', text: 'Replace all bulbs with LEDs and unplug standby devices.',
    saving: '~100 kg CO₂e/yr', pledge: 'Reduce electricity use' },
  { category: 'diet', condition: d => ['meat-heavy', 'average'].includes(sel('diet')),
    icon: '🥗', text: 'Go meat-free 3 days a week (flexitarian diet).',
    saving: '~400 kg CO₂e/yr', pledge: 'Eat less meat' },
  { category: 'diet', condition: d => sel('food-waste') === 'high',
    icon: '♻️', text: 'Plan meals and compost scraps to halve your food waste.',
    saving: '~150 kg CO₂e/yr', pledge: 'Reduce food waste' },
  { category: 'shopping', condition: d => val('clothing') > 3,
    icon: '👕', text: 'Buy second-hand or swap clothes instead of buying new.',
    saving: '~200 kg CO₂e/yr', pledge: 'Buy less new clothing' },
  { category: 'shopping', condition: d => val('electronics') > 1,
    icon: '📱', text: 'Extend device life by 1 year; repair before replacing.',
    saving: '~300 kg CO₂e/yr', pledge: 'Repair, don\'t replace electronics' },
  { category: 'shopping', condition: d => val('streaming') > 5,
    icon: '📺', text: 'Reduce streaming to SD quality and limit daily screen time.',
    saving: '~30 kg CO₂e/yr', pledge: 'Reduce streaming hours' },
];

function renderInsights(data) {
  const tips = ALL_TIPS.filter(t => t.condition(data));
  // Always show at least 4 tips
  const shown = tips.length >= 4 ? tips : [...tips, ...ALL_TIPS.filter(t => !tips.includes(t))].slice(0, 4);

  const intro = data.total < GLOBAL_AVG
    ? `Great work! Your footprint of ${Math.round(data.total).toLocaleString()} kg CO₂e is below the global average. Here's how to go even further:`
    : `Your footprint of ${Math.round(data.total).toLocaleString()} kg CO₂e is above the global average of ${GLOBAL_AVG.toLocaleString()} kg. These actions can make the biggest difference:`;
  $('insights-intro').textContent = intro;

  const list = $('tips-list');
  list.innerHTML = '';
  shown.forEach(t => {
    const li = document.createElement('li');
    li.className = 'tip-item';
    li.setAttribute('role', 'listitem');
    li.innerHTML = `<span class="tip-icon" aria-hidden="true">${t.icon}</span>
      <span class="tip-text">${t.text}<span class="tip-saving">Potential saving: ${t.saving}</span></span>`;
    list.appendChild(li);
  });

  // Pledge checkboxes
  const pledgeContainer = $('pledge-options');
  pledgeContainer.innerHTML = '';
  const pledgeWrap = document.createElement('div');
  pledgeWrap.className = 'pledge-options-grid';

  shown.forEach((t, i) => {
    const id = `pledge-${i}`;
    const label = document.createElement('label');
    label.className = 'pledge-option';
    label.htmlFor = id;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.dataset.saving = parseInt(t.saving.replace(/[^0-9]/g, '')) || 0;
    cb.addEventListener('change', updatePledgeSavings);
    label.appendChild(cb);
    label.append(` ${t.pledge}`);
    pledgeWrap.appendChild(label);
  });
  pledgeContainer.appendChild(pledgeWrap);
  updatePledgeSavings();
}

function updatePledgeSavings() {
  const checks = document.querySelectorAll('#pledge-options input[type="checkbox"]:checked');
  const total = Array.from(checks).reduce((s, cb) => s + (parseInt(cb.dataset.saving) || 0), 0);
  $('pledge-savings').textContent = checks.length
    ? `✅ You've pledged to save up to ~${total.toLocaleString()} kg CO₂e/year!`
    : '';
}

// ── Share ─────────────────────────────────────────────────────────────────────

function setupShare(data) {
  $('share-btn').addEventListener('click', () => {
    const text = `I just calculated my carbon footprint: ${Math.round(data.total).toLocaleString()} kg CO₂e/year using the Carbon Footprint Tracker. Check yours! #CarbonFootprint #PromptWars`;
    if (navigator.share) {
      navigator.share({ title: 'My Carbon Footprint', text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        $('share-msg').textContent = '✅ Copied to clipboard! Paste it anywhere.';
      });
    } else {
      $('share-msg').textContent = text;
    }
  });
}

// ── Event wiring ──────────────────────────────────────────────────────────────

$('footprint-form').addEventListener('submit', e => {
  e.preventDefault();
  const data = calculate();
  renderResults(data);
  renderInsights(data);
  setupShare(data);
});

$('recalculate-btn').addEventListener('click', () => {
  $('results').hidden = true;
  $('insights').hidden = true;
  $('calculator').hidden = false;
  $('calculator').scrollIntoView({ behavior: 'smooth' });
});
