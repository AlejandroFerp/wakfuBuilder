# Mejoras del catálogo

- [x] Devolver Buscar sublimaciones al optimizador (incluido el atajo /).
- [x] Mover Set en preparación al lugar del buscador en la segunda pestaña.
- [x] Eliminar Reglas del cálculo.
- [x] Mostrar estadísticas completas en filas con iconos y valores separados del título.
- [x] Investigar iconos de objetos y estadísticas de ZenithWakfu.
- [x] Desplegar la cadena de mejoras de fabricación dentro de cada ficha.
- [x] Mostrar componentes por paso y totales sin contar dos veces las piezas intermedias.
- [x] Verificar recetas alternativas, objetos sin receta y cadenas con Recuerdo (12 pruebas correctas).
- [x] Revisión visual del catálogo completada en navegador al añadir los filtros.

La cadena debe seguir las relaciones reales de ingredientes de las recetas oficiales, no agrupar objetos solo por nombre. Los totales corresponden a fabricar una unidad del último paso mostrado; las piezas intermedias se fabrican o se obtienen en el paso anterior. No expandir árboles de fabricación de otros componentes.

Iconos de estadísticas guardados localmente (34). Las imágenes de objetos se sirven desde ZenithWakfu y dependen de su disponibilidad. Efectos especiales sin interpretación fiable se identifican como tales y remiten a la ficha externa.

## Filtros basados en las capturas del juego y snapshot.html

- [x] Nivel mínimo y máximo; varias rarezas y tipos de equipo.
- [x] Fabricación, mejora y sin receta registrada, según los datos disponibles.
- [x] 36 características con límites mínimo y máximo, agrupadas e ilustradas con iconos.
- [x] Valores netos con malus; cero cuando no existe la característica; elementos universales separados de aleatorios.
- [x] Resumen de filtros activos, eliminación individual y limpieza completa.
- [x] Orden por nivel, nombre, rareza o característica y paginación de todo el catálogo.
- [x] 18 pruebas correctas. Verificación en navegador de rangos combinados, rareza, tipo, aviso por rango invertido, limpieza y cambio de página.

Ejemplo verificado: niveles 51–80, PA ≥1, dominio distancia ≥20 → 13 resultados; añadir Mítico y Hacha (Dos manos) → Trirreme. Sin filtros: 7.819 objetos, 435 páginas de 18.

## Perfiles y requisitos de equipamiento (13 de octubre)

- [x] Registro comunitario de 59 objetos con requisitos, con fuente y límite de cobertura visibles.
- [x] Selección de condiciones concretas, por ejemplo PA ≤11 o placaje ≥500.
- [x] Filtros con/sin estadísticas negativas y por malus concreto, sin confundirlos con los requisitos del personaje.
- [x] Mono, bi, tri y todos los elementos según bonus positivos.
- [x] Índices ofensivo/defensivo con PA ×100, PM ×75, crítico/anticipación ×15; esquiva ×0,25 en ambos perfiles; sin PdV ni cura ni penalizaciones por malus. Dominios combinados ponderados ×0,8 (peso 200/250 del devblog).
- [x] Medianas y percentiles por tipo dentro del intervalo mínimo/máximo de niveles. Sin selector adicional de franjas. Los perfiles filtran sobre la mediana y ordenan por puntos descendentes automáticamente.
- [x] 24 pruebas correctas, incluida cobertura del catálogo completo.
- [ ] Revisión visual de los nuevos controles: el navegador integrado no está disponible en esta sesión.

Correcciones posteriores verificadas: objetos con dominio trielemental y un suplemento de fuego/agua no entran en mono. Regresiones con Garras de Ignemikhal y Escamas de Aguabrial. En niveles 120–155, el perfil ofensivo pasa de 1.669 a 808 resultados y mantiene puntuación descendente. La mediana cambia con los límites de nivel y permanece estable al apilar los demás filtros.
