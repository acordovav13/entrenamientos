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
- Tema **oscuro** fijo, base berenjena (`#191426`), que tiene tono propio en vez de
  gris neutro. Dos acentos con significado: **ámbar** (`#f7a55c`) para lo que se toca
  y **verde** (`#5fcf96`) para lo que ya hiciste. Ese contraste de dos colores es lo
  que le da vida a la pantalla; con un solo acento quedaba gris.
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

El usuario probó varias versiones `0.x` antes de mandar una a producción. El plan original
era usar la elegida dos semanas antes de declarar la `1.0`; **el 2026-10-28 el usuario
decidió sacar la `1.0` ese mismo día, sin el periodo de prueba.** Lo que aparezca del uso
real se corrige en versiones `1.x`.

- Cada versión se marca con un tag de git (`v0.1`, `v0.2`, ...).
- `package.json` lleva el número y Vite lo inyecta como `__VERSION__`.
- La versión se muestra en la cabecera de **Ajustes**, para saber cuál estás usando.
- Hasta la 1.0, las betas se publicaban en subcarpetas (`/v0.1/` a `/v0.8/`) para
  compararlas, y como IndexedDB va por origen y no por ruta, todas compartían el mismo
  historial. **Desde la 1.0.1 ya no se publican**: la comparación terminó y compilarlas
  alargaba cada despliegue unos 3 minutos. Siguen como etiquetas de git.
- **Publicar es `git push` a secas**, no `git push --tags`: con `--tags` solo suben las
  etiquetas y la rama se queda atrás, asi que el despliegue (que se dispara al
  empujar `main`) nunca corre. Para subir rama y etiquetas de una: `git push --follow-tags`.

| Versión | Qué trae | Estado |
| --- | --- | --- |
| v0.1 | Registro, historial de solo lectura, PWA, respaldo manual | Etiquetada |
| v0.2 | Días en tarjetas, historial editable, planificación desde Historial | Etiquetada |
| v0.3 | Historial de solo lectura otra vez, repisa de días en Entrenar, varias rutinas por día sin cerrar ninguna | Etiquetada |
| v0.4 | Paleta cálida gris, sin botón fijo ni etiqueta "En curso", rutinas cerradas compactas | Etiquetada |
| v0.5 | Paleta berenjena con ámbar y verde: la v0.4 quedó demasiado gris | Etiquetada |
| v0.6 | Protección de datos: almacenamiento persistente, confirmaciones, aviso de respaldo, medianoche | Etiquetada |
| v0.7 | Fase 2: calendario mensual y progreso por ejercicio con gráfico | Etiquetada |
| v0.8 | Respaldo automático en Google Drive (fase 3, adelantada a petición del usuario) | Etiquetada |
| v1.0 | La v0.8 declarada estable. Sale el 2026-10-28 por decisión del usuario | Etiquetada |
| **v1.0.1** | **Arreglos del respaldo en Drive: un archivo por dispositivo, aviso de cambios sin respaldar. Fuera las betas publicadas** | **Publicada, en uso** |

**Decisión tomada:** la **v0.5 es la base de la 1.0**. Las versiones anteriores quedan
como referencia en git; no se sigue desarrollando sobre ellas.

---

## Plan por fases

| Fase | Qué incluye | Estado |
| --- | --- | --- |
| 0 | Diseño y decisiones | ✅ Cerrada |
| 1 | Registrar y ver: pestaña de registro, historial en lista, PWA, respaldo manual | ✅ Cerrada |
| 1.5 | Protección de datos (v0.6): antes de acumular entrenamientos de verdad | ✅ Cerrada |
| 2 | Historial completo: calendario mensual y progreso por ejercicio | ✅ Cerrada en la v0.7. La edición de días pasados se descartó en la v0.3: el historial es de solo lectura |
| 3 | Google Drive | 🔸 Parcial en la v0.8: **respaldo** automático (una vía) sí. La sincronización en dos vías entre dispositivos no, y sigue fuera de la 1.0 |
| 4 | Pulido según lo que moleste al usarla (plantillas, densidad, temporizador, notas) | ⬜ |

## La 1.0

**Salió el 2026-10-28**, por decisión del usuario, sin las dos semanas de prueba que
preveía el plan original. Contiene todo lo diseñado en la fase 0 más el respaldo en
Drive, que estaba previsto para después de la 1.0 y se adelantó a pedido del usuario.

Lo que sigue **sin verificar con uso real**, y conviene vigilar:
- **Drive con la cuenta real:** la subida manual de la 1.0 funcionó el 2026-10-28 con el
  ID de cliente del usuario. Lo nuevo de la 1.0.1 (archivo por dispositivo, adopción del
  archivo de la 1.0, recuperar eligiendo copia) está probado contra un Drive simulado,
  no contra Google.
- El calendario y el gráfico de progreso solo se han visto con datos de ejemplo, no con
  el historial real.
- La densidad compacta nunca se probó en el gimnasio.

### Lo que trae la 1.0.1
Arregla los bugs que dejó la 1.0, encontrados revisando el código después de publicar.
- **Un archivo por dispositivo.** En la 1.0 había uno solo, `entrenamientos-respaldo.json`,
  y el último dispositivo que respaldaba borraba lo que había subido el otro. Ahora cada
  uno escribe en `entrenamientos-respaldo (<dispositivo>).json`. El dueño se reconoce por
  `appProperties.dispositivo` (un id al azar guardado en localStorage), no por el nombre,
  así que moverlo de carpeta no rompe nada. El nombre del dispositivo sale del navegador.
- **Adopción del archivo de la 1.0:** el dispositivo que ya lo usaba (lo tiene en
  `drive-archivo-id`) lo marca como suyo y le pone su nombre. Un archivo con otro dueño
  nunca se toca, y uno en la papelera se descarta: antes se seguía escribiendo ahí.
- **El automático ya no abre la ventana de Google.** En la 1.0 lo intentaba sin un clic,
  el navegador la bloqueaba y fallaba en silencio. Ahora solo sube con el permiso de un
  toque reciente (dura una hora): 20 s después del último cambio, al salir o volver a la
  app, y al recuperar la señal.
- **Banda "Hay cambios sin respaldar en Drive"** sobre las pestañas, con el botón
  Respaldar, cuando hay datos sin subir y no queda permiso, o cuando un intento falló
  (dice por qué: sin conexión, permiso vencido, ventana cerrada). No sale en Ajustes.
- **Recuperar deja elegir la copia**: lista las de Drive con dispositivo, fecha y número
  de rutinas, la más reciente primero.
- En Ajustes, "Por subir" pasó a ser "Estado: Al día / Cambios sin respaldar".
- **El punto ámbar cuenta Drive:** cada subida llama a `marcarRespaldo`.
- Plurales: `contar()` en `formato.ts` ("1 rutina", no "1 rutinas").
- Limpieza: fuera los botones de betas de Ajustes y sus compilaciones del workflow, README
  al día, y `ejemplo.ts` fuera del paquete publicado (import dinámico tras `import.meta.env.DEV`).

**Qué viene después:** lo que moleste del uso real, en versiones `1.1`, `1.2`... Eso manda
por sobre cualquier función nueva. Siguen fuera: la sincronización en dos vías entre
dispositivos (la 1.0 solo respalda) y el pulido de la fase 4.

---

## Estado actual

**v1.0.1 publicada** en https://acordovav13.github.io/entrenamientos/. Repositorio:
`acordovav13/entrenamientos` (público), desplegado por GitHub Actions en cada push a `main`.

**Drive funcionando desde el 2026-10-28**: el usuario creó el ID de cliente y lo tiene
conectado solo en el teléfono (el PC se desconectó por el bug del archivo único de la
1.0). Con la 1.0.1 ya puede conectar también el PC. Cada archivo queda suelto en la raíz
de Mi unidad (se crea sin `parents`), y Drive guarda 30 días de versiones anteriores.

Verificado en producción (v1.0): el manifest queda en `standalone` con scope
`/entrenamientos/`, y el service worker se registra. La app es instalable.

### Lo que trae la v0.8 (respaldo en Drive)
Es **respaldo, no sincronización**: la app sube una copia y solo baja cuando el usuario
lo pide a mano. Así nunca puede destruir datos resolviendo mal una mezcla entre dos
dispositivos. La sincronización en dos vías sigue pendiente y fuera de la 1.0.
- Permiso `drive.file`: la app solo ve el archivo que ella misma crea. No puede leer
  nada más del Drive del usuario.
- El **ID de cliente de OAuth lo pega el usuario en Ajustes** y se guarda en
  localStorage de ese dispositivo. Crear ese ID en Google Cloud es el único paso que
  Claude no puede hacer: es la cuenta de Google del usuario.
- **Respaldo automático** al abrir la app y al volver del segundo plano, solo si los
  datos cambiaron (se compara una huella: nº de rutinas, nº de ejercicios y el
  `actualizado` más reciente). En la práctica casi nunca corría: renovar el permiso abre
  la ventana de Google y sin un clic el navegador la bloquea. La 1.0.1 lo rehízo (arriba).
- **La ventana de Google se abre de forma síncrona dentro del clic.** Si se abriera
  después de un `await` (por ejemplo tras leer la base), el navegador la bloquea por
  emergente. Por eso `pedirToken` tiene un camino síncrono cuando el guion ya está
  cargado, y `precargarGis()` se llama al entrar a Ajustes.
- Los códigos de error de Google se traducen al castellano: `popup_failed_to_open` y
  compañía no le dicen nada a quien usa la app.

### Lo que trajo la v0.7 (fase 2)
El Historial gana una repisa con tres vistas: **Lista / Calendario / Progreso**. Sigue
siendo de solo lectura y sin rachas ni totales motivacionales.
- **Calendario mensual** (`componentes/Calendario.tsx`): semana de lunes a domingo, día
  entrenado relleno en verde, día a medias solo perfilado, hoy con borde ámbar. El botón
  de mes siguiente se desactiva al llegar al mes actual. Al tocar un día se despliega su
  detalle debajo. En pantallas anchas se acota a 430px: sin eso, las celdas llegaban a
  90px y el calendario ocupaba la pantalla entera.
- **Progreso por ejercicio** (`componentes/GraficoProgreso.tsx`): SVG a mano, sin librería.
  Selector ordenado por cuántas veces hiciste cada ejercicio. Debajo, la lista día por día.
- **Qué mide el gráfico depende del ejercicio**, y se dice en pantalla: kilos de la serie
  más pesada cuando hay peso, repeticiones totales si es peso corporal (un gráfico de kilos
  en dominadas sería una línea plana en 0), y minutos o kilómetros si es cardio.
- **Solo cuenta lo marcado como hecho.** El progreso es lo que levantaste, no lo que
  planeaste. Con menos de dos sesiones no se dibuja nada y se explica por qué.
- Los días planificados a futuro no entran ni en el calendario ni en el progreso.

### Lo que trajo la v0.6
Todo apunta a un solo riesgo: el historial es la única copia que existe.
- **Almacenamiento persistente.** La app pide `navigator.storage.persist()` al arrancar,
  para que el sistema no descarte el IndexedDB cuando falte espacio. El navegador decide:
  en Android se concede al instalar la app en la pantalla de inicio. Ajustes muestra el
  estado real, no una promesa.
- **Confirmación antes de borrar** un ejercicio. Antes un toque mal dado lo perdía sin aviso.
- **Se puede borrar una rutina completa**, con sus ejercicios, desde el icono de papelera
  del pie. Antes había que vaciarla ejercicio por ejercicio para que apareciera "Descartar".
- **Aviso de respaldo.** Ajustes muestra cuándo fue el último, y a los 14 días aparece un
  punto ámbar en la pestaña de Ajustes. Discreto: no interrumpe el entrenamiento.
- **Medianoche.** La fecha se calculaba una sola vez al abrir, así que una app instalada
  (que nunca se cierra del todo) se quedaba mostrando el día anterior. Ahora se revisa al
  volver del segundo plano y cada minuto.
- Ajustes explica en una frase dónde viven los datos y cuánto espacio ocupan.

### Lo que trajo la v0.5
- **Paleta con tono.** La v0.4 arregló lo "informático" pero se fue a grises neutros y
  quedó apagada. Ahora la base es berenjena oscuro (`#191426`), con tono propio, y hay
  **dos acentos con significado**: ámbar (`#f7a55c`) para lo que se toca y verde
  (`#5fcf96`) para lo hecho. Tener dos colores es lo que quita la sensación de gris.
- Contraste medido: nombres 15.8:1, verde de completado 8.2:1, ámbar de navegación
  8.1:1, pestaña apagada 3.54:1.
- El servidor de desarrollo **se reinicia solo al cambiar `package.json`**. El número de
  versión se inyecta al arrancar, así que al subir de versión seguía mostrando la
  anterior hasta reiniciar a mano, y eso confundía justo al comparar versiones.

### Lo que trajo la v0.4
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

### Deuda conocida
- La densidad es compacta según lo pedido, pero aún no se probó en el gimnasio.
  Si resulta apretada, en la fase 4 hay un interruptor de densidad.
- Cada origen tiene su propio IndexedDB, así que `localhost`, la IP de la red local y
  GitHub Pages son historiales separados. Se resuelve en la fase 3 con Drive; mientras
  tanto el puente es exportar/importar desde Ajustes.
