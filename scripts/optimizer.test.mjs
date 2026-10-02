import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function planner() {
  const context = vm.createContext({
    window: {}, localStorage: { getItem: () => null },
    document: { addEventListener() {} },
  });
  vm.runInContext(source, context);
  return vm.runInContext("({ state, calculateOptimization, SELECTABLE_STATS })", context);
}

function resistanceTotals(result) {
  const totals = {};
  for (const socket of result.assignments.flatMap((piece) => piece.sockets)) {
    assert.ok(!["Puntos de Vida (PdV)", "Iniciativa"].includes(socket.statName));
    if (!socket.statName.startsWith("Resistencia")) {
      assert.ok(socket.statName.startsWith("Dominio"));
      assert.equal(socket.multiplier, 2, "No debe asignar dominios ×1");
      assert.ok(socket.priority > 0, "Solo dominios elegidos");
      continue;
    }
    totals[socket.statName] = (totals[socket.statName] ?? 0) + socket.realValue;
  }
  return totals;
}

test("balances all four resistances with the requested colors and chest wildcard", () => {
  const app = planner();
  const result = app.calculateOptimization();
  assert.equal(result.assignments.length, 10);
  assert.equal(result.assignments.flatMap((piece) => piece.sockets).length, 40);
  assert.deepEqual(Object.values(resistanceTotals(result)), [1400, 1400, 1400, 1400]);
  for (const [slot, color] of Object.entries({ "Cinturón": "green", Botas: "red", Hombreras: "blue", Capa: "blue" })) {
    assert.ok(result.assignments.find((piece) => piece.slotName === slot).sockets.every((socket) => socket.colorId === color && socket.statName.startsWith("Resistencia")));
  }
  const chest = result.assignments.find((piece) => piece.slotName === "Coraza");
  assert.ok(chest.sockets.every((socket) => socket.statName.startsWith("Resistencia") && socket.multiplier === 2));
  assert.ok(app.SELECTABLE_STATS.every((name) => name.startsWith("Dominio")));
  const sockets = result.assignments.flatMap((piece) => piece.sockets);
  assert.equal(sockets.filter((socket) => socket.statName.startsWith("Dominio")).length, 4);
  assert.equal(sockets.filter((socket) => socket.statName.startsWith("Resistencia") && socket.multiplier === 1).length, 16);
});

test("damage weights and clearing priorities never displace resistance", () => {
  const app = planner();
  for (const stat of Object.keys(app.state.weights)) {
    app.state.weights[stat] = 100;
    app.state.slotValues[stat] = 999;
  }
  assert.deepEqual(Object.values(resistanceTotals(app.calculateOptimization())), [1200, 1200, 1200, 1200]);
  for (const stat of Object.keys(app.state.weights)) app.state.weights[stat] = 0;
  const cleared = app.calculateOptimization();
  assert.deepEqual(Object.values(resistanceTotals(cleared)), [1500, 1500, 1500, 1500]);
  assert.ok(cleared.assignments.flatMap((piece) => piece.sockets).every((socket) => socket.statName.startsWith("Resistencia")));
});

test("a forced belt pattern uses single resistances when damage has no double bonus", () => {
  const app = planner();
  app.state.combinations = [{ id: 1, target: "Cinturón", colors: ["red", "red", "red"] }];
  const result = app.calculateOptimization();
  const belt = result.assignments.find((piece) => piece.slotName === "Cinturón");
  assert.deepEqual(Array.from(belt.sockets.filter((socket) => socket.isFixed), (socket) => socket.colorId), ["red", "red", "red"]);
  assert.equal(belt.sockets.find((socket) => !socket.isFixed).colorId, "green");
  assert.ok(belt.sockets.every((socket) => socket.statName.startsWith("Resistencia")));
  const totals = Object.values(resistanceTotals(result));
  assert.ok(Math.max(...totals) - Math.min(...totals) <= 100);
  assert.equal(totals.reduce((sum, value) => sum + value, 0), 5300);
});

test("automatic patterns keep defense slots available before maximizing damage", () => {
  const app = planner();
  app.state.combinations = Array.from({ length: 5 }, (_, index) => ({ id: index + 1, target: "auto", colors: ["red", "red", "red"] }));
  const result = app.calculateOptimization();
  assert.equal(result.assignments.filter((piece) => piece.combinationId).length, 5);
  assert.equal(Object.values(resistanceTotals(result)).reduce((sum, value) => sum + value, 0), 5600);
  assert.ok(result.assignments.find((piece) => piece.slotName === "Casco").sockets.every((socket) => socket.statName === "Dominio Cuerpo a Cuerpo" && socket.isDouble));
});

test("ten mixed patterns preserve all colors, explicit rings, and deterministic results", () => {
  const app = planner();
  app.state.combinations = Array.from({ length: 10 }, (_, index) => ({
    id: index + 1, target: index < 2 ? `Anillo ${index + 1}` : "auto",
    colors: index % 2 ? ["blue", "green", "red"] : ["red", "blue", "blue"],
  }));
  const result = app.calculateOptimization();
  assert.equal(result.warnings.length, 0);
  for (const piece of result.assignments) {
    const combination = app.state.combinations.find((item) => item.id === piece.combinationId);
    assert.ok(combination);
    assert.deepEqual(Array.from(piece.sockets.filter((socket) => socket.isFixed), (socket) => socket.colorId), combination.colors);
    if (combination.target !== "auto") assert.equal(piece.slotName, combination.target);
  }
  resistanceTotals(result);
  assert.equal(JSON.stringify(result), JSON.stringify(app.calculateOptimization()));
});
