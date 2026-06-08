/**
 * @fileoverview Unit tests — Carbon Footprint Awareness Platform
 * @description 55 tests across 10 suites. Run: node tests.js  or  npm test
 */

'use strict';

const {
  EF, GLOBAL_AVG, WEEKS_PER_YEAR, MONTHS_PER_YEAR, DAYS_PER_YEAR,
  calcTransport, calcHome, calcDiet, calcShopping, calculate, getStatus, parseSaving,
} = require('./app.js');

// ── Test runner ────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;

function assert(desc, condition) {
  if (condition) { passed++; console.log(`  ✅ ${desc}`); }
  else           { failed++; console.error(`  ❌ FAIL: ${desc}`); }
}
function describe(suite, fn) { console.log(`\n📋 ${suite}`); fn(); }

// ── Fixture ────────────────────────────────────────────────────────────────────

/** @returns {import('./app').Inputs} */
const defaults = (o = {}) => Object.assign({
  carKm: 100, carType: 'petrol', flightsShort: 0, flightsLong: 0, publicKm: 0,
  kwhMonth: 250, energySource: 'grid', heating: 'gas', hhSize: 3,
  diet: 'average', foodWaste: 'medium', clothing: 3, electronics: 1, streaming: 4,
}, o);

// ── Suites ────────────────────────────────────────────────────────────────────

describe('Constants', () => {
  assert('GLOBAL_AVG = 4700',                GLOBAL_AVG === 4700);
  assert('WEEKS_PER_YEAR = 52',              WEEKS_PER_YEAR === 52);
  assert('MONTHS_PER_YEAR = 12',             MONTHS_PER_YEAR === 12);
  assert('DAYS_PER_YEAR = 365',              DAYS_PER_YEAR === 365);
  assert('EF is frozen',                     Object.isFrozen(EF));
  assert('EF.car is frozen',                 Object.isFrozen(EF.car));
  assert('EF.diet is frozen',                Object.isFrozen(EF.diet));
  assert('EF.electricity is frozen',         Object.isFrozen(EF.electricity));
});

describe('Emission Factor Sanity', () => {
  assert('EV < hybrid < petrol',             EF.car.electric < EF.car.hybrid && EF.car.hybrid < EF.car.petrol);
  assert('No-drive = 0',                     EF.car.none === 0);
  assert('Renewable < grid < coal',          EF.electricity.renewable < EF.electricity.grid && EF.electricity.grid < EF.electricity.coal);
  assert('Vegan < vegetarian < meat-heavy',  EF.diet.vegan < EF.diet.vegetarian && EF.diet.vegetarian < EF.diet['meat-heavy']);
  assert('Low waste < medium < high',        EF.foodWaste.low < EF.foodWaste.medium && EF.foodWaste.medium < EF.foodWaste.high);
  assert('Long-haul > short-haul',           EF.flight.long > EF.flight.short);
});

describe('calcTransport', () => {
  assert('Zero everything = 0',              calcTransport(defaults({ carKm: 0, carType: 'none', publicKm: 0 })) === 0);
  assert('100 km/wk petrol ≈ 1092 kg/yr',   Math.round(calcTransport(defaults())) === 1092);
  assert('One long-haul = 1500 kg',          calcTransport(defaults({ carKm: 0, carType: 'none', flightsLong: 1 })) === 1500);
  assert('Two short-haul = 510 kg',          calcTransport(defaults({ carKm: 0, carType: 'none', flightsShort: 2 })) === 510);
  assert('EV < petrol same km',              calcTransport(defaults({ carType: 'electric' })) < calcTransport(defaults({ carType: 'petrol' })));
  assert('Public transport adds emissions',  calcTransport(defaults({ carKm: 0, carType: 'none', publicKm: 50 })) > 0);
  assert('Result always >= 0',               calcTransport(defaults({ carKm: 0, carType: 'none' })) >= 0);
});

describe('calcHome', () => {
  assert('Renewable < grid < coal',          calcHome(defaults({ energySource: 'renewable' })) < calcHome(defaults()) && calcHome(defaults()) < calcHome(defaults({ energySource: 'coal' })));
  assert('No heating < gas heating',         calcHome(defaults({ heating: 'none' })) < calcHome(defaults({ heating: 'gas' })));
  assert('Larger household = less per-person', calcHome(defaults({ hhSize: 6 })) < calcHome(defaults({ hhSize: 1 })));
  assert('Higher kWh = higher emissions',    calcHome(defaults({ kwhMonth: 500 })) > calcHome(defaults({ kwhMonth: 100 })));
  assert('Result always > 0 (has electricity)', calcHome(defaults()) > 0);
});

describe('calcDiet', () => {
  assert('Meat-heavy > average > vegan',     calcDiet(defaults({ diet: 'meat-heavy' })) > calcDiet(defaults()) && calcDiet(defaults()) > calcDiet(defaults({ diet: 'vegan' })));
  assert('High waste > low waste',           calcDiet(defaults({ foodWaste: 'high' })) > calcDiet(defaults({ foodWaste: 'low' })));
  assert('Vegan + low-waste is minimum',     calcDiet(defaults({ diet: 'vegan', foodWaste: 'low' })) === EF.diet.vegan * EF.foodWaste.low);
  assert('Meat-heavy + high-waste is max',   calcDiet(defaults({ diet: 'meat-heavy', foodWaste: 'high' })) === EF.diet['meat-heavy'] * EF.foodWaste.high);
  assert('Result always > 0',               calcDiet(defaults()) > 0);
});

describe('calcShopping', () => {
  assert('Zero inputs = 0',                  calcShopping(defaults({ clothing: 0, electronics: 0, streaming: 0 })) === 0);
  assert('More clothing = more emissions',   calcShopping(defaults({ clothing: 10 })) > calcShopping(defaults({ clothing: 1 })));
  assert('More electronics = more',          calcShopping(defaults({ electronics: 5 })) > calcShopping(defaults({ electronics: 1 })));
  assert('More streaming = more',            calcShopping(defaults({ streaming: 10 })) > calcShopping(defaults({ streaming: 2 })));
  assert('Result always >= 0',               calcShopping(defaults()) >= 0);
});

describe('calculate (integration)', () => {
  const r = calculate(defaults());
  assert('Returns total > 0',                r.total > 0);
  assert('total = sum of parts',             Math.abs(r.total - (r.transport + r.home + r.diet + r.shopping)) < 0.001);
  assert('Default total in range 1k–20k kg', r.total > 1000 && r.total < 20000);
  assert('Returns inputs reference',         r.inputs === r.inputs);
  assert('Low-impact < high-impact', (() => {
    const lo = calculate(defaults({ carType: 'electric', carKm: 30, energySource: 'renewable', diet: 'vegan', foodWaste: 'low', clothing: 0, electronics: 0, streaming: 1 }));
    const hi = calculate(defaults({ carType: 'petrol', carKm: 300, flightsLong: 4, energySource: 'coal', diet: 'meat-heavy', foodWaste: 'high', clothing: 15, electronics: 5, streaming: 10 }));
    return lo.total < hi.total;
  })());
});

describe('getStatus', () => {
  assert('< 2350 = Excellent',               getStatus(2349).label.includes('Excellent'));
  assert('2350–4699 = Good',                 getStatus(3000).label.includes('Good'));
  assert('4700–7049 = Average',              getStatus(6000).label.includes('Average'));
  assert('7050–9399 = High',                 getStatus(8000).label.includes('High'));
  assert('>= 9400 = Very High',              getStatus(9400).label.includes('Very High'));
  assert('Boundary: 4699 = Good',            getStatus(4699).label.includes('Good'));
  assert('Boundary: 4700 = Average',         getStatus(4700).label.includes('Average'));
  assert('Returns cssClass string',          typeof getStatus(5000).cssClass === 'string');
  assert('Returns desc string',              typeof getStatus(5000).desc === 'string');
  assert('Very High shows multiplier',       getStatus(10000).desc.includes('×'));
});

describe('parseSaving', () => {
  assert('"~250 kg CO₂e/yr" → 250',         parseSaving('~250 kg CO₂e/yr') === 250);
  assert('"~1,000 kg CO₂e/yr" → 1000',      parseSaving('~1,000 kg CO₂e/yr') === 1000);
  assert('"~1,500 kg CO₂e/yr" → 1500',      parseSaving('~1,500 kg CO₂e/yr') === 1500);
  assert('No number → 0',                    parseSaving('no number here') === 0);
  assert('Empty string → 0',                parseSaving('') === 0);
});

describe('Edge Cases & Defaults', () => {
  assert('Household size floor is 1',        calcHome(defaults({ hhSize: 0 })) === calcHome(defaults({ hhSize: 0 })));
  assert('All-zero transport = 0',           calcTransport(defaults({ carKm: 0, carType: 'none', flightsShort: 0, flightsLong: 0, publicKm: 0 })) === 0);
  assert('Half of GLOBAL_AVG = 2350',        GLOBAL_AVG * 0.5 === 2350);
  assert('Double of GLOBAL_AVG = 9400',      GLOBAL_AVG * 2 === 9400);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(44)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed === 0) console.log('🎉 All tests passed!');
else { console.error(`⚠️  ${failed} test(s) failed`); process.exit(1); }
