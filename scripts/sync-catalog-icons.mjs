import { readFile, writeFile, mkdir } from 'node:fs/promises';
// Run with official items.json and Zenith's public builder/api/filters JSON.
const [itemsPath, filtersPath] = process.argv.slice(2);
if (!itemsPath || !filtersPath) throw new Error('Usage: node scripts/sync-catalog-icons.mjs items.json filters.json');
const items = JSON.parse(await readFile(itemsPath, 'utf8'));
const filters = JSON.parse(await readFile(filtersPath, 'utf8'));
const graphics = Object.fromEntries(items.map(entry => [entry.definition.item.id, entry.definition.item.graphicParameters?.gfxId]).filter(([, id]) => id));
const stats = Object.fromEntries(Object.values(filters.statistics).flat().filter(stat => stat.image_stats).map(stat => [stat.id_stats, stat.image_stats]));
Object.assign(stats, { 1068: stats[120], 1069: stats[80], 90: stats[80], 1059: stats[1052], 192: stats[191], 183: 'given_armor.webp', 185: 'received_armor.webp' });
await mkdir(new URL('../assets/stats/', import.meta.url), { recursive: true });
for (const file of new Set(Object.values(stats))) {
  const response = await fetch(`https://www.zenithwakfu.com/images/type_stats/${file}`);
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    console.warn(`Unavailable icon: ${file}`);
    for (const id of Object.keys(stats)) if (stats[id] === file) delete stats[id];
    continue;
  }
  await writeFile(new URL(`../assets/stats/${file}`, import.meta.url), Buffer.from(await response.arrayBuffer()));
}
await writeFile(new URL('../data/item-icons.js', import.meta.url), `window.WAKFU_ITEM_ICONS = ${JSON.stringify(graphics)};\nwindow.WAKFU_STAT_ICONS = ${JSON.stringify(stats)};\n`);
console.log(`${Object.keys(graphics).length} item graphics; ${new Set(Object.values(stats)).size} local stat icons.`);
