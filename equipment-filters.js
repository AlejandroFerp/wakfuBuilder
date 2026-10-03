(function (root) {
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
  function statsFor(item) {
    const stats = Object.fromEntries(definitions.map(stat => [stat.key, 0]));
    for (const effect of item.effects) {
      const id = negative[effect.actionId] || effect.actionId;
      const key = positive[id];
      if (!key) continue;
      const match = effect.text.match(/^(-?\d+(?:[.,]\d+)?)/);
      let value = match ? Number(match[1].replace(',', '.')) :
        [1068, 1069].includes(id) ? Number(effect.params?.[0] || 0) + Number(effect.params?.[1] || 0) * item.level : 0;
      if (negative[effect.actionId]) value = -Math.abs(value);
      stats[key] += value;
    }
    // Universal bonuses apply to every element. Random bonuses do not guarantee a particular element.
    for (const element of ['fire', 'water', 'earth', 'air']) {
      stats[`${element}Mastery`] += stats.mastery;
      stats[`${element}Resistance`] += stats.resistance;
    }
    return stats;
  }
  function blank() {
    return { query: '', minLevel: null, maxLevel: null, rarities: [], types: [], acquisition: [], ranges: {}, sort: 'level-desc', page: 1 };
  }
  function invalid(filters) {
    if (filters.minLevel != null && filters.maxLevel != null && filters.minLevel > filters.maxLevel) return 'El nivel mínimo supera el máximo.';
    for (const [key, range] of Object.entries(filters.ranges)) {
      if (range.min != null && range.max != null && range.min > range.max) return `El mínimo de ${definitions.find(stat => stat.key === key)?.label || key} supera el máximo.`;
    }
    return '';
  }
  function createIndex(items) {
    const stats = new Map(items.map(item => [item.id, statsFor(item)]));
    function search(filters) {
      if (invalid(filters)) return [];
      const terms = filters.query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(/\s+/).filter(Boolean);
      const result = items.filter(item => {
        if (!terms.every(term => item.searchText.includes(term))) return false;
        if (filters.minLevel != null && item.level < filters.minLevel || filters.maxLevel != null && item.level > filters.maxLevel) return false;
        if (filters.rarities.length && !filters.rarities.includes(item.rarityLabel)) return false;
        if (filters.types.length && !filters.types.includes(item.itemTypeName)) return false;
        if (filters.acquisition.length && !filters.acquisition.some(mode => mode === 'craft' ? item.recipes.length > 0 : mode === 'upgrade' ? item.recipes.some(recipe => recipe.isUpgrade) : item.recipes.length === 0)) return false;
        return Object.entries(filters.ranges).every(([key, range]) => {
          const value = stats.get(item.id)[key];
          return value != null && (range.min == null || value >= range.min) && (range.max == null || value <= range.max);
        });
      });
      const statSort = filters.sort.startsWith('stat:') ? filters.sort.slice(5) : null;
      return result.sort((a, b) => {
        const name = a.name.localeCompare(b.name, 'es') || a.id - b.id;
        if (statSort) return (stats.get(b.id)[statSort] || 0) - (stats.get(a.id)[statSort] || 0) || b.level - a.level || name;
        if (filters.sort === 'name') return name;
        if (filters.sort === 'level-asc') return a.level - b.level || name;
        if (filters.sort === 'rarity') {
          const rank = { 'Común': 0, 'Raro': 1, 'Mítico': 2, 'Legendario': 3, 'Recuerdo': 4, 'Épico': 5, 'Reliquia': 6 };
          return (rank[b.rarityLabel] || 0) - (rank[a.rarityLabel] || 0) || b.level - a.level || name;
        }
        return b.level - a.level || name;
      });
    }
    return { search, stats };
  }
  root.WAKFU_EQUIPMENT_FILTERS = { groups, definitions, statsFor, blank, invalid, createIndex };
})(typeof window === 'undefined' ? globalThis : window);
