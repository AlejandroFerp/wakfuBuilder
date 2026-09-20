# Plan de implementación — Wakfu Builder

Fecha: 19-09-2026. Estado: propuesta de implementación; no implica funciones ya implementadas.

## Objetivo

Convertir Color Forge en un builder de sets por personaje con catálogo consultable, datos actualizables, optimización de encantamientos y rutas de obtención trazables. Compartir el mismo modelo de datos entre la aplicación y las consultas de un asistente, evitando mantener dos bases diferentes.

## Punto de partida comprobado

- Repositorio: https://github.com/AlejandroFerp/wakfuBuilder, rama main.
- Aplicación HTML/CSS/JavaScript con cuatro archivos; catálogo local de 467 sublimaciones en la revisión consultada.
- Medida III ya existe: objeto 31739, épica. Su ausencia en una interfaz concreta requiere comprobar despliegue, caché y búsqueda; no justifica duplicar el registro.
- El optimizador actual representa nueve categorías, agrupa los anillos, trabaja con rojo/azul/verde y cuatro huecos por categoría. No constituye todavía un builder completo de objetos equipados.
- La carpeta local solo contiene .git. Antes de implementar, obtener una copia del repositorio y registrar el commit de partida sin sobrescribir trabajo del usuario.
- El CDN de Ankama respondió con versión 1.92.1.60 durante la investigación. Es la versión del export consultado, no una garantía de que coincida siempre con el último parche jugable.
- Los states.json oficiales consultados aportan nombres de estados, pero no bastan para reconstruir todos los textos y cálculos de sublimaciones.

## Arquitectura propuesta

Monorepositorio TypeScript, frontend con Vite y React, importadores Node.js, SQLite como catálogo normalizado local y snapshots JSON versionados para la web. Confirmar las dependencias y sus versiones al implementar. Mantener el diseño visual actual mientras se sustituye progresivamente el motor.

```text
apps/web/                 catálogo, personajes, sets y comparación
packages/domain/         objetos, equipo, reglas y cálculo compartidos
packages/data/           esquema, consultas y repositorios
packages/optimizer/      objetivos, restricciones y solver
packages/assistant/      herramientas de consulta local/MCP
scripts/sync/            adaptadores, normalización y validaciones
data/manifests/          versión, fuentes, hashes y cobertura
data/snapshots/          exportaciones publicadas para la web
docs/                    reglas, fuentes, contratos y ejemplos
tests/fixtures/          casos reales con resultados comprobados
```

La web usará snapshots sin necesitar un servidor permanente. SQLite permitirá consultas locales complejas y alimentará la interfaz del asistente. Los sets personales se guardarán inicialmente en IndexedDB con exportación/importación JSON y versión de esquema. La sincronización de datos del juego no modificará los sets del usuario.

## Fuentes y política de confianza

| Información | Fuente inicial | Verificación necesaria |
| --- | --- | --- |
| IDs, nombres multilingües, niveles, tipos, rarezas, efectos numéricos, patrones | CDN de Ankama | Validar esquema, versión y cobertura real de cada export |
| Recetas e ingredientes | Exports oficiales de recetas | Comprobar relaciones, cantidades, profesión y existencia de archivos |
| Textos y reglas de sublimaciones | Datos oficiales cuando existan; contraste comunitario | Conservar condiciones, nivel del estado y límite de acumulación por separado |
| Drops, monstruos, mazmorras, cofres y croupiers | MethodWakfu y otras fuentes comunitarias contrastables | Investigar API/export disponible, licencia, estructura, parche y acceso permitido |
| Guías y contexto de obtención | MethodWakfu, wiki y guías oficiales | Referencia complementaria; no convertir prosa ambigua en datos confirmados |
| Precios y disponibilidad comercial | Sin fuente automática confirmada | Presupuesto introducido por el usuario; no inventar precios actuales |

Referencias:

- https://wakfu.cdn.ankama.com/gamedata/config.json
- https://wakfu.cdn.ankama.com/gamedata/1.92.1.60/items.json
- https://www.wakfu.com/en/forum/332-development/236779-json-data
- https://db.methodwakfu.com/items
- https://www.wakfu.nexus/
- https://wakfu.wiki.gg/wiki/Enchantment
- https://gitlab.com/MathiusD/wakdata
- https://github.com/CharlyRien/wakfu-autobuilder

MethodWakfu muestra relaciones de obtención en fichas consultadas, pero no se ha confirmado una API pública reutilizable. WakfuDB mostraba una versión anterior en el resultado consultado; no tratarlo como actualizado por defecto. Los accesos web pueden fallar o requerir JavaScript. La fase de investigación debe resolver estas limitaciones antes de prometer cobertura automática completa.

Cada dato incorporará sourceUrl, sourceVersion si existe, fetchedAt, verifiedAt cuando proceda y estado de verificación. La fecha de descarga no equivale a la fecha del parche. Las discrepancias se conservarán para revisión; no se resolverán únicamente por ser la última descarga.

## Modelo de datos

- Item: ID oficial, traducciones, nivel, rareza, tipo, slots compatibles, restricciones, efectos, estados aplicados y propiedades de encantamiento.
- Effect: actionId, parámetros originales, fórmula interpretada, condiciones y estado supported/unsupported. Conservar el dato original para auditar signos, escalados y traducciones.
- Sublimation: itemId, stateId, categoría normal/épica/reliquia, patrón ordenado, nivel aportado, familia de acumulación, máximo acumulable, condiciones y efectos. El III del nombre no determina automáticamente el nivel del estado.
- EnchantmentRule: color, estadística, nivel, valor, coste y piezas con bonificación. Reglas versionadas; blancos como comodines con su tratamiento explícito.
- Acquisition: itemId, método, entidad origen, zona, ubicación o coordenadas cuando existan, cantidades/coste, condiciones, restricciones, probabilidad si está documentada y procedencia.
- Recipe y RecipeIngredient: resultado, cantidad producida, ingredientes, profesión, nivel y restricciones. Admitir recetas alternativas y detectar ciclos.
- Character: clase, nivel real/modulado, rol, elementos, aptitudes y bonificaciones externas explícitas.
- Build: personaje, objetos por slot, elementos elegidos, encantamientos, sublimaciones, escenario de combate y versión de datos.
- BuildItem: ID de objeto más personalización de esa pieza. No confundir dos copias equipadas del mismo objeto con una única entidad.
- DatasetManifest: versiones de fuentes, fecha de generación, hashes, cantidades, validación, cobertura y limitaciones.

Las ubicaciones desconocidas se mostrarán como desconocidas. La presencia en un export no implica disponibilidad actual en juego: modelar objetos antiguos, temporales o de disponibilidad no confirmada.

## Fase 0 — Copia reproducible y auditoría

1. Recuperar el repositorio, comprobar historial y guardar el commit base.
2. Ejecutar la aplicación y reproducir la búsqueda de Medida III.
3. Inventariar efectos incompletos, placeholders, duplicados y diferencias con el export oficial por ID.
4. Documentar reglas actuales y separar datos, cálculo y presentación.

Aceptación: aplicación reproducible, diagnóstico de búsqueda y reporte de diferencias. No cambiar datos que ya coincidan sin motivo documentado.

## Fase 1 — Actualización automática y catálogo fiable

1. Implementar adaptador oficial que consulte config.json y descargue una única versión consistente de los archivos necesarios.
2. Conservar snapshots originales con hashes; usar caché y no descargar versiones idénticas sin necesidad.
3. Normalizar objetos, sublimaciones y recetas sin ejecutar texto remoto como código.
4. Generar SQLite, JSON y manifiesto desde el mismo proceso.
5. Validar IDs únicos, referencias, tipos, nombres, patrones, fórmulas y diferencias inesperadas de cobertura.
6. Publicar el snapshot de forma atómica solo si pasa validaciones. Mantener el último válido y un informe si falla.
7. Añadir búsqueda por nombre ES/EN/FR/PT, ID, alias y acentos; filtros por nivel, tipo, rareza, estadísticas y sublimaciones.
8. Mostrar versión, fuente y advertencias de datos incompletos en las fichas donde sean relevantes.

Aceptación: Medida III localizable, catálogo regenerable con un comando y fallo de red sin pérdida de datos. Las fórmulas desconocidas quedan visibles y fuera de afirmaciones de cálculo completo.

## Fase 2 — Dónde conseguir cada objeto

1. Realizar una prueba de extracción con diez objetos representativos: drop, receta, mejora, croupier, misión, cofre, evento y sublimaciones de distintos tipos.
2. Elegir adaptadores según acceso público permitido, estabilidad, granularidad y versión. Preferir API o export documentado; extracción HTML solo cuando sea viable y permitida.
3. Almacenar obtención como relaciones: objeto → receta/monstruo/croupier → zona/mazmorra. Mantener múltiples rutas.
4. Resolver materiales recursivamente considerando cantidades producidas y existencias introducidas por el usuario.
5. Mostrar restricciones: dificultad, estela, misión previa, moneda, servidor o evento únicamente cuando estén verificadas.
6. Separar probabilidad base publicada de probabilidad efectiva; evitar estimaciones de tiempo de farmeo sin datos suficientes.
7. Incorporar una lista de objetivos para sets con alternativas de obtención y materiales compartidos.

Aceptación: cada ruta enlaza su fuente, los casos de prueba coinciden con ella y la falta de cobertura no se presenta como imposibilidad de conseguir el objeto. Si no existe fuente accesible para un método, entregar la cobertura disponible y registrar el método pendiente.

## Fase 3 — Builder completo por personaje

1. Modelar slots equipables reales: dos anillos independientes, combinaciones de armas a una/dos manos y segunda mano; accesorios, mascota y montura según reglas verificadas.
2. Seleccionar objetos, variantes, elementos, encantamientos y sublimaciones por pieza.
3. Validar nivel, exclusiones de armas, límites de épica/reliquia, requisitos de objetos y reglas de duplicados.
4. Calcular estadísticas con desglose de origen: equipo, aptitudes, runas, sublimaciones y buffs.
5. Distinguir estadísticas permanentes de efectos al inicio de combate, condicionales o temporales. No sumar condiciones incompatibles simultáneamente.
6. Guardar varios personajes y sets; duplicar, comparar, exportar e importar.
7. Avisar si una actualización cambia un objeto o invalida un set y permitir consultar su snapshot anterior.

Aceptación: sets de referencia cotejados con el juego; discrepancias identificadas por efecto. Un set inválido no se etiqueta como equipable. Guardar y recuperar conserva toda la personalización.

## Fase 4 — Optimización de huecos y sets

Dos problemas independientes con motor compartido:

### Una pieza

- Entradas: objeto, número y orden real de huecos, colores/blancos, nivel de encantamiento, sublimación requerida, stats objetivo y cambios permitidos.
- Enumerar combinaciones legales y respetar el orden de patrones y las ventanas verificadas.
- Aplicar bonus dobles, límites por nivel del objeto y costes documentados.
- Devolver la mejor opción y alternativas explicando ganancia, pérdida y cambios necesarios.
- Distinguir mantener huecos actuales de permitir recolorear/reordenar/aumentar huecos. No dar coste esperado de operaciones aleatorias sin probabilidades verificadas.

### Un set

- Entradas: clase, nivel, rol, elementos, objetos disponibles/bloqueados, requisitos mínimos de PA/PM/alcance/resistencias y objetivo.
- Primera versión: maximizar estadísticas cuantificables con restricciones explícitas y efectos soportados.
- Prefiltrar candidatos y descartar objetos dominados solo cuando sus restricciones y efectos permitan demostrarlo.
- Ejecutar en Worker para mantener la interfaz usable; soportar cancelación y progreso.
- Empezar con búsqueda acotada y medir. Evaluar solver de restricciones o servicio local si el tamaño real lo exige.
- Etiquetar resultado como mejor encontrado o óptimo demostrado según el método y el espacio explorado.
- Proponer alternativas ofensivas/defensivas y comparación de tradeoffs.
- Añadir daño por clase y rotación en una fase posterior con pasivas, hechizos y condiciones modelados y verificados. Más dominio no equivale automáticamente a mayor daño efectivo.

Aceptación: óptimos contrastados por enumeración exhaustiva en problemas pequeños; ninguna violación de equipo, patrones o acumulación. Benchmarks reproducibles antes de fijar promesas de rendimiento.

## Fase 5 — Datos utilizables por el asistente

Construir una interfaz de consulta sobre la misma SQLite y el mismo motor, primero CLI con salida JSON y después servidor MCP local de solo lectura cuando el entorno lo permita:

```text
search_items(query, filters)
get_item(itemId, datasetVersion?)
search_sublimations(query, filters)
get_sublimation(itemId)
get_acquisition(itemId, server?, datasetVersion?)
get_recipe_tree(itemId, quantity, ownedMaterials?)
get_build(buildId)
validate_build(build)
compare_builds(buildA, buildB, scenario?)
optimize_item(request)
recommend_build(request)
get_data_status()
```

Cada resultado devolverá datos estructurados, versión, fuentes, condiciones, cobertura y limitaciones del cálculo. Las consultas serán parametrizadas, con límites de resultados y acceso a sets personales solo mediante la integración local configurada.

Documentar instalación y ejemplos en AGENTS.md y docs/assistant.md. Estos archivos ayudan a descubrir los datos, pero no dan acceso por sí solos: el asistente necesita herramientas conectadas o acceso al workspace. No prometer memoria universal entre conversaciones ni acceso automático al IndexedDB del navegador. Implementar exportación/sincronización local explícita de los sets que se quieran consultar.

Aceptación mediante preguntas reales:

- «¿Dónde consigo Medida III?» → ID correcto, rutas verificadas y fuentes; si no hay cobertura, indicarlo.
- «Este casco tiene rojo/azul/blanco/verde, ¿qué me conviene?» → pedir o usar objetivo, respetar huecos y explicar alternativas.
- «Crea un set de Ocra nivel 155 con 12 PA y 6 PM» → set legal con restricciones, supuestos y versión; si no es viable, explicar los requisitos incompatibles.
- «¿Qué gano cambiando este anillo?» → delta completo y condiciones que cambian.

## Fase 6 — Automatización operativa

- Un comando de sincronización ejecuta descarga, normalización, pruebas de datos, diff y exportación.
- CI prueba los cambios de código. Job programado diario consulta novedades; programación y despliegue se configurarán durante implementación, no en este plan.
- Actualizaciones compatibles publican snapshots automáticamente una vez configurado el destino. Rupturas de esquema, caída anormal de registros o contradicciones bloquean el snapshot nuevo y producen un informe.
- Versionar esquema y migraciones, registrar duración y cobertura, conservar snapshots recuperables y probar recuperación.
- No insertar texto comunitario como instrucciones para el asistente; tratarlo como datos con procedencia.
- Precios o texto ilegible no se completan mediante estimaciones silenciosas. La automatización debe fallar de forma explícita y conservar la última información válida.

Aceptación: dos ejecuciones con la misma entrada producen el mismo contenido normalizado, interrupciones no dejan publicaciones parciales y una fuente caída no borra datos válidos.

## Orden de entrega

| Entrega | Contenido | Dependencias |
| --- | --- | --- |
| A | Auditoría, importador oficial, catálogo y consulta CLI inicial | Fases 0–1 |
| B | Fichas de obtención y materiales | Fase 2; cobertura según adaptadores confirmados |
| C | Personajes, sets y comparación | Fase 3 sobre A |
| D | Optimización de una pieza y sets con objetivos estáticos | Fase 4 sobre C |
| E | Consultas de builds y optimización por MCP/CLI | Fase 5 ampliada sobre B–D |
| F | Operación programada y recuperación verificadas | Fase 6; controles de calidad presentes desde A |

La investigación de obtención puede avanzar en paralelo al builder. La consulta básica del asistente se entrega con A; no necesita esperar al optimizador completo.

## Pruebas y riesgos prioritarios

- Datos: traducciones ausentes, IDs retirados, objetos antiguos, efectos desconocidos, cambios de esquema y endpoints incompletos.
- Reglas: signos negativos, escalado por nivel, dos anillos, segunda mano, blancos, efectos condicionales y máximos por familia de sublimación.
- Obtención: unidades de probabilidades, recetas alternativas, ciclos, cantidades producidas, eventos terminados y restricciones de servidor.
- Experiencia: búsqueda rápida, guardar/importar sets, actualización de datos y explicación entendible de resultados.
- Riesgo principal: cobertura de condiciones y obtención. La aplicación debe exponer exactamente qué conoce antes de ofrecer recomendaciones concluyentes.

## Definición de terminado

El usuario puede buscar objetos y sublimaciones, consultar fuentes y obtención conocida, crear y guardar sets legales por personaje, comparar cambios, optimizar una pieza y generar sets bajo restricciones soportadas. El asistente puede realizar esas consultas con los mismos datos y reglas. El catálogo se actualiza por código, conserva versiones y nunca convierte información faltante en hechos inventados.
