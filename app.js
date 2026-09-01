const COLOR_DEFINITIONS = {
  red: {
    label: "Rojo",
    short: "R",
    className: "red",
    stats: [
      {
        name: "Dominio Cuerpo a Cuerpo",
        doubleSlots: ["Casco", "Botas", "Capa", "Armas a dos manos"],
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
        doubleSlots: ["Casco"],
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
        doubleSlots: ["Anillos"],
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
        doubleSlots: ["Anillos"],
      },
      {
        name: "Iniciativa",
        doubleSlots: ["Collar", "Capa"],
      },
      {
        name: "Dominio de Espalda",
        doubleSlots: ["Botas"],
      },
      {
        name: "Voluntad",
        doubleSlots: [],
      },
      {
        name: "Resistencia a Fuego",
        doubleSlots: ["Coraza"],
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
  "Anillos",
];
const SOCKETS_PER_SLOT = 4;
const FIXED_PATTERN_SIZE = 3;
const MAX_COMBINATIONS = 9;
const OPTIMIZER_RESTARTS = 24;
const NUMBER_FORMATTER = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
});
const SUBLIMATION_CATALOG = Array.isArray(window.COLOR_FORGE_SUBLIMATIONS)
  ? window.COLOR_FORGE_SUBLIMATIONS
  : [];
const SUBLIMATION_RESULTS_LIMIT = 18;

const ALL_STATS = COLOR_IDS.flatMap((colorId) =>
  COLOR_DEFINITIONS[colorId].stats.map((stat) => stat.name),
);

const DOMAIN_STATS = new Set(
  ALL_STATS.filter((statName) => statName.startsWith("Dominio")),
);

const RESISTANCE_STATS = new Set(
  ALL_STATS.filter((statName) => statName.startsWith("Resistencia")),
);

const EXTRA_STATS = new Set(
  ALL_STATS.filter(
    (statName) =>
      !DOMAIN_STATS.has(statName) && !RESISTANCE_STATS.has(statName),
  ),
);

const STAT_GROUP_LABELS = {
  attack: "Ataque · Dominios",
  defense: "Defensa · Resistencias",
  extras: "Extras",
};
const STAT_GROUP_ORDER = {
  attack: 0,
  defense: 1,
  extras: 2,
};

const STAT_ORDER = [
  ...ALL_STATS.filter((statName) => DOMAIN_STATS.has(statName)),
  ...ALL_STATS.filter((statName) => RESISTANCE_STATS.has(statName)),
  ...ALL_STATS.filter((statName) => EXTRA_STATS.has(statName)),
];

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
    "Puntos de Vida (PdV)": 65,
    Esquiva: 35,
    "Resistencia a Tierra": 25,
  },
  slotValues: { ...DEFAULT_SLOT_VALUES },
  combinations: [
    { id: 1, target: "auto", colors: ["red", "red", "red"] },
    { id: 2, target: "auto", colors: ["red", "green", "green"] },
    { id: 3, target: "auto", colors: ["blue", "blue", "blue"] },
  ],
  sublimationQuery: "",
  nextCombinationId: 4,
  result: null,
};

const elements = {};

function getElements() {
  elements.feedback = document.querySelector("#feedback");
  elements.statsControls = document.querySelector("#stats-controls");
  elements.combinationList = document.querySelector("#combination-list");
  elements.priorityCount = document.querySelector("#priority-count");
  elements.sublimationSearch = document.querySelector("#sublimation-search");
  elements.sublimationResults = document.querySelector("#sublimation-results");
  elements.sublimationCount = document.querySelector("#sublimation-count");
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
  if (terms.length === 0) {
    return SUBLIMATION_CATALOG;
  }
  return SUBLIMATION_CATALOG.filter((sublimation) => {
    const searchableText = normalizeSearchText(sublimation.searchText);
    return terms.every((term) => searchableText.includes(term));
  });
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
  const visibleMatches = matches.slice(0, SUBLIMATION_RESULTS_LIMIT);
  const resultLabel = matches.length === 1 ? "resultado" : "resultados";
  elements.sublimationCount.textContent = `${matches.length} ${resultLabel}`;

  if (matches.length === 0) {
    elements.sublimationResults.innerHTML = `
      <div class="catalog-empty">
        No hay sublimaciones que coincidan con esa búsqueda.
        Prueba con una palabra del efecto, una condición o "épica"/"reliquia".
      </div>
    `;
    return;
  }

  const limitMessage =
    matches.length > SUBLIMATION_RESULTS_LIMIT
      ? `<p class="catalog-limit">Mostrando ${SUBLIMATION_RESULTS_LIMIT} de ${matches.length}. Sigue escribiendo para afinar la búsqueda.</p>`
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
  elements.statsControls.innerHTML = STAT_ORDER.map((statName, statIndex) => {
    const weight = state.weights[statName] ?? 0;
    const slotValue = state.slotValues[statName] ?? 0;
    const statGroup = getStatGroup(statName);
    const previousGroup =
      statIndex > 0 ? getStatGroup(STAT_ORDER[statIndex - 1]) : null;
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

function renderCombinationList() {
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
  }
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

function getCandidateColors() {
  return COLOR_IDS;
}

function compareChoices(first, second) {
  if (!second) {
    return first;
  }
  if (first.optimizationScore !== second.optimizationScore) {
    return first.optimizationScore > second.optimizationScore ? first : second;
  }
  if (first.isDouble !== second.isDouble) {
    return first.isDouble ? first : second;
  }
  if (first.priority !== second.priority) {
    return first.priority > second.priority ? first : second;
  }
  return first.colorId < second.colorId ? first : second;
}

function getChoicesForColor(colorId, slotName) {
  return getStatsForColor(colorId).map((statName) => {
    const priority = state.weights[statName] ?? 0;
    const slotValue = state.slotValues[statName] ?? 0;
    const isDouble = isDoubleStat(statName, slotName);
    const multiplier = isDouble ? 2 : 1;
    const realValue = slotValue * multiplier;
    const optimizationScore = isDomainStat(statName)
      ? priority * realValue
      : priority * multiplier;
    return {
      colorId,
      statName,
      priority,
      slotValue,
      multiplier,
      isDouble,
      realValue,
      optimizationScore,
      score: priority * realValue,
    };
  });
}

function getChoicesForAllowedColors(colorIds, slotName) {
  const choices = colorIds.flatMap((colorId) =>
    getChoicesForColor(colorId, slotName),
  );
  const prioritizedChoices = choices.filter((choice) => choice.priority > 0);
  return prioritizedChoices.length > 0 ? prioritizedChoices : choices;
}

function getBestChoiceForColor(colorId, slotName) {
  const candidates = getChoicesForColor(colorId, slotName);
  return candidates.reduce((best, candidate) => compareChoices(candidate, best), null);
}

function getBestFreeChoice(slotName) {
  return getCandidateColors()
    .map((colorId) => getBestChoiceForColor(colorId, slotName))
    .reduce((best, candidate) => compareChoices(candidate, best), null);
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
    optimizationScore: sockets.reduce(
      (total, socket) => total + socket.optimizationScore,
      0,
    ),
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
      candidate.optimizationScore > best.optimizationScore ||
      (candidate.optimizationScore === best.optimizationScore && windowStart === preferredStart)
    ) {
      best = candidate;
    }
  }
  return best;
}

function recalculateAssignment(assignment) {
  assignment.optimizationScore = assignment.sockets.reduce(
    (total, socket) => total + socket.optimizationScore,
    0,
  );
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

function getCombatObjective(assignments, config) {
  const groupTotals = Object.fromEntries(
    config.activeGroups.map((group) => [group, 0]),
  );
  const resistanceTotals = Object.fromEntries(
    config.activeResistanceStats.map((statName) => [statName, 0]),
  );
  let weightedScore = 0;
  let prioritizedSocketCount = 0;

  for (const assignment of assignments) {
    for (const socket of assignment.sockets) {
      weightedScore += socket.score;
      prioritizedSocketCount += Number(socket.priority > 0);
      const group = getStatGroup(socket.statName);
      if (group && config.activeGroupSet.has(group)) {
        groupTotals[group] += socket.realValue;
      }
      if (group === "defense" && config.activeResistanceSet.has(socket.statName)) {
        resistanceTotals[socket.statName] += socket.realValue;
      }
    }
  }

  const missingGroups = config.activeGroups.reduce(
    (total, group) => total + Number(groupTotals[group] === 0),
    0,
  );
  const groupRatios =
    missingGroups === 0
      ? config.activeGroups.map(
          (group) => groupTotals[group] / config.groupWeights[group],
        )
      : [];
  const groupError =
    missingGroups === 0
      ? Math.max(...groupRatios) - Math.min(...groupRatios)
      : Infinity;
  const resistanceError =
    config.activeResistanceStats.length > 1 && groupTotals.defense > 0
      ? config.activeResistanceStats.reduce(
          (total, statName) =>
            total +
            Math.abs(
              resistanceTotals[statName] / groupTotals.defense -
                config.resistanceTarget[statName],
            ),
          0,
        )
      : config.activeResistanceStats.length > 1
        ? Infinity
        : 0;

  return {
    missingGroups,
    groupError,
    resistanceError,
    prioritizedSocketCount,
    weightedScore,
  };
}

function compareCombatObjectives(first, second) {
  if (first.missingGroups !== second.missingGroups) {
    return first.missingGroups < second.missingGroups ? 1 : -1;
  }
  if (first.groupError !== second.groupError) {
    return first.groupError < second.groupError ? 1 : -1;
  }
  if (first.resistanceError !== second.resistanceError) {
    return first.resistanceError < second.resistanceError ? 1 : -1;
  }
  if (first.prioritizedSocketCount !== second.prioritizedSocketCount) {
    return first.prioritizedSocketCount > second.prioritizedSocketCount ? 1 : -1;
  }
  if (first.weightedScore !== second.weightedScore) {
    return first.weightedScore > second.weightedScore ? 1 : -1;
  }
  return 0;
}

function balanceResistanceDistribution(assignments, config) {
  if (config.activeResistanceStats.length < 2) {
    return;
  }

  const resistanceSockets = assignments.flatMap((assignment) =>
    assignment.sockets
      .filter((socket) => config.activeResistanceSet.has(socket.statName))
      .map((socket) => ({ assignment, socket })),
  );
  const currentDefenseTotal = resistanceSockets.reduce(
    (total, entry) => total + entry.socket.realValue,
    0,
  );
  if (resistanceSockets.length === 0 || currentDefenseTotal === 0) {
    return;
  }

  const targetTotals = Object.fromEntries(
    config.activeResistanceStats.map((statName) => [
      statName,
      currentDefenseTotal * config.resistanceTarget[statName],
    ]),
  );
  const totals = Object.fromEntries(
    config.activeResistanceStats.map((statName) => [statName, 0]),
  );

  resistanceSockets.sort((first, second) => {
    if (first.socket.isFixed !== second.socket.isFixed) {
      return first.socket.isFixed ? -1 : 1;
    }
    return first.socket.realValue - second.socket.realValue;
  });

  for (const entry of resistanceSockets) {
    const allowedColorIds = entry.socket.isFixed
      ? [entry.socket.colorId]
      : COLOR_IDS;
    const choices = allowedColorIds
      .flatMap((colorId) => getChoicesForColor(colorId, entry.assignment.slotName))
      .filter((choice) => config.activeResistanceSet.has(choice.statName));
    let bestChoice = null;
    let bestBalanceError = Infinity;

    for (const choice of choices) {
      const projectedError = config.activeResistanceStats.reduce(
        (total, statName) => {
          const projectedTotal =
            totals[statName] +
            (choice.statName === statName ? choice.realValue : 0);
          return (
            total +
            Math.abs(projectedTotal / targetTotals[statName] - 1)
          );
        },
        0,
      );
      if (
        !bestChoice ||
        projectedError < bestBalanceError ||
        (projectedError === bestBalanceError &&
          choice.optimizationScore > bestChoice.optimizationScore)
      ) {
        bestChoice = choice;
        bestBalanceError = projectedError;
      }
    }

    if (!bestChoice) {
      continue;
    }
    const socketIndex = entry.socket.socketIndex;
    const isFixed = entry.socket.isFixed;
    Object.assign(entry.socket, bestChoice, { socketIndex, isFixed });
    totals[bestChoice.statName] += bestChoice.realValue;
  }

  refineResistanceDistribution(assignments, config);
  improveResistancePairs(assignments, config);
}

function getResistanceTotals(assignments, config) {
  const totals = Object.fromEntries(
    config.activeResistanceStats.map((statName) => [statName, 0]),
  );
  for (const assignment of assignments) {
    for (const socket of assignment.sockets) {
      if (config.activeResistanceSet.has(socket.statName)) {
        totals[socket.statName] += socket.realValue;
      }
    }
  }
  return totals;
}

function getResistanceBalanceError(totals, targetTotals, config) {
  return config.activeResistanceStats.reduce(
    (total, statName) =>
      total + Math.abs(totals[statName] / targetTotals[statName] - 1),
    0,
  );
}

function refineResistanceDistribution(assignments, config) {
  const resistanceEntries = assignments.flatMap((assignment) =>
    assignment.sockets
      .filter((socket) => config.activeResistanceSet.has(socket.statName))
      .map((socket) => ({ assignment, socket })),
  );
  const currentDefenseTotal = resistanceEntries.reduce(
    (total, entry) => total + entry.socket.realValue,
    0,
  );
  if (resistanceEntries.length === 0 || currentDefenseTotal === 0) {
    return;
  }

  const targetTotals = Object.fromEntries(
    config.activeResistanceStats.map((statName) => [
      statName,
      currentDefenseTotal * config.resistanceTarget[statName],
    ]),
  );
  let currentError = getResistanceBalanceError(
    getResistanceTotals(assignments, config),
    targetTotals,
    config,
  );

  for (let pass = 0; pass < 12; pass += 1) {
    let changed = false;
    for (const entry of resistanceEntries) {
      const originalSocket = { ...entry.socket };
      const allowedColorIds = entry.socket.isFixed
        ? [entry.socket.colorId]
        : COLOR_IDS;
      const choices = allowedColorIds
        .flatMap((colorId) =>
          getChoicesForColor(colorId, entry.assignment.slotName),
        )
        .filter((choice) => config.activeResistanceSet.has(choice.statName));
      let bestChoice = null;
      let bestError = currentError;

      for (const choice of choices) {
        Object.assign(entry.socket, originalSocket);
        Object.assign(entry.socket, choice, {
          socketIndex: originalSocket.socketIndex,
          isFixed: originalSocket.isFixed,
        });
        const candidateTotals = getResistanceTotals(assignments, config);
        const candidateError = getResistanceBalanceError(
          candidateTotals,
          targetTotals,
          config,
        );
        if (
          candidateError < bestError ||
          (candidateError === bestError &&
            choice.optimizationScore >
              (bestChoice?.optimizationScore ??
                originalSocket.optimizationScore))
        ) {
          bestChoice = choice;
          bestError = candidateError;
        }
      }

      if (bestChoice) {
        Object.assign(entry.socket, bestChoice, {
          socketIndex: originalSocket.socketIndex,
          isFixed: originalSocket.isFixed,
        });
        currentError = bestError;
        changed = true;
      } else {
        Object.assign(entry.socket, originalSocket);
      }
    }
    if (!changed) {
      break;
    }
  }
}

function improveResistancePairs(assignments, config) {
  const resistanceEntries = assignments.flatMap((assignment) =>
    assignment.sockets
      .filter((socket) => config.activeResistanceSet.has(socket.statName))
      .map((socket) => ({ assignment, socket })),
  );
  if (resistanceEntries.length < 2) {
    return;
  }

  let currentObjective = getCombatObjective(assignments, config);
  for (let pass = 0; pass < 6; pass += 1) {
    let bestMove = null;
    let bestObjective = currentObjective;

    for (let firstIndex = 0; firstIndex < resistanceEntries.length; firstIndex += 1) {
      const firstEntry = resistanceEntries[firstIndex];
      const firstOriginal = { ...firstEntry.socket };
      const firstColors = firstEntry.socket.isFixed
        ? [firstEntry.socket.colorId]
        : COLOR_IDS;
      const firstChoices = firstColors
        .flatMap((colorId) =>
          getChoicesForColor(colorId, firstEntry.assignment.slotName),
        )
        .filter((choice) => config.activeResistanceSet.has(choice.statName));

      for (
        let secondIndex = firstIndex + 1;
        secondIndex < resistanceEntries.length;
        secondIndex += 1
      ) {
        const secondEntry = resistanceEntries[secondIndex];
        const secondOriginal = { ...secondEntry.socket };
        const secondColors = secondEntry.socket.isFixed
          ? [secondEntry.socket.colorId]
          : COLOR_IDS;
        const secondChoices = secondColors
          .flatMap((colorId) =>
            getChoicesForColor(colorId, secondEntry.assignment.slotName),
          )
          .filter((choice) =>
            config.activeResistanceSet.has(choice.statName),
          );

        for (const firstChoice of firstChoices) {
          Object.assign(firstEntry.socket, firstChoice, {
            socketIndex: firstOriginal.socketIndex,
            isFixed: firstOriginal.isFixed,
          });
          for (const secondChoice of secondChoices) {
            Object.assign(secondEntry.socket, secondChoice, {
              socketIndex: secondOriginal.socketIndex,
              isFixed: secondOriginal.isFixed,
            });
            const candidateObjective = getCombatObjective(assignments, config);
            if (
              compareCombatObjectives(candidateObjective, bestObjective) > 0
            ) {
              bestMove = {
                firstEntry,
                firstOriginal,
                firstChoice,
                secondEntry,
                secondOriginal,
                secondChoice,
              };
              bestObjective = candidateObjective;
            }
            Object.assign(secondEntry.socket, secondOriginal);
          }
          Object.assign(firstEntry.socket, firstOriginal);
        }
      }
    }

    if (!bestMove) {
      break;
    }

    Object.assign(bestMove.firstEntry.socket, bestMove.firstChoice, {
      socketIndex: bestMove.firstOriginal.socketIndex,
      isFixed: bestMove.firstOriginal.isFixed,
    });
    Object.assign(bestMove.secondEntry.socket, bestMove.secondChoice, {
      socketIndex: bestMove.secondOriginal.socketIndex,
      isFixed: bestMove.secondOriginal.isFixed,
    });
    currentObjective = bestObjective;
  }
}

function optimizeCombatAssignments(assignments) {
  const activeDomainStats = STAT_ORDER.filter(
    (statName) => isDomainStat(statName) && (state.weights[statName] ?? 0) > 0,
  );
  const activeResistanceStats = STAT_ORDER.filter(
    (statName) => isResistanceStat(statName) && (state.weights[statName] ?? 0) > 0,
  );
  const activeExtraStats = STAT_ORDER.filter(
    (statName) => EXTRA_STATS.has(statName) && (state.weights[statName] ?? 0) > 0,
  );
  const statsByGroup = {
    attack: activeDomainStats,
    defense: activeResistanceStats,
    extras: activeExtraStats,
  };
  const groupWeights = {};
  const activeGroups = [];
  for (const [group, stats] of Object.entries(statsByGroup)) {
    if (stats.length === 0) {
      continue;
    }
    activeGroups.push(group);
    groupWeights[group] =
      stats.reduce(
        (total, statName) => total + (state.weights[statName] ?? 0),
        0,
      ) / stats.length;
  }

  if (activeGroups.length === 0) {
    return;
  }

  const defensePriorityTotal = activeResistanceStats.reduce(
    (total, statName) => total + (state.weights[statName] ?? 0),
    0,
  );
  const config = {
    activeGroups,
    activeGroupSet: new Set(activeGroups),
    groupWeights,
    activeResistanceSet: new Set(activeResistanceStats),
    activeResistanceStats,
    resistanceTarget: Object.fromEntries(
      activeResistanceStats.map((statName) => [
        statName,
        defensePriorityTotal > 0
          ? (state.weights[statName] ?? 0) / defensePriorityTotal
          : 0,
      ]),
    ),
  };
  const choiceSets = assignments.map((assignment) =>
    assignment.sockets.map((socket) => {
      const allowedColorIds = socket.isFixed ? [socket.colorId] : COLOR_IDS;
      return getChoicesForAllowedColors(allowedColorIds, assignment.slotName);
    }),
  );
  const snapshotAssignments = () =>
    assignments.map((assignment) =>
      assignment.sockets.map((socket) => ({ ...socket })),
    );
  const restoreAssignments = (snapshot) => {
    assignments.forEach((assignment, assignmentIndex) => {
      assignment.sockets.forEach((socket, socketIndex) => {
        Object.assign(socket, snapshot[assignmentIndex][socketIndex]);
      });
    });
  };
  const baselineSnapshot = snapshotAssignments();
  let randomSeed = 0x9e3779b9;
  const nextRandom = () => {
    randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
    return randomSeed / 4294967296;
  };
  const improveCurrentAssignments = () => {
    let currentObjective = getCombatObjective(assignments, config);

    for (let pass = 0; pass < 12; pass += 1) {
      let changed = false;

      assignments.forEach((assignment, assignmentIndex) => {
        assignment.sockets.forEach((socket, socketIndex) => {
          const originalSocket = { ...socket };
          let bestChoice = null;
          let bestObjective = currentObjective;

          for (const choice of choiceSets[assignmentIndex][socketIndex]) {
            Object.assign(socket, originalSocket);
            Object.assign(socket, choice, {
              socketIndex: originalSocket.socketIndex,
              isFixed: originalSocket.isFixed,
            });
            const candidateObjective = getCombatObjective(assignments, config);
            if (
              compareCombatObjectives(candidateObjective, bestObjective) > 0
            ) {
              bestChoice = choice;
              bestObjective = candidateObjective;
            }
          }

          if (bestChoice) {
            Object.assign(socket, bestChoice, {
              socketIndex: originalSocket.socketIndex,
              isFixed: originalSocket.isFixed,
            });
            currentObjective = bestObjective;
            changed = true;
          } else {
            Object.assign(socket, originalSocket);
          }
        });
      });

      if (!changed) {
        break;
      }
    }

    return currentObjective;
  };
  let bestSnapshot = snapshotAssignments();
  let bestOverallObjective = getCombatObjective(assignments, config);

  for (let restart = 0; restart < OPTIMIZER_RESTARTS; restart += 1) {
    restoreAssignments(baselineSnapshot);
    if (restart > 0) {
      assignments.forEach((assignment, assignmentIndex) => {
        assignment.sockets.forEach((socket, socketIndex) => {
          const choices = choiceSets[assignmentIndex][socketIndex];
          const choice = choices[Math.floor(nextRandom() * choices.length)];
          Object.assign(socket, choice, {
            socketIndex,
            isFixed: socket.isFixed,
          });
        });
      });
    }

    const candidateObjective = improveCurrentAssignments();
    if (compareCombatObjectives(candidateObjective, bestOverallObjective) > 0) {
      bestOverallObjective = candidateObjective;
      bestSnapshot = snapshotAssignments();
    }
  }

  restoreAssignments(bestSnapshot);
  assignments.forEach(recalculateAssignment);
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
      assignment.optimizationScore,
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
      const terminal = { delta: 0, placements: [], unplaced: [] };
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
        delta: 0,
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
        delta:
          assignment.optimizationScore -
          (initialScores.get(slotName) ?? 0) +
          next.delta,
        placements: [{ slotName, combination, assignment }, ...next.placements],
        unplaced: next.unplaced,
      };
      if (
        !best ||
        candidate.delta > best.delta ||
        (candidate.delta === best.delta &&
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
  optimizeCombatAssignments(resolvedAssignments);
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
  const prioritizedStats = ALL_STATS.filter((statName) => (state.weights[statName] ?? 0) > 0);
  const totalSockets = result.assignments.length * SOCKETS_PER_SLOT;
  const activeSockets = result.assignments.flatMap((assignment) => assignment.sockets).length;
  elements.metricScore.textContent = `${formatNumber(result.totalScore)} pts`;
  elements.metricScoreCaption.textContent =
    prioritizedStats.length > 0
      ? `${prioritizedStats.length} stats ponderadas`
      : "Sin prioridades, se usa orden estable";
  elements.metricDoubles.textContent = formatNumber(result.doubleCount);
  elements.metricPriorities.textContent = formatNumber(prioritizedStats.length);
  elements.metricPrioritiesCaption.textContent =
    prioritizedStats.length > 0 ? "Influyen directamente en el score" : "Activa sliders para enfocar el calculo";
  elements.metricSlots.textContent = `${activeSockets} / ${totalSockets}`;
  elements.scorePill.textContent = formatNumber(result.totalScore);
  elements.priorityCount.textContent = `${prioritizedStats.length} activas`;
}

function renderSlotGrid(result) {
  elements.slotGrid.innerHTML = result.assignments
    .map((assignment, index) => {
      const isFixed = Boolean(assignment.combinationId);
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
            <span>Sublimación</span>
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
            <span class="slot-score">${formatNumber(assignment.score)} pts</span>
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

  const prioritizedStats = STAT_ORDER.filter(
    (statName) => (state.weights[statName] ?? 0) > 0,
  ).sort((first, second) => {
    const groupDifference =
      STAT_GROUP_ORDER[getStatGroup(first)] -
      STAT_GROUP_ORDER[getStatGroup(second)];
    if (groupDifference !== 0) {
      return groupDifference;
    }
    return (state.weights[second] ?? 0) - (state.weights[first] ?? 0);
  });
  const statsToShow =
    prioritizedStats.length > 0
      ? prioritizedStats
      : ALL_STATS.filter((statName) => statSummary[statName].effectiveCount > 0).slice(0, 5);

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
    "Puntos de Vida (PdV)": 65,
    Esquiva: 35,
    "Resistencia a Tierra": 25,
  };
  state.slotValues = { ...DEFAULT_SLOT_VALUES };
  state.combinations = [
    { id: 1, target: "auto", colors: ["red", "red", "red"] },
    { id: 2, target: "auto", colors: ["red", "green", "green"] },
    { id: 3, target: "auto", colors: ["blue", "blue", "blue"] },
  ];
  state.sublimationQuery = "";
  state.nextCombinationId = 4;
  elements.sublimationSearch.value = "";
  renderStatsControls();
  renderCombinationList();
  renderSublimationCatalog();
  calculateAndRender();
}

function bindEvents() {
  document.querySelector("#add-combination").addEventListener("click", addCombination);
  document.querySelector("#clear-priorities").addEventListener("click", clearPriorities);
  elements.sublimationSearch.addEventListener("input", (event) => {
    state.sublimationQuery = event.currentTarget.value;
    renderSublimationCatalog();
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
  renderStatsControls();
  renderCombinationList();
  renderSublimationCatalog();
  renderReference();
  calculateAndRender();
}

document.addEventListener("DOMContentLoaded", init);
