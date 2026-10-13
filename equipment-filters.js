(function (root) {
  const rarityStyles = { 'Común': 'common', 'Raro': 'rare', 'Mítico': 'mythic', 'Legendario': 'legendary', 'Épico': 'epic', 'Reliquia': 'relic', 'Recuerdo': 'memory' };
  function rarityClass(item) { return rarityStyles[item.rarityLabel] || 'common'; }
  function comparisonRarity(item) {
    return ['Legendario', 'Épico', 'Reliquia', 'Recuerdo'].includes(item.rarityLabel)
      ? 'Legendario / Épico / Reliquia / Recuerdo' : item.rarityLabel || 'Común';
  }
  const groups = [
    { label: 'Principales', stats: [
      ['health', 'PdV', 20], ['ap', 'PA', 31], ['wp', 'PW', 191], ['mp', 'PM', 41],
    ] },
    { label: 'Dominios y resistencias', stats: [
      ['mastery', 'Dominio elemental', 120], ['resistance', 'Resistencia elemental', 80],
      ['fireMastery', 'Dominio de fuego', 122], ['fireResistance', 'Resistencia al fuego', 82],
      ['waterMastery', 'Dominio de agua', 124], ['waterResistance', 'Resistencia al agua', 83],
      ['earthMastery', 'Dominio de tierra', 123], ['earthResistance', 'Resistencia a la tierra', 84],
      ['airMastery', 'Dominio de aire', 125], ['airResistance', 'Resistencia al aire', 85],
      ['randomMastery', 'Dominio en elementos aleatorios', 1068], ['randomResistance', 'Resistencia en elementos aleatorios', 1069],
    ] },
    { label: 'Combate', stats: [
      ['critical', 'Golpe crítico (%)', 150], ['block', 'Anticipación (%)', 875],
      ['initiative', 'Iniciativa', 171], ['range', 'Alcance', 160], ['dodge', 'Esquiva', 175],
      ['tackle', 'Placaje', 173], ['will', 'Voluntad', 177],
    ] },
    { label: 'Secundarias', stats: [
      ['criticalMastery', 'Dominio crítico', 149], ['criticalResistance', 'Resistencia crítica', 988],
      ['rearMastery', 'Dominio espalda', 180], ['rearResistance', 'Resistencia por la espalda', 71],
      ['melee', 'Dominio de melé', 1052], ['distance', 'Dominio distancia', 1053],
      ['givenArmor', 'Armadura dada (%)', 183], ['receivedArmor', 'Armadura recibida (%)', 185],
      ['healing', 'Dominio cura', 26], ['berserk', 'Dominio berserker', 1055],
    ] },
    { label: 'Otras características', stats: [
      ['wisdom', 'Sabiduría', 166], ['prospection', 'Prospección', 162], ['control', 'Control', 184],
    ] },
  ];
  const definitions = groups.flatMap(group => group.stats.map(([key, label, actionId]) => ({ key, label, actionId })));
  const positive = Object.fromEntries(definitions.map(stat => [stat.actionId, stat.key]));
  const negative = { 21: 20, 56: 31, 57: 41, 192: 191, 194: 191, 90: 80, 100: 80, 96: 84, 97: 82, 98: 83, 130: 120, 132: 122, 161: 160, 168: 150, 172: 171, 174: 173, 176: 175, 181: 180, 1056: 149, 1059: 1052, 1060: 1053, 1061: 1055, 1062: 988, 1063: 71, 876: 875 };
  function effectValue(effect, item) {
    const id = negative[effect.actionId] || effect.actionId;
    const match = effect.text.match(/^(-?\d+(?:[.,]\d+)?)/);
    let value = match ? Number(match[1].replace(',', '.')) :
      [1068, 1069].includes(id) ? Number(effect.params?.[0] || 0) + Number(effect.params?.[1] || 0) * item.level : 0;
    if (negative[effect.actionId]) value = -Math.abs(value);
    return { key: positive[id], value };
  }
  function statsFor(item, positiveOnly = false) {
    const stats = Object.fromEntries(definitions.map(stat => [stat.key, 0]));
    for (const effect of item.effects) {
      const { key, value } = effectValue(effect, item);
      if (!key) continue;
      if (positiveOnly && value < 0) continue;
      stats[key] += value;
    }
    // Universal bonuses apply to every element. Random bonuses do not guarantee a particular element.
    for (const element of ['fire', 'water', 'earth', 'air']) {
      stats[`${element}Mastery`] += stats.mastery;
      stats[`${element}Resistance`] += stats.resistance;
    }
    return stats;
  }
  const bracketEnds = [20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215, 230, 245];
  function bracketFor(level) {
    if (level === 0) return { min: 0, max: 0, label: 'Nivel 0' };
    const index = bracketEnds.findIndex(end => level <= end);
    const min = index < 0 ? 246 : index === 0 ? 1 : bracketEnds[index - 1] + 1;
    const max = index < 0 ? level : bracketEnds[index];
    return { min, max, label: `${min}–${max}` };
  }
  function elementCounts(item) {
    let randomCount = 0;
    let universal = false;
    const specific = new Set();
    for (const effect of item.effects) {
      if (effectValue(effect, item).value <= 0) continue;
      if (effect.actionId === 120) universal = true;
      if (effect.actionId === 1068) randomCount = Math.max(randomCount, Number(effect.params?.[2]) || 0);
      if ([122, 123, 124, 125].includes(effect.actionId)) specific.add(effect.actionId);
    }
    // A specific-element supplement does not make a multi-element item mono.
    const count = universal ? 4 : Math.max(randomCount, specific.size);
    return count ? [count] : [];
  }
  function profileFor(item) {
    const bonus = statsFor(item, true);
    const common = bonus.ap * 100 + bonus.mp * 75;
    const elemental = Math.max(bonus.fireMastery, bonus.waterMastery, bonus.earthMastery, bonus.airMastery) + bonus.randomMastery;
    const domains = [elemental, bonus.melee, bonus.distance, bonus.criticalMastery, bonus.rearMastery, bonus.berserk].filter(value => value > 0);
    // Devblog (1.81): reference weight 250, reduced to 200 for combined domains.
    const domainMultiplier = domains.length > 1 ? 200 / 250 : 1;
    const domainPoints = domains.reduce((sum, value) => sum + value, 0) * domainMultiplier;
    const offensive = common + bonus.dodge * .25 + bonus.critical * 15 + domainPoints;
    let randomResistance = 0;
    for (const effect of item.effects) {
      if (effect.actionId === 1069) randomResistance += Math.max(0, effectValue(effect, item).value) * Number(effect.params?.[2] || 0);
    }
    const defensive = common + bonus.block * 15 + bonus.tackle + bonus.dodge * .25 + bonus.fireResistance + bonus.waterResistance + bonus.earthResistance + bonus.airResistance + randomResistance + bonus.criticalResistance + bonus.rearResistance;
    const maluses = item.effects.flatMap(effect => {
      const value = effectValue(effect, item);
      return value.value < 0 ? [value.key || 'other'] : [];
    });
    return { offensive, defensive, domainMultiplier, domainPoints, elements: elementCounts(item), maluses: [...new Set(maluses)], bracket: bracketFor(item.level) };
  }
  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }
  function conditionsFor(item, source = {}) {
    return item.conditions || source.items?.[item.id] || [];
  }
  const conditionOptions = [
    { key: 'ap-max-11', label: 'PA ≤11', rules: [{ stat: 'ap', operator: '<=', value: 11 }] },
    { key: 'ap-min-13', label: 'PA ≥13', rules: [{ stat: 'ap', operator: '>=', value: 13 }] },
    { key: 'mp-max-5', label: 'PM ≤5', rules: [{ stat: 'mp', operator: '<=', value: 5 }] },
    { key: 'wp-max-4', label: 'PW ≤4', rules: [{ stat: 'wp', operator: '<=', value: 4 }] },
    { key: 'wp-min-8', label: 'PW ≥8', rules: [{ stat: 'wp', operator: '>=', value: 8 }] },
    { key: 'range-max-3', label: 'Alcance ≤3', rules: [{ stat: 'range', operator: '<=', value: 3 }] },
    { key: 'range-min-2', label: 'Alcance ≥2', rules: [{ stat: 'range', operator: '>=', value: 2 }] },
    { key: 'critical-max-25', label: 'Golpe crítico ≤25', rules: [{ stat: 'critical', operator: '<=', value: 25 }] },
    { key: 'critical-40-50', label: 'Golpe crítico entre 40 y 50', rules: [{ stat: 'critical', operator: '>=', value: 40 }, { stat: 'critical', operator: '<=', value: 50 }] },
    { key: 'block-max-20', label: 'Anticipación ≤20', rules: [{ stat: 'block', operator: '<=', value: 20 }] },
    { key: 'block-40-50', label: 'Anticipación entre 40 y 50', rules: [{ stat: 'block', operator: '>=', value: 40 }, { stat: 'block', operator: '<=', value: 50 }] },
    { key: 'tackle-400-500', label: 'Placaje entre 400 y 500', rules: [{ stat: 'tackle', operator: '>=', value: 400 }, { stat: 'tackle', operator: '<=', value: 500 }] },
    { key: 'tackle-500-600', label: 'Placaje entre 500 y 600', rules: [{ stat: 'tackle', operator: '>=', value: 500 }, { stat: 'tackle', operator: '<=', value: 600 }] },
    { key: 'dodge-500-600', label: 'Esquiva entre 500 y 600', rules: [{ stat: 'dodge', operator: '>=', value: 500 }, { stat: 'dodge', operator: '<=', value: 600 }] },
    { key: 'distance-400-500', label: 'Dominio distancia entre 400 y 500', rules: [{ stat: 'distance', operator: '>=', value: 400 }, { stat: 'distance', operator: '<=', value: 500 }] },
  ];
  function blank() {
    return { query: '', minLevel: null, maxLevel: null, rarities: [], types: [], acquisition: [], ranges: {}, sort: 'level-desc', page: 1,
      elements: [], negatives: 'any', negativeStats: [], conditionMode: 'any', conditionStats: [], conditionRules: [], conditionSelection: [], scoreMode: 'any' };
  }
  function invalid(filters) {
    if (filters.minLevel != null && filters.maxLevel != null && filters.minLevel > filters.maxLevel) return 'El nivel mínimo supera el máximo.';
    for (const [key, range] of Object.entries(filters.ranges)) {
      if (range.min != null && range.max != null && range.min > range.max) return `El mínimo de ${definitions.find(stat => stat.key === key)?.label || key} supera el máximo.`;
    }
    if (filters.conditionRules?.some(rule => rule.stat && rule.value == null)) return 'Introduce el umbral de cada condición seleccionada.';
    return '';
  }
  function createIndex(items, conditionSource = root.WAKFU_ITEM_CONDITIONS || {}) {
    const stats = new Map(items.map(item => [item.id, statsFor(item)]));
    const profiles = new Map(items.map(item => [item.id, profileFor(item)]));
    const conditions = new Map(items.map(item => [item.id, conditionsFor(item, conditionSource)]));
    let referenceKey = null;
    function updateReference(minLevel, maxLevel) {
      const min = minLevel ?? 0;
      const max = maxLevel ?? Math.max(0, ...items.map(item => item.level));
      const key = `${min}|${max}`;
      if (referenceKey === key) return;
      referenceKey = key;
      const buckets = new Map();
      for (const item of items) {
        if (item.level < min || item.level > max) continue;
        const profile = profiles.get(item.id);
        profile.referenceRarity = comparisonRarity(item);
        const bucketKey = JSON.stringify([item.itemTypeName, profile.referenceRarity]);
        const bucket = buckets.get(bucketKey) || [];
        bucket.push(profile);
        buckets.set(bucketKey, bucket);
      }
      for (const bucket of buckets.values()) {
        for (const axis of ['offensive', 'defensive']) {
          const values = bucket.map(profile => profile[axis]).sort((a, b) => a - b);
          const med = median(values);
          const ranks = new Map();
          for (let start = 0; start < values.length;) {
            let end = start + 1;
            while (end < values.length && values[end] === values[start]) end++;
            ranks.set(values[start], (start + (end - start) / 2) / values.length * 100);
            start = end;
          }
          for (const profile of bucket) {
            profile[`${axis}Median`] = med;
            profile[`${axis}Percentile`] = ranks.get(profile[axis]);
            profile.sampleSize = bucket.length;
            profile.referenceRange = `${min}–${max}`;
          }
        }
      }
    }
    updateReference(null, null);
    function search(filters) {
      if (invalid(filters)) return [];
      updateReference(filters.minLevel, filters.maxLevel);
      const terms = filters.query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(/\s+/).filter(Boolean);
      const result = items.filter(item => {
        if (!terms.every(term => item.searchText.includes(term))) return false;
        if (filters.minLevel != null && item.level < filters.minLevel || filters.maxLevel != null && item.level > filters.maxLevel) return false;
        if (filters.rarities.length && !filters.rarities.includes(item.rarityLabel)) return false;
        if (filters.types.length && !filters.types.includes(item.itemTypeName)) return false;
        if (filters.acquisition.length && !filters.acquisition.some(mode => mode === 'craft' ? item.recipes.length > 0 : mode === 'upgrade' ? item.recipes.some(recipe => recipe.isUpgrade) : item.recipes.length === 0)) return false;
        const profile = profiles.get(item.id);
        const rules = conditions.get(item.id);
        if (filters.elements?.length && !filters.elements.some(count => profile.elements.includes(Number(count)))) return false;
        if (filters.negatives === 'none' && profile.maluses.length || filters.negatives === 'with' && !profile.maluses.length) return false;
        if (filters.negativeStats?.length && !filters.negativeStats.some(key => profile.maluses.includes(key))) return false;
        if (filters.conditionMode === 'with' && !rules.length || filters.conditionMode === 'unrecorded' && rules.length) return false;
        if (filters.conditionStats?.length && !filters.conditionStats.every(key => rules.some(rule => rule.stat === key))) return false;
        if (filters.conditionSelection?.length && !conditionOptions.some(option => filters.conditionSelection.includes(option.key) && option.rules.every(bound => rules.some(rule => rule.stat === bound.stat && rule.operator === bound.operator && rule.value === bound.value)))) return false;
        if (filters.conditionRules?.some(filter => filter.stat && !rules.some(rule => rule.stat === filter.stat && rule.operator === filter.operator && rule.value === filter.value))) return false;
        if (['offensive', 'both'].includes(filters.scoreMode) && profile.offensive <= profile.offensiveMedian) return false;
        if (['defensive', 'both'].includes(filters.scoreMode) && profile.defensive <= profile.defensiveMedian) return false;
        return Object.entries(filters.ranges).every(([key, range]) => {
          const value = stats.get(item.id)[key];
          return value != null && (range.min == null || value >= range.min) && (range.max == null || value <= range.max);
        });
      });
      const sort = effectiveSort(filters);
      const statSort = sort.startsWith('stat:') ? sort.slice(5) : null;
      return result.sort((a, b) => {
        const name = a.name.localeCompare(b.name, 'es') || a.id - b.id;
        if (sort === 'score:both') return profiles.get(b.id).offensive + profiles.get(b.id).defensive - profiles.get(a.id).offensive - profiles.get(a.id).defensive || name;
        if (sort.startsWith('score:')) {
          const [axis, mode] = sort.slice(6).split('-');
          const key = mode === 'relative' ? `${axis}Percentile` : axis;
          return profiles.get(b.id)[key] - profiles.get(a.id)[key] || profiles.get(b.id)[axis] - profiles.get(a.id)[axis] || name;
        }
        if (statSort) return (stats.get(b.id)[statSort] || 0) - (stats.get(a.id)[statSort] || 0) || b.level - a.level || name;
        if (sort === 'name') return name;
        if (sort === 'level-asc') return a.level - b.level || name;
        if (sort === 'rarity') {
          const rank = { 'Común': 0, 'Raro': 1, 'Mítico': 2, 'Legendario': 3, 'Recuerdo': 4, 'Épico': 5, 'Reliquia': 6 };
          return (rank[b.rarityLabel] || 0) - (rank[a.rarityLabel] || 0) || b.level - a.level || name;
        }
        return b.level - a.level || name;
      });
    }
    return { search, stats, profiles, conditions };
  }
  function effectiveSort(filters) {
    return ['offensive', 'defensive', 'both'].includes(filters.scoreMode) ? `score:${filters.scoreMode}` : filters.sort;
  }
  root.WAKFU_EQUIPMENT_FILTERS = { groups, definitions, statsFor, blank, invalid, createIndex, effectValue, profileFor, bracketFor, bracketEnds, conditionsFor, conditionOptions, effectiveSort, rarityClass };
})(typeof window === 'undefined' ? globalThis : window);
