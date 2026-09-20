# Wakfu Builder

Color Forge es un optimizador local de huecos de encantamiento y un catálogo de objetos de Wakfu. El catálogo se genera desde el CDN oficial de Ankama y conserva la versión del juego con la que se creó.

## Uso

Abre `index.html` en un navegador. La aplicación permite buscar sublimaciones y objetos, equipar un set local y optimizar colores de huecos según las prioridades elegidas.

Los sets en preparación se guardan únicamente en `localStorage` del navegador. El catálogo incluye recetas e ingredientes extraídos del CDN oficial. No infiere precios, drops ni rutas no verificadas; cada ficha también enlaza a MethodWakfu para comprobar esas vías de obtención.

## Actualizar datos

Se necesita Node 18 o superior.

```powershell
node scripts/sync-game-data.mjs
node scripts/check-game-data.mjs
```

El primer script consulta `config.json` del CDN oficial, descarga la versión declarada y genera:

- `data/game-data.json`: catálogo detallado para consultas y futuros cálculos.
- `data/game-data.js`: catálogo compacto que carga la web.
- `data/manifest.json`: versión, cobertura, cantidades y hashes.
- `sublimations-data.js`: catálogo de sublimaciones reconciliado por ID oficial.

La acción programada de GitHub repite la sincronización diariamente cuando el repositorio se publique con el workflow incluido.

## Consultar datos desde terminal

```powershell
node scripts/query-game-data.mjs status
node scripts/query-game-data.mjs item "dominio distancia"
node scripts/query-game-data.mjs sublimation "Medida III"
node scripts/query-game-data.mjs get 31739
```

La salida es JSON para que pueda consumirse desde herramientas de asistente, scripts y futuras integraciones locales.

## Fuentes y límites

- Datos base: `https://wakfu.cdn.ankama.com/gamedata/config.json`.
- Objetos y estadísticas: export de `items.json` de la versión declarada.
- Consulta externa de obtención: `https://db.methodwakfu.com/items/{id}`.

Los efectos simples se muestran a partir de las descripciones oficiales de acciones. Algunos efectos condicionados del juego tienen una sintaxis que no puede resumirse sin interpretar reglas adicionales; se conservan como texto de referencia y no se usan todavía para declarar un óptimo de daño.
