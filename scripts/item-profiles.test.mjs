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
  assert.equal(profile.offensive, 430);
  assert.equal(profile.defensive, 360);
  assert.equal(profile.domainMultiplier, .8);
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

test('median uses the selected level interval and type and is unaffected by other filters', () => {
  const catalog = [item(1, [effect(1053, '10 Dominio distancia')]), item(2, [effect(1053, '30 Dominio distancia')]), item(3, [effect(1053, '500 Dominio distancia')], { itemTypeName: 'Espada (Dos manos)' }), item(4, [effect(1053, '500 Dominio distancia')], { level: 81 })];
  const index = api.createIndex(catalog);
  assert.equal(index.profiles.get(1).offensiveMedian, 30);
  const filters = api.blank(); filters.scoreMode = 'offensive'; filters.minLevel = 66; filters.maxLevel = 80;
  assert.deepEqual(index.search(filters).map(x => x.id), [2]);
  filters.query = 'equipo 1';
  assert.equal(index.search(filters).length, 0);
  assert.equal(index.profiles.get(1).offensiveMedian, 20);
  filters.query = ''; filters.maxLevel = 81;
  assert.deepEqual(index.search(filters).map(x => x.id), [4]);
  assert.equal(index.profiles.get(1).offensiveMedian, 30);
  assert.equal(api.bracketFor(20).label, '1–20');
  assert.equal(api.bracketFor(21).label, '21–35');
  assert.equal(api.bracketFor(245).label, '231–245');
  assert.equal(api.bracketFor(0).label, 'Nivel 0');
});

test('monoelemental excludes triple-element items with single-element supplements', () => {
  const browser = { window: {} };
  vm.runInNewContext(readFileSync(new URL('../data/game-data.js', import.meta.url), 'utf8'), browser);
  const pieces = browser.window.COLOR_FORGE_GAME_DATA.equipment.filter(item => [23965, 23966, 23967, 23968].includes(item.id));
  assert.equal(pieces.length, 4);
  const index = api.createIndex(pieces);
  const filters = api.blank(); filters.elements = ['1'];
  assert.equal(index.search(filters).length, 0);
  filters.elements = ['3'];
  assert.equal(index.search(filters).length, 4);
  assert.deepEqual(api.profileFor(item(9, [effect(120, '100 Dominio elemental'), effect(122, '20 Dominio de fuego')])).elements, [4]);
});

test('every multi-element item in the full catalog is excluded from mono regardless of name', () => {
  const browser = { window: {} };
  vm.runInNewContext(readFileSync(new URL('../data/game-data.js', import.meta.url), 'utf8'), browser);
  const items = browser.window.COLOR_FORGE_GAME_DATA.equipment;
  const index = api.createIndex(items);
  const filters = api.blank(); filters.elements = ['1'];
  const mono = new Set(index.search(filters).map(item => item.id));
  let checked = 0;
  for (const piece of items) {
    const positive = piece.effects.filter(effect => api.effectValue(effect, piece).value > 0);
    const randomMulti = positive.some(effect => effect.actionId === 1068 && Number(effect.params?.[2]) >= 2);
    const universal = positive.some(effect => effect.actionId === 120);
    const specificCount = new Set(positive.filter(effect => [122, 123, 124, 125].includes(effect.actionId)).map(effect => effect.actionId)).size;
    if (randomMulti || universal || specificCount >= 2) {
      checked++;
      assert.ok(!mono.has(piece.id), `${piece.name} #${piece.id} must not appear as mono`);
    }
  }
  assert.ok(checked > 1000, 'The regression must cover the whole catalog, not just a list of named examples');
});

test('best profiles visibly exclude lower scores and force descending score order', () => {
  const pieces = [item(1, [effect(1053, '10 Dominio distancia')]), item(2, [effect(1053, '30 Dominio distancia')]), item(3, [effect(1053, '50 Dominio distancia')]), item(4, [effect(1053, '100 Dominio distancia')], { level: 79 })];
  const index = api.createIndex(pieces);
  const filters = api.blank(); filters.minLevel = 66; filters.maxLevel = 80; filters.scoreMode = 'offensive';
  assert.deepEqual(index.search(filters).map(x => x.id), [4, 3]);
  filters.query = 'equipo 3';
  assert.deepEqual(index.search(filters).map(x => x.id), [3]);
  assert.equal(index.profiles.get(3).offensiveMedian, 40);
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

test('defensive profile filters and sorts by defensive score independently of offense', () => {
  const pieces = [item(1, [effect(173, '10 Placaje')]), item(2, [effect(173, '30 Placaje')]), item(3, [effect(173, '50 Placaje')]), item(4, [effect(173, '100 Placaje')], { level: 79 })];
  const index = api.createIndex(pieces);
  const filters = api.blank(); filters.scoreMode = 'defensive'; filters.minLevel = 66; filters.maxLevel = 80;
  assert.deepEqual(index.search(filters).map(x => x.id), [4, 3]);
  filters.scoreMode = 'both';
  assert.equal(index.search(filters).length, 0, 'Items with zero offense cannot be above an offensive median of zero');
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
