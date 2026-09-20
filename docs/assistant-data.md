# Consultas de datos para asistentes

El proyecto expone los datos generados desde el CDN oficial en archivos locales y una interfaz de línea de comandos. Cualquier recomendación debe indicar la versión de `data/manifest.json` y distinguir los datos oficiales de las rutas de obtención externas.

## Fuente de verdad local

- `data/game-data.json`: objetos equipables, efectos interpretados, posiciones, huecos y recetas.
- `sublimations-data.js`: sublimaciones, patrones, estado asociado y recetas.
- `data/manifest.json`: versión de Wakfu, fechas, cobertura y hashes.

## Comandos

```powershell
node scripts/query-game-data.mjs status
node scripts/query-game-data.mjs item "dominio distancia"
node scripts/query-game-data.mjs sublimation "Medida III"
node scripts/query-game-data.mjs get 31739
```

La salida es JSON. `get` busca tanto objetos como sublimaciones por ID oficial. Las recetas incluidas proceden del CDN de Ankama y contienen cantidades e ingredientes; los nombres de materiales se resuelven desde `jobsItems.json` cuando corresponde.

## Reglas de respuesta

- Para una recomendación de build, pedir o declarar clase, nivel, rol, elementos, PA/PM/alcance requeridos, modo de juego y presupuesto.
- No sumar ni optimizar como permanentes los efectos condicionales que aún no tienen una regla interpretada.
- Citar la versión de datos y señalar cuando la respuesta dependa de MethodWakfu u otra fuente externa.
- Para drops, cofres, croupiers y estelas, abrir la ficha externa indicada por `https://db.methodwakfu.com/items/{id}`. La extracción automática de esas rutas todavía no está integrada porque no hay una API pública confirmada.
- No asumir que un objeto está disponible en todos los servidores ni que su precio es conocido.
