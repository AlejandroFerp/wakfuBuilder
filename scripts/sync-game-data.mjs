import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");
const dataDirectory = resolve(projectDirectory, "data");
const sublimationsPath = resolve(projectDirectory, "sublimations-data.js");
const gameDataPath = resolve(dataDirectory, "game-data.js");
const gameDataJsonPath = resolve(dataDirectory, "game-data.json");
const manifestPath = resolve(dataDirectory, "manifest.json");

const CDN_ROOT = "https://wakfu.cdn.ankama.com/gamedata/";
const OFFICIAL_CONFIG_URL = `${CDN_ROOT}config.json`;
const SCHEMA_VERSION = 1;
const LOCALE = "es";

const POSITION_LABELS = {
  ACCESSORY: "Accesorio",
  BACK: "Capa",
  BELT: "Cinturón",
  CHEST: "Coraza",
  FIRST_WEAPON: "Arma principal",
  HEAD: "Casco",
  LEFT_HAND: "Anillo izquierdo",
  LEGS: "Botas",
  MOUNTS: "Montura",
  NECK: "Collar",
  PET: "Mascota",
  RIGHT_HAND: "Anillo derecho",
  SECOND_WEAPON: "Arma secundaria",
  SHOULDERS: "Hombreras",
};

const RARITY_LABELS = {
  0: "Común",
  1: "Raro",
  2: "Raro",
  3: "Mítico",
  4: "Legendario",
  5: "Reliquia",
  6: "Recuerdo",
  7: "Épico",
};

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "wakfu-builder-data-sync" },
  });
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${url}: HTTP ${response.status}`);
  }
  return response.json();
}

function getTranslation(translations, locale = LOCALE) {
  return translations?.[locale] ?? translations?.en ?? translations?.fr ?? "Sin nombre";
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function calculateParameter(params, parameterNumber, level) {
  const index = (parameterNumber - 1) * 2;
  const base = Number(params?.[index] ?? 0);
  const perLevel = Number(params?.[index + 1] ?? 0);
  const value = base + perLevel * level;
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
}

function renderEffectTemplate(template, params, level) {
  if (!template) {
    return "Efecto sin descripción oficial";
  }

  const rendered = template
    .replace(/\[#charac [^\]]+\]\s*/g, "")
    .replace(/\[#(\d+)\]/g, (_match, number) => calculateParameter(params, Number(number), level))
    .replace(/\{\[[^{}]+\]\?[^{}]*\}/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return rendered || "Efecto condicional; consulta el dato bruto";
}

function cleanGameTemplate(value) {
  return String(value ?? "")
    .replace(/\{[^{}]*\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEffect(effectContainer, actionsById, itemLevel) {
  const definition = effectContainer?.effect?.definition;
  if (!definition) {
    return null;
  }

  const action = actionsById.get(definition.actionId);
  const template = getTranslation(action?.description);
  const params = definition.params ?? [];
  return {
    actionId: definition.actionId,
    text: renderEffectTemplate(template, params, itemLevel),
    params,
  };
}

function parseBrowserArray(source, globalName) {
  const match = source.match(new RegExp(`window\\.${globalName}\\s*=\\s*(\\[.*\\]);?\\s*$`, "s"));
  if (!match) {
    throw new Error(`No se pudo leer ${globalName} del catálogo existente.`);
  }
  return JSON.parse(match[1]);
}

async function readExistingSublimations() {
  const source = await readFile(sublimationsPath, "utf8");
  return parseBrowserArray(source, "COLOR_FORGE_SUBLIMATIONS");
}

function classifySublimation(parameters) {
  const colors = { 1: "red", 2: "green", 3: "blue" };
  const pattern = (parameters.slotColorPattern ?? []).map((id) => {
    if (!colors[id]) throw new Error(`Color de sublimación desconocido: ${id}`);
    return colors[id];
  });
  if (parameters.isEpic) {
    return { kind: "epic", kindLabel: "Épica", pattern: [] };
  }
  if (parameters.isRelic) {
    return { kind: "relic", kindLabel: "Reliquia", pattern: [] };
  }
  return {
    kind: "pattern",
    kindLabel: `Patrón de ${pattern.length} colores`,
    pattern,
  };
}

function getStateId(itemEntry) {
  const stateEffect = itemEntry.definition?.equipEffects?.find(
    (entry) => entry.effect?.definition?.actionId === 304,
  );
  return stateEffect?.effect?.definition?.params?.[0] ?? null;
}

function normalizeSublimations(items, existingSublimations, sourceUrl, recipesByProduct) {
  const existingById = new Map(existingSublimations.map((entry) => [entry.id, entry]));
  const sublimations = items
    .filter((entry) => entry.definition?.item?.sublimationParameters)
    .map((entry) => {
      const item = entry.definition.item;
      const legacy = existingById.get(item.id);
      const classification = classifySublimation(item.sublimationParameters);
      const name = getTranslation(entry.title);
      const effectName = legacy?.effectName ?? name;
      const effectText =
        legacy?.effectText ??
        "Efecto de estado pendiente de una fuente textual verificable. Consulta el estado asociado y la fuente oficial.";
      return {
        id: item.id,
        name,
        kind: classification.kind,
        kindLabel: classification.kindLabel,
        pattern: classification.pattern,
        level: legacy?.level ?? 1,
        effectName,
        effectText,
        stateId: getStateId(entry),
        effectSource: legacy?.effectText ? "catalogo-local-verificado" : "estado-oficial-sin-texto",
        sourceUrl,
        recipes: recipesByProduct.get(item.id) ?? [],
        searchText: normalizeText(
          [name, classification.kindLabel, effectName, effectText, entry.title?.en, entry.title?.fr].join(" "),
        ),
      };
    })
    .sort((first, second) => first.name.localeCompare(second.name, "es"));

  const ids = new Set();
  for (const sublimation of sublimations) {
    if (ids.has(sublimation.id)) {
      throw new Error(`ID de sublimación duplicado: ${sublimation.id}`);
    }
    ids.add(sublimation.id);
  }
  return sublimations;
}

function normalizeEquipment(items, itemTypes, actions, recipesByProduct) {
  const actionsById = new Map(actions.map((action) => [action.definition?.id, action]));
  const typesById = new Map(itemTypes.map((type) => [type.definition?.id, type]));

  return items
    .filter((entry) => {
      const item = entry.definition?.item;
      const type = typesById.get(item?.baseParameters?.itemTypeId);
      return (
        item &&
        !item.sublimationParameters &&
        type?.definition?.equipmentPositions?.length > 0 &&
        (entry.definition?.equipEffects?.length > 0 || item.baseParameters?.maximumShardSlotNumber > 0)
      );
    })
    .map((entry) => {
      const item = entry.definition.item;
      const base = item.baseParameters;
      const type = typesById.get(base.itemTypeId);
      const effects = (entry.definition.equipEffects ?? [])
        .map((effect) => normalizeEffect(effect, actionsById, item.level))
        .filter(Boolean);
      const positions = type.definition.equipmentPositions ?? [];
      const disabledPositions = type.definition.equipmentDisabledPositions ?? [];
      const name = getTranslation(entry.title);
      const typeName = cleanGameTemplate(getTranslation(type.title));
      const aliases = Array.from(new Set(Object.values(entry.title ?? {}).filter(Boolean)));
      return {
        id: item.id,
        name,
        aliases,
        description: getTranslation(entry.description),
        level: item.level,
        rarity: base.rarity,
        rarityLabel: RARITY_LABELS[base.rarity] ?? `Rareza ${base.rarity}`,
        itemTypeId: base.itemTypeId,
        itemTypeName: typeName,
        positions,
        positionLabels: positions.map((position) => POSITION_LABELS[position] ?? position),
        disabledPositions,
        disabledPositionLabels: disabledPositions.map(
          (position) => POSITION_LABELS[position] ?? position,
        ),
        sockets: {
          min: base.minimumShardSlotNumber ?? 0,
          max: base.maximumShardSlotNumber ?? 0,
        },
        isEpic: base.rarity === 7,
        isRelic: base.rarity === 5,
        effects,
        recipes: recipesByProduct.get(item.id) ?? [],
        searchText: normalizeText(
          [
            item.id,
            name,
            ...aliases,
            typeName,
            ...effects.map((effect) => effect.text),
          ].join(" "),
        ),
      };
    })
    .sort((first, second) => second.level - first.level || first.name.localeCompare(second.name, "es"));
}

function normalizeRecipes(items, jobItems, recipes, ingredients, results) {
  const namesById = new Map(
    [...items, ...jobItems].map((entry) => [entry.definition?.item?.id ?? entry.definition?.id, getTranslation(entry.title)]),
  );
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const ingredientsByRecipe = new Map();
  for (const ingredient of ingredients) {
    const list = ingredientsByRecipe.get(ingredient.recipeId) ?? [];
    list.push(ingredient);
    ingredientsByRecipe.set(ingredient.recipeId, list);
  }
  const recipesByProduct = new Map();
  for (const result of results) {
    const recipe = recipesById.get(result.recipeId);
    if (!recipe) {
      continue;
    }
    const normalized = {
      id: recipe.id,
      level: recipe.level,
      isUpgrade: Boolean(recipe.isUpgrade),
      quantity: result.productedItemQuantity,
      ingredients: (ingredientsByRecipe.get(recipe.id) ?? [])
        .sort((first, second) => first.ingredientOrder - second.ingredientOrder)
        .map((ingredient) => ({
          itemId: ingredient.itemId,
          name: namesById.get(ingredient.itemId) ?? `Objeto ${ingredient.itemId}`,
          quantity: ingredient.quantity,
        })),
    };
    const list = recipesByProduct.get(result.productedItemId) ?? [];
    list.push(normalized);
    recipesByProduct.set(result.productedItemId, list);
  }
  return recipesByProduct;
}

function makeBrowserCatalog(data) {
  return {
    schemaVersion: data.schemaVersion,
    manifest: data.manifest,
    equipment: data.equipment.map((item) => ({
      id: item.id,
      name: item.name,
      aliases: item.aliases,
      description: item.description,
      level: item.level,
      rarity: item.rarity,
      rarityLabel: item.rarityLabel,
      itemTypeName: item.itemTypeName,
      positions: item.positions,
      positionLabels: item.positionLabels,
      disabledPositions: item.disabledPositions,
      sockets: item.sockets,
      isEpic: item.isEpic,
      isRelic: item.isRelic,
      effects: item.effects,
      recipes: item.recipes,
      searchText: item.searchText,
    })),
  };
}

function makeBrowserData(payload, globalName) {
  return `window.${globalName} = ${JSON.stringify(payload)};\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function main() {
  const config = await fetchJson(OFFICIAL_CONFIG_URL);
  const version = config.version;
  if (!version || !/^\d+(\.\d+)+$/.test(version)) {
    throw new Error("El CDN oficial no devolvió una versión de juego válida.");
  }

  const force = process.argv.includes("--force");
  try {
    const existingManifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (existingManifest.gameVersion === version && !force) {
      console.log(`Datos ya actualizados para Wakfu ${version}. Usa --force para regenerarlos.`);
      return;
    }
  } catch {
    // El primer sincronizado no tiene manifiesto todavía.
  }

  const versionRoot = `${CDN_ROOT}${version}/`;
  const [items, itemTypes, actions, jobItems, recipes, recipeIngredients, recipeResults, existingSublimations] = await Promise.all([
    fetchJson(`${versionRoot}items.json`),
    fetchJson(`${versionRoot}equipmentItemTypes.json`),
    fetchJson(`${versionRoot}actions.json`),
    fetchJson(`${versionRoot}jobsItems.json`),
    fetchJson(`${versionRoot}recipes.json`),
    fetchJson(`${versionRoot}recipeIngredients.json`),
    fetchJson(`${versionRoot}recipeResults.json`),
    readExistingSublimations(),
  ]);

  const recipesByProduct = normalizeRecipes(items, jobItems, recipes, recipeIngredients, recipeResults);
  const sublimations = normalizeSublimations(
    items,
    existingSublimations,
    `${versionRoot}items.json`,
    recipesByProduct,
  );
  const equipment = normalizeEquipment(items, itemTypes, actions, recipesByProduct);
  const medidaIII = sublimations.find((entry) => entry.id === 31739);
  if (!medidaIII?.name.includes("Medida III") || medidaIII.kind !== "epic") {
    throw new Error("La sincronización no encontró Medida III como sublimación épica.");
  }
  if (equipment.length === 0) {
    throw new Error("La sincronización no encontró objetos equipables.");
  }

  const generatedAt = new Date().toISOString();
  const data = {
    schemaVersion: SCHEMA_VERSION,
    manifest: {
      gameVersion: version,
      generatedAt,
      source: {
        name: "CDN oficial de Ankama",
        configUrl: OFFICIAL_CONFIG_URL,
        versionRoot,
      },
      counts: {
        officialItems: items.length,
        equipment: equipment.length,
        sublimations: sublimations.length,
        craftableEquipment: equipment.filter((item) => item.recipes.length > 0).length,
        craftableSublimations: sublimations.filter((item) => item.recipes.length > 0).length,
      },
      coverage: {
        equipmentEffects: "Descripción oficial interpretada cuando el formato es directo; se conserva la plantilla bruta.",
        sublimationEffects: "Se conservan los textos validados del catálogo local y se marcan los estados sin texto verificable.",
        acquisition: "Las recetas e ingredientes proceden del CDN oficial. Drops, cofres y croupiers siguen enlazando a MethodWakfu hasta disponer de una fuente estructurada verificable.",
      },
    },
    equipment,
  };
  const manifest = {
    ...data.manifest,
    hashes: {
      gameData: sha256(JSON.stringify(data)),
      sublimations: sha256(JSON.stringify(sublimations)),
    },
  };

  await mkdir(dataDirectory, { recursive: true });
  await writeFile(gameDataPath, makeBrowserData(makeBrowserCatalog(data), "COLOR_FORGE_GAME_DATA"), "utf8");
  await writeFile(gameDataJsonPath, `${JSON.stringify(data)}\n`, "utf8");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(sublimationsPath, makeBrowserData(sublimations, "COLOR_FORGE_SUBLIMATIONS"), "utf8");

  console.log(
    `Datos actualizados: Wakfu ${version}; ${equipment.length} objetos equipables; ${sublimations.length} sublimaciones.`,
  );
}

main().catch((error) => {
  console.error(`Error de sincronización: ${error.message}`);
  process.exitCode = 1;
});
