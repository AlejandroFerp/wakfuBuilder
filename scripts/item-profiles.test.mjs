import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import '../equipment-filters.js';
const api = globalThis.WAKFU_EQUIPMENT_FILTERS;
const effect = (actionId, text, params = []) => ({ actionId, text, params });
const item = (id, effects = [], extra = {}) => ({ id, level: 80, name: `Equipo ${id}`, itemTypeName: 'Casco', effects, recipes: [], searchText: `equipo ${id}`, rarityLabel: 'Legendario', ...extra });

test('positive scores follow the agreed weights and exclude life, healing and negative stats', () => {
  const piece = item(1, [effect(31, '1 PA'), effect(41, '1 PM'), effect(150, '2% crítico'), effect(875, '3% anticipación'), effect(173, '40 Placaje'), effect(175, '100 Esquiva'), effect(120, '200 Dominio elemental'), effect(1053, '50 Dominio distancia'), effect(1055, '-500 Dominio berserker'), effect(20, '900 PdV'), effect(26, '600 Dominio cura'), effect(80, '10 Resistencia elemental'), effect(83, '20 Resistencia al agua'), effect(1069, '{condition}', [5, 0, 3])]);
  const profile = api.profileFor(piece);
  assert.equal(profile.offensive, 550);
  assert.equal(profile.defensive, 465);
  assert.ok(profile.maluses.includes('berserk'));
  assert.equal(api.statsFor(piece).berserk, -500);
});

test('two and three elemental masteries score equally while resistances count each element', () => {
  const bi = api.profileFor(item(1, [effect(1068, '{conditional}', [100, 0, 2]), effect(1069, '{conditional}', [10, 0, 2])]));
  const tri = api.profileFor(item(2, [effect(1068, '{conditional}', [100, 0, 3]), effect(1069, '{conditional}', [10, 0, 3])]));
  assert.equal(bi.offensive, tri.offensive);
  assert.equal(bi.defensive, 20);
  assert.equal(tri.defensive, 30);
  assert.deepEqual(bi.elements, [2]);
  assert.deepEqual(tri.elements, [3]);
  assert.deepEqual(api.profileFor(item(3, [effect(122, '100 Dominio de fuego'), effect(124, '100 Dominio de agua')])).elements, [2]);
});

test('negative stat filters detect raw maluses even when net stats stay positive', () => {
  const catalog = [item(1, [effect(31, '2 PA'), effect(56, '-1 PA')]), item(2, [effect(31, '1 PA')]), item(3, [effect(1055, '-500 Dominio berserker')])];
  const index = api.createIndex(catalog);
  const filters = api.blank(); filters.negatives = 'none';
  assert.deepEqual(index.search(filters).map(x => x.id), [2]);
  filters.negatives = 'with'; filters.negativeStats = ['berserk'];
  assert.deepEqual(index.search(filters).map(x => x.id), [3]);
  assert.equal(index.profiles.get(1).offensive, 200);
});

test('conditions are character requirements rather than item stats and preserve exact comparisons', () => {
  const catalog = [item(1, [effect(173, '700 Placaje')]), item(2, [])];
  const index = api.createIndex(catalog, { items: { 2: [{ stat: 'tackle', operator: '>=', value: 500 }, { stat: 'ap', operator: '<=', value: 11 }] } });
  const filters = api.blank(); filters.conditionSelection = ['ap-max-11'];
  assert.deepEqual(index.search(filters).map(x => x.id), [2]);
  filters.conditionSelection = ['ap-min-13'];
  assert.equal(index.search(filters).length, 0);
  filters.conditionSelection = []; filters.conditionMode = 'unrecorded';
  assert.deepEqual(index.search(filters).map(x => x.id), [1]);
});

test('median is relative to actual game brackets and equipment type, unaffected by search filters', () => {
  const catalog = [item(1, [effect(1053, '10 Dominio distancia')]), item(2, [effect(1053, '30 Dominio distancia')]), item(3, [effect(1053, '500 Dominio distancia')], { itemTypeName: 'Espada (Dos manos)' }), item(4, [effect(1053, '500 Dominio distancia')], { level: 81 })];
  const index = api.createIndex(catalog);
  assert.equal(index.profiles.get(1).offensiveMedian, 20);
  assert.equal(index.profiles.get(2).offensiveMedian, 20);
  const filters = api.blank(); filters.scoreMode = 'offensive'; filters.bracket = '80';
  assert.deepEqual(index.search(filters).map(x => x.id), [2]);
  filters.query = 'equipo 1';
  assert.equal(index.search(filters).length, 0);
  assert.equal(index.profiles.get(1).offensiveMedian, 20);
  assert.equal(api.bracketFor(20).label, '1–20');
  assert.equal(api.bracketFor(21).label, '21–35');
  assert.equal(api.bracketFor(245).label, '231–245');
  assert.equal(api.bracketFor(0).label, 'Nivel 0');
});

test('multiple dropdown conditions use OR while ranges and types remain stacked', () => {
  const catalog = [item(1), item(2), item(3), item(4, [], { itemTypeName: 'Capa' })];
  const index = api.createIndex(catalog, { items: {
    1: [{ stat: 'ap', operator: '<=', value: 11 }],
    2: [{ stat: 'critical', operator: '>=', value: 40 }, { stat: 'critical', operator: '<=', value: 50 }],
    3: [{ stat: 'critical', operator: '>=', value: 40 }],
    4: [{ stat: 'ap', operator: '<=', value: 11 }],
  } });
  const filters = api.blank();
  filters.conditionSelection = ['ap-max-11', 'critical-40-50'];
  filters.types = ['Casco'];
  filters.minLevel = 80; filters.maxLevel = 80;
  assert.deepEqual(index.search(filters).map(item => item.id), [1, 2]);
  filters.conditionSelection = ['critical-40-50'];
  assert.deepEqual(index.search(filters).map(item => item.id), [2]);
  filters.conditionSelection = [];
  assert.deepEqual(index.search(filters).map(item => item.id), [1, 2, 3]);
});

test('real conditions and profile data stay finite across the entire catalog', () => {
  const browser = { window: {} };
  vm.runInNewContext(readFileSync(new URL('../data/game-data.js', import.meta.url), 'utf8'), browser);
  vm.runInNewContext(readFileSync(new URL('../data/item-conditions.js', import.meta.url), 'utf8'), browser);
  const items = browser.window.COLOR_FORGE_GAME_DATA.equipment;
  const index = api.createIndex(items, browser.window.WAKFU_ITEM_CONDITIONS);
  assert.equal(index.conditions.get(27447)[0].value, 11);
  for (const profile of index.profiles.values()) {
    for (const key of ['offensive', 'defensive', 'offensiveMedian', 'defensiveMedian', 'offensivePercentile', 'defensivePercentile']) assert.ok(Number.isFinite(profile[key]));
  }
  const filters = api.blank(); filters.elements = ['3']; filters.scoreMode = 'offensive'; filters.negatives = 'none';
  assert.ok(index.search(filters).length > 0);
});
