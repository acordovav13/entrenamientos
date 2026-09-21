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
- Tres pestañas fijas abajo: **Hoy / Historial / Ajustes**. Abre siempre en "Hoy".

### Historial
- Lista cronológica por día (base).
- Progreso por ejercicio, con gráfico simple de peso y reps en el tiempo.
- Calendario mensual con marca en los días entrenados.
- **Sin rachas ni totales motivacionales.**
- Se puede editar y corregir **cualquier día pasado**.

### Estética
- Tema **oscuro** fijo. Acento verde menta `#2dd4a7`.
- Densidad **compacta**, con excepción: las fichas de serie y el botón de agregar
  se mantienen en 44px para usar con una mano.

### Primer uso y estados vacíos
- Sin onboarding, sin tour, sin pedir datos. Se entra directo a "Hoy".
- Hoy vacío: un solo botón grande "Agregar ejercicio".
- Historial vacío: "Aún no hay entrenamientos. Lo que registres en Hoy aparecerá acá."
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

## Plan por fases

| Fase | Qué incluye | Estado |
| --- | --- | --- |
| 0 | Diseño y decisiones | ✅ Cerrada |
| 1 | Registrar y ver: pestaña Hoy completa, historial en lista, PWA, respaldo manual | ✅ Cerrada |
| 2 | Historial completo: calendario, progreso por ejercicio, edición de días pasados | ⬜ Siguiente |
| 3 | Google Drive: setup de OAuth y sincronización automática local-primero | ⬜ |
| 4 | Pulido según lo que moleste al usarla (plantillas, densidad, temporizador, notas) | ⬜ |

---

## Estado actual

**Fase 1: CERRADA.** La app funciona de punta a punta en local.

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
- El historial todavía no permite editar días pasados (es de la fase 2, ya decidido).
