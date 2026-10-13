(function (root) {
  const prefix = 'WFB1.';
  function encode(build) {
    const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, items: build.equippedItems, combinations: build.combinations, weights: build.weights, values: build.slotValues }));
    return prefix + btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  }
  function decode(code, catalog) {
    const fail = () => { throw new Error('Código de set inválido o incompatible. El set actual se conserva.'); };
    const text = String(code).trim();
    if (!text.startsWith(prefix) || text.length > 30000 || !/^[\w-]+$/.test(text.slice(prefix.length))) fail();
    let data;
    try {
      const raw = text.slice(prefix.length).replaceAll('-', '+').replaceAll('_', '/');
      data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(raw), char => char.charCodeAt(0))));
    } catch { fail(); }
    const object = value => value && typeof value === 'object' && !Array.isArray(value);
    if (data?.v !== 1 || !object(data.items) || !Array.isArray(data.combinations) || data.combinations.length > 10) fail();
    const equippedItems = {};
    for (const [slot, id] of Object.entries(data.items)) {
      const item = catalog.items.find(item => item.id === id);
      if (!catalog.slots.includes(slot) || !item || !item.positions.includes(slot)) fail();
      equippedItems[slot] = id;
    }
    const combinations = data.combinations.map((entry, index) => {
      if (!object(entry) || !['auto', ...catalog.targets].includes(entry.target) || !Array.isArray(entry.colors) || entry.colors.length !== 3 || entry.colors.some(color => !['red', 'blue', 'green'].includes(color))) fail();
      const result = { id: index + 1, target: entry.target, colors: [...entry.colors] };
      if (entry.sublimationId != null) {
        const sub = catalog.sublimations.find(sub => sub.id === entry.sublimationId);
        if (!sub || sub.pattern.length !== 3 || sub.pattern.some((color, index) => color !== entry.colors[index])) fail();
        result.sublimationId = sub.id;
        result.sublimationName = sub.name;
      }
      return result;
    });
    function numbers(value, max) {
      if (!object(value) || Object.keys(value).length !== catalog.stats.length) fail();
      const result = {};
      for (const stat of catalog.stats) {
        if (!Object.hasOwn(value, stat) || !Number.isFinite(value[stat]) || value[stat] < 0 || value[stat] > max) fail();
        result[stat] = value[stat];
      }
      return result;
    }
    return { equippedItems, combinations, weights: numbers(data.weights, 100), slotValues: numbers(data.values, 999) };
  }
  root.WAKFU_BUILD_CODE = { encode, decode };
})(typeof window === 'undefined' ? globalThis : window);
