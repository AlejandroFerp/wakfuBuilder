import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import '../equipment-filters.js';
const api = globalThis.WAKFU_EQUIPMENT_FILTERS;
const effect = (actionId, text, params = []) => ({ actionId, text, params });
function item(id, extra = {}) {
  return { id, level: 100, name: `Equipo ${id}`, rarity: 4, rarityLabel: 'Legendario', itemTypeName: 'Casco', searchText: `equipo ${id}`, effects: [], recipes: [], ...extra };
}
const items = [
  item(1, { level: 80, name: 'Capa de prueba', itemTypeName: 'Capa', searchText: 'capa de prueba', rarityLabel: 'Mítico', effects: [effect(31, '1 PA'), effect(1053, '40 Dominio distancia')], recipes: [{ isUpgrade: true }] }),
  item(2, { effects: [effect(31, '1 PA'), effect(56, '-1 PA'), effect(1053, '60 Dominio distancia')] }),
  item(3, { level: 120, effects: [effect(31, '2 PA'), effect(1053, '80 Dominio distancia')], recipes: [{ isUpgrade: false }] }),
];

test('level, multiple rarities and types combine with all numerical bounds', () => {
  const filters = api.blank();
  Object.assign(filters, { minLevel: 80, maxLevel: 100, rarities: ['Mítico', 'Legendario'], types: ['Capa', 'Casco'], ranges: { ap: { min: 1, max: 1 }, distance: { min: 40, max: 60 } } });
  assert.deepEqual(api.createIndex(items).search(filters).map(x => x.id), [1]);
  filters.ranges.ap.min = 0;
  assert.deepEqual(api.createIndex(items).search(filters).map(x => x.id), [2, 1]);
});

test('absent stats are zero, explicit zero and negative limits work and maluses are subtracted', () => {
  const filters = api.blank();
  filters.ranges.ap = { min: 0, max: 0 };
  assert.deepEqual(api.createIndex([...items, item(4)]).search(filters).map(x => x.id), [2, 4]);
  filters.ranges.ap = { min: -2, max: -1 };
  assert.deepEqual(api.createIndex([item(5, { effects: [effect(56, '-1 PA')] })]).search(filters).map(x => x.id), [5]);
});

test('universal elemental bonuses count for each element and random bonuses stay separate', () => {
  const stats = api.statsFor(item(1, { effects: [effect(120, '20 Dominio elemental'), effect(122, '10 Dominio de fuego'), effect(80, '30 Resistencia elemental'), effect(97, '-5 Resistencia al fuego'), effect(1068, '{conditional}', [40, 0.5, 2]), effect(1069, '{conditional}', [50, 0, 3])] }));
  assert.equal(stats.fireMastery, 30);
  assert.equal(stats.waterMastery, 20);
  assert.equal(stats.fireResistance, 25);
  assert.equal(stats.randomMastery, 90);
  assert.equal(stats.randomResistance, 50);
});

test('crafting and upgrade filters use recipe metadata and preserve unions', () => {
  const filters = api.blank();
  filters.acquisition = ['upgrade'];
  assert.deepEqual(api.createIndex(items).search(filters).map(x => x.id), [1]);
  filters.acquisition = ['craft'];
  assert.deepEqual(api.createIndex(items).search(filters).map(x => x.id), [3, 1]);
  filters.acquisition = ['upgrade', 'external'];
  assert.deepEqual(api.createIndex(items).search(filters).map(x => x.id), [2, 1]);
});

test('text accents, stat sorting, ties and reversed ranges behave predictably', () => {
  const filters = api.blank();
  filters.query = 'CÁPA prueba';
  assert.deepEqual(api.createIndex(items).search(filters).map(x => x.id), [1]);
  filters.query = '';
  filters.sort = 'stat:distance';
  assert.deepEqual(api.createIndex(items).search(filters).map(x => x.id), [3, 2, 1]);
  filters.minLevel = 100; filters.maxLevel = 80;
  assert.ok(api.invalid(filters));
  assert.deepEqual(api.createIndex(items).search(filters), []);
  filters.minLevel = null; filters.maxLevel = null;
  filters.ranges.ap = { min: 2, max: 1 };
  assert.ok(api.invalid(filters));
  assert.deepEqual(api.createIndex(items).search(filters), []);
});

test('real browser catalog matches numerical constraints and every item is accessible through sorting', () => {
  const browser = { window: {} };
  vm.runInNewContext(readFileSync(new URL('../data/game-data.js', import.meta.url), 'utf8'), browser);
  const catalog = browser.window.COLOR_FORGE_GAME_DATA.equipment;
  const index = api.createIndex(catalog);
  assert.equal(index.search(api.blank()).length, catalog.length);
  const filters = api.blank();
  filters.minLevel = 51; filters.maxLevel = 80;
  filters.ranges.ap = { min: 1, max: null };
  filters.ranges.distance = { min: 20, max: null };
  const matches = index.search(filters);
  assert.ok(matches.length > 0);
  assert.ok(matches.every(x => x.level >= 51 && x.level <= 80 && index.stats.get(x.id).ap >= 1 && index.stats.get(x.id).distance >= 20));
  assert.ok([...index.stats.values()].every(stats => Object.values(stats).every(Number.isFinite)));
});
