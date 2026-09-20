import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [command = "status", ...terms] = process.argv.slice(2);
const query = terms.join(" ").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const [dataSource, sublimationSource, manifestSource] = await Promise.all([
    readFile(resolve(projectDirectory, "data/game-data.json"), "utf8"),
    readFile(resolve(projectDirectory, "sublimations-data.js"), "utf8"),
    readFile(resolve(projectDirectory, "data/manifest.json"), "utf8"),
  ]);
  const data = JSON.parse(dataSource);
  const sublimations = JSON.parse(
    sublimationSource.match(/window\.COLOR_FORGE_SUBLIMATIONS\s*=\s*(\[.*\]);?\s*$/s)?.[1] ?? "[]",
  );
  const manifest = JSON.parse(manifestSource);

  if (command === "status") {
    print(manifest);
    return;
  }
  if (command === "item") {
    print(data.equipment.filter((item) => item.searchText.includes(query)).slice(0, 20));
    return;
  }
  if (command === "sublimation") {
    print(sublimations.filter((item) => item.searchText.includes(query)).slice(0, 20));
    return;
  }
  if (command === "get") {
    const id = Number(terms[0]);
    const item = data.equipment.find((entry) => entry.id === id) ?? sublimations.find((entry) => entry.id === id);
    print(item ?? { error: `No existe un objeto o sublimación con ID ${id}.` });
    return;
  }
  throw new Error("Uso: query:data [status|item <texto>|sublimation <texto>|get <id>]");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
