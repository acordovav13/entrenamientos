# Entrenamientos

App web personal para registrar entrenamientos. Funciona sin internet, guarda todo
en el propio dispositivo y se instala en el teléfono como una app más.

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

## Estructura

```
src/
  tipos.ts        Modelo de datos: Rutina, Ejercicio, Serie
  db.ts           IndexedDB con Dexie y todas las operaciones
  formato.ts      Fechas y resúmenes de texto
  App.tsx         Armazón y las tres pestañas
  pantallas/      Hoy, Historial, Ajustes
  componentes/    Hoja inferior, formulario, tarjeta de ejercicio, iconos
```

## Dónde viven los datos

En IndexedDB, dentro del navegador de cada dispositivo. No hay servidor ni cuenta.
Teléfono y PC son historiales separados hasta que uses **Ajustes → Exportar / Importar**.
La sincronización automática con Google Drive llega en la fase 3.

Las decisiones de diseño y el plan por fases están en [CLAUDE.md](CLAUDE.md).
