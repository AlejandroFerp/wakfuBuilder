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
const NUMBER_FORMATTER = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
});

const ALL_STATS = COLOR_IDS.flatMap((colorId) =>
  COLOR_DEFINITIONS[colorId].stats.map((stat) => stat.name),
);

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
  nextCombinationId: 4,
  result: null,
};

const elements = {};

function getElements() {
  elements.feedback = document.querySelector("#feedback");
  elements.statsControls = document.querySelector("#stats-controls");
  elements.combinationList = document.querySelector("#combination-list");
  elements.priorityCount = document.querySelector("#priority-count");
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

function getColorLabel(colorId) {
  return COLOR_DEFINITIONS[colorId]?.label ?? colorId;
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
  elements.statsControls.innerHTML = ALL_STATS.map((statName) => {
    const weight = state.weights[statName] ?? 0;
    const slotValue = state.slotValues[statName] ?? 0;
    const safeId = `stat-${statName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toLowerCase()}`;
    const slotValueId = `${safeId}-slot-value`;
    const activeClass = weight > 0 ? " is-active" : "";
    return `
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

function getCandidateColors() {
  return COLOR_IDS;
}

function compareChoices(first, second) {
  if (!second) {
    return first;
  }
  if (first.score !== second.score) {
    return first.score > second.score ? first : second;
  }
  if (first.isDouble !== second.isDouble) {
    return first.isDouble ? first : second;
  }
  if (first.priority !== second.priority) {
    return first.priority > second.priority ? first : second;
  }
  return first.colorId < second.colorId ? first : second;
}

function getBestChoiceForColor(colorId, slotName) {
  const candidates = getStatsForColor(colorId).map((statName) => {
    const priority = state.weights[statName] ?? 0;
    const slotValue = state.slotValues[statName] ?? 0;
    const isDouble = isDoubleStat(statName, slotName);
    const multiplier = isDouble ? 2 : 1;
    const realValue = slotValue * multiplier;
    return {
      colorId,
      statName,
      priority,
      slotValue,
      multiplier,
      isDouble,
      realValue,
      score: priority * realValue,
    };
  });

  return candidates.reduce((best, candidate) => compareChoices(candidate, best), null);
}

function getBestFreeChoice(slotName) {
  return getCandidateColors()
    .map((colorId) => getBestChoiceForColor(colorId, slotName))
    .reduce((best, candidate) => compareChoices(candidate, best), null);
}

function createAssignment(slotName, combination) {
  const socketChoices = combination
    ? combination.colors.map((colorId) => getBestChoiceForColor(colorId, slotName))
    : [];
  while (socketChoices.length < SOCKETS_PER_SLOT) {
    socketChoices.push(getBestFreeChoice(slotName));
  }
  const sockets = socketChoices.map((choice, index) => ({
    ...choice,
    socketIndex: index,
    isFixed: Boolean(combination && index < combination.colors.length),
  }));
  return {
    slotName,
    sockets,
    combinationId: combination?.id ?? null,
    fixedColors: combination?.colors ?? [],
    score: sockets.reduce((total, socket) => total + socket.score, 0),
  };
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
    initialAssignments.map((assignment) => [assignment.slotName, assignment.score]),
  );
  const usedSlots = new Set();

  for (const combination of explicit) {
    if (!EQUIPMENT_SLOTS.includes(combination.target) || usedSlots.has(combination.target)) {
      warnings.push(`La sublimación ${combination.id} no tiene un slot de destino disponible.`);
      continue;
    }
    const assignment = createAssignment(combination.target, combination);
    assignments.set(combination.target, assignment);
    usedSlots.add(combination.target);
  }

  let fixedDelta = 0;
  for (const slotName of usedSlots) {
    fixedDelta += assignments.get(slotName).score - (initialScores.get(slotName) ?? 0);
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
      const assignment = createAssignment(slotName, combination);
      const next = solveAutomatic(index + 1, usedMask | (1 << slotIndex));
      const candidate = {
        delta:
          assignment.score -
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
  const totalScore =
    initialAssignments.reduce((total, assignment) => total + assignment.score, 0) +
    fixedDelta +
    automaticSolution.delta;
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
            <span>· 1 libre</span>
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

  const prioritizedStats = ALL_STATS.filter((statName) => (state.weights[statName] ?? 0) > 0).sort(
    (first, second) => (state.weights[second] ?? 0) - (state.weights[first] ?? 0),
  );
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

function applyMeleePreset() {
  state.weights = {
    ...DEFAULT_WEIGHTS,
    "Dominio Cuerpo a Cuerpo": 100,
    "Dominio Berserker": 70,
    "Puntos de Vida (PdV)": 65,
    Esquiva: 35,
    "Resistencia a Tierra": 25,
  };
  renderStatsControls();
  calculateAndRender();
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
  state.nextCombinationId = 4;
  renderStatsControls();
  renderCombinationList();
  calculateAndRender();
}

function bindEvents() {
  document.querySelector("#add-combination").addEventListener("click", addCombination);
  document.querySelector("#preset-melee").addEventListener("click", applyMeleePreset);
  document.querySelector("#clear-priorities").addEventListener("click", clearPriorities);
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
  renderReference();
  calculateAndRender();
}

document.addEventListener("DOMContentLoaded", init);
