# Handoff: Casa en Orden · diseño visual (dirección 2b "Jardín de cempasúchil")

## Resumen
Diseño visual de la PWA familiar Casa en Orden (dos personas, celular primero, es-MX). **Este paquete cubre solo el diseño**: tokens, componentes, pantallas y movimiento. El comportamiento y las reglas de cada función están en el documento de features aparte; si algo choca, manda el documento de features en lo funcional y este README en lo visual.

## Sobre los archivos
Los `.dc.html` son **referencias de diseño hechas en HTML**: muestran el aspecto final. No son código de producción para copiar. Hay que recrearlos en el stack de la app con sus propios patrones. Para verlos, abre cualquier `.dc.html` en el navegador (necesita `support.js` en la misma carpeta). Cada archivo muestra claro y oscuro.

- `Sistema 2b.dc.html`: tokens, paleta de persona, tipografía y componentes con sus estados.
- `Pantallas 2b - Principales.dc.html`: Inicio (más su primer uso), Calendario mes y semana, Pendientes (con aviso de rutina), Súper, Compras y Mejoras.
- `Pantallas 2b - Organizacion.dc.html`: Más, Comidas, Niños, Fechas, Planes, Notas, Contactos, Revisión y el cierre de la revisión.
- `Pantallas 2b - Estados y tablet.dc.html`: hoja de captura (normal y con teclado), inicio de sesión, sin acceso, cargando, sin conexión, solo lectura, error, estados vacíos, y la versión a 768 px de Inicio, Calendario y Comidas.
- `tokens.css` / `tokens.json`: la fuente de verdad de los valores. Mantienen los nombres de token del brief.

## Fidelidad
**Alta fidelidad.** Colores, tipografía, medidas, radios y copy son finales. Los íconos son SVG de trazo de 1.8–2.2 px en una caja de 24 px; se pueden reemplazar por un set equivalente de trazo uniforme (Lucide o Phosphor Regular, por ejemplo) sin emojis.

## Idea visual
Un patio con macetas: verde bosque tranquilo y un solo color audaz, el **cempasúchil (`--sun`)**, reservado para "hoy" (día en el calendario y la tira de la semana) y para el cierre de la revisión semanal. En Inicio y en el login, un círculo grande de `--sun-soft` asoma desde la esquina superior derecha; es el único elemento decorativo.

## Tipografía
- **Young Serif** (Google Fonts, solo 400) para títulos y números grandes. Alternativa: `Georgia, serif`.
- **Instrument Sans** (400–700) para todo lo demás. Alternativa: `system-ui`.
- Escala (px, tamaño/alto de línea):
  - display-xl 38/40
  - display-l 30/34 (título de pantalla)
  - display-m 24/28 (título de grupo)
  - display-s 20/24
  - producto 17/22 en 500
  - título de fila 16/22 en 600
  - cuerpo 16/22
  - pequeño 14/20
  - meta 13/18 en `--muted`
  - eyebrow 12/16 en 700, +0.08em, mayúsculas
  - navegación 11/14 (500; 700 si está activa)
- Horas, montos y conteos con `font-variant-numeric: tabular-nums`. Los campos de captura siempre van a 16 px o más.

## Color
Valores en `tokens.css`. Reglas:
- Fondo `--bg`. Las tarjetas son `--surface` con borde de 1 px en `--line`, sin sombra. Los divisores internos de fila usan `--tint`.
- `--accent` (verde) para acciones primarias, enlaces y la navegación activa.
- Atrasado: tarjeta o grupo entero en `--danger-soft`, texto en `--danger` y siempre el ícono "!". Hoy o pronto: `--warn-soft`/`--warn` con ícono de reloj. Hecho: `--ok-soft`/`--ok` con palomita. Nunca se comunica solo con color.
- **Oscuro (diseñado, no invertido):** verde noche. Las superficies se aclaran al subir de nivel (`bg` #0C1914 → `surface` #132620 → `tint` #1A3128). El acento pasa a menta #7FD3A8 con texto oscuro encima. El cempasúchil se mantiene encendido.
- El tema sigue a `prefers-color-scheme`, con `data-theme` para forzarlo.

## Colores de persona
- Por defecto: persona A = Azul #2B62C4 (oscuro #82AEFF) y persona B = Teja #B8401F (oscuro #FF8F6E).
- "Ambos" = punto partido a la mitad (A | B), con `linear-gradient(90deg, A 0 50%, B 50% 100%)`. El token `--person-both` (tinta) es para texto o contorno cuando no cabe el punto partido.
- Hay seis intercambiables en `tokens.json → personPalette`:
  - grupo frío: Azul, Ciruela y Jade
  - grupo cálido: Teja, Ocre y Rosa
- **Regla:** una persona de cada grupo. Así se distinguen con deuteranopía (el eje azul–amarillo se conserva). Todas cumplen 4.5:1 sobre `--surface` y `--bg` en su modo.
- El color se usa en el punto o marcador, en el avatar, en los puntos del calendario y en el chip de responsable (punto + nombre). No se usa como fondo de fila.

## Marcador de entrada de calendario (forma = tipo)
El color dice **quién**; la forma dice **qué**:

| Tipo | Forma | Medida |
|---|---|---|
| Evento | círculo | 12 × 12 |
| Pendiente | cuadrado, radio 3 | 12 × 12 |
| Fecha | rombo (cuadrado de 10 px girado 45°) | 10 × 10 |
| Niños | triángulo | 14 × 12 |
| Plan | anillo (máscara con hueco de 3.5 px) | 14 × 14 |
| Comida | píldora horizontal, radio 4 | 16 × 8 |

El subtítulo repite el tipo en texto: "Evento · Yo". Los chips de capa del calendario usan la misma forma en `--ink`.

## Espaciado, radios y elevación
- Base de 4 px; margen lateral de pantalla de 16 px; separación entre bloques de 16–18 px; padding de tarjeta de 12–14 px.
- Filas:
  - con casilla: alto mínimo 54 px, casilla circular de 30 px, separación de 12 px
  - sin casilla: alto mínimo 62 px
- Radios: chips 13–14, campos 16, tarjetas 18, tarjetas destacadas 22, hoja 26 arriba, botones en píldora.
- Objetivos táctiles de 44 px o más. Botón primario de 48 px; botón chico de 36 px dentro de un área de 44 px.
- Elevación casi plana. Solo llevan sombra la hoja (`--elev-sheet`) y el aviso temporal (`--elev-toast`). Velo bajo la hoja: `--scrim`.

## Estructura de pantalla (390 × 844)
- Barra de estado del sistema + **encabezado de la app** (alto de unos 44 px):
  - a la izquierda, "Casa en Orden" en Young Serif 17
  - a la derecha, el estado de conexión y el avatar de 32 px
- Estados de conexión:
  - "En vivo": punto de 8 px en `--ok`
  - "Sin conexión": ícono de wifi tachado en `--warn`, más un aviso bajo el encabezado
  - "Solo lectura": candado en `--info`, más un aviso
- Las subpantallas de Más reemplazan el encabezado por "‹ Más" (44 px, en `--accent`).
- **Navegación inferior** fija sobre `--surface` con borde superior y 5 destinos:
  - ícono de 24 px + etiqueta de 11 px + un punto de 5 px bajo el destino activo
  - insignias de 18 px: Pendientes (atrasados + hoy) en `--danger`; Listas (faltan en el súper) en `--ink`
  - respeta `env(safe-area-inset-bottom)`
- Título de pantalla en display-l. Los grupos llevan un título display-m con el conteo en 13 px al lado.
- Tablet (768 px o más): columna centrada de 720 px como máximo. La navegación se centra en 520 px. El calendario muestra hasta 2 títulos por celda (celda de 96 px) más "+N más". Comidas se vuelve tabla de día × 3 comidas. La hoja se centra como diálogo de 560 px.

## Notas por pantalla
- **Inicio:** saludo (display-xl), tira de la semana (círculos de 40 px; hoy en `--sun`), atajos en una tarjeta de 3 columnas y "Hacer la revisión de la semana" como botón secundario. Siguen Hoy (línea de tiempo), Atrasados (bloque rojo suave), Próximos 7 días (agrupado por día con eyebrow) y Fechas que se acercan.
- **Calendario mes:** números en círculos de 34 px, con hasta 4 puntos de 5 px y luego "+N".
  - hoy: relleno `--sun` + texto `--sun-ink`
  - seleccionado: anillo de 2 px en `--ink`
  - otro mes: número en `--muted` y sin puntos
  - el panel del día es una línea de tiempo con una línea vertical de 1.5 px en `--line`
- **Calendario semana:** columna de fecha de 46 px a la izquierda y tarjeta de entradas a la derecha; "—" si el día está vacío.
- **Pendientes:** captura en tarjeta (texto + 3 selectores en `--tint` + Agregar). Debajo, filtros, grupos y "Hechos" colapsado. El aviso de rutina va 12 px sobre la navegación.
- **Súper:** anillo de avance de 64 px en `--sun`. La captura queda **fija abajo, sobre la navegación**, al alcance del pulgar. Producto en 17 px. Lo comprado va tachado, en `--muted`, con la casilla llena en `--accent`. "Limpiar comprados" pide confirmación en línea.
- **Compras y Mejoras:** resumen arriba (total en display) y píldoras selectoras.
  - prioridad: Alta en danger, Media en warn, Baja en tint
  - estado: Idea en tint, Planeado en info, En proceso en warn, Listo en ok
- **Revisión:** barra de 5 pasos y números en círculo de 36 px (el paso actual relleno de `--sun`). Cierra con un botón grande de `--sun` y una pantalla final "Semana en orden" con el sol completo.

## Interacciones y movimiento
| Acción | Movimiento | Movimiento reducido |
|---|---|---|
| Marcar casilla | La casilla escala .92 → 1 (120 ms) y se rellena; el texto se tacha y atenúa en 200 ms. Con "Ocultar comprados", la fila colapsa su alto en 200 ms tras 600 ms. | Cambio instantáneo, sin colapso animado |
| Completar rutina | Palomita, la fila sale y el aviso sube desde abajo (200 ms, ease-out). Dura 4 s y tiene Deshacer. | El aviso aparece sin desplazarse |
| Abrir la hoja | El velo pasa de 0 a 1 (200 ms) y la hoja sube con translateY de 100% a 0 (280 ms, `cubic-bezier(.2,.8,.2,1)`). Al cerrar: 200 ms ease-in. Se cierra arrastrando hacia abajo. | Solo fundido de 120 ms, o nada |
| Presionar botón | Escala .98 y el fondo cambia según los estados del Sistema | Solo el cambio de fondo |
| Cambiar de día o mes | Fundido de la cuadrícula en 120 ms | Instantáneo |
| Esqueleto | Pulso de opacidad 1 → .55 en 1.2 s | Estático |
| Cierre de la revisión | El sol escala .9 → 1 con fundido (400 ms) | Estático |

- **Foco de teclado:** anillo de 2 px en `--focus` separado 3 px (`box-shadow: 0 0 0 3px var(--bg), 0 0 0 5px var(--focus)`). Siempre visible con `:focus-visible`.
- **Teclado en pantalla:** el pie de la hoja (Eliminar · Cancelar · Guardar) se ancla encima del teclado con `visualViewport`. El contenido de la hoja se desplaza; el pie no.
- **Estados de los componentes:** normal, presionado, foco y deshabilitado, en `Sistema 2b.dc.html`.

## Accesibilidad
- Texto y componentes cumplen WCAG AA en ambos modos.
- Los estados nunca dependen solo del color (íconos y texto en atrasado, hoy y hecho; forma por tipo de entrada).
- Hay foco visible y se respetan `prefers-reduced-motion` y las áreas seguras del iPhone.

## Decisiones
- **Young Serif + Instrument Sans:** una serif cálida, con aire de rótulo antiguo, que se usa solo en títulos y números para dar carácter doméstico. Una sans compacta y muy legible para todo lo operativo; en el súper, a pleno sol, el texto del producto va en sans de 17 px.
- **Verde bosque + cempasúchil:** el verde es tranquilo y no regaña. El cempasúchil es la única nota audaz y siempre significa "hoy" o "terminamos", por eso no se diluye.
- **Azul + Teja:** son lo más separados posible en tono y se distinguen con deuteranopía. Las otras cuatro opciones respetan la misma regla frío/cálido.
- **Forma por tipo:** con solo dos colores de persona, el tipo de entrada necesita otro canal que no sea el color.

## Pendiente (tercera ronda)
El ícono de la app (normal y maskable, 192 y 512 px) y la pantalla de carga final no están en este paquete.
