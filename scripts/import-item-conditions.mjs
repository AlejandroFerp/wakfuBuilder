import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile(process.argv[2], 'utf8');
const aliases = { critical_hit: 'critical', block: 'block', distance_mastery: 'distance', lock: 'tackle', dodge: 'dodge', ap: 'ap', mp: 'mp', wp: 'wp', ra: 'range' };
const conditions = {};
for (const match of source.matchAll(/for item_id in \(([\s\S]*?)\):\s+conditions\[item_id\] = (\w+)/g)) {
  const group = source.match(new RegExp(`^${match[2]} = (\\[[\\s\\S]*?\\])`, 'm'))?.[1];
  if (!group) throw new Error(`Missing condition group: ${match[2]}`);
  const bounds = [...group.matchAll(/rst\.Set(Minimums|Maximums)\((\w+)=(-?\d+)\)/g)].map(([, bound, stat, value]) => {
    if (!aliases[stat]) throw new Error(`Unknown condition stat: ${stat}`);
    return { stat: aliases[stat], operator: bound === 'Minimums' ? '>=' : '<=', value: Number(value) };
  });
  if (!bounds.length) throw new Error(`No conditions in ${match[2]}`);
  for (const id of match[1].split(',').map(Number).filter(Boolean)) conditions[id] = bounds;
}
const data = { source: 'https://github.com/mikeshardmind/wakfu-utils/blob/main/wakautosolver/item_conditions.py', importedAt: new Date().toISOString().slice(0, 10), coverage: 'Registro comunitario parcial; ausencia de registro no garantiza ausencia de condiciones.', copyright: 'Michael Hall, MPL-2.0. https://mozilla.org/MPL/2.0/', items: conditions };
await writeFile(new URL('../data/item-conditions.js', import.meta.url), `// Condition data adapted from Michael Hall / wakfu-utils (MPL-2.0).\nwindow.WAKFU_ITEM_CONDITIONS = ${JSON.stringify(data)};\n`);
console.log(`${Object.keys(conditions).length} objects with recorded equipment conditions.`);
