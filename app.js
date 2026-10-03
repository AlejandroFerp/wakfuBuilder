const COLOR_DEFINITIONS = {
  red: {
    label: "Rojo",
    short: "R",
    className: "red",
    stats: [
      {
        name: "Dominio Cuerpo a Cuerpo",
        doubleSlots: ["Casco", "Capa"],
      },
      {
        name: "Dominio Distancia",
        doubleSlots: ["Cinturón", "Armas a dos manos"],
      },
      {
        name: "Dominio Berserker",
        doubleSlots: ["Collar", "Capa"],
      },
      {
        name: "Resistencia a Tierra",
        doubleSlots: ["Coraza", "Botas"],
      },
    ],
  },
  blue: {
    label: "Azul",
    short: "A",
    className: "blue",
    stats: [
      {
        name: "Puntos de Vida (PdV)",
        doubleSlots: ["Casco","Armas a dos manos"],
      },
      {
        name: "Resistencia a Agua",
        doubleSlots: ["Coraza", "Hombreras"],
      },
      {
        name: "Resistencia a Aire",
        doubleSlots: ["Coraza", "Capa"],
      },
      {
        name: "Dominio de Cura",
        doubleSlots: ["Collar", "Hombreras"],
      },
      {
        name: "Placaje",
        doubleSlots: ["Anillo 1", "Anillo 2"],
      },
      {
        name: "Dominio Elemental",
        doubleSlots: ["Coraza", "Capa"],
      },
    ],
  },
  green: {
    label: "Verde",
    short: "V",
    className: "green",
    stats: [
      {
        name: "Esquiva",
        doubleSlots: ["Anillo 1", "Anillo 2"],
      },
      {
        name: "Iniciativa",
        doubleSlots: ["Collar", "Capa"],
      },
      {
        name: "Dominio de Espalda",
        doubleSlots: ["Botas","Cinturón"],
      },
      {
        name: "Dominio Crítico",
        doubleSlots: ["Hombreras","Armas a dos manos"],
      },
      {
        name: "Resistencia a Fuego",
        doubleSlots: ["Coraza","Cinturón"],
      },
    ],
  },
};

const COLOR_IDS = ["red", "blue", "green"];
const EQUIPMENT_SLOTS = [
  "Casco",
  "Botas",
  "Capa",
  "Armas a dos manos",
  "Cinturón",
  "Collar",
  "Coraza",
  "Hombreras",
  "Anillo 1",
  "Anillo 2",
];
const SOCKETS_PER_SLOT = 4;
const FIXED_PATTERN_SIZE = 3;
const MAX_COMBINATIONS = EQUIPMENT_SLOTS.length;
const RESISTANCE_SLOT_COLORS = {
  "Cinturón": "green",
  Botas: "red",
  Hombreras: "blue",
  Capa: "blue",
};
const NUMBER_FORMATTER = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
});
const SUBLIMATION_CATALOG = Array.isArray(window.COLOR_FORGE_SUBLIMATIONS)
  ? window.COLOR_FORGE_SUBLIMATIONS
  : [];
const SUBLIMATION_RESULTS_LIMIT = 18;
const GAME_DATA = window.COLOR_FORGE_GAME_DATA ?? { manifest: null, equipment: [] };
const EQUIPMENT_CATALOG = Array.isArray(GAME_DATA.equipment) ? GAME_DATA.equipment : [];
const EQUIPMENT_RESULTS_LIMIT = 18;
const BUILD_STORAGE_KEY = "color-forge:equipped-items:v1";
const BUILD_SLOT_ORDER = [
  "HEAD",
  "BACK",
  "NECK",
  "SHOULDERS",
  "CHEST",
  "BELT",
  "LEGS",
  "LEFT_HAND",
  "RIGHT_HAND",
  "FIRST_WEAPON",
  "SECOND_WEAPON",
  "ACCESSORY",
  "PET",
  "MOUNTS",
];
const BUILD_STAT_LABELS = {
  20: "PdV",
  31: "PA",
  41: "PM",
  80: "Resistencia elemental",
  83: "Resistencia agua",
  84: "Resistencia tierra",
  85: "Resistencia aire",
  120: "Dominio elemental",
  149: "Dominio crítico",
  150: "% crítico",
  160: "Alcance",
  171: "Iniciativa",
  173: "Placaje",
  175: "Esquiva",
  1052: "Dominio melé",
  1053: "Dominio distancia",
  1055: "Dominio berserker",
};

const ALL_STATS = COLOR_IDS.flatMap((colorId) =>
  COLOR_DEFINITIONS[colorId].stats.map((stat) => stat.name),
);

const DOMAIN_STATS = new Set(
  ALL_STATS.filter((statName) => statName.startsWith("Dominio")),
);

const RESISTANCE_STATS = new Set(
  ALL_STATS.filter((statName) => statName.startsWith("Resistencia")),
);

const EXTRA_STATS = new Set(["Esquiva", "Placaje"]);
const SELECTABLE_STATS = [...DOMAIN_STATS];

const STAT_GROUP_LABELS = {
  attack: "Ataque · Dominios",
  defense: "Defensa · Resistencias",
  extras: "Extras",
};


const DEFAULT_WEIGHTS = Object.fromEntries(
  ALL_STATS.map((statName) => [statName, 0]),
);

const DEFAULT_SLOT_VALUES = Object.fromEntries(
  ALL_STATS.map((statName) => [statName, 100]),
);

const state = {
  weights: {
    ...DEFAULT_WEIGHTS,
    "Dominio Cuerpo a Cuerpo": 100,
  },
  slotValues: { ...DEFAULT_SLOT_VALUES },
  combinations: [],
  sublimationQuery: "",
  sublimationPatternFilters: [{ id: 1, colors: ["", "", ""] }],
  nextPatternFilterId: 2,
  equipmentQuery: "",
  equipmentSlot: "",
  equipmentMinLevel: 0,
  equippedItems: loadSavedBuild(),
  nextCombinationId: 1,
  result: null,
};

function loadSavedBuild() {
  try {
    const saved = JSON.parse(localStorage.getItem(BUILD_STORAGE_KEY) ?? "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function saveBuild() {
  localStorage.setItem(BUILD_STORAGE_KEY, JSON.stringify(state.equippedItems));
}

const elements = {};

function getElements() {
  elements.feedback = document.querySelector("#feedback");
  elements.statsControls = document.querySelector("#stats-controls");
  elements.combinationCount = document.querySelector("#combination-count");
  elements.combinationList = document.querySelector("#combination-list");
  elements.priorityCount = document.querySelector("#priority-count");
  elements.sublimationSearch = document.querySelector("#sublimation-search");
  elements.sublimationResults = document.querySelector("#sublimation-results");
  elements.sublimationCount = document.querySelector("#sublimation-count");
  elements.sublimationPatternFilters = document.querySelector("#sublimation-pattern-filters");
  elements.equipmentSearch = document.querySelector("#equipment-search");
  elements.equipmentSlotFilter = document.querySelector("#equipment-slot-filter");
  elements.equipmentMinLevel = document.querySelector("#equipment-min-level");
  elements.equipmentResults = document.querySelector("#equipment-results");
  elements.equipmentCount = document.querySelector("#equipment-count");
  elements.buildSummary = document.querySelector("#build-summary");
  elements.slotGrid = document.querySelector("#slot-grid");
  elements.colorDistribution = document.querySelector("#color-distribution");
  elements.statCoverage = document.querySelector("#stat-coverage");
  elements.colorReference = document.querySelector("#color-reference");
  elements.metricScore = document.querySelector("#metric-score");
  elements.metricScoreCaption = document.querySelector("#metric-score-caption");
  elements.metricDoubles = document.querySelector("#metric-doubles");
  elements.metricPriorities = document.querySelector("#metric-priorities");
  elements.metricPrioritiesCaption = document.querySelector("#metric-priorities-caption");
  elements.metricSlots = document.querySelector("#metric-slots");
  elements.scorePill = document.querySelector("#score-pill");
}

function formatNumber(value) {
  return NUMBER_FORMATTER.format(Math.round(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeSearchText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getColorLabel(colorId) {
  return COLOR_DEFINITIONS[colorId]?.label ?? colorId;
}

function getSublimationMatches() {
  const terms = normalizeSearchText(state.sublimationQuery)
    .split(/\s+/)
    .filter(Boolean);
  const activePatterns = state.sublimationPatternFilters
    .map((filter) => filter.colors)
    .filter((colors) => colors.some(Boolean));
  return SUBLIMATION_CATALOG.filter((sublimation) => {
    const searchableText = normalizeSearchText(sublimation.searchText);
    const matchesText = terms.every((term) => searchableText.includes(term));
    const matchesPattern = activePatterns.length === 0 || activePatterns.some((colors) =>
      sublimation.pattern.length === FIXED_PATTERN_SIZE &&
      colors.every((color, index) => !color || sublimation.pattern[index] === color),
    );
    return matchesText && matchesPattern;
  });
}

function renderSublimationPatternFilters() {
  elements.sublimationPatternFilters.innerHTML = state.sublimationPatternFilters
    .map((filter, rowIndex) => `
      <div class="pattern-filter-row" data-pattern-filter="${filter.id}">
        <div class="pattern-filter-row-heading">
          <strong>Combinación ${rowIndex + 1}</strong>
          ${state.sublimationPatternFilters.length > 1
            ? `<button class="pattern-filter-remove" type="button" data-remove-pattern="${filter.id}" aria-label="Quitar combinación ${rowIndex + 1}">Quitar</button>`
            : ""}
        </div>
        <div class="pattern-filter-colors">
          ${filter.colors.map((selectedColor, index) => `
            <label class="pattern-filter-position">
              <span>Color ${index + 1}</span>
              <span class="pattern-filter-select-wrap">
                <span class="pattern-filter-swatch${selectedColor ? ` color-shape color-shape-${selectedColor}` : ""}" aria-hidden="true"></span>
                <select data-pattern-position="${index}">
                  <option value="">Cualquiera</option>
                  ${COLOR_IDS.map((colorId) => `<option value="${colorId}"${selectedColor === colorId ? " selected" : ""}>${COLOR_DEFINITIONS[colorId].label}</option>`).join("")}
                </select>
              </span>
            </label>
          `).join("")}
        </div>
      </div>
    `).join("");
}

function updateSublimationPatternFilter(event) {
  const select = event.target.closest("[data-pattern-position]");
  if (!select) return;
  const filterId = Number(select.closest("[data-pattern-filter]").dataset.patternFilter);
  const filter = state.sublimationPatternFilters.find((item) => item.id === filterId);
  if (!filter || (select.value && !COLOR_IDS.includes(select.value))) return;
  filter.colors[Number(select.dataset.patternPosition)] = select.value;
  select.parentElement.querySelector(".pattern-filter-swatch").className =
    `pattern-filter-swatch${select.value ? ` color-shape color-shape-${select.value}` : ""}`;
  renderSublimationCatalog();
}

function removeSublimationPatternFilter(event) {
  const button = event.target.closest("[data-remove-pattern]");
  if (!button) return;
  const id = Number(button.dataset.removePattern);
  state.sublimationPatternFilters = state.sublimationPatternFilters.filter((filter) => filter.id !== id);
  renderSublimationPatternFilters();
  renderSublimationCatalog();
}

function renderSublimationPattern(sublimation) {
  if (sublimation.pattern.length === 0) {
    return `
      <span class="catalog-no-pattern">
        ${escapeHtml(sublimation.kindLabel)} · Sin combinación de colores
      </span>
    `;
  }
  return `
    <span class="catalog-pattern" aria-label="Combinación ${escapeHtml(
      sublimation.pattern.map(getColorLabel).join(" / "),
    )}">
      ${sublimation.pattern
        .map(
          (colorId) =>
            `<span class="color-shape color-shape-${COLOR_DEFINITIONS[colorId].className}" title="${getColorLabel(
              colorId,
            )}"></span>`,
        )
        .join("")}
    </span>
  `;
}

function renderSublimationCatalog() {
  if (!elements.sublimationResults) {
    return;
  }
  const matches = getSublimationMatches();
  const hasPatternFilter = state.sublimationPatternFilters.some((filter) =>
    filter.colors.some(Boolean),
  );
  const visibleMatches = hasPatternFilter ? matches : matches.slice(0, SUBLIMATION_RESULTS_LIMIT);
  const resultLabel = matches.length === 1 ? "resultado" : "resultados";
  elements.sublimationCount.textContent = `${matches.length} ${resultLabel}`;

  if (matches.length === 0) {
    elements.sublimationResults.innerHTML = `
      <div class="catalog-empty">
        No hay sublimaciones que coincidan con el texto y los colores elegidos.
        Prueba otra combinación o limpia los filtros.
      </div>
    `;
    return;
  }

  const limitMessage =
    !hasPatternFilter && matches.length > SUBLIMATION_RESULTS_LIMIT
      ? `<p class="catalog-limit">Mostrando ${SUBLIMATION_RESULTS_LIMIT} de ${matches.length}. Filtra por texto o colores para afinar la búsqueda.</p>`
      : "";
  elements.sublimationResults.innerHTML = `
    ${visibleMatches
      .map((sublimation) => {
        const effectText = sublimation.effectText.replace(/(^|\n)- /g, "$1> ");
        const effectHtml = escapeHtml(effectText).replaceAll(
          "\n",
          "<br>",
        );
        const addButton =
          sublimation.pattern.length > 0
            ? `
              <button
                class="catalog-add-button"
                type="button"
                data-catalog-add="${sublimation.id}"
              >Añadir patrón</button>
            `
            : `
              <span class="catalog-reference-only">Solo efecto · no fija colores</span>
            `;
        return `
          <article class="sublimation-result">
            <div class="sublimation-result-header">
              <div class="sublimation-result-title">
                <h4>${escapeHtml(sublimation.name)}</h4>
                <span class="catalog-kind catalog-kind-${sublimation.kind}">${escapeHtml(
                  sublimation.kindLabel,
                )}</span>
              </div>
              <span class="catalog-level">Nv. ${sublimation.level}</span>
            </div>
            <div class="catalog-pattern-row">
              ${renderSublimationPattern(sublimation)}
              ${sublimation.kind === "pattern" ? renderSublimationTotal(sublimation) : ""}
            </div>
            <div class="catalog-effect">
              <strong>${escapeHtml(sublimation.effectName)}</strong>
              <p>${effectHtml}</p>
            </div>
            <div class="catalog-result-footer">${addButton}</div>
          </article>
        `;
      })
      .join("")}
    ${limitMessage}
  `;

  elements.sublimationResults
    .querySelectorAll("[data-catalog-add]")
    .forEach((button) => {
      button.addEventListener("click", addSublimationFromCatalog);
    });
}

function addSublimationFromCatalog(event) {
  const sublimationId = Number(event.currentTarget.dataset.catalogAdd);
  const sublimation = SUBLIMATION_CATALOG.find(
    (item) => item.id === sublimationId,
  );
  if (!sublimation || sublimation.pattern.length === 0) {
    return;
  }
  if (state.combinations.length >= MAX_COMBINATIONS) {
    showFeedback(
      `Puedes añadir como máximo ${MAX_COMBINATIONS} sublimaciones.`,
      true,
    );
    return;
  }
  state.combinations.push({
    id: state.nextCombinationId,
    target: "auto",
    colors: [...sublimation.pattern],
    sublimationId: sublimation.id,
    sublimationName: sublimation.name,
  });
  state.nextCombinationId += 1;
  renderCombinationList();
  calculateAndRender();
  showFeedback(`Sublimación «${sublimation.name}» añadida a la build.`);
}

function getEquipmentSlotLabel(slotId) {
  const item = EQUIPMENT_CATALOG.find((entry) => entry.positions.includes(slotId));
  const index = item?.positions.indexOf(slotId) ?? -1;
  return item?.positionLabels[index] ?? slotId;
}

function renderEquipmentSlotOptions() {
  if (!elements.equipmentSlotFilter) {
    return;
  }
  const availableSlots = BUILD_SLOT_ORDER.filter((slotId) =>
    EQUIPMENT_CATALOG.some((item) => item.positions.includes(slotId)),
  );
  elements.equipmentSlotFilter.innerHTML = [
    '<option value="">Todos los slots</option>',
    ...availableSlots.map(
      (slotId) =>
        `<option value="${slotId}">${escapeHtml(getEquipmentSlotLabel(slotId))}</option>`,
    ),
  ].join("");
}

function getEquipmentMatches() {
  const terms = normalizeSearchText(state.equipmentQuery)
    .split(/\s+/)
    .filter(Boolean);
  return EQUIPMENT_CATALOG.filter((item) => {
    const matchesTerms = terms.every((term) => item.searchText.includes(term));
    const matchesSlot = !state.equipmentSlot || item.positions.includes(state.equipmentSlot);
    return matchesTerms && matchesSlot && item.level >= state.equipmentMinLevel;
  });
}

let equipmentRecipes;

function itemIcon(itemId) {
  const graphic = EQUIPMENT_CATALOG.find(item => item.id === itemId)?.gfxId || window.WAKFU_ITEM_ICONS?.[itemId];
  return graphic ? `<img class="equipment-icon" src="https://www.zenithwakfu.com/images/items/${Number(graphic)}.webp" alt="" loading="lazy" width="48" height="48">` : '';
}

function hideBrokenItemIcons(container) {
  container.querySelectorAll('.equipment-icon').forEach(image => {
    image.addEventListener('error', () => { image.hidden = true; }, { once: true });
  });
}

function equipmentStat(effect, level = 0) {
  let text = effect.text;
  if ([1068, 1069].includes(effect.actionId)) {
    const value = Number((effect.params[0] + (effect.params[1] || 0) * level).toFixed(2));
    text = `${value} ${effect.actionId === 1068 ? 'Dominio' : 'Resistencia'} en ${effect.params[2]} elementos`;
  }
  // Uninterpreted triggered effects must not appear as fake numerical statistics.
  if (/[{}]/.test(text) || text === 'Sin nombre' || [39, 40].includes(effect.actionId)) {
    return `<li class="equipment-stat effect-unresolved"><span>Efecto especial · consultar obtención (ID ${effect.actionId})</span></li>`;
  }
  const match = text.match(/^(-?\d+(?:[.,]\d+)?%?)\s+(.+)$/);
  const icon = window.WAKFU_STAT_ICONS?.[effect.actionId] || ([80, 90, 100, 1069].includes(effect.actionId) ? 'resistance.webp' : null);
  return `<li class="equipment-stat${match?.[1].startsWith('-') ? ' is-negative' : ''}">
    ${icon ? `<img src="assets/stats/${escapeHtml(icon)}" width="20" height="20" alt="">` : '<span class="stat-icon-fallback" aria-hidden="true">◇</span>'}
    <span>${escapeHtml(match ? match[2] : text)}</span>${match ? `<strong>${escapeHtml(match[1])}</strong>` : ''}</li>`;
}

function ingredientList(ingredients) {
  return `<ul class="recipe-ingredients">${ingredients.map(entry => `<li>${itemIcon(entry.itemId)}<span>${escapeHtml(entry.name)} <small>#${entry.itemId}</small></span><strong>×${entry.quantity}</strong></li>`).join('')}</ul>`;
}

function renderCraftingPath(container, chain) {
  const { steps, totals } = equipmentRecipes.requirements(chain);
  container.innerHTML = `<p class="crafting-sequence">${chain.map(step => `${escapeHtml(step.item.rarityLabel)} · ${escapeHtml(step.item.name)}`).join(' → ')}</p>
    <div class="crafting-totals"><h5>Total para obtener 1 ${escapeHtml(chain.at(-1).item.name)} (${escapeHtml(chain.at(-1).item.rarityLabel)})</h5>
    <p>Componentes que debes reunir desde el primer paso. Las piezas intermedias fabricadas no se cuentan dos veces. No se desglosan las recetas de los demás materiales.</p>${ingredientList(totals)}</div>
    <ol class="crafting-steps">${steps.map(step => `<li class="crafting-step">
      <h5>${itemIcon(step.item.id)}<span>${escapeHtml(step.item.name)} <small>${escapeHtml(step.item.rarityLabel)} · #${step.item.id} · ×${step.needed}</small></span></h5>
      ${step.recipe ? `<p>Receta #${step.recipe.id} · Nv. ${step.recipe.level} · ${step.crafts} fabricación(es), ${step.recipe.quantity} unidad(es) por fabricación</p>${ingredientList(step.ingredients)}` : `<p>Sin receta registrada: obtener ×${step.needed} de esta pieza por otra vía. <a href="https://db.methodwakfu.com/items/${step.item.id}" target="_blank" rel="noreferrer">Consultar obtención</a></p>`}
    </li>`).join('')}</ol>`;
  hideBrokenItemIcons(container);
}

function toggleCrafting(event) {
  const button = event.currentTarget;
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  const expanded = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!expanded));
  button.textContent = expanded ? 'Ver fabricación y mejoras' : 'Ocultar fabricación';
  panel.hidden = expanded;
  if (expanded || panel.childElementCount) return;
  equipmentRecipes ||= window.WAKFU_CATALOG.createCatalog(EQUIPMENT_CATALOG);
  const chains = equipmentRecipes.chains(Number(button.dataset.craftItem));
  if (!chains.length) { panel.textContent = 'No hay datos de fabricación disponibles.'; return; }
  panel.innerHTML = `${chains.length > 1 ? `<label>Ruta de fabricación <select class="crafting-route">${chains.map((chain, index) => `<option value="${index}">${index + 1}. ${chain.map(step => `${escapeHtml(step.item.rarityLabel)} #${step.item.id}${step.recipe ? ` (receta ${step.recipe.id})` : ''}`).join(' → ')}</option>`).join('')}</select></label>` : ''}<div class="crafting-path"></div>`;
  const content = panel.querySelector('.crafting-path');
  renderCraftingPath(content, chains[0]);
  panel.querySelector('select')?.addEventListener('change', event => renderCraftingPath(content, chains[Number(event.target.value)]));
}

function renderEquipmentCatalog() {
  if (!elements.equipmentResults) {
    return;
  }
  const matches = getEquipmentMatches();
  const visibleMatches = matches.slice(0, EQUIPMENT_RESULTS_LIMIT);
  elements.equipmentCount.textContent = `${matches.length} ${matches.length === 1 ? "resultado" : "resultados"}`;

  if (matches.length === 0) {
    elements.equipmentResults.innerHTML =
      '<div class="catalog-empty">No hay objetos que coincidan con los filtros.</div>';
    return;
  }

  const limitMessage =
    matches.length > EQUIPMENT_RESULTS_LIMIT
      ? `<p class="catalog-limit">Mostrando ${EQUIPMENT_RESULTS_LIMIT} de ${matches.length}. Añade más términos o filtra por slot.</p>`
      : "";
  elements.equipmentResults.innerHTML = `
    ${visibleMatches
      .map((item) => {
        const socketText =
          item.sockets.max > 0
            ? `${item.sockets.min}–${item.sockets.max} huecos`
            : "Sin huecos";
        const effects = item.effects.map(effect => equipmentStat(effect, item.level)).join('');
        const recipe = item.recipes[0];
        const acquisition = recipe
          ? `Fabricable · receta Nv. ${recipe.level} · ${recipe.ingredients.length} ingredientes`
          : "Obtención externa";
        const equipButtons = item.positions
          .filter((slotId) => BUILD_SLOT_ORDER.includes(slotId))
          .map(
            (slotId) =>
              `<button class="catalog-add-button" type="button" data-equip-item="${item.id}" data-equip-slot="${slotId}">Equipar · ${escapeHtml(getEquipmentSlotLabel(slotId))}</button>`,
          )
          .join("");
        return `
          <article class="sublimation-result equipment-result">
            <div class="sublimation-result-header">
              <div class="sublimation-result-title">
                ${itemIcon(item.id)}
                <h4>${escapeHtml(item.name)}</h4>
                <span class="catalog-kind">${escapeHtml(item.rarityLabel)}</span>
              </div>
              <span class="catalog-level">Nv. ${item.level}</span>
            </div>
            <div class="catalog-pattern-row equipment-meta">
              <span>${escapeHtml(item.itemTypeName)}</span>
              <span>· ${socketText}</span>
              <span>· ID ${item.id}</span>
            </div>
            <div class="catalog-effect">
              <ul class="equipment-stats">${effects || '<li>Sin efectos de equipo interpretables</li>'}</ul>
              <p>${escapeHtml(item.description || "Sin descripción.")}<br><span class="acquisition-note">${escapeHtml(acquisition)}</span></p>
            </div>
            <div class="catalog-result-footer equipment-footer">
              <a class="catalog-link" href="https://db.methodwakfu.com/items/${item.id}" target="_blank" rel="noreferrer">Consultar obtención</a>
              <div class="equipment-actions">${equipButtons}</div>
            </div>
            <button class="quick-button crafting-toggle" type="button" data-craft-item="${item.id}" aria-expanded="false" aria-controls="crafting-${item.id}">Ver fabricación y mejoras</button>
            <section id="crafting-${item.id}" class="crafting-panel" aria-label="Fabricación de ${escapeHtml(item.name)}" hidden></section>
          </article>
        `;
      })
      .join("")}
    ${limitMessage}
  `;
  elements.equipmentResults.querySelectorAll("[data-equip-item]").forEach((button) => {
    button.addEventListener("click", equipCatalogItem);
  });
  elements.equipmentResults.querySelectorAll('[data-craft-item]').forEach(button => button.addEventListener('click', toggleCrafting));
  hideBrokenItemIcons(elements.equipmentResults);
}

function getEquippedItems() {
  return BUILD_SLOT_ORDER.flatMap((slotId) => {
    const itemId = state.equippedItems[slotId];
    const item = EQUIPMENT_CATALOG.find((entry) => entry.id === itemId);
    return item ? [{ slotId, item }] : [];
  });
}

function getBuildWarnings(equippedItems) {
  const warnings = [];
  const epicCount = equippedItems.filter(({ item }) => item.isEpic).length;
  const relicCount = equippedItems.filter(({ item }) => item.isRelic).length;
  if (epicCount > 1) {
    warnings.push("Hay más de un objeto épico equipado.");
  }
  if (relicCount > 1) {
    warnings.push("Hay más de una reliquia equipada.");
  }
  const firstWeapon = equippedItems.find(({ slotId }) => slotId === "FIRST_WEAPON")?.item;
  if (firstWeapon?.disabledPositions.includes("SECOND_WEAPON") && state.equippedItems.SECOND_WEAPON) {
    warnings.push("El arma principal elegida bloquea el arma secundaria.");
  }
  return warnings;
}

function getEffectValue(effect, itemLevel) {
  const base = Number(effect.params?.[0] ?? 0);
  const perLevel = Number(effect.params?.[1] ?? 0);
  return base + perLevel * itemLevel;
}

function getBuildStatTotals(equippedItems) {
  const totals = new Map();
  for (const { item } of equippedItems) {
    for (const effect of item.effects) {
      let label = BUILD_STAT_LABELS[effect.actionId];
      if (effect.actionId === 1068) {
        const elementCount = Number(effect.params?.[2] ?? 0);
        label = `Dominio en ${elementCount || "varios"} elementos`;
      }
      if (!label) {
        continue;
      }
      const value = getEffectValue(effect, item.level);
      if (!Number.isFinite(value)) {
        continue;
      }
      totals.set(label, (totals.get(label) ?? 0) + value);
    }
  }
  return [...totals.entries()].sort((first, second) => first[0].localeCompare(second[0], "es"));
}

function renderBuildSummary() {
  if (!elements.buildSummary) {
    return;
  }
  const equippedItems = getEquippedItems();
  const warnings = getBuildWarnings(equippedItems);
  if (equippedItems.length === 0) {
    elements.buildSummary.innerHTML =
      '<div class="catalog-empty">Todavía no has equipado objetos. Usa el catálogo para empezar un set.</div>';
    return;
  }
  const statTotals = getBuildStatTotals(equippedItems);
  elements.buildSummary.innerHTML = `
    <div class="build-metrics">${equippedItems.length} piezas · ${equippedItems.filter(({ item }) => item.isEpic).length} épica · ${equippedItems.filter(({ item }) => item.isRelic).length} reliquia</div>
    ${
      statTotals.length > 0
        ? `<div class="build-stat-list">${statTotals
            .map(([label, value]) => `<span><strong>${formatNumber(value)}</strong> ${escapeHtml(label)}</span>`)
            .join("")}</div>`
        : ""
    }
    <div class="build-items">
      ${equippedItems
        .map(
          ({ slotId, item }) => `
            <div class="build-item">
              <div>
                <small>${escapeHtml(getEquipmentSlotLabel(slotId))}</small>
                <strong>${escapeHtml(item.name)}</strong>
                <span>Nv. ${item.level} · ${escapeHtml(item.rarityLabel)}</span>
              </div>
              <button class="remove-button" type="button" data-unequip-slot="${slotId}" aria-label="Quitar ${escapeHtml(item.name)}">×</button>
            </div>
          `,
        )
        .join("")}
    </div>
    ${warnings.length > 0 ? `<p class="build-warning">${escapeHtml(warnings.join(" "))}</p>` : ""}
  `;
  elements.buildSummary.querySelectorAll("[data-unequip-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      delete state.equippedItems[button.dataset.unequipSlot];
      saveBuild();
      renderBuildSummary();
    });
  });
}

function equipCatalogItem(event) {
  const itemId = Number(event.currentTarget.dataset.equipItem);
  const slotId = event.currentTarget.dataset.equipSlot;
  const item = EQUIPMENT_CATALOG.find((entry) => entry.id === itemId);
  if (!item || !item.positions.includes(slotId)) {
    return;
  }
  state.equippedItems[slotId] = itemId;
  saveBuild();
  renderBuildSummary();
  showFeedback(`«${item.name}» equipado en ${getEquipmentSlotLabel(slotId)}.`);
}

function getColorOptions(selectedColor) {
  return COLOR_IDS.map((colorId) => {
    const color = COLOR_DEFINITIONS[colorId];
    const selected = colorId === selectedColor ? " selected" : "";
    return `<option value="${colorId}"${selected}>${color.label}</option>`;
  }).join("");
}

function getTargetOptions(selectedTarget) {
  const automaticSelected = selectedTarget === "auto" ? " selected" : "";
  const options = [`<option value="auto"${automaticSelected}>Automatico</option>`];
  for (const slotName of EQUIPMENT_SLOTS) {
    const selected = selectedTarget === slotName ? " selected" : "";
    options.push(`<option value="${slotName}"${selected}>${slotName}</option>`);
  }
  return options.join("");
}

function renderStatsControls() {
  elements.statsControls.innerHTML = SELECTABLE_STATS.map((statName, statIndex) => {
    const weight = state.weights[statName] ?? 0;
    const slotValue = state.slotValues[statName] ?? 0;
    const statGroup = getStatGroup(statName);
    const previousGroup =
      statIndex > 0 ? getStatGroup(SELECTABLE_STATS[statIndex - 1]) : null;
    const groupHeading =
      statGroup !== previousGroup
        ? `<div class="stat-group-heading">${STAT_GROUP_LABELS[statGroup]}</div>`
        : "";
    const safeId = `stat-${statName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toLowerCase()}`;
    const slotValueId = `${safeId}-slot-value`;
    const activeClass = weight > 0 ? " is-active" : "";
    return `
      ${groupHeading}
      <div class="stat-control${activeClass}" data-stat-control="${escapeHtml(statName)}">
        <div class="stat-control-header">
          <label for="${safeId}">${escapeHtml(statName)}</label>
          <div class="stat-control-values">
            <label class="slot-value-label" for="${slotValueId}">Ranura base</label>
            <input
              id="${slotValueId}"
              class="slot-value-input"
              type="number"
              min="0"
              max="999"
              step="1"
              maxlength="3"
              inputmode="numeric"
              value="${slotValue}"
              data-slot-value-stat="${escapeHtml(statName)}"
              aria-label="Ranura base de ${escapeHtml(statName)}"
            />
            <output id="${safeId}-value" for="${safeId}">${weight}</output>
          </div>
        </div>
        <div class="range-row">
          <input
            id="${safeId}"
            type="range"
            min="0"
            max="100"
            step="5"
            value="${weight}"
            style="--range-value: ${weight}%"
            data-stat="${escapeHtml(statName)}"
            aria-label="Prioridad de ${escapeHtml(statName)}"
          />
        </div>
      </div>
    `;
  }).join("");

  elements.statsControls.querySelectorAll('input[type="range"]').forEach((input) => {
    input.addEventListener("input", (event) => {
      const slider = event.currentTarget;
      const statName = slider.dataset.stat;
      const nextValue = Number(slider.value);
      state.weights[statName] = nextValue;
      slider.style.setProperty("--range-value", `${nextValue}%`);
      const control = slider.closest(".stat-control");
      const output = control?.querySelector("output");
      if (output) {
        output.textContent = String(nextValue);
      }
      control?.classList.toggle("is-active", nextValue > 0);
      calculateAndRender();
    });
  });

  elements.statsControls.querySelectorAll("input[data-slot-value-stat]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const slotValueInput = event.currentTarget;
      const statName = slotValueInput.dataset.slotValueStat;
      const digits = slotValueInput.value.replace(/\D/g, "");
      const nextValue = digits === "" ? 0 : Math.min(Number(digits), 999);
      slotValueInput.value = digits === "" ? "" : String(nextValue);
      state.slotValues[statName] = nextValue;
      calculateAndRender();
    });
  });
}

function getSublimationTotal(sublimation) {
  return state.combinations.reduce((total, combination) => {
    const selected = SUBLIMATION_CATALOG.find((item) => item.id === combination.sublimationId);
    const sameState = selected && (sublimation.stateId != null
      ? selected.stateId === sublimation.stateId
      : selected.id === sublimation.id);
    return total + (sameState ? selected.level : 0);
  }, 0);
}

function renderSublimationTotal(sublimation) {
  const total = getSublimationTotal(sublimation);
  const maximum = sublimation.maxLevel;
  return `<span class="sublimation-total${maximum && total > maximum ? " is-over-limit" : ""}">
    Estado: ${total}/${maximum ?? "máximo sin verificar"}${maximum && total > maximum ? " · Supera el máximo" : ""}
  </span>`;
}

function renderCombinationList() {
  elements.combinationCount.textContent = `${state.combinations.length}/${MAX_COMBINATIONS}`;
  document.querySelector("#add-combination").disabled = state.combinations.length >= MAX_COMBINATIONS;
  renderSublimationCatalog();
  if (state.combinations.length === 0) {
    elements.combinationList.innerHTML = `
      <div class="empty-combinations">
        No hay sublimaciones. Añade una para obligar al motor a reservar una
        combinacion de tres colores.
      </div>
    `;
    return;
  }

  elements.combinationList.innerHTML = state.combinations
    .map((combination, index) => {
      const selected = SUBLIMATION_CATALOG.find((item) => item.id === combination.sublimationId);
      const colorInputs = combination.colors
        .map((colorId, colorIndex) => {
          const color = COLOR_DEFINITIONS[colorId];
          return `
            <label class="select-label" aria-label="Color ${colorIndex + 1} de la sublimación ${index + 1}">
              <select
                data-action="color"
                data-combination-id="${combination.id}"
                data-color-index="${colorIndex}"
                data-color="${colorId}"
                aria-label="Color ${colorIndex + 1}"
              >
                ${getColorOptions(colorId)}
              </select>
            </label>
          `;
        })
        .join("");

      return `
        <div class="combination-row" data-combination-row="${combination.id}">
          <span class="combination-index">${String(index + 1).padStart(2, "0")}</span>
          <div class="combination-details">
            <div class="combination-name">${escapeHtml(combination.colors.map(getColorLabel).join(" · "))}${selected ? ` (${escapeHtml(selected.name)})` : ""}</div>
            ${selected ? renderSublimationTotal(selected) : ""}
          <div class="combination-inputs">
            <label class="select-label">
              <select
                data-action="target"
                data-combination-id="${combination.id}"
                aria-label="Slot de destino de la sublimación ${index + 1}"
              >
                ${getTargetOptions(combination.target)}
              </select>
            </label>
            ${colorInputs}
          </div>
          </div>
          <button
            class="remove-button"
            type="button"
            data-action="remove"
            data-combination-id="${combination.id}"
            aria-label="Eliminar sublimación ${index + 1}"
          >×</button>
        </div>
      `;
    })
    .join("");

  elements.combinationList
    .querySelectorAll("select[data-action]")
    .forEach((select) => {
      select.addEventListener("change", handleCombinationChange);
    });
  elements.combinationList
    .querySelectorAll('button[data-action="remove"]')
    .forEach((button) => {
      button.addEventListener("click", handleCombinationRemove);
    });
}

function handleCombinationChange(event) {
  const input = event.currentTarget;
  const combinationId = Number(input.dataset.combinationId);
  const combination = state.combinations.find((item) => item.id === combinationId);
  if (!combination) {
    return;
  }

  if (input.dataset.action === "target") {
    combination.target = input.value;
  } else {
    const colorIndex = Number(input.dataset.colorIndex);
    combination.colors[colorIndex] = input.value;
    input.dataset.color = input.value;
    delete combination.sublimationId;
    delete combination.sublimationName;
  }
  renderCombinationList();
  calculateAndRender();
}

function handleCombinationRemove(event) {
  const button = event.currentTarget;
  const combinationId = Number(button.dataset.combinationId);
  state.combinations = state.combinations.filter((item) => item.id !== combinationId);
  renderCombinationList();
  calculateAndRender();
}

function addCombination() {
  if (state.combinations.length >= MAX_COMBINATIONS) {
    showFeedback(`Puedes añadir como maximo ${MAX_COMBINATIONS} sublimaciones, una por slot disponible.`, true);
    return;
  }
  state.combinations.push({
    id: state.nextCombinationId,
    target: "auto",
    colors: ["red", "blue", "green"],
  });
  state.nextCombinationId += 1;
  renderCombinationList();
  calculateAndRender();
}

function getStatsForColor(colorId) {
  return COLOR_DEFINITIONS[colorId].stats.map((stat) => stat.name);
}

function getDoubleSlotsForStat(statName) {
  return COLOR_IDS
    .flatMap((colorId) => COLOR_DEFINITIONS[colorId].stats)
    .find((stat) => stat.name === statName)?.doubleSlots ?? [];
}

function isDoubleStat(statName, slotName) {
  return getDoubleSlotsForStat(statName).includes(slotName);
}

function isDomainStat(statName) {
  return DOMAIN_STATS.has(statName);
}

function isResistanceStat(statName) {
  return RESISTANCE_STATS.has(statName);
}

// Compare in priority order, without allowing damage weights to buy away resistance.
function compareObjectives(first, second) {
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) return first[index] > second[index] ? 1 : -1;
  }
  return 0;
}

function getChoiceObjective(choice, slotName) {
  const resistance = isResistanceStat(choice.statName);
  return [
    Number(resistance && choice.isDouble),
    Number(isDomainStat(choice.statName) && choice.isDouble),
    resistance ? choice.multiplier : 0,
    Number(resistance && choice.colorId === RESISTANCE_SLOT_COLORS[slotName]),
    choice.score,
  ];
}

function getChoicesForColor(colorId, slotName) {
  return getStatsForColor(colorId)
    .filter((name) => isResistanceStat(name) ||
      (isDomainStat(name) && isDoubleStat(name, slotName) &&
        state.weights[name] > 0 && state.slotValues[name] > 0))
    .map((statName) => {
      const resistance = isResistanceStat(statName);
      const priority = resistance ? 0 : state.weights[statName] ?? 0;
      const slotValue = resistance ? 100 : state.slotValues[statName] ?? 0;
      const isDouble = isDoubleStat(statName, slotName);
      const multiplier = isDouble ? 2 : 1;
      const realValue = slotValue * multiplier;
      return { colorId, statName, priority, slotValue, multiplier, isDouble,
        realValue, score: priority * realValue };
    });
}

function getBestChoice(colorIds, slotName) {
  return colorIds.flatMap((color) => getChoicesForColor(color, slotName))
    .reduce((best, choice) => !best || compareObjectives(
      getChoiceObjective(choice, slotName), getChoiceObjective(best, slotName),
    ) > 0 ? choice : best, null);
}

function getBestChoiceForColor(colorId, slotName) {
  return getBestChoice([colorId], slotName);
}

function getBestFreeChoice(slotName) {
  return getBestChoice(COLOR_IDS, slotName);
}

function getMaxPatternWindowStart(combination) {
  return combination ? SOCKETS_PER_SLOT - combination.colors.length : 0;
}

// windowStart 0 => el patrón ocupa las posiciones 1-3 (deja libre la 4).
// windowStart 1 => el patrón ocupa las posiciones 2-4 (deja libre la 1).
// Con FIXED_PATTERN_SIZE=3 y SOCKETS_PER_SLOT=4 esto cubre exactamente
// las dos ventanas válidas descritas por WakForge para un patrón de 3 en 4.
function createAssignment(slotName, combination, windowStart = 0) {
  const socketChoices = new Array(SOCKETS_PER_SLOT).fill(null);
  if (combination) {
    combination.colors.forEach((colorId, colorIndex) => {
      socketChoices[windowStart + colorIndex] = {
        ...getBestChoiceForColor(colorId, slotName),
        isFixed: true,
      };
    });
  }
  for (let index = 0; index < SOCKETS_PER_SLOT; index += 1) {
    if (!socketChoices[index]) {
      socketChoices[index] = { ...getBestFreeChoice(slotName), isFixed: false };
    }
  }
  const sockets = socketChoices.map((choice, index) => ({
    ...choice,
    socketIndex: index,
  }));
  return {
    slotName,
    sockets,
    combinationId: combination?.id ?? null,
    fixedColors: combination?.colors ?? [],
    patternStart: combination ? windowStart : null,
    score: sockets.reduce((total, socket) => total + socket.score, 0),
  };
}

// El optimizador decide la ventana del patrón: evalúa las posiciones válidas
// (1-3 y 2-4) y se queda con la de mayor puntuación; en empate usa la
// paridad del slot como desempate estable para repartir ambas ventanas.
function createBestAssignment(slotName, combination) {
  if (!combination) {
    return createAssignment(slotName, null, 0);
  }
  const maxWindowStart = getMaxPatternWindowStart(combination);
  const preferredStart = EQUIPMENT_SLOTS.indexOf(slotName) % 2 === 0 ? 0 : Math.min(1, maxWindowStart);
  let best = null;
  for (let windowStart = 0; windowStart <= maxWindowStart; windowStart += 1) {
    const candidate = createAssignment(slotName, combination, windowStart);
    if (
      !best ||
      compareObjectives(getAssignmentObjective(candidate), getAssignmentObjective(best)) > 0 ||
      (compareObjectives(getAssignmentObjective(candidate), getAssignmentObjective(best)) === 0 && windowStart === preferredStart)
    ) {
      best = candidate;
    }
  }
  return best;
}

function recalculateAssignment(assignment) {
  assignment.score = assignment.sockets.reduce(
    (total, socket) => total + socket.score,
    0,
  );
}

function getStatGroup(statName) {
  if (isDomainStat(statName)) {
    return "attack";
  }
  if (isResistanceStat(statName)) {
    return "defense";
  }
  if (EXTRA_STATS.has(statName)) {
    return "extras";
  }
  return null;
}

function getAssignmentObjective(assignment) {
  return assignment.sockets.reduce((total, socket) => {
    const score = getChoiceObjective(socket, assignment.slotName);
    return total.map((value, index) => value + score[index]);
  }, [0, 0, 0, 0, 0]);
}

function getResistanceCounts(assignments) {
  const totals = Object.fromEntries([...RESISTANCE_STATS].map((name) => [name, 0]));
  for (const assignment of assignments) {
    for (const socket of assignment.sockets) {
      if (isResistanceStat(socket.statName)) totals[socket.statName] += socket.multiplier;
    }
  }
  return Object.values(totals);
}

function getResistanceBalance(counts) {
  return [Math.min(...counts), -counts.reduce((total, value) => total + value * value, 0)];
}

// Keep doubled damage and resistance bonuses. Balance all remaining resistance
// sockets, including single bonuses, without changing the sublimation colors.
function optimizeCombatAssignments(assignments, balanceCache = new Map()) {
  const names = [...RESISTANCE_STATS];
  const entries = [];
  for (const assignment of assignments) {
    for (const socket of assignment.sockets) {
      if (!isResistanceStat(socket.statName)) continue;
      const colors = socket.isFixed ? [socket.colorId] : COLOR_IDS;
      const resistanceOptions = colors.flatMap((color) => getChoicesForColor(color, assignment.slotName))
        .filter((choice) => isResistanceStat(choice.statName));
      const multiplier = Math.max(...resistanceOptions.map((choice) => choice.multiplier));
      const options = resistanceOptions.filter((choice) => choice.multiplier === multiplier);
      const key = `${multiplier}:${options.map((choice) => names.indexOf(choice.statName)).join(",")}`;
      entries.push({ socket, options, key });
    }
  }
  // Equivalent color constraints share a result across automatic destination swaps.
  entries.sort((first, second) => first.options.length - second.options.length || first.key.localeCompare(second.key));
  const cacheKey = entries.map((entry) => entry.key).join(";");
  let selected = balanceCache.get(cacheKey);
  if (!selected) {
    const counts = [0, 0, 0, 0];
    const flexible = entries.filter((entry) => entry.options.length > 1);
    for (const entry of entries.filter((item) => item.options.length === 1)) {
      const choice = entry.options[0];
      counts[names.indexOf(choice.statName)] += choice.multiplier;
    }
    let distributions = new Map([[counts.join(","), { counts, parent: null }]]);
    for (const entry of flexible) {
      const next = new Map();
      for (const distribution of distributions.values()) {
        for (const [optionIndex, choice] of entry.options.entries()) {
          const projected = [...distribution.counts];
          projected[names.indexOf(choice.statName)] += choice.multiplier;
          const key = projected.join(",");
          if (!next.has(key)) next.set(key, { counts: projected, parent: distribution, optionIndex });
        }
      }
      distributions = next;
    }
    let best = null;
    for (const distribution of distributions.values()) {
      if (!best || compareObjectives(getResistanceBalance(distribution.counts), getResistanceBalance(best.counts)) > 0) best = distribution;
    }
    const flexibleChoices = [];
    while (best.parent) {
      flexibleChoices.push(best.optionIndex);
      best = best.parent;
    }
    flexibleChoices.reverse();
    let nextFlexible = 0;
    selected = entries.map((entry) => entry.options.length === 1 ? 0 : flexibleChoices[nextFlexible++]);
    balanceCache.set(cacheKey, selected);
  }
  entries.forEach(({ socket, options }, index) => Object.assign(socket, options[selected[index]]));
  assignments.forEach(recalculateAssignment);
}

function getBuildObjective(assignments) {
  const local = assignments.reduce((total, assignment) => {
    const score = getAssignmentObjective(assignment);
    return total.map((value, index) => value + score[index]);
  }, [0, 0, 0, 0, 0]);
  return [local[0], local[1], ...getResistanceBalance(getResistanceCounts(assignments)), ...local.slice(2)];
}

// Reconsider automatic destinations using the balanced build, including empty
// pieces. Explicit destinations and the order of the three colors stay fixed.
function improveAutomaticPlacements(assignments, explicitTargets, balanceCache) {
  let bestObjective = getBuildObjective(assignments);
  const byId = new Map(state.combinations.map((combination) => [combination.id, combination]));
  for (let pass = 0; pass < EQUIPMENT_SLOTS.length; pass += 1) {
    let bestMove = null;
    for (let first = 0; first < assignments.length; first += 1) {
      if (explicitTargets.has(assignments[first].slotName)) continue;
      for (let second = first + 1; second < assignments.length; second += 1) {
        if (explicitTargets.has(assignments[second].slotName)) continue;
        if (!assignments[first].combinationId && !assignments[second].combinationId) continue;
        const candidate = assignments.map((assignment) => ({
          ...assignment, sockets: assignment.sockets.map((socket) => ({ ...socket })),
        }));
        candidate[first] = createBestAssignment(assignments[first].slotName, byId.get(assignments[second].combinationId));
        candidate[second] = createBestAssignment(assignments[second].slotName, byId.get(assignments[first].combinationId));
        optimizeCombatAssignments(candidate, balanceCache);
        const objective = getBuildObjective(candidate);
        if (compareObjectives(objective, bestObjective) > 0) {
          bestObjective = objective;
          bestMove = candidate;
        }
      }
    }
    if (!bestMove) break;
    assignments.splice(0, assignments.length, ...bestMove);
  }
}

function getCombinationValidation(combination, explicitTargets) {
  const errors = [];
  if (combination.colors.length !== FIXED_PATTERN_SIZE) {
    errors.push("debe tener tres colores");
  }
  if (combination.target !== "auto") {
    if (explicitTargets.has(combination.target)) {
      errors.push(`comparte destino con ${combination.target}`);
    }
  }
  return errors;
}

function getEmptyOptimizationResult() {
  const assignments = EQUIPMENT_SLOTS.map((slotName) => createAssignment(slotName, null));
  optimizeCombatAssignments(assignments);
  return {
    assignments,
    totalScore: assignments.reduce((total, assignment) => total + assignment.score, 0),
    warnings: [],
    doubleCount: assignments
      .flatMap((assignment) => assignment.sockets)
      .filter((socket) => socket.isDouble).length,
  };
}

function calculateOptimization() {
  const explicitTargets = new Set();
  const explicit = [];
  const automatic = [];
  const warnings = [];

  for (const combination of state.combinations) {
    const validationErrors = getCombinationValidation(combination, explicitTargets);
    if (validationErrors.length > 0) {
      warnings.push(
        `Sublimación ${combination.colors.map(getColorLabel).join(" / ")} no se pudo aplicar: ${validationErrors.join(
          ", ",
        )}.`,
      );
      continue;
    }
    if (combination.target === "auto") {
      automatic.push(combination);
    } else {
      explicitTargets.add(combination.target);
      explicit.push(combination);
    }
  }

  const initialAssignments = EQUIPMENT_SLOTS.map((slotName) =>
    createAssignment(slotName, null),
  );
  const assignments = new Map(
    initialAssignments.map((assignment) => [assignment.slotName, assignment]),
  );
  const initialScores = new Map(
    initialAssignments.map((assignment) => [
      assignment.slotName,
      getAssignmentObjective(assignment),
    ]),
  );
  const usedSlots = new Set();

  for (const combination of explicit) {
    if (!EQUIPMENT_SLOTS.includes(combination.target) || usedSlots.has(combination.target)) {
      warnings.push(`La sublimación ${combination.id} no tiene un slot de destino disponible.`);
      continue;
    }
    const assignment = createBestAssignment(combination.target, combination);
    assignments.set(combination.target, assignment);
    usedSlots.add(combination.target);
  }

  const automaticCandidates = automatic;

  const memo = new Map();
  function solveAutomatic(index, usedMask) {
    const memoKey = `${index}:${usedMask}`;
    if (memo.has(memoKey)) {
      return memo.get(memoKey);
    }
    if (index >= automaticCandidates.length) {
      const terminal = { delta: [0, 0, 0, 0, 0], placements: [], unplaced: [] };
      memo.set(memoKey, terminal);
      return terminal;
    }

    const availableSlots = EQUIPMENT_SLOTS.filter((slotName, slotIndex) => {
      const isUsedByExplicit = usedSlots.has(slotName);
      const isUsedByAutomatic = (usedMask & (1 << slotIndex)) !== 0;
      return !isUsedByExplicit && !isUsedByAutomatic;
    });

    if (availableSlots.length === 0) {
      const terminal = {
        delta: [0, 0, 0, 0, 0],
        placements: [],
        unplaced: automaticCandidates.slice(index),
      };
      memo.set(memoKey, terminal);
      return terminal;
    }

    let best = null;
    const combination = automaticCandidates[index];
    for (const slotName of availableSlots) {
      const slotIndex = EQUIPMENT_SLOTS.indexOf(slotName);
      const assignment = createBestAssignment(slotName, combination);
      const next = solveAutomatic(index + 1, usedMask | (1 << slotIndex));
      const candidate = {
        delta: getAssignmentObjective(assignment).map((value, component) =>
          value - initialScores.get(slotName)[component] + next.delta[component]),
        placements: [{ slotName, combination, assignment }, ...next.placements],
        unplaced: next.unplaced,
      };
      if (
        !best ||
        compareObjectives(candidate.delta, best.delta) > 0 ||
        (compareObjectives(candidate.delta, best.delta) === 0 &&
          candidate.placements.length > best.placements.length)
      ) {
        best = candidate;
      }
    }

    memo.set(memoKey, best);
    return best;
  }

  const automaticSolution = solveAutomatic(0, 0);
  for (const placement of automaticSolution.placements) {
    assignments.set(placement.slotName, placement.assignment);
  }
  for (const combination of automaticSolution.unplaced) {
    warnings.push(`La sublimación ${combination.id} no se pudo colocar: no quedan slots libres.`);
  }

  const resolvedAssignments = EQUIPMENT_SLOTS.map((slotName) => assignments.get(slotName));
  const balanceCache = new Map();
  optimizeCombatAssignments(resolvedAssignments, balanceCache);
  improveAutomaticPlacements(resolvedAssignments, explicitTargets, balanceCache);
  const totalScore = resolvedAssignments.reduce(
    (total, assignment) => total + assignment.score,
    0,
  );
  const allSockets = resolvedAssignments.flatMap((assignment) => assignment.sockets);

  return {
    assignments: resolvedAssignments,
    totalScore,
    warnings,
    doubleCount: allSockets.filter((socket) => socket.isDouble).length,
  };
}

function showFeedback(message, isWarning = false) {
  elements.feedback.textContent = message;
  elements.feedback.classList.toggle("is-warning", isWarning);
  elements.feedback.classList.remove("is-hidden");
}

function hideFeedback() {
  elements.feedback.textContent = "";
  elements.feedback.classList.add("is-hidden");
  elements.feedback.classList.remove("is-warning");
}

function renderMetrics(result) {
  const prioritizedStats = SELECTABLE_STATS.filter((statName) => (state.weights[statName] ?? 0) > 0);
  const totalSockets = result.assignments.length * SOCKETS_PER_SLOT;
  const activeSockets = result.assignments.flatMap((assignment) => assignment.sockets).length;
  elements.metricScore.textContent = `${formatNumber(result.totalScore)} pts`;
  elements.metricScoreCaption.textContent =
    prioritizedStats.length > 0
      ? "Tras cubrir resistencias"
      : "Resistencias automáticas";
  elements.metricDoubles.textContent = formatNumber(result.doubleCount);
  elements.metricPriorities.textContent = formatNumber(prioritizedStats.length);
  elements.metricPrioritiesCaption.textContent =
    prioritizedStats.length > 0 ? "Resistencias siempre obligatorias" : "Activa sliders para enfocar el calculo";
  elements.metricSlots.textContent = `${activeSockets} / ${totalSockets}`;
  elements.scorePill.textContent = formatNumber(result.totalScore);
  elements.priorityCount.textContent = `${prioritizedStats.length} activas`;
}

function renderSlotGrid(result) {
  elements.slotGrid.innerHTML = result.assignments
    .map((assignment, index) => {
      const isFixed = Boolean(assignment.combinationId);
      const resistanceSockets = assignment.sockets.filter((socket) => isResistanceStat(socket.statName));
      const resistanceCount = resistanceSockets.length;
      const allResistanceDoubled = resistanceSockets.every((socket) => socket.isDouble);
      const combination = state.combinations.find((item) => item.id === assignment.combinationId);
      const socketMarkup = assignment.sockets
        .map((socket) => {
          const color = COLOR_DEFINITIONS[socket.colorId];
          const bonusText = socket.isDouble
            ? "Bonus doble aplicado"
            : "Ranura base";
          return `
            <div class="socket socket-${color.className}" title="${escapeHtml(
              `${color.label}: ${socket.statName}. ${bonusText}. Ranura base ${socket.slotValue} × ${socket.multiplier} = ${socket.realValue} real.`,
            )}">
              <div class="socket-top">
                <span class="socket-number">${String(socket.socketIndex + 1).padStart(2, "0")}</span>
                <span class="socket-color-shape color-shape-${color.className}" aria-hidden="true"></span>
                <span class="socket-color-name">${color.label}</span>
                ${socket.isDouble ? '<span class="socket-multiplier">×2</span>' : ""}
              </div>
              <strong>${escapeHtml(socket.statName)}</strong>
              <small>${socket.isFixed ? "Sublimación aplicada" : "Ranura optimizada"} · Ranura base ${
                socket.slotValue
              } × ${socket.multiplier} = ${formatNumber(socket.realValue)} real</small>
            </div>
          `;
        })
        .join("");
      const windowLabel =
        assignment.patternStart === 1 ? "Ranuras 2-4" : "Ranuras 1-3";
      const patternMarkup = isFixed
        ? `
          <div class="fixed-pattern">
            <span>${escapeHtml(combination?.sublimationName ?? "Sublimación")}</span>
            <span class="fixed-pattern-dots" aria-label="Sublimación de colores">
              ${assignment.fixedColors
                .map(
                  (colorId) =>
                    `<span class="pattern-${COLOR_DEFINITIONS[colorId].className}" title="${getColorLabel(
                      colorId,
                    )}"></span>`,
                )
                .join("")}
            </span>
            <span>· ${windowLabel} · 1 libre</span>
          </div>
        `
        : "";
      return `
        <article class="slot-card${isFixed ? " is-fixed" : ""}">
          <div class="slot-header">
            <div class="slot-title">
              <span class="slot-number">${String(index + 1).padStart(2, "0")}</span>
              <h3>${escapeHtml(assignment.slotName)}</h3>
            </div>
            <span class="slot-score" title="${formatNumber(assignment.score)} puntos de dominios">${resistanceCount ? `${resistanceCount} resist.${allResistanceDoubled ? " ×2" : ""}` : `${formatNumber(assignment.score)} pts`}</span>
          </div>
          <div class="socket-list">${socketMarkup}</div>
          ${patternMarkup}
        </article>
      `;
    })
    .join("");
}

function renderColorDistribution(result) {
  const counts = Object.fromEntries(COLOR_IDS.map((colorId) => [colorId, 0]));
  result.assignments
    .flatMap((assignment) => assignment.sockets)
    .forEach((socket) => {
      counts[socket.colorId] += 1;
    });
  const maxCount = Math.max(...Object.values(counts), 1);

  elements.colorDistribution.innerHTML = COLOR_IDS.map((colorId) => {
    const color = COLOR_DEFINITIONS[colorId];
    const count = counts[colorId];
    const width = (count / maxCount) * 100;
    return `
      <div class="bar-item">
        <div class="bar-item-header">
          <span class="bar-item-label">
            <span class="color-shape color-shape-${color.className}" aria-hidden="true"></span>
            <span>${color.label}</span>
          </span>
          <span class="bar-item-value">${count} ranuras</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill bar-fill-${color.className}" style="width: ${width}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderStatCoverage(result) {
  const statSummary = Object.fromEntries(
    ALL_STATS.map((statName) => [
      statName,
      {
        count: 0,
        effectiveCount: 0,
        normalCount: 0,
        doubleCount: 0,
        realValue: 0,
        score: 0,
      },
    ]),
  );
  result.assignments
    .flatMap((assignment) => assignment.sockets)
    .forEach((socket) => {
      const summary = statSummary[socket.statName];
      const multiplier = socket.isDouble ? 2 : 1;
      summary.count += 1;
      summary.effectiveCount += multiplier;
      summary.normalCount += multiplier === 1 ? 1 : 0;
      summary.doubleCount += multiplier === 2 ? 1 : 0;
      summary.realValue += socket.realValue;
      summary.score += socket.score;
    });

  const statsToShow = [
    ...RESISTANCE_STATS,
    ...SELECTABLE_STATS.filter((name) => state.weights[name] > 0 || statSummary[name].count > 0),
  ];

  if (statsToShow.length === 0) {
    elements.statCoverage.innerHTML =
      '<p class="empty-state">Todavia no hay stats que mostrar.</p>';
    return;
  }

  const maxValue = Math.max(
    ...statsToShow.map((statName) => statSummary[statName].realValue),
    1,
  );
  elements.statCoverage.innerHTML = statsToShow
    .map((statName) => {
      const summary = statSummary[statName];
      const comparableValue = summary.realValue;
      const width = (comparableValue / maxValue) * 100;
      const weight = state.weights[statName] ?? 0;
      const slotValue = state.slotValues[statName] ?? 0;
      const coverageFormula = `${summary.normalCount} × 1 + ${summary.doubleCount} × 2 = ${summary.effectiveCount}`;
      const realValueFormula = `${slotValue} × (${summary.normalCount} × 1 + ${summary.doubleCount} × 2) = ${summary.realValue}`;
      return `
        <div
          class="stat-coverage-item"
          title="${escapeHtml(
            `${statName}: ${coverageFormula}. Cada ranura normal suma 1 y cada bonus doble suma 2.`,
          )}"
        >
          <div class="stat-coverage-header">
            <span class="stat-coverage-name">${escapeHtml(statName)}</span>
            <span class="stat-coverage-meta">${formatNumber(
              summary.realValue,
            )} real · ${summary.effectiveCount}x</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${width}%"></div>
          </div>
          <small class="stat-coverage-formula">
            ${realValueFormula}${weight > 0 ? ` · ${formatNumber(summary.score)} pts` : ""}
          </small>
        </div>
      `;
    })
    .join("");
}

function renderReference() {
  elements.colorReference.innerHTML = COLOR_IDS.map((colorId) => {
    const color = COLOR_DEFINITIONS[colorId];
    const stats = color.stats;
    return `
      <article class="reference-item">
        <div class="reference-header">
          <span class="color-shape color-shape-${color.className}" aria-hidden="true"></span>
          <h3>${color.label}</h3>
          <span>${stats.length} stats</span>
        </div>
        <div class="reference-stats">
          ${stats
            .map(
              (stat) => `
                <div class="reference-stat">
                  <span class="reference-stat-name" title="${escapeHtml(stat.name)}">${escapeHtml(
                    stat.name,
                  )}</span>
                  <span class="reference-stat-slots">
                    <strong>×2:</strong> ${escapeHtml(stat.doubleSlots.join(", ") || "Ningun slot")}
                  </span>
                </div>
              `,
            )
            .join("")}
        </div>
      </article>
    `;
  }).join("");
}

function renderEquipmentGuide() {
  const slot = document.querySelector("#guide-slot").value;
  const doubleCount = COLOR_IDS.reduce((total, colorId) => total +
    COLOR_DEFINITIONS[colorId].stats.filter((stat) => stat.doubleSlots.includes(slot)).length, 0);
  document.querySelector("#guide-summary").textContent = `${slot}: ${doubleCount} estadísticas con bono doble. Consulta también dónde se duplican las demás para comparar piezas.`;
  document.querySelector("#guide-colors").innerHTML = COLOR_IDS.map((colorId) => {
    const color = COLOR_DEFINITIONS[colorId];
    const stats = [...color.stats].sort((a, b) =>
      Number(b.doubleSlots.includes(slot)) - Number(a.doubleSlots.includes(slot)));
    const count = stats.filter((stat) => stat.doubleSlots.includes(slot)).length;
    return `<article class="guide-color guide-color-${colorId}">
      <h3><span class="color-shape color-shape-${colorId}" aria-hidden="true"></span>${color.label}</h3>
      <p class="guide-note">${count ? `${count} opciones con ×2` : "Sin bonos dobles en esta pieza"}</p>
      <ul class="guide-stats">${stats.map((stat) => {
        const doubled = stat.doubleSlots.includes(slot);
        return `<li class="guide-stat${doubled ? " guide-stat-double" : ""}">
          <div><strong>${escapeHtml(stat.name)}</strong><span class="guide-multiplier">${doubled ? "×2 · Doble" : "×1 · Normal"}</span></div>
          <small>${doubled ? "Bono doble en " + escapeHtml(slot) : "×2 en: " + escapeHtml(stat.doubleSlots.join(", "))}</small>
        </li>`;
      }).join("")}</ul>
    </article>`;
  }).join("");
}

function initEquipmentGuide() {
  const select = document.querySelector("#guide-slot");
  select.innerHTML = EQUIPMENT_SLOTS.map((slot) =>
    `<option value="${escapeHtml(slot)}">${escapeHtml(slot)}</option>`).join("");
  select.addEventListener("change", renderEquipmentGuide);
  renderEquipmentGuide();
}

function calculateAndRender() {
  const result = calculateOptimization();
  state.result = result;
  renderMetrics(result);
  renderSlotGrid(result);
  renderColorDistribution(result);
  renderStatCoverage(result);

  if (result.warnings.length > 0) {
    showFeedback(result.warnings.join(" "), true);
  } else {
    hideFeedback();
  }
}

function clearPriorities() {
  state.weights = { ...DEFAULT_WEIGHTS };
  renderStatsControls();
  calculateAndRender();
}

function resetDemo() {
  state.weights = {
    ...DEFAULT_WEIGHTS,
    "Dominio Cuerpo a Cuerpo": 100,
  };
  state.slotValues = { ...DEFAULT_SLOT_VALUES };
  state.combinations = [];
  state.sublimationQuery = "";
  state.sublimationPatternFilters = [{ id: 1, colors: ["", "", ""] }];
  state.nextPatternFilterId = 2;
  state.nextCombinationId = 1;
  elements.sublimationSearch.value = "";
  renderStatsControls();
  renderCombinationList();
  renderSublimationPatternFilters();
  renderSublimationCatalog();
  calculateAndRender();
}

function activateTab(tabId) {
  document.querySelectorAll('[role="tab"]').forEach((tab) => {
    const selected = tab.id === tabId;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden = !selected;
  });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function bindTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab.id));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 :
        (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      activateTab(tabs[next].id);
      tabs[next].focus();
    });
  });
}

function bindEvents() {
  document.querySelector("#add-combination").addEventListener("click", addCombination);
  document.querySelector("#clear-priorities").addEventListener("click", clearPriorities);
  elements.sublimationSearch.addEventListener("input", (event) => {
    state.sublimationQuery = event.currentTarget.value;
    renderSublimationCatalog();
  });
  elements.sublimationPatternFilters.addEventListener("change", updateSublimationPatternFilter);
  elements.sublimationPatternFilters.addEventListener("click", removeSublimationPatternFilter);
  document.querySelector("#add-pattern-filter").addEventListener("click", () => {
    state.sublimationPatternFilters.push({ id: state.nextPatternFilterId++, colors: ["", "", ""] });
    renderSublimationPatternFilters();
  });
  document.querySelector("#clear-pattern-filters").addEventListener("click", () => {
    state.sublimationPatternFilters = [{ id: 1, colors: ["", "", ""] }];
    state.nextPatternFilterId = 2;
    renderSublimationPatternFilters();
    renderSublimationCatalog();
  });
  elements.equipmentSearch.addEventListener("input", (event) => {
    state.equipmentQuery = event.currentTarget.value;
    renderEquipmentCatalog();
  });
  elements.equipmentSlotFilter.addEventListener("change", (event) => {
    state.equipmentSlot = event.currentTarget.value;
    renderEquipmentCatalog();
  });
  elements.equipmentMinLevel.addEventListener("input", (event) => {
    const value = Number(event.currentTarget.value);
    state.equipmentMinLevel = Number.isFinite(value) ? Math.max(0, Math.min(245, value)) : 0;
    renderEquipmentCatalog();
  });
  document.querySelector("#clear-build").addEventListener("click", () => {
    state.equippedItems = {};
    saveBuild();
    renderBuildSummary();
    showFeedback("Set vaciado.");
  });
  document.addEventListener("keydown", (event) => {
    const activeTagName = document.activeElement?.tagName;
    if (
      event.key === "/" &&
      activeTagName !== "INPUT" &&
      activeTagName !== "TEXTAREA" &&
      activeTagName !== "SELECT"
    ) {
      event.preventDefault();
      activateTab("planner-tab");
      elements.sublimationSearch.focus();
    }
  });
  document.querySelector("#optimize-button").addEventListener("click", () => {
    calculateAndRender();
    elements.slotGrid.animate(
      [
        { opacity: 0.55, transform: "translateY(4px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 360, easing: "ease-out" },
    );
  });
  document.querySelector("#reset-button").addEventListener("click", resetDemo);
}

function init() {
  getElements();
  bindEvents();
  bindTabs();
  renderEquipmentSlotOptions();
  renderStatsControls();
  renderCombinationList();
  renderSublimationPatternFilters();
  renderSublimationCatalog();
  renderEquipmentCatalog();
  renderBuildSummary();
  renderReference();
  initEquipmentGuide();
  calculateAndRender();
}

document.addEventListener("DOMContentLoaded", init);
