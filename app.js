/**
 * @fileoverview Carbon Footprint Awareness Platform
 * @description Calculates personal CO₂e emissions and provides reduction tips.
 * Emission factors sourced from IPCC AR6, EPA eGRID & DEFRA 2023 guidelines.
 */

'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Emission factors (kg CO₂e per unit) */
const EF = Object.freeze({
  car:         Object.freeze({ petrol: 0.21, hybrid: 0.11, electric: 0.053, none: 0 }),
  flight:      Object.freeze({ short: 255, long: 1500 }),
  busTrain:    0.04,
  electricity: Object.freeze({ grid: 0.233, renewable: 0.05, coal: 0.82 }),
  heating:     Object.freeze({ gas: 2.04, electric: 0.5, oil: 2.52, none: 0 }),
  diet: Object.freeze({
    'meat-heavy': 3300, average: 2500, 'low-meat': 1900,
    pescatarian: 1600, vegetarian: 1200, vegan: 900,
  }),
  foodWaste:   Object.freeze({ high: 1.25, medium: 1.0, low: 0.85 }),
  clothing:    6,     // kg CO₂e per garment
  electronics: 300,   // kg CO₂e per device
  streaming:   0.036, // kg CO₂e per hour
});

const GLOBAL_AVG      = 4700; // kg CO₂e/year (World Bank / IPCC)
const WEEKS_PER_YEAR  = 52;
const DAYS_PER_YEAR   = 365;
const MONTHS_PER_YEAR = 12;

// ── Pure calculation functions ────────────────────────────────────────────────

/**
 * @typedef {Object} Inputs
 * @property {number} carKm @property {string} carType @property {number} flightsShort
 * @property {number} flightsLong @property {number} publicKm @property {number} kwhMonth
 * @property {string} energySource @property {string} heating @property {number} hhSize
 * @property {string} diet @property {string} foodWaste @property {number} clothing
 * @property {number} electronics @property {number} streaming
 */

/**
 * Calculate annual transport emissions.
 * @param {Inputs} i @returns {number} kg CO₂e/year
 */
function calcTransport(i) {
  const car     = i.carKm * WEEKS_PER_YEAR * EF.car[i.carType];
  const flights = i.flightsShort * EF.flight.short + i.flightsLong * EF.flight.long;
  const pt      = i.publicKm * WEEKS_PER_YEAR * EF.busTrain;
  return car + flights + pt;
}

/**
 * Calculate annual home energy emissions.
 * @param {Inputs} i @returns {number} kg CO₂e/year
 */
function calcHome(i) {
  const elec = i.kwhMonth * MONTHS_PER_YEAR * EF.electricity[i.energySource];
  const heat = EF.heating[i.heating] * MONTHS_PER_YEAR / i.hhSize;
  return elec + heat;
}

/**
 * Calculate annual diet emissions.
 * @param {Inputs} i @returns {number} kg CO₂e/year
 */
function calcDiet(i) {
  return EF.diet[i.diet] * EF.foodWaste[i.foodWaste];
}

/**
 * Calculate annual shopping & lifestyle emissions.
 * @param {Inputs} i @returns {number} kg CO₂e/year
 */
function calcShopping(i) {
  return (
    i.clothing    * MONTHS_PER_YEAR * EF.clothing +
    i.electronics * EF.electronics +
    i.streaming   * DAYS_PER_YEAR   * EF.streaming
  );
}

/**
 * Get status label, description, and color for a total emission value.
 * @param {number} total @returns {{ label: string, desc: string, color: string }}
 */
function getStatus(total) {
  if (total < GLOBAL_AVG * 0.5) return { label: '🌟 Excellent', desc: 'Well below global average',                        color: '#2e9e5b' };
  if (total < GLOBAL_AVG)       return { label: '✅ Good',       desc: 'Below global average',                             color: '#2e9e5b' };
  if (total < GLOBAL_AVG * 1.5) return { label: '⚠️ Average',   desc: 'Near global average',                              color: '#e6a817' };
  if (total < GLOBAL_AVG * 2)   return { label: '🔴 High',       desc: 'Above global average',                             color: '#d94f3b' };
  return                               { label: '🚨 Very High',  desc: `${(total / GLOBAL_AVG).toFixed(1)}× global average`, color: '#d94f3b' };
}

/**
 * Parse the numeric saving value from a tip string like "~1,000 kg CO₂e/yr".
 * @param {string} saving @returns {number}
 */
function parseSaving(saving) {
  return parseInt(saving.replace(/[^0-9]/g, ''), 10) || 0;
}

// ── Exports (Node.js / test runner) ──────────────────────────────────────────

if (typeof module !== 'undefined') {
  module.exports = { EF, GLOBAL_AVG, calcTransport, calcHome, calcDiet, calcShopping, getStatus, parseSaving };
}

// ── Browser-only code ─────────────────────────────────────────────────────────

if (typeof document !== 'undefined') {

  /** @param {string} id @returns {HTMLElement} */
  const $ = id => document.getElementById(id);

  /**
   * Read a clamped numeric value from a form input.
   * @param {string} id @param {number} [fallback=0] @param {number} [max=99999] @returns {number}
   */
  function readNum(id, fallback = 0, max = 99999) {
    const n = parseFloat($(id).value);
    if (!isFinite(n) || n < 0) return fallback;
    return Math.min(max, n);
  }

  /** @param {string} id @returns {string} */
  const readSel = id => $(id).value;

  /**
   * Read all form inputs into a plain Inputs object.
   * @returns {Inputs}
   */
  function readInputs() {
    return {
      carKm:        readNum('car-km', 100),
      carType:      readSel('car-type'),
      flightsShort: readNum('flights-short', 0),
      flightsLong:  readNum('flights-long', 0),
      publicKm:     readNum('public-transport', 0),
      kwhMonth:     readNum('electricity', 250),
      energySource: readSel('energy-source'),
      heating:      readSel('heating'),
      hhSize:       Math.max(1, readNum('household-size', 3)),
      diet:         readSel('diet'),
      foodWaste:    readSel('food-waste'),
      clothing:     readNum('clothing', 3),
      electronics:  readNum('electronics', 1),
      streaming:    readNum('streaming', 4),
    };
  }

  /** Run full calculation from current form state. */
  function calculate() {
    const inputs    = readInputs();
    const transport = calcTransport(inputs);
    const home      = calcHome(inputs);
    const diet      = calcDiet(inputs);
    const shopping  = calcShopping(inputs);
    return { inputs, transport, home, diet, shopping, total: transport + home + diet + shopping };
  }

  /** @type {Array<{icon:string, text:string, saving:string, pledge:string, condition:Function}>} */
  const ALL_TIPS = [
    { icon: '🚗', text: 'Drive less: switch 2 car trips/week to cycling or walking.',        saving: '~250 kg CO₂e/yr',   pledge: 'Drive less, cycle more',            condition: (d, i) => calcTransport(i) > 1500 },
    { icon: '⚡', text: 'Consider switching to an electric or hybrid vehicle.',              saving: '~1,000 kg CO₂e/yr', pledge: 'Switch to EV or hybrid',            condition: (_, i) => i.carType === 'petrol' && i.carKm > 50 },
    { icon: '✈️', text: 'Replace one long-haul flight with a train or video call.',          saving: '~1,500 kg CO₂e/yr', pledge: 'Reduce long-haul flights',           condition: (_, i) => i.flightsLong > 0 },
    { icon: '🚆', text: 'Take the train instead of short-haul flights.',                     saving: '~500 kg CO₂e/yr',   pledge: 'Train over short flights',           condition: (_, i) => i.flightsShort > 2 },
    { icon: '☀️', text: 'Switch to a renewable energy tariff — many are cost-neutral.',      saving: '~350 kg CO₂e/yr',   pledge: 'Switch to green energy',             condition: (_, i) => i.energySource !== 'renewable' },
    { icon: '🌡️', text: 'Lower your thermostat by 1°C and insulate drafts.',                saving: '~200 kg CO₂e/yr',   pledge: 'Reduce home heating',                condition: (d)    => d.home > 1200 },
    { icon: '💡', text: 'Replace all bulbs with LEDs and unplug standby devices.',           saving: '~100 kg CO₂e/yr',   pledge: 'Reduce electricity use',             condition: (_, i) => i.kwhMonth > 300 },
    { icon: '🥗', text: 'Go meat-free 3 days a week (flexitarian diet).',                   saving: '~400 kg CO₂e/yr',   pledge: 'Eat less meat',                      condition: (_, i) => ['meat-heavy', 'average'].includes(i.diet) },
    { icon: '♻️', text: 'Plan meals and compost scraps to halve your food waste.',           saving: '~150 kg CO₂e/yr',   pledge: 'Reduce food waste',                  condition: (_, i) => i.foodWaste === 'high' },
    { icon: '👕', text: 'Buy second-hand or swap clothes instead of buying new.',            saving: '~200 kg CO₂e/yr',   pledge: 'Buy less new clothing',              condition: (_, i) => i.clothing > 3 },
    { icon: '📱', text: 'Extend device life by 1 year; repair before replacing.',            saving: '~300 kg CO₂e/yr',   pledge: "Repair, don't replace electronics",  condition: (_, i) => i.electronics > 1 },
    { icon: '📺', text: 'Reduce streaming to SD quality and limit daily screen time.',       saving: '~30 kg CO₂e/yr',    pledge: 'Reduce streaming hours',             condition: (_, i) => i.streaming > 5 },
  ];

  /**
   * Render results section.
   * @param {{ total:number, transport:number, home:number, diet:number, shopping:number }} data
   */
  function renderResults(data) {
    const { total, transport, home, diet, shopping } = data;

    $('total-co2').textContent = Math.round(total).toLocaleString();

    const status = getStatus(total);
    $('status-label').textContent = status.label;
    $('status-label').style.color = status.color;
    $('status-desc').textContent  = status.desc;

    const categories = [
      { name: '🚗 Transport',   value: transport },
      { name: '🏠 Home Energy', value: home },
      { name: '🍽️ Diet',       value: diet },
      { name: '🛍️ Shopping',   value: shopping },
    ];
    const maxVal   = Math.max(...categories.map(c => c.value), 1);
    const fragment = document.createDocumentFragment();

    categories.forEach(({ name, value }) => {
      const pct = Math.round((value / maxVal) * 100);
      const cls = pct > 66 ? 'high' : pct > 33 ? 'medium' : '';
      const kg  = Math.round(value).toLocaleString();
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.setAttribute('role', 'listitem');
      row.innerHTML = `<span class="bar-label">${name}</span>
        <div class="bar-track" role="img" aria-label="${name}: ${kg} kg">
          <div class="bar-fill ${cls}" style="width:${pct}%"></div>
        </div>
        <span class="bar-value">${kg} kg</span>`;
      fragment.appendChild(row);
    });

    const barsEl = $('breakdown-bars');
    barsEl.innerHTML = '';
    barsEl.appendChild(fragment);

    $('gauge-fill').style.width = `${Math.min(100, (total / (GLOBAL_AVG * 2)) * 100)}%`;

    $('calculator').hidden = true;
    $('results').hidden    = false;
    $('insights').hidden   = false;
    $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Render personalised tips and pledge section.
   * @param {{ total:number, home:number, inputs:Inputs }} data
   */
  function renderInsights(data) {
    const matched = ALL_TIPS.filter(t => t.condition(data, data.inputs));
    const shown   = matched.length >= 4
      ? matched
      : [...matched, ...ALL_TIPS.filter(t => !matched.includes(t))].slice(0, 4);

    $('insights-intro').textContent = data.total < GLOBAL_AVG
      ? `Great work! Your footprint of ${Math.round(data.total).toLocaleString()} kg CO₂e is below the global average. Here's how to go even further:`
      : `Your footprint of ${Math.round(data.total).toLocaleString()} kg CO₂e is above the global average of ${GLOBAL_AVG.toLocaleString()} kg. These actions can make the biggest difference:`;

    const listFrag = document.createDocumentFragment();
    shown.forEach(t => {
      const li = document.createElement('li');
      li.className = 'tip-item';
      li.setAttribute('role', 'listitem');
      li.innerHTML = `<span class="tip-icon" aria-hidden="true">${t.icon}</span>
        <span class="tip-text">${t.text}<span class="tip-saving">Potential saving: ${t.saving}</span></span>`;
      listFrag.appendChild(li);
    });
    const list = $('tips-list');
    list.innerHTML = '';
    list.appendChild(listFrag);

    const pledgeWrap = document.createElement('div');
    pledgeWrap.className = 'pledge-options-grid';
    shown.forEach((t, i) => {
      const id    = `pledge-${i}`;
      const label = document.createElement('label');
      label.className = 'pledge-option';
      label.htmlFor   = id;
      const cb        = document.createElement('input');
      cb.type         = 'checkbox';
      cb.id           = id;
      cb.dataset.saving = parseSaving(t.saving);
      cb.addEventListener('change', updatePledgeSavings);
      label.appendChild(cb);
      label.append(` ${t.pledge}`);
      pledgeWrap.appendChild(label);
    });
    const pledgeContainer = $('pledge-options');
    pledgeContainer.innerHTML = '';
    pledgeContainer.appendChild(pledgeWrap);
    updatePledgeSavings();
  }

  /** Update live pledge savings total. */
  function updatePledgeSavings() {
    const checked = document.querySelectorAll('#pledge-options input[type="checkbox"]:checked');
    const saved   = Array.from(checked).reduce((sum, cb) => sum + (parseInt(cb.dataset.saving, 10) || 0), 0);
    $('pledge-savings').textContent = checked.length
      ? `✅ You've pledged to save up to ~${saved.toLocaleString()} kg CO₂e/year!`
      : '';
  }

  let shareListenerAttached = false;

  /**
   * Attach share button handler (idempotent).
   * @param {number} total
   */
  function setupShare(total) {
    if (shareListenerAttached) return;
    shareListenerAttached = true;
    $('share-btn').addEventListener('click', () => {
      const kg   = Math.round(Math.max(0, total)).toLocaleString();
      const text = `I just calculated my carbon footprint: ${kg} kg CO₂e/year using the Carbon Footprint Tracker. Check yours! #CarbonFootprint #PromptWars`;
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

  // ── Event wiring ────────────────────────────────────────────────────────────

  $('footprint-form').addEventListener('submit', e => {
    e.preventDefault();
    const data = calculate();
    renderResults(data);
    renderInsights(data);
    setupShare(data.total);
  });

  $('recalculate-btn').addEventListener('click', () => {
    $('results').hidden      = true;
    $('insights').hidden     = true;
    $('calculator').hidden   = false;
    shareListenerAttached    = false;
    $('share-msg').textContent = '';
    $('calculator').scrollIntoView({ behavior: 'smooth' });
  });

} // end browser-only block
