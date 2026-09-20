import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parseBrowserValue(source, globalName) {
  const match = source.match(new RegExp(`window\\.${globalName}\\s*=\\s*(.+);\\s*$`, "s"));
  if (!match) {
    throw new Error(`No se encontró ${globalName}.`);
  }
  return JSON.parse(match[1]);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const [gameDataSource, fullDataSource, sublimationsSource, manifestSource] = await Promise.all([
    readFile(resolve(projectDirectory, "data/game-data.js"), "utf8"),
    readFile(resolve(projectDirectory, "data/game-data.json"), "utf8"),
    readFile(resolve(projectDirectory, "sublimations-data.js"), "utf8"),
    readFile(resolve(projectDirectory, "data/manifest.json"), "utf8"),
  ]);
  const gameData = parseBrowserValue(gameDataSource, "COLOR_FORGE_GAME_DATA");
  const fullData = JSON.parse(fullDataSource);
  const sublimations = parseBrowserValue(sublimationsSource, "COLOR_FORGE_SUBLIMATIONS");
  const manifest = JSON.parse(manifestSource);

  assert(gameData.schemaVersion === 1, "Versión de esquema de catálogo no soportada.");
  assert(/^\d+(\.\d+)+$/.test(manifest.gameVersion), "Falta versión de Wakfu en el manifiesto.");
  assert(gameData.equipment.length > 1000, "El catálogo de equipo parece incompleto.");
  assert(sublimations.length === manifest.counts.sublimations, "El manifiesto y el catálogo de sublimaciones difieren.");
  assert(gameData.equipment.length === manifest.counts.equipment, "El manifiesto y el catálogo de objetos difieren.");
  assert(fullData.equipment.length === gameData.equipment.length, "El catálogo web y los datos detallados difieren.");
  assert(new Set(gameData.equipment.map((item) => item.id)).size === gameData.equipment.length, "Hay IDs de objetos duplicados.");
  assert(new Set(sublimations.map((item) => item.id)).size === sublimations.length, "Hay IDs de sublimaciones duplicados.");
  assert(
    gameData.equipment.filter((item) => item.recipes.length > 0).length === manifest.counts.craftableEquipment,
    "La cobertura de recetas de equipo no coincide con el manifiesto.",
  );

  const medidaIII = sublimations.find((item) => item.id === 31739);
  for (const item of sublimations) {
    assert(Array.isArray(item.pattern) && item.pattern.every((color) =>
      ["red", "blue", "green"].includes(color)), `Patrón de colores incompatible: ${item.id}`);
  }
  assert(medidaIII?.name === "Medida III", "Medida III no se puede localizar por su ID oficial.");
  assert(medidaIII.kind === "epic", "Medida III debe ser épica.");
  assert(medidaIII.stateId === 8492, "El estado oficial de Medida III ha cambiado o no se interpretó.");

  console.log(
    `Datos válidos: Wakfu ${manifest.gameVersion}; ${gameData.equipment.length} objetos; ${sublimations.length} sublimaciones.`,
  );
}

main().catch((error) => {
  console.error(`Validación fallida: ${error.message}`);
  process.exitCode = 1;
});
