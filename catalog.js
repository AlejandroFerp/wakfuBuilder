/* Recipe links, rather than names, define equipment upgrades. */
(function (root) {
  function createCatalog(items) {
    const byId = new Map(items.map(item => [item.id, item]));
    const rank = new Map([[1, 0], [2, 0], [3, 1], [4, 2], [6, 3]]);
    const parents = new Map();
    const children = new Map();
    for (const item of items) {
      const links = [];
      for (const recipe of item.recipes) {
        const previous = recipe.isUpgrade ? recipe.ingredients.filter(ingredient => {
          const source = byId.get(ingredient.itemId);
          const sameType = source && (source.itemTypeId != null && item.itemTypeId != null
            ? source.itemTypeId === item.itemTypeId
            : source.itemTypeName === item.itemTypeName && JSON.stringify(source.positions) === JSON.stringify(item.positions));
          return sameType &&
            rank.has(source.rarity) && rank.has(item.rarity) && rank.get(source.rarity) < rank.get(item.rarity);
        }) : [];
        // Multiple equipment ingredients are not enough evidence for a unique upgrade lineage.
        const parent = previous.length === 1 ? byId.get(previous[0].itemId) : null;
        const step = { item, recipe, parent };
        links.push(step);
        if (parent) {
          const list = children.get(parent.id) || [];
          list.push(step);
          children.set(parent.id, list);
        }
      }
      parents.set(item.id, links.length ? links : [{ item, recipe: null, parent: null }]);
    }
    function chains(id) {
      if (!byId.has(id)) return [];
      function ancestors(item) {
        return parents.get(item.id).flatMap(step => step.parent
          ? ancestors(step.parent).map(path => [...path, step]) : [[step]]);
      }
      function descendants(item) {
        const next = children.get(item.id) || [];
        return next.length ? next.flatMap(step => descendants(step.item).map(path => [step, ...path])) : [[]];
      }
      return ancestors(byId.get(id)).flatMap(before => descendants(byId.get(id)).map(after => [...before, ...after]));
    }
    function requirements(chain) {
      const totals = new Map();
      const steps = new Array(chain.length);
      let needed = 1;
      function add(ingredient, quantity) {
        const entry = totals.get(ingredient.itemId) || { ...ingredient, quantity: 0 };
        entry.quantity += quantity;
        totals.set(ingredient.itemId, entry);
      }
      for (let index = chain.length - 1; index >= 0; index--) {
        const { item, recipe } = chain[index];
        const crafts = recipe ? Math.ceil(needed / Math.max(1, recipe.quantity)) : 0;
        const ingredients = recipe ? recipe.ingredients.map(entry => ({ ...entry, quantity: entry.quantity * crafts })) : [];
        steps[index] = { ...chain[index], needed, crafts, ingredients };
        if (!recipe) add({ itemId: item.id, name: item.name }, needed);
        const previousId = chain[index - 1]?.item.id;
        needed = 0;
        for (const ingredient of ingredients) {
          if (ingredient.itemId === previousId) needed += ingredient.quantity;
          else add(ingredient, ingredient.quantity);
        }
      }
      return { steps, totals: [...totals.values()].sort((a, b) => a.name.localeCompare(b.name, 'es')) };
    }
    return { chains, requirements };
  }
  root.WAKFU_CATALOG = { createCatalog };
})(typeof window === 'undefined' ? globalThis : window);
