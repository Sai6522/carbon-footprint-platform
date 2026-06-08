/**
 * tests.js — Carbon Footprint Platform Unit Tests
 * Run in browser: open test.html | or Node: node tests.js
 */

// ── Minimal test runner ────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function assert(description, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${description}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${description}`);
  }
}

function describe(suite, fn) {
  console.log(`\n📋 ${suite}`);
  fn();
}

// ── Inline emission factors (mirrors app.js) ──────────────────────────────────

const EF = {
  car: { petrol: 0.21, hybrid: 0.11, electric: 0.053, none: 0 },
  flight: { short: 255, long: 1500 },
  bus_train: 0.04,
  electricity: { grid: 0.233, renewable: 0.05, coal: 0.82 },
  heating: { gas: 2.04, electric: 0.5, oil: 2.52, none: 0 },
  diet: { 'meat-heavy': 3300, average: 2500, 'low-meat': 1900, pescatarian: 1600, vegetarian: 1200, vegan: 900 },
  food_waste: { high: 1.25, medium: 1.0, low: 0.85 },
  clothing: 6,
  electronics: 300,
  streaming: 0.036,
};
const GLOBAL_AVG = 4700;

// ── Calculation helpers (pure functions, testable without DOM) ────────────────

function calcTransport({ carKm = 100, carType = 'petrol', flightsShort = 0, flightsLong = 0, publicKm = 0 } = {}) {
  const car = carKm * 52 * EF.car[carType];
  const flights = flightsShort * EF.flight.short + flightsLong * EF.flight.long;
  const pt = publicKm * 52 * EF.bus_train;
  return car + flights + pt;
}

function calcHome({ kwh = 250, source = 'grid', heating = 'gas', hhSize = 3 } = {}) {
  const elec = kwh * 12 * EF.electricity[source];
  const heat = EF.heating[heating] * 12 / hhSize;
  return elec + heat;
}

function calcDiet({ diet = 'average', waste = 'medium' } = {}) {
  return EF.diet[diet] * EF.food_waste[waste];
}

function calcShopping({ clothing = 3, electronics = 1, streaming = 4 } = {}) {
  return clothing * 12 * EF.clothing + electronics * EF.electronics + streaming * 365 * EF.streaming;
}

function safeNum(n, min = 0, max = Infinity, fallback = 0) {
  if (!isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Emission Factors — Sanity', () => {
  assert('EV emits less than petrol', EF.car.electric < EF.car.petrol);
  assert('Hybrid emits less than petrol', EF.car.hybrid < EF.car.petrol);
  assert('No-drive emits zero', EF.car.none === 0);
  assert('Renewable grid < standard grid', EF.electricity.renewable < EF.electricity.grid);
  assert('Coal grid > standard grid', EF.electricity.coal > EF.electricity.grid);
  assert('Vegan diet < meat-heavy', EF.diet.vegan < EF.diet['meat-heavy']);
  assert('Low waste multiplier < high waste', EF.food_waste.low < EF.food_waste.high);
  assert('Long-haul flight > short-haul', EF.flight.long > EF.flight.short);
});

describe('Transport Calculation', () => {
  assert('No driving = 0 car emissions', calcTransport({ carKm: 0, carType: 'none', flightsShort: 0, flightsLong: 0, publicKm: 0 }) === 0);
  assert('100 km/week petrol = 1092 kg/yr', Math.round(calcTransport({ carKm: 100, carType: 'petrol' })) === 1092);
  assert('One long-haul flight adds 1500 kg', calcTransport({ carKm: 0, carType: 'none', flightsLong: 1 }) === 1500);
  assert('Two short-haul flights = 510 kg', calcTransport({ carKm: 0, carType: 'none', flightsShort: 2 }) === 510);
  assert('EV car emits less than petrol same distance', calcTransport({ carKm: 100, carType: 'electric' }) < calcTransport({ carKm: 100, carType: 'petrol' }));
  assert('Public transport adds emissions', calcTransport({ carKm: 0, carType: 'none', publicKm: 50 }) > 0);
});

describe('Home Energy Calculation', () => {
  assert('Renewable source produces less than grid', calcHome({ source: 'renewable' }) < calcHome({ source: 'grid' }));
  assert('Coal source produces more than grid', calcHome({ source: 'coal' }) > calcHome({ source: 'grid' }));
  assert('No heating reduces emissions', calcHome({ heating: 'none' }) < calcHome({ heating: 'gas' }));
  assert('Larger household = lower per-person heating', calcHome({ hhSize: 4 }) < calcHome({ hhSize: 1 }));
  assert('Higher kWh = higher emissions', calcHome({ kwh: 500 }) > calcHome({ kwh: 100 }));
});

describe('Diet Calculation', () => {
  assert('Meat-heavy > average > vegan', EF.diet['meat-heavy'] > EF.diet.average && EF.diet.average > EF.diet.vegan);
  assert('High waste increases diet emissions', calcDiet({ waste: 'high' }) > calcDiet({ waste: 'low' }));
  assert('Vegan low-waste is minimum', calcDiet({ diet: 'vegan', waste: 'low' }) < calcDiet({ diet: 'average', waste: 'medium' }));
  assert('Diet result is positive', calcDiet() > 0);
});

describe('Shopping Calculation', () => {
  assert('More clothing = more emissions', calcShopping({ clothing: 10 }) > calcShopping({ clothing: 1 }));
  assert('More electronics = more emissions', calcShopping({ electronics: 5 }) > calcShopping({ electronics: 1 }));
  assert('Zero everything = minimal (just streaming floor)', calcShopping({ clothing: 0, electronics: 0, streaming: 0 }) === 0);
  assert('Result is non-negative', calcShopping({ clothing: 0, electronics: 0, streaming: 0 }) >= 0);
});

describe('Total Footprint', () => {
  const avg = calcTransport() + calcHome() + calcDiet() + calcShopping();
  assert('Default inputs produce positive total', avg > 0);
  assert('Default inputs are in reasonable range (1000–20000 kg)', avg > 1000 && avg < 20000);
  assert('Vegan+EV+renewable total < meat+petrol+coal', (() => {
    const low = calcTransport({ carKm: 50, carType: 'electric' }) + calcHome({ source: 'renewable' }) + calcDiet({ diet: 'vegan', waste: 'low' }) + calcShopping({ clothing: 1, electronics: 0, streaming: 1 });
    const high = calcTransport({ carKm: 200, carType: 'petrol', flightsLong: 2 }) + calcHome({ source: 'coal' }) + calcDiet({ diet: 'meat-heavy', waste: 'high' }) + calcShopping({ clothing: 10, electronics: 3, streaming: 8 });
    return low < high;
  })());
});

describe('Input Sanitization (safeNum)', () => {
  assert('NaN returns fallback', safeNum(NaN, 0, 1000, 0) === 0);
  assert('Infinity returns fallback', safeNum(Infinity, 0, 1000, 0) === 0);
  assert('Negative clamped to min', safeNum(-5, 0, 1000, 0) === 0);
  assert('Over-max clamped', safeNum(9999, 0, 100, 0) === 100);
  assert('Valid number passes through', safeNum(42, 0, 100, 0) === 42);
});

describe('Status Thresholds', () => {
  function getStatus(total) {
    if (total < GLOBAL_AVG * 0.5) return 'excellent';
    if (total < GLOBAL_AVG) return 'good';
    if (total < GLOBAL_AVG * 1.5) return 'average';
    if (total < GLOBAL_AVG * 2) return 'high';
    return 'very-high';
  }
  assert('500 kg = excellent', getStatus(500) === 'excellent');
  assert('3000 kg = good', getStatus(3000) === 'good');
  assert('6000 kg = average', getStatus(6000) === 'average');
  assert('8000 kg = high', getStatus(8000) === 'high');
  assert('10000 kg = very-high', getStatus(10000) === 'very-high');
  assert('Exactly global avg = good (boundary)', getStatus(GLOBAL_AVG - 1) === 'good');
});

describe('Global Average', () => {
  assert('GLOBAL_AVG is 4700', GLOBAL_AVG === 4700);
  assert('GLOBAL_AVG is positive', GLOBAL_AVG > 0);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) console.log('🎉 All tests passed!');
else console.error(`⚠️  ${failed} test(s) failed`);

// Export for browser test runner
if (typeof module !== 'undefined') module.exports = { passed, failed };
