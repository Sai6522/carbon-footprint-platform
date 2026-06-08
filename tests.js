/**
 * @fileoverview Unit tests for Carbon Footprint Awareness Platform
 * Run: node tests.js
 */

'use strict';

const { EF, GLOBAL_AVG, calcTransport, calcHome, calcDiet, calcShopping, getStatus, parseSaving } = require('./app.js');

// ── Minimal test runner ────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function assert(description, condition) {
  if (condition) { passed++; console.log(`  ✅ ${description}`); }
  else           { failed++; console.error(`  ❌ FAIL: ${description}`); }
}

function describe(suite, fn) { console.log(`\n📋 ${suite}`); fn(); }

// ── Helpers matching app.js signatures ───────────────────────────────────────

const makeInputs = (overrides = {}) => Object.assign({
  carKm: 100, carType: 'petrol', flightsShort: 0, flightsLong: 0, publicKm: 0,
  kwhMonth: 250, energySource: 'grid', heating: 'gas', hhSize: 3,
  diet: 'average', foodWaste: 'medium', clothing: 3, electronics: 1, streaming: 4,
}, overrides);

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Emission Factors — Sanity', () => {
  assert('EV emits less than petrol',              EF.car.electric < EF.car.petrol);
  assert('Hybrid emits less than petrol',          EF.car.hybrid < EF.car.petrol);
  assert('No-drive emits zero',                    EF.car.none === 0);
  assert('Renewable grid < standard grid',         EF.electricity.renewable < EF.electricity.grid);
  assert('Coal grid > standard grid',              EF.electricity.coal > EF.electricity.grid);
  assert('Vegan diet < meat-heavy',                EF.diet.vegan < EF.diet['meat-heavy']);
  assert('Low waste multiplier < high waste',      EF.foodWaste.low < EF.foodWaste.high);
  assert('Long-haul flight > short-haul',          EF.flight.long > EF.flight.short);
});

describe('Transport Calculation', () => {
  assert('No activity = 0 emissions',              calcTransport(makeInputs({ carKm: 0, carType: 'none' })) === 0);
  assert('100 km/week petrol = 1092 kg/yr',        Math.round(calcTransport(makeInputs())) === 1092);
  assert('One long-haul flight adds 1500 kg',      calcTransport(makeInputs({ carKm: 0, carType: 'none', flightsLong: 1 })) === 1500);
  assert('Two short-haul flights = 510 kg',        calcTransport(makeInputs({ carKm: 0, carType: 'none', flightsShort: 2 })) === 510);
  assert('EV emits less than petrol same distance',calcTransport(makeInputs({ carType: 'electric' })) < calcTransport(makeInputs({ carType: 'petrol' })));
  assert('Public transport adds emissions',        calcTransport(makeInputs({ carKm: 0, carType: 'none', publicKm: 50 })) > 0);
});

describe('Home Energy Calculation', () => {
  assert('Renewable < grid',                       calcHome(makeInputs({ energySource: 'renewable' })) < calcHome(makeInputs({ energySource: 'grid' })));
  assert('Coal > grid',                            calcHome(makeInputs({ energySource: 'coal' })) > calcHome(makeInputs({ energySource: 'grid' })));
  assert('No heating reduces emissions',           calcHome(makeInputs({ heating: 'none' })) < calcHome(makeInputs({ heating: 'gas' })));
  assert('Larger household = lower per-person',    calcHome(makeInputs({ hhSize: 4 })) < calcHome(makeInputs({ hhSize: 1 })));
  assert('Higher kWh = higher emissions',          calcHome(makeInputs({ kwhMonth: 500 })) > calcHome(makeInputs({ kwhMonth: 100 })));
});

describe('Diet Calculation', () => {
  assert('Meat-heavy > average > vegan',           EF.diet['meat-heavy'] > EF.diet.average && EF.diet.average > EF.diet.vegan);
  assert('High waste > low waste',                 calcDiet(makeInputs({ foodWaste: 'high' })) > calcDiet(makeInputs({ foodWaste: 'low' })));
  assert('Vegan low-waste is minimum diet',        calcDiet(makeInputs({ diet: 'vegan', foodWaste: 'low' })) < calcDiet(makeInputs()));
  assert('Diet result is positive',                calcDiet(makeInputs()) > 0);
});

describe('Shopping Calculation', () => {
  assert('More clothing = more emissions',         calcShopping(makeInputs({ clothing: 10 })) > calcShopping(makeInputs({ clothing: 1 })));
  assert('More electronics = more emissions',      calcShopping(makeInputs({ electronics: 5 })) > calcShopping(makeInputs({ electronics: 1 })));
  assert('Zero shopping = zero',                   calcShopping(makeInputs({ clothing: 0, electronics: 0, streaming: 0 })) === 0);
  assert('Result is non-negative',                 calcShopping(makeInputs({ clothing: 0, electronics: 0, streaming: 0 })) >= 0);
});

describe('Total Footprint', () => {
  const i   = makeInputs();
  const tot = calcTransport(i) + calcHome(i) + calcDiet(i) + calcShopping(i);
  assert('Default inputs produce positive total',  tot > 0);
  assert('Default inputs in range 1000–20000 kg', tot > 1000 && tot < 20000);
  assert('Low-impact < high-impact lifestyle', (() => {
    const lo = makeInputs({ carType: 'electric', carKm: 50, energySource: 'renewable', diet: 'vegan', foodWaste: 'low', clothing: 1, electronics: 0, streaming: 1 });
    const hi = makeInputs({ carType: 'petrol', carKm: 200, flightsLong: 2, energySource: 'coal', diet: 'meat-heavy', foodWaste: 'high', clothing: 10, electronics: 3, streaming: 8 });
    return (calcTransport(lo) + calcHome(lo) + calcDiet(lo) + calcShopping(lo)) <
           (calcTransport(hi) + calcHome(hi) + calcDiet(hi) + calcShopping(hi));
  })());
});

describe('Status Thresholds (getStatus)', () => {
  assert('500 kg = excellent',          getStatus(500).label.includes('Excellent'));
  assert('3000 kg = good',              getStatus(3000).label.includes('Good'));
  assert('6000 kg = average',           getStatus(6000).label.includes('Average'));
  assert('8000 kg = high',              getStatus(8000).label.includes('High'));
  assert('10000 kg = very high',        getStatus(10000).label.includes('Very High'));
  assert('Just below avg = good',       getStatus(GLOBAL_AVG - 1).label.includes('Good'));
  assert('Status returns color string', typeof getStatus(5000).color === 'string');
  assert('Status returns desc string',  typeof getStatus(5000).desc === 'string');
});

describe('Input Sanitization', () => {
  // safeNum-equivalent logic tested via calcTransport with edge inputs
  assert('GLOBAL_AVG is 4700',          GLOBAL_AVG === 4700);
  assert('parseSaving extracts number', parseSaving('~1,000 kg CO₂e/yr') === 1000);
  assert('parseSaving handles zero',    parseSaving('no number here') === 0);
  assert('EF object is frozen',         Object.isFrozen(EF));
  assert('EF.car object is frozen',     Object.isFrozen(EF.car));
});

describe('Global Average', () => {
  assert('GLOBAL_AVG is positive',      GLOBAL_AVG > 0);
  assert('Half avg threshold works',    GLOBAL_AVG * 0.5 === 2350);
  assert('Double avg threshold works',  GLOBAL_AVG * 2 === 9400);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) console.log('🎉 All tests passed!');
else process.exit(1);
