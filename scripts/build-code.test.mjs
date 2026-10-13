import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import '../build-code.js';
const api = globalThis.WAKFU_BUILD_CODE;
test('copy/load controls restore a real catalog set, persist it and preserve it after a bad paste', async () => {
  const input = { value: '', focus() { this.focused = true; }, select() { this.selected = true; } };
  const status = { textContent: '' };
  let copied = ''; const writes = []; const renders = [];
  const context = vm.createContext({
    window: { WAKFU_BUILD_CODE: api },
    navigator: { clipboard: { async writeText(text) { copied = text; } } },
    localStorage: { getItem: () => null, setItem(key, value) { writes.push([key, value]); } },
    document: { addEventListener() {}, querySelector(id) { return id === '#build-code' ? input : status; } },
    mark: name => renders.push(name),
  });
  vm.runInContext(readFileSync(new URL('../data/game-data.js', import.meta.url), 'utf8'), context);
  vm.runInContext(readFileSync(new URL('../sublimations-data.js', import.meta.url), 'utf8'), context);
  vm.runInContext(readFileSync(new URL('../app.js', import.meta.url), 'utf8'), context);
  vm.runInContext(`
    renderBuildSummary = () => mark('summary');
    renderStatsControls = () => mark('stats');
    renderCombinationList = () => mark('combinations');
    calculateAndRender = () => { state.result = calculateOptimization(); mark('calculation'); };
    const helmet = EQUIPMENT_CATALOG.find(item => item.positions.includes('HEAD'));
    state.equippedItems = { HEAD: helmet.id };
    const sublimation = SUBLIMATION_CATALOG.find(item => item.pattern.length === 3);
    state.combinations = [{ id: 1, target: 'auto', colors: [...sublimation.pattern], sublimationId: sublimation.id, sublimationName: sublimation.name }];
  `, context);
  await vm.runInContext('copyBuildCode()', context);
  assert.equal(input.value, copied);
  assert.match(status.textContent, /copiado/);
  const saved = vm.runInContext('JSON.stringify({ items: state.equippedItems, combinations: state.combinations })', context);
  vm.runInContext('state.equippedItems = {}; state.combinations = []; importBuildCode();', context);
  assert.equal(vm.runInContext('JSON.stringify({ items: state.equippedItems, combinations: state.combinations })', context), saved);
  assert.equal(writes.length, 1);
  assert.deepEqual(renders, ['summary', 'stats', 'combinations', 'calculation']);
  assert.match(status.textContent, /recuperado/);
  input.value = 'WFB1.invalid';
  vm.runInContext('importBuildCode()', context);
  assert.equal(vm.runInContext('JSON.stringify({ items: state.equippedItems, combinations: state.combinations })', context), saved);
  assert.equal(writes.length, 1);
  assert.match(status.textContent, /inválido/);
  context.navigator.clipboard.writeText = async () => { throw new Error('Clipboard unavailable'); };
  await vm.runInContext('copyBuildCode()', context);
  assert.ok(input.selected && input.focused);
  assert.match(status.textContent, /Ctrl\+C/);
});
function planner() {
  const context = vm.createContext({ window: {}, localStorage: { getItem: () => null }, document: { addEventListener() {} } });
  vm.runInContext(readFileSync(new URL('../app.js', import.meta.url), 'utf8'), context);
  return vm.runInContext('({ state, calculateOptimization, ALL_STATS, EQUIPMENT_SLOTS, BUILD_SLOT_ORDER })', context);
}
test('copy and paste reproduces equipment, Unicode stats, sublimations and optimizer output', () => {
  const app = planner();
  const catalog = { stats: [...app.ALL_STATS], targets: [...app.EQUIPMENT_SLOTS], slots: [...app.BUILD_SLOT_ORDER],
    items: [{ id: 123, positions: ['LEFT_HAND', 'RIGHT_HAND'] }, { id: 456, positions: ['HEAD'] }],
    sublimations: [{ id: 789, name: 'Sublimación de prueba', pattern: ['red', 'red', 'red'] }] };
  app.state.equippedItems = { LEFT_HAND: 123, RIGHT_HAND: 123, HEAD: 456 };
  app.state.combinations = [{ id: 19, target: 'Botas', colors: ['red', 'red', 'red'], sublimationId: 789, sublimationName: 'Sublimación de prueba' }, { id: 20, target: 'auto', colors: ['blue', 'green', 'blue'] }];
  app.state.slotValues['Dominio Cuerpo a Cuerpo'] = 999;
  const before = app.calculateOptimization();
  const code = api.encode(app.state);
  assert.match(code, /^WFB1\.[\w-]+$/);
  const decoded = api.decode(`  ${code}\n`, catalog);
  assert.deepEqual(decoded.equippedItems, app.state.equippedItems);
  assert.deepEqual(decoded.weights, { ...app.state.weights });
  assert.deepEqual(decoded.slotValues, { ...app.state.slotValues });
  assert.equal(decoded.combinations[0].sublimationName, 'Sublimación de prueba');
  Object.assign(app.state, decoded);
  const after = app.calculateOptimization();
  // Internal row IDs are regenerated, but every assigned piece and socket must match.
  const normalize = value => JSON.parse(JSON.stringify(value, (key, val) => key === 'combinationId' ? undefined : val));
  assert.deepEqual(normalize(after), normalize(before));
});
test('invalid imports reject unknown equipment, wrong slots, colors, versions and numbers', () => {
  const app = planner();
  const catalog = { stats: [...app.ALL_STATS], targets: [...app.EQUIPMENT_SLOTS], slots: [...app.BUILD_SLOT_ORDER], items: [{ id: 123, positions: ['HEAD'] }], sublimations: [] };
  const payload = JSON.parse(JSON.stringify(app.state));
  for (const mutate of [
    build => { build.equippedItems = { HEAD: 999 }; },
    build => { build.equippedItems = { RIGHT_HAND: 123 }; },
    build => { build.weights['Dominio Crítico'] = -1; },
    build => { build.slotValues['Dominio Crítico'] = 1000; },
    build => { build.combinations = [{ target: 'auto', colors: ['red', 'bad', 'blue'] }]; },
    build => { build.combinations = [{ target: 'auto', colors: ['red', 'red', 'red'], sublimationId: 999 }]; },
    build => { build.combinations = Array(11).fill({ target: 'auto', colors: ['red', 'red', 'red'] }); },
  ]) {
    const bad = structuredClone(payload); mutate(bad);
    assert.throws(() => api.decode(api.encode(bad), catalog), /inválido/);
  }
  for (const code of ['garbage', 'WFB2.abc', 'WFB1.e30', 'WFB1.!!!']) assert.throws(() => api.decode(code, catalog));
  assert.deepEqual({ ...app.state.equippedItems }, payload.equippedItems);
});
