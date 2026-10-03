import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import '../catalog.js';
const { createCatalog } = globalThis.WAKFU_CATALOG;
const ingredient = (itemId, quantity) => ({ itemId, name: `Material ${itemId}`, quantity });
const recipe = (id, ingredients, quantity = 1, isUpgrade = true) => ({ id, ingredients, quantity, isUpgrade, level: 10 });
const item = (id, rarity, recipes = []) => ({ id, name: 'Mismo nombre', itemTypeId: 132, rarity, recipes });

test('real ingredient links connect rare to mythic, legendary and souvenir in either direction', () => {
  const data = [item(1, 2), item(2, 3, [recipe(12, [ingredient(1, 1), ingredient(90, 4)])]), item(3, 4, [recipe(13, [ingredient(2, 1), ingredient(90, 6)])]), item(4, 6, [recipe(14, [ingredient(3, 1), ingredient(91, 3)])]), item(5, 4)];
  const catalog = createCatalog(data);
  for (const id of [1, 2, 3, 4]) {
    const chain = catalog.chains(id)[0];
    assert.deepEqual(chain.map(step => step.item.id), [1, 2, 3, 4]);
    assert.deepEqual(Object.fromEntries(catalog.requirements(chain).totals.map(x => [x.itemId, x.quantity])), { 1: 1, 90: 10, 91: 3 });
  }
  assert.equal(catalog.chains(5)[0].length, 1, 'Same name alone must not create a link');
});

test('craft quantities propagate backwards and respect batch outputs', () => {
  const catalog = createCatalog([item(1, 2, [recipe(10, [ingredient(90, 5)], 2, false)]), item(2, 3, [recipe(11, [ingredient(1, 3), ingredient(91, 2)])])]);
  const result = catalog.requirements(catalog.chains(2)[0]);
  assert.equal(result.steps[0].crafts, 2);
  assert.deepEqual(Object.fromEntries(result.totals.map(x => [x.itemId, x.quantity])), { 90: 10, 91: 2 });
});

test('alternative recipes and upgrade branches stay separate', () => {
  const catalog = createCatalog([item(1, 2, [recipe(10, [ingredient(90, 1)], 1, false), recipe(11, [ingredient(91, 2)], 1, false)]), item(2, 3, [recipe(12, [ingredient(1, 1)])]), item(3, 4, [recipe(13, [ingredient(2, 1)])]), item(4, 4, [recipe(14, [ingredient(2, 1)])])]);
  assert.equal(catalog.chains(2).length, 4);
  for (const chain of catalog.chains(2)) assert.equal(catalog.requirements(chain).totals.length, 1);
});

test('non-upgrade recipes and ambiguous equipment ingredients do not invent a lineage', () => {
  const catalog = createCatalog([item(1, 2), item(2, 2), item(3, 4, [recipe(10, [ingredient(1, 1), ingredient(2, 1)])]), item(4, 4, [recipe(11, [ingredient(1, 1)], 1, false)])]);
  assert.equal(catalog.chains(3)[0].length, 1);
  assert.equal(catalog.chains(4)[0].length, 1);
  assert.deepEqual(catalog.chains(999), []);
});

test('official catalog chains are finite and the primary coat has its real upgrade recipes', () => {
  const data = JSON.parse(readFileSync(new URL('../data/game-data.json', import.meta.url), 'utf8'));
  const catalog = createCatalog(data.equipment);
  const paths = catalog.chains(31912);
  assert.ok(paths.some(path => path.some(step => step.item.id === 31911) && path.some(step => step.recipe?.id === 9691)));
  for (const item of data.equipment) {
    for (const chain of catalog.chains(item.id)) {
      assert.equal(new Set(chain.map(step => step.item.id)).size, chain.length);
      assert.ok(catalog.requirements(chain).totals.every(entry => Number.isFinite(entry.quantity) && entry.quantity > 0));
    }
  }
});

test('the compact browser catalog produces the same crafting chains and totals', () => {
  const browser = { window: {} };
  vm.runInNewContext(readFileSync(new URL('../data/game-data.js', import.meta.url), 'utf8'), browser);
  const compact = createCatalog(browser.window.COLOR_FORGE_GAME_DATA.equipment);
  const full = createCatalog(JSON.parse(readFileSync(new URL('../data/game-data.json', import.meta.url), 'utf8')).equipment);
  for (const item of browser.window.COLOR_FORGE_GAME_DATA.equipment) {
    const summarize = catalog => catalog.chains(item.id).map(chain => ({ ids: chain.map(step => step.item.id), totals: catalog.requirements(chain).totals }));
    assert.equal(JSON.stringify(summarize(compact)), JSON.stringify(summarize(full)));
  }
});

test('stats keep negative values, escape labels and interpret multi-element bonuses', () => {
  const context = vm.createContext({ window: { WAKFU_STAT_ICONS: { 168: 'criticalhit.webp' } }, localStorage: { getItem: () => null }, document: { addEventListener() {} } });
  vm.runInContext(readFileSync(new URL('../app.js', import.meta.url), 'utf8'), context);
  const render = vm.runInContext('equipmentStat', context);
  assert.match(render({ actionId: 168, text: '-5% de golpe crítico' }), /is-negative/);
  assert.match(render({ actionId: 168, text: '-5% de golpe crítico' }), /<strong>-5%<\/strong>/);
  const multi = render({ actionId: 1068, text: '{unresolved}', params: [10, 2, 3] }, 5);
  assert.match(multi, /Dominio en 3 elementos/);
  assert.match(multi, /<strong>20<\/strong>/);
  assert.doesNotMatch(multi, /unresolved/);
  assert.match(render({ actionId: 999, text: '<script>' }), /&lt;script&gt;/);
});
