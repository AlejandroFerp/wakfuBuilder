# Wakfu Builder

Wakfu Builder es un optimizador local de huecos de encantamiento y un catálogo de objetos de Wakfu. El catálogo se genera desde el CDN oficial de Ankama y conserva la versión del juego con la que se creó.

## Uso

Abre `index.html` en un navegador. La aplicación permite buscar sublimaciones y objetos, equipar un set local y optimizar colores de huecos según las prioridades elegidas.

Los sets en preparación se guardan únicamente en `localStorage` del navegador. El catálogo incluye recetas e ingredientes extraídos del CDN oficial. No infiere precios, drops ni rutas no verificadas; cada ficha también enlaza a MethodWakfu para comprobar esas vías de obtención.

Las pestañas superiores separan el optimizador de la guía de encantamientos y su referencia de bonus.

El buscador de sublimaciones está en el optimizador. La segunda pestaña contiene el set y los objetos. Cada ficha muestra todas las estadísticas y permite desplegar la fabricación y sus mejoras enlazadas por ingredientes oficiales (Raro, Mítico, Legendario y Recuerdo cuando existe). Las recetas alternativas se eligen en el desplegable. Los totales calculan una unidad del último paso, respetan cantidades por fabricación y excluyen las piezas intermedias ya fabricadas. Los componentes secundarios no se expanden en un árbol de recetas. Una pieza sin receta se cuenta como objeto que debe obtenerse por otra vía.

La búsqueda de objetos ofrece niveles mínimo y máximo, varias rarezas y tipos a la vez, recetas de fabricación o mejora y rangos de 36 características agrupadas. Todas las características deben cumplirse; dentro de rarezas, tipos u obtención basta una opción. Una característica ausente vale cero y los malus se restan. El bonus elemental universal se incluye al filtrar un elemento concreto; los bonus en elementos aleatorios se filtran aparte porque no garantizan un elemento determinado. Los rangos invertidos muestran un aviso. Los filtros activos se pueden quitar individualmente o limpiar todos. La ordenación incluye nombre, nivel, rareza y cada característica, con paginación de 18 objetos para acceder al catálogo completo. Los filtros de monstruos, botín, cofres y croupiers no están disponibles en el export oficial usado aquí.

Los iconos de estadísticas se conservan en `assets/stats/`; las imágenes de objetos se cargan desde ZenithWakfu por el identificador gráfico de Ankama. Si una imagen no está disponible, la ficha sigue mostrando su nombre y sus datos. Para actualizar el mapa de iconos: `node scripts/sync-catalog-icons.mjs ruta/items.json ruta/zenith-filters.json`. El segundo archivo procede de `https://api.zenithwakfu.com/builder/api/filters` (cabecera `X-Requested-With: XMLHttpRequest`). Los recursos gráficos pertenecen a sus respectivos autores; fuentes: Ankama y ZenithWakfu.

El cálculo reserva primero todos los huecos que permiten resistencia ×2: cinturón verde, botas rojas, hombreras y capa azules, y coraza como comodín. Los dominios seleccionados solo se asignan donde reciben ×2. Todos los huecos restantes se dedican a resistencias, también ×1, equilibrando los cuatro elementos. Nunca asigna dominios ×1, vida, iniciativa, esquiva ni placaje. El selector solo contiene dominios. Las resistencias usan una base común de 100 para comparar el reparto; los valores base de los dominios se pueden ajustar.

Las sublimaciones conservan el orden de sus colores y sus destinos explícitos. Para destinos automáticos, el motor maximiza primero los huecos de resistencia ×2 y después mejora el equilibrio intercambiando destinos automáticos. No promete una búsqueda exhaustiva de todas las combinaciones globales.

Para ejecutar las pruebas del reparto: `npm test`.

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
