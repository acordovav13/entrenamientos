# App de fitness personal

App web personal para registrar entrenamientos. Prioridad número uno: simplicidad.
Pocas pantallas, poca fricción, nada de funciones de más.

## Objetivos, en orden
1. Agregar un ejercicio en 2 o 3 toques.
2. Marcar completado durante la sesión sin perder el hilo.
3. Ver el historial de lo terminado de forma clara.

## Restricciones
- Uso personal, un solo usuario. Sin login ni multiusuario (excepción: la cuenta de Google en fase 3, solo para sincronizar).
- Mismo código en teléfono y PC. Responsive, mobile-first.
- Datos locales. Sin backend propio.
- Sin publicidad, analítica ni integraciones externas.
- Interfaz en español. Unidades: kg, km, minutos.

---

## Decisiones cerradas (fase 0)

### Modelo de datos
- Un **ejercicio** es de tipo `fuerza` o `cardio`. El formulario cambia según el tipo.
  - Fuerza: nombre + series + reps + peso (kg). Peso 0 = peso corporal.
  - Cardio: nombre + tiempo (min) y/o distancia (km). Ej: trote, bici, cuerda, saco de boxeo.
- **Series**: se agregan en resumen (ej. 3x10 @ 40kg) y durante la rutina se marca
  cada serie con su propia ficha. Cardio se marca con una sola ficha.
- **Nombres de ejercicio**: escritura libre con autocompletado desde el historial propio.
  La sugerencia trae peso y reps de la última vez. Sin catálogo precargado.
- **Sin relojes.** No se guarda hora de inicio ni de fin en ningún lado. La rutina
  guarda solo fecha, nombre opcional y orden dentro del día. Tiempo y distancia son
  campos de datos del cardio, no marcas de reloj.

### Rutinas y sesiones
- La rutina **se abre sola** al agregar el primer ejercicio del día.
- Botón **"Cerrar rutina"** opcional: sella el bloque y lo deja en solo lectura.
  Aplica a la rutina completa, sin importar qué tipos de ejercicio contenga. Se puede reabrir.
- Se pueden tener **varias rutinas por día**. Si agregas un ejercicio después de
  cerrar, empieza una rutina nueva.
- Si no cierras, la rutina queda abierta indefinidamente. Nada se descarta solo.
- Un día con ejercicios sin completar **se queda tal cual**: guarda lo hecho y lo no hecho.
- **Nombre de rutina opcional**, con autocompletado ("Pierna", "Empuje", "Corrida").

### Pantallas
- Tres pestañas fijas abajo: **Entrenar / Historial / Ajustes**. Abre siempre en Entrenar,
  mostrando hoy. Desde ahí también se planifican los días siguientes.

### Historial
- Lista cronológica por día (base).
- Progreso por ejercicio, con gráfico simple de peso y reps en el tiempo.
- Calendario mensual con marca en los días entrenados.
- **Sin rachas ni totales motivacionales.**
- **De solo lectura.** El pasado se mira, no se toca (revertido en la v0.3; en la v0.2 era editable).

### Estética
- Tema **oscuro** fijo, en grises cálidos (`#1a1817`) con acento verde salvia (`#85bd8e`).
  Nada de gris azulado ni acentos de neón: la v0.3 se veía a herramienta de programación.
- Densidad **compacta**, con excepción: las fichas de serie y el botón de agregar
  se mantienen en 44px para usar con una mano. Las rutinas cerradas se compactan a
  una línea por ejercicio.

### Primer uso y estados vacíos
- Sin onboarding, sin tour, sin pedir datos. Se entra directo a Entrenar, en el día de hoy.
- Día vacío: un solo botón grande "Agregar ejercicio" ("Planificar ejercicio" si es futuro).
- Historial vacío: "Aún no hay entrenamientos. Lo que registres en Entrenar aparecerá acá."
- Sin historial, "Agregar ejercicio" salta directo al formulario: no hay nada que sugerir.

### Persistencia
- **Fases 1-2:** todo local en IndexedDB del navegador. Exportar/importar JSON como respaldo.
- **Fase 3:** sincronización con Google Drive, local-primero (la app funciona sin señal
  y sincroniza cuando hay internet). Requiere client ID de OAuth en Google Cloud y
  entrar con la cuenta de Google en cada dispositivo. Decisión consciente: rompe
  "sin login" a cambio de tener el mismo historial en teléfono y PC sin mover archivos.

### Infraestructura
- **Stack:** Vite + React + TypeScript, Dexie sobre IndexedDB, vite-plugin-pwa.
  Sin router, sin librería de estado, sin backend. CSS plano con variables.
- **Hosting:** GitHub Pages, desplegado por GitHub Actions en cada push a `main`.
  `VITE_BASE` se calcula sola desde el nombre del repositorio.

---

## Versiones

El usuario prueba varias versiones `0.x` antes de elegir cuál mandar a producción
(usarla de verdad en el gimnasio). La `1.0` se declara después de evaluar las `0.x`,
usar la elegida al menos dos semanas, y corregir lo que aparezca.

- Cada versión se marca con un tag de git (`v0.1`, `v0.2`, ...).
- `package.json` lleva el número y Vite lo inyecta como `__VERSION__`.
- La versión se muestra en la cabecera de **Ajustes**, para saber cuál estás usando.
- Las versiones anteriores se publican en subcarpetas (`/v0.1/`, `/v0.2/`, ...). Se listan
  en `VERSIONES_ANTERIORES` del workflow y en `VERSIONES_ANTERIORES` de `Ajustes.tsx`:
  las dos listas tienen que coincidir.
- Como IndexedDB se guarda por origen y no por ruta, **todas las versiones publicadas
  comparten el mismo historial**. La comparación es con los mismos datos.

| Versión | Qué trae | Estado |
| --- | --- | --- |
| v0.1 | Registro, historial de solo lectura, PWA, respaldo manual | Etiquetada |
| v0.2 | Días en tarjetas, historial editable, planificación desde Historial | Etiquetada |
| v0.3 | Historial de solo lectura otra vez, repisa de días en Entrenar, varias rutinas por día sin cerrar ninguna | Etiquetada |
| v0.4 | Paleta cálida, sin botón fijo ni etiqueta "En curso", rutinas cerradas compactas | Actual |
| v1.0 | La `0.x` elegida, tras dos semanas de uso real y sus correcciones | Pendiente |

---

## Plan por fases

| Fase | Qué incluye | Estado |
| --- | --- | --- |
| 0 | Diseño y decisiones | ✅ Cerrada |
| 1 | Registrar y ver: pestaña de registro, historial en lista, PWA, respaldo manual | ✅ Cerrada |
| 2 | Historial completo: calendario mensual y progreso por ejercicio | ⬜ Pendiente. La edición de días pasados se descartó en la v0.3: el historial es de solo lectura por decisión del usuario |
| 3 | Google Drive: setup de OAuth y sincronización automática local-primero | ⬜ |
| 4 | Pulido según lo que moleste al usarla (plantillas, densidad, temporizador, notas) | ⬜ |

---

## Estado actual

**v0.4 lista, sin publicar todavía.** El repositorio en GitHub
(`acordovav13/entrenamientos`, público) está creado pero aún vacío: falta el primer push.

### Lo que trae la v0.4
- **Paleta cálida.** Fuera el gris azulado y el menta de neón, que se veían a
  herramienta de programación. Ahora grises cálidos (`#1a1817`) y un verde salvia
  apagado (`#85bd8e`). Contraste medido: texto 14.8:1, pestaña activa 6.8:1,
  pestaña apagada 3.96:1.
- **Sin botón fijo de agregar.** Quedaba redundante con el pie de cada rutina y el
  botón de nueva rutina. En un día vacío el botón vive dentro del estado vacío.
- **Sin etiqueta "En curso".** Como ya no hay botón fijo, no hay ninguna rutina
  privilegiada: cada agregado dice explícitamente en cuál cae.
- **Rutinas cerradas compactas y distintas.** Se hunden en el fondo en vez de solo
  perder opacidad, llevan candado, y sus ejercicios pasan a una línea cada uno.
  Ocupan un 64% menos. Se fue la nota "Rutina cerrada…"; reabrir sigue estando en
  el botón de la cabecera.

### Lo que trajo la v0.3
- **Pestaña "Hoy" renombrada a "Entrenar"**, porque ya no solo muestra hoy: desde ahí
  se registra el día actual y se planifican los siguientes.
- **Repisa de días** en Entrenar: hoy, mañana, pasado y el día siguiente a un toque,
  más un calendario para cualquier otra fecha futura. Lo elegido se ilumina, el resto
  queda apagado, y las opciones se separan con una barrita fina en vez de parecer botones.
- **El historial vuelve a ser de solo lectura**, como en la v0.1, pero conservando las
  tarjetas por día de la v0.2. Los días planificados ya no aparecen ahí: lo que no ha
  pasado no es historial, y se ve desde Entrenar.
- **Varias rutinas por día sin pelear**: antes, con dos rutinas abiertas, todo caía en
  la primera y había que cerrar las demás para poder agregar donde uno quería. Ahora
  hay un botón "Nueva rutina de este día", cada rutina abierta tiene su propio
  "Agregar a esta rutina", y el botón grande cae en la rutina marcada "En curso",
  que es la última abierta. Las otras abiertas se marcan solo como "Abierta".
- Solo se puede planificar de hoy en adelante: el calendario tiene `min` en hoy.

### Lo que trajo la v0.2
- **Historial mucho más separado**: cada día es una tarjeta con su cabecera, y las
  rutinas dentro quedan en bandas distintas. Antes solo los dividía una línea fina.
- **Cualquier día es editable**: tocas un día del historial y se abre con la misma
  interfaz de "Hoy". El editor de día se extrajo a `componentes/EditorDia.tsx` y lo
  comparten las dos vistas, para que nunca se separen.
- **Días futuros planificables**: botón "Otro día" con atajos (hoy, mañana, pasado
  mañana) y selector de fecha libre. Los días futuros salen en una sección
  "Planificado" con borde punteado, sin marcas de completado.
- **Rutina cerrada coherente**: antes las series no se dejaban marcar pero el menú ⋮
  sí permitía cambiar los kilos. Ahora una rutina cerrada está cerrada del todo, y
  una banda explica el bloqueo y la reabre de un toque.
- Número de versión visible en Ajustes.

### Lo que quedó hecho en la fase 1 (v0.1)

### Lo que quedó hecho en la fase 1
- Pestaña **Hoy**: agregar ejercicio en 2 toques desde el autocompletado (3 si es nuevo),
  fichas de serie marcables, "+" para repetir la última serie, editar y borrar ejercicio,
  nombrar la rutina, cerrarla y reabrirla, varias rutinas por día.
- Pestaña **Historial**: lista cronológica por día con rutinas, ejercicios, sus números
  y marca de completado. Solo lectura por ahora.
- Pestaña **Ajustes**: exportar e importar respaldo JSON, borrar todo, contadores.
- PWA instalable, con service worker y funcionamiento sin conexión.
- El nombre de la rutina se guarda en cada tecla, no al salir del campo.

### Pendiente de que el usuario haga
- Crear el repositorio en GitHub y hacer el primer push para que Pages publique la app.
  Hasta entonces la app solo corre en `localhost` y no se puede instalar en el teléfono.

### Deuda conocida
- La densidad es compacta según lo pedido, pero aún no se probó en el gimnasio.
  Si resulta apretada, en la fase 4 hay un interruptor de densidad.
- Faltan de la fase 2: calendario mensual y gráfico de progreso por ejercicio.
- Cada origen tiene su propio IndexedDB, así que `localhost`, la IP de la red local y
  GitHub Pages son historiales separados. Se resuelve en la fase 3 con Drive; mientras
  tanto el puente es exportar/importar desde Ajustes.
