/**
 * @fileoverview Carbon Footprint Awareness Platform — app.js
 * @description Pure calculation engine + browser UI.
 * Emission factors: IPCC AR6, EPA eGRID & DEFRA 2023 (kg CO₂e per unit).
 * @version 2.0.0
 */

'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────

/** @readonly @enum {Object} Emission factors (kg CO₂e per unit) */
const EF = Object.freeze({
  car:         Object.freeze({ petrol: 0.21, hybrid: 0.11, electric: 0.053, none: 0 }),
  flight:      Object.freeze({ short: 255,   long: 1500 }),
  busTrain:    0.04,
  electricity: Object.freeze({ grid: 0.233,  renewable: 0.05, coal: 0.82 }),
  heating:     Object.freeze({ gas: 2.04,    electric: 0.5,   oil: 2.52, none: 0 }),
  diet:        Object.freeze({ 'meat-heavy': 3300, average: 2500, 'low-meat': 1900, pescatarian: 1600, vegetarian: 1200, vegan: 900 }),
  foodWaste:   Object.freeze({ high: 1.25,   medium: 1.0,     low: 0.85 }),
  clothing:    6,     // kg CO₂e per garment
  electronics: 300,   // kg CO₂e per device
  streaming:   0.036, // kg CO₂e per hour
});

/** @readonly */ const GLOBAL_AVG      = 4700;
/** @readonly */ const WEEKS_PER_YEAR  = 52;
/** @readonly */ const DAYS_PER_YEAR   = 365;
/** @readonly */ const MONTHS_PER_YEAR = 12;

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Inputs
 * @property {number} carKm          Weekly car distance (km)
 * @property {string} carType        Fuel type: petrol | hybrid | electric | none
 * @property {number} flightsShort   Short-haul flights per year
 * @property {number} flightsLong    Long-haul flights per year
 * @property {number} publicKm       Weekly public transport distance (km)
 * @property {number} kwhMonth       Monthly electricity consumption (kWh)
 * @property {string} energySource   grid | renewable | coal
 * @property {string} heating        gas | electric | oil | none
 * @property {number} hhSize         Household size (people, min 1)
 * @property {string} diet           meat-heavy | average | low-meat | pescatarian | vegetarian | vegan
 * @property {string} foodWaste      high | medium | low
 * @property {number} clothing       New clothing items per month
 * @property {number} electronics    New electronic devices per year
 * @property {number} streaming      Daily screen/streaming hours
 */

/**
 * @typedef {Object} Results
 * @property {Inputs} inputs
 * @property {number} transport
 * @property {number} home
 * @property {number} diet
 * @property {number} shopping
 * @property {number} total
 */

// ── Pure calculation functions ────────────────────────────────────────────────

/**
 * Annual transport emissions.
 * @param {Inputs} i
 * @returns {number} kg CO₂e/year
 */
function calcTransport(i) {
  const carFactor = EF.car[i.carType] ?? EF.car.petrol;
  return (
    i.carKm       * WEEKS_PER_YEAR * carFactor +
    i.flightsShort * EF.flight.short +
    i.flightsLong  * EF.flight.long +
    i.publicKm     * WEEKS_PER_YEAR * EF.busTrain
  );
}

/**
 * Annual home energy emissions.
 * @param {Inputs} i
 * @returns {number} kg CO₂e/year
 */
function calcHome(i) {
  const elecFactor = EF.electricity[i.energySource] ?? EF.electricity.grid;
  const heatFactor = EF.heating[i.heating] ?? EF.heating.gas;
  return (
    i.kwhMonth * MONTHS_PER_YEAR * elecFactor +
    heatFactor * MONTHS_PER_YEAR / i.hhSize
  );
}

/**
 * Annual diet emissions.
 * @param {Inputs} i
 * @returns {number} kg CO₂e/year
 */
function calcDiet(i) {
  const dietFactor  = EF.diet[i.diet]           ?? EF.diet.average;
  const wasteFactor = EF.foodWaste[i.foodWaste] ?? EF.foodWaste.medium;
  return dietFactor * wasteFactor;
}

/**
 * Annual shopping & lifestyle emissions.
 * @param {Inputs} i
 * @returns {number} kg CO₂e/year
 */
function calcShopping(i) {
  return (
    i.clothing    * MONTHS_PER_YEAR * EF.clothing +
    i.electronics * EF.electronics +
    i.streaming   * DAYS_PER_YEAR   * EF.streaming
  );
}

/**
 * Run full footprint calculation.
 * @param {Inputs} inputs
 * @returns {Results}
 */
function calculate(inputs) {
  const transport = calcTransport(inputs);
  const home      = calcHome(inputs);
  const diet      = calcDiet(inputs);
  const shopping  = calcShopping(inputs);
  return { inputs, transport, home, diet, shopping, total: transport + home + diet + shopping };
}

/**
 * Determine status tier for a given CO₂e total.
 * @param {number} total
 * @returns {{ label: string, desc: string, cssClass: string }}
 */
function getStatus(total) {
  if (total < GLOBAL_AVG * 0.5) return { label: '🌟 Excellent', desc: 'Well below global average',                          cssClass: 'status-excellent' };
  if (total < GLOBAL_AVG)       return { label: '✅ Good',       desc: 'Below global average',                               cssClass: 'status-good'      };
  if (total < GLOBAL_AVG * 1.5) return { label: '⚠️ Average',   desc: 'Near global average',                                cssClass: 'status-average'   };
  if (total < GLOBAL_AVG * 2)   return { label: '🔴 High',       desc: 'Above global average',                               cssClass: 'status-high'      };
  return                               { label: '🚨 Very High',  desc: `${(total / GLOBAL_AVG).toFixed(1)}× global average`, cssClass: 'status-very-high' };
}

/**
 * Extract numeric saving from a tip string, e.g. "~1,000 kg CO₂e/yr" → 1000.
 * @param {string} saving
 * @returns {number}
 */
function parseSaving(saving) {
  return parseInt(saving.replace(/[^0-9]/g, ''), 10) || 0;
}

// ── Node.js exports ───────────────────────────────────────────────────────────

if (typeof module !== 'undefined') {
  module.exports = { EF, GLOBAL_AVG, WEEKS_PER_YEAR, MONTHS_PER_YEAR, DAYS_PER_YEAR,
                     calcTransport, calcHome, calcDiet, calcShopping, calculate, getStatus, parseSaving };
}

// ── Browser UI ────────────────────────────────────────────────────────────────

if (typeof document === 'undefined') return; // guard: exit in Node after exports

/** @param {string} id @returns {HTMLElement} */
const $ = id => document.getElementById(id);

/**
 * Read a sanitized, clamped numeric input value.
 * @param {string} id
 * @param {number} fallback Default when blank or invalid
 * @param {number} [max=99999]
 * @returns {number}
 */
function readNum(id, fallback, max = 99999) {
  const n = parseFloat($(id).value);
  return (isFinite(n) && n >= 0) ? Math.min(max, n) : fallback;
}

/** @param {string} id @returns {string} */
const readSel = id => $(id).value;

/**
 * Read all form inputs into an Inputs object.
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
    streaming:    readNum('streaming', 4, 24),
  };
}

/** @type {Array<{icon:string,text:string,saving:string,pledge:string,condition:function(Results,Inputs):boolean}>} */
const ALL_TIPS = [
  { icon: '🚗', text: 'Drive less: switch 2 car trips/week to cycling or walking.',       saving: '~250 kg CO₂e/yr',   pledge: 'Drive less, cycle more',           condition: (d)    => d.transport > 1500                              },
  { icon: '⚡', text: 'Consider switching to an electric or hybrid vehicle.',             saving: '~1,000 kg CO₂e/yr', pledge: 'Switch to EV or hybrid',           condition: (_, i) => i.carType === 'petrol' && i.carKm > 50          },
  { icon: '✈️', text: 'Replace one long-haul flight with a train or video call.',         saving: '~1,500 kg CO₂e/yr', pledge: 'Reduce long-haul flights',          condition: (_, i) => i.flightsLong > 0                               },
  { icon: '🚆', text: 'Take the train instead of short-haul flights.',                    saving: '~500 kg CO₂e/yr',   pledge: 'Train over short flights',          condition: (_, i) => i.flightsShort > 2                              },
  { icon: '☀️', text: 'Switch to a renewable energy tariff — many are cost-neutral.',     saving: '~350 kg CO₂e/yr',   pledge: 'Switch to green energy',            condition: (_, i) => i.energySource !== 'renewable'                  },
  { icon: '🌡️', text: 'Lower your thermostat by 1°C and insulate drafts.',               saving: '~200 kg CO₂e/yr',   pledge: 'Reduce home heating',               condition: (d)    => d.home > 1200                                   },
  { icon: '💡', text: 'Replace all bulbs with LEDs and unplug standby devices.',          saving: '~100 kg CO₂e/yr',   pledge: 'Reduce electricity use',            condition: (_, i) => i.kwhMonth > 300                                },
  { icon: '🥗', text: 'Go meat-free 3 days a week (flexitarian diet).',                  saving: '~400 kg CO₂e/yr',   pledge: 'Eat less meat',                     condition: (_, i) => ['meat-heavy', 'average'].includes(i.diet)      },
  { icon: '♻️', text: 'Plan meals and compost scraps to halve your food waste.',          saving: '~150 kg CO₂e/yr',   pledge: 'Reduce food waste',                 condition: (_, i) => i.foodWaste === 'high'                          },
  { icon: '👕', text: 'Buy second-hand or swap clothes instead of buying new.',           saving: '~200 kg CO₂e/yr',   pledge: 'Buy less new clothing',             condition: (_, i) => i.clothing > 3                                  },
  { icon: '📱', text: 'Extend device life by 1 year; repair before replacing.',           saving: '~300 kg CO₂e/yr',   pledge: "Repair, don't replace electronics", condition: (_, i) => i.electronics > 1                               },
  { icon: '📺', text: 'Reduce streaming to SD quality and limit daily screen time.',      saving: '~30 kg CO₂e/yr',    pledge: 'Reduce streaming hours',            condition: (_, i) => i.streaming > 5                                 },
];

/**
 * Create a bar row element for the breakdown chart.
 * @param {string} name  Category label
 * @param {number} value kg CO₂e
 * @param {number} maxVal Maximum value in chart (for scaling)
 * @returns {HTMLElement}
 */
function createBarRow(name, value, maxVal) {
  const pct = Math.round((value / maxVal) * 100);
  const kg  = Math.round(value).toLocaleString();
  const cls = pct > 66 ? 'high' : pct > 33 ? 'medium' : '';

  const row   = document.createElement('div');
  const label = document.createElement('span');
  const track = document.createElement('div');
  const fill  = document.createElement('div');
  const val   = document.createElement('span');

  row.className   = 'bar-row';
  row.setAttribute('role', 'listitem');
  label.className = 'bar-label';
  label.textContent = name;
  track.className = 'bar-track';
  track.setAttribute('role', 'img');
  track.setAttribute('aria-label', `${name}: ${kg} kg`);
  fill.className  = `bar-fill${cls ? ` ${cls}` : ''}`;
  fill.style.width = `${pct}%`;
  val.className   = 'bar-value';
  val.textContent = `${kg} kg`;

  track.appendChild(fill);
  row.appendChild(label);
  row.appendChild(track);
  row.appendChild(val);
  return row;
}

// Status CSS colour classes (defined in style.css)
const STATUS_COLORS = Object.freeze({
  'status-excellent': '#2e9e5b',
  'status-good':      '#2e9e5b',
  'status-average':   '#e6a817',
  'status-high':      '#d94f3b',
  'status-very-high': '#d94f3b',
});

/**
 * Render the results section.
 * @param {Results} data
 */
function renderResults(data) {
  const { total, transport, home, diet, shopping } = data;
  const status = getStatus(total);

  $('total-co2').textContent    = Math.round(total).toLocaleString();
  $('status-label').textContent = status.label;
  $('status-label').style.color = STATUS_COLORS[status.cssClass];
  $('status-desc').textContent  = status.desc;

  // Build bars with DocumentFragment — single reflow
  const categories = [
    { name: '🚗 Transport',   value: transport },
    { name: '🏠 Home Energy', value: home       },
    { name: '🍽️ Diet',       value: diet        },
    { name: '🛍️ Shopping',   value: shopping    },
  ];
  let maxVal = 1;
  for (const c of categories) if (c.value > maxVal) maxVal = c.value;

  const frag = document.createDocumentFragment();
  for (const c of categories) frag.appendChild(createBarRow(c.name, c.value, maxVal));

  const barsEl = $('breakdown-bars');
  barsEl.innerHTML = '';
  barsEl.appendChild(frag);

  $('gauge-fill').style.width = `${Math.min(100, (total / (GLOBAL_AVG * 2)) * 100)}%`;

  $('calculator').hidden = true;
  $('results').hidden    = false;
  $('insights').hidden   = false;
  $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Render personalised tips and pledge checkboxes.
 * @param {Results} data
 */
function renderInsights(data) {
  const matched = ALL_TIPS.filter(t => t.condition(data, data.inputs));
  const shown   = matched.length >= 4
    ? matched
    : [...matched, ...ALL_TIPS.filter(t => !matched.includes(t))].slice(0, 4);

  $('insights-intro').textContent = data.total < GLOBAL_AVG
    ? `Great work! Your footprint of ${Math.round(data.total).toLocaleString()} kg CO₂e is below the global average. Here's how to go even further:`
    : `Your footprint of ${Math.round(data.total).toLocaleString()} kg CO₂e is above the global average of ${GLOBAL_AVG.toLocaleString()} kg. These actions can make the biggest difference:`;

  const tipFrag = document.createDocumentFragment();
  for (const t of shown) {
    const li      = document.createElement('li');
    const icon    = document.createElement('span');
    const textWrap= document.createElement('span');
    const saving  = document.createElement('span');
    li.className       = 'tip-item';
    li.setAttribute('role', 'listitem');
    icon.className     = 'tip-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent   = t.icon;
    textWrap.className = 'tip-text';
    textWrap.textContent = t.text;
    saving.className   = 'tip-saving';
    saving.textContent = `Potential saving: ${t.saving}`;
    textWrap.appendChild(saving);
    li.appendChild(icon);
    li.appendChild(textWrap);
    tipFrag.appendChild(li);
  }
  const list = $('tips-list');
  list.innerHTML = '';
  list.appendChild(tipFrag);

  const pledgeFrag = document.createDocumentFragment();
  shown.forEach((t, idx) => {
    const id    = `pledge-${idx}`;
    const label = document.createElement('label');
    const cb    = document.createElement('input');
    label.className = 'pledge-option';
    label.htmlFor   = id;
    cb.type         = 'checkbox';
    cb.id           = id;
    cb.dataset.saving = String(parseSaving(t.saving));
    cb.addEventListener('change', updatePledgeSavings);
    label.appendChild(cb);
    label.append(` ${t.pledge}`);
    pledgeFrag.appendChild(label);
  });
  const pledgeContainer = $('pledge-options');
  pledgeContainer.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'pledge-options-grid';
  wrap.appendChild(pledgeFrag);
  pledgeContainer.appendChild(wrap);
  updatePledgeSavings();
}

/** Recompute and display cumulative pledge savings. */
function updatePledgeSavings() {
  const checked = $('pledge-options').querySelectorAll('input[type="checkbox"]:checked');
  let saved = 0;
  for (const cb of checked) saved += parseInt(cb.dataset.saving, 10) || 0;
  $('pledge-savings').textContent = checked.length
    ? `✅ You've pledged to save up to ~${saved.toLocaleString()} kg CO₂e/year!`
    : '';
}

let _shareAttached = false;

/**
 * Attach the share button handler (idempotent).
 * @param {number} total
 */
function setupShare(total) {
  if (_shareAttached) return;
  _shareAttached = true;
  $('share-btn').addEventListener('click', () => {
    const kg   = Math.round(Math.max(0, total)).toLocaleString();
    const text = `I just calculated my carbon footprint: ${kg} kg CO₂e/year using the Carbon Footprint Tracker. Check yours! #CarbonFootprint #PromptWars`;
    if (navigator.share) {
      navigator.share({ title: 'My Carbon Footprint', text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => { $('share-msg').textContent = '✅ Copied to clipboard!'; })
        .catch(() => { $('share-msg').textContent = text; });
    } else {
      $('share-msg').textContent = text;
    }
  });
}

// ── Event wiring ──────────────────────────────────────────────────────────────

$('footprint-form').addEventListener('submit', e => {
  e.preventDefault();
  const btn  = $('calculate-btn');
  btn.disabled   = true;
  btn.textContent = 'Calculating…';
  try {
    const data = calculate(readInputs());
    renderResults(data);
    renderInsights(data);
    setupShare(data.total);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Calculate My Footprint';
  }
});

$('recalculate-btn').addEventListener('click', () => {
  $('results').hidden    = true;
  $('insights').hidden   = true;
  $('calculator').hidden = false;
  _shareAttached         = false;
  $('share-msg').textContent = '';
  $('calculator').scrollIntoView({ behavior: 'smooth' });
});
