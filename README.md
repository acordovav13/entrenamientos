# Entrenamientos

App web personal para registrar entrenamientos. Funciona sin internet, guarda todo
en el propio dispositivo y se instala en el teléfono como una app más.

Publicada en https://acordovav13.github.io/entrenamientos/.

## Para desarrollar

```bash
npm install
npm run dev
```

Queda en http://localhost:5173.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compila a `dist/` |
| `npm run preview` | Sirve `dist/` para probar la versión compilada |
| `npm run iconos` | Regenera los iconos del PWA en `public/` |

Cada push a `main` se publica solo en GitHub Pages.

## Estructura

```
src/
  tipos.ts           Modelo de datos: Rutina, Ejercicio, Serie
  db.ts              IndexedDB con Dexie y todas las operaciones
  formato.ts         Fechas, plurales y resúmenes de texto
  progreso.ts        Calendario y gráfico de progreso del Historial
  almacenamiento.ts  Almacenamiento persistente y fecha del último respaldo
  drive.ts           Respaldo en Google Drive
  App.tsx            Armazón, las tres pestañas y el respaldo automático
  pantallas/         Entrenar, Historial, Ajustes
  componentes/       Hojas, formularios, tarjetas, calendario, gráfico, iconos
```

## Dónde viven los datos

En IndexedDB, dentro del navegador de cada dispositivo. No hay servidor propio.
Teléfono y PC son historiales separados: la app respalda, no sincroniza.

- **Google Drive** (Ajustes → Respaldo en Google Drive): cada dispositivo sube su
  copia a su propio archivo, `entrenamientos-respaldo (<dispositivo>).json`, en la
  raíz de Mi unidad. Necesita un ID de cliente de OAuth creado en Google Cloud.
- **Archivo** (Ajustes → Exportar / Importar): un JSON para guardar donde quieras.

Las decisiones de diseño y el plan por fases están en [CLAUDE.md](CLAUDE.md).
