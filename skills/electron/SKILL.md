---
name: electron
description: Consultar la propuesta futura de migración del guardado a Electron y Steam cuando se solicite empaquetado.
---

# Migración del guardado a Electron (para cuando toque)

Esta propuesta complementa el contrato de [guardado](../guardado/SKILL.md).
Describe **cómo sustituir el guardado actual (basado en el navegador) por un
archivo de guardado real en disco**, el día que empaquetemos el proyecto con
Electron para publicarlo en Steam. No hace falta tocar nada de esto ahora:
es la chuleta para cuando llegue el momento.

**Estado de los ejemplos:** se conserva el apéndice de diseño y su código como
referencia futura. No es una implementación completa de la API actual: antes de
usarlo hay que incorporar también pérdidas, provisional y notificaciones de
secretos. Pasar métodos a promesas exige adaptar consumidores (punto 4), aunque
la propuesta mantenga los nombres públicos y busque minimizar los cambios.
No sustituyas el `storage.js` actual por este ejemplo sin esa adaptación.

## 1. Por qué hoy usamos `localStorage`/`sessionStorage`

El proyecto corre hoy como páginas HTML sueltas abiertas en un navegador.
Un navegador normal **no tiene permiso para leer/escribir archivos del
disco** (sandboxing de seguridad). La única persistencia disponible ahí es
el almacenamiento interno del propio navegador:

- `localStorage` → guardado "confirmado" (`totalScore`, `playedGames`).
- `sessionStorage` → puntos ganados en la sesión actual aún no guardados
  (`pendingScore`), que se pierden si cierras sin pulsar "Guardar
  progreso" — igual que perder una partida sin guardar en un juego real.

Todo esto vive en un único archivo: `scripts/storage.js`, que expone una
fachada `window.NSG` con unos pocos métodos. **Ningún juego ni el menú
tocan `localStorage` directamente**: todos llaman a `window.NSG.algo()`.
Esto es lo que hace que la migración de abajo sea barata.

## 2. Qué cambia con Electron

Electron ejecuta la app con dos procesos:

- **Proceso principal (`main`)**: tiene Node.js completo, incluido acceso
  al sistema de archivos (`fs`). Aquí es donde debe vivir la lectura y
  escritura del archivo de guardado real.
- **Proceso de renderizado (`renderer`)**: es básicamente el navegador que
  muestra `index.html` y los juegos. Por seguridad, **no debería tener
  acceso directo a Node.js/`fs`**; habla con el proceso principal a través
  de IPC (`ipcRenderer` ↔ `ipcMain`), normalmente expuesto de forma segura
  mediante un *preload script* con `contextBridge`.

El archivo de guardado deja de ser `localStorage` y pasa a ser un **archivo
JSON real** guardado en la carpeta de datos de la app del sistema operativo
(la misma idea que usan la mayoría de juegos de Steam), por ejemplo:

- Windows: `%APPDATA%/NoSenseGames/save.json`
- macOS: `~/Library/Application Support/NoSenseGames/save.json`
- Linux: `~/.config/NoSenseGames/save.json`

Electron ya resuelve esa ruta por ti con `app.getPath('userData')`.

## 3. Lo único que hay que tocar: el interior de `storage.js`

La clave de la migración es que **la API pública de `window.NSG` no
cambia** (mismos nombres de métodos, mismos argumentos, mismo
comportamiento desde fuera). Lo único que cambia es su implementación
interna: en vez de leer/escribir `localStorage`, llama a IPC para que el
proceso principal lea/escriba el archivo real.

Los juegos (`calculadora.js`, `snake.js`, futuros juegos) y el menú
(`menu.js`) **no se tocan**.

La intención de este apartado es conservar las reglas de los juegos; su
afirmación sobre no tocar consumidores queda matizada por el cambio asíncrono
del punto 4 y por los métodos actuales señalados al comienzo de esta skill.

### 3.1. Proceso principal (`main.js` o `electron/main.js`)

```js
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs/promises');
const path = require('path');

function getSavePath() {
  return path.join(app.getPath('userData'), 'save.json');
}

function defaultSave() {
  return { totalScore: 0, playedGames: [] };
}

async function readSaveFile() {
  try {
    const raw = await fs.readFile(getSavePath(), 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      totalScore: Number.isFinite(parsed.totalScore) ? parsed.totalScore : 0,
      playedGames: Array.isArray(parsed.playedGames) ? parsed.playedGames : [],
    };
  } catch (err) {
    return defaultSave(); // no existe todavía o está corrupto
  }
}

async function writeSaveFile(save) {
  await fs.mkdir(path.dirname(getSavePath()), { recursive: true });
  await fs.writeFile(getSavePath(), JSON.stringify(save, null, 2), 'utf-8');
}

ipcMain.handle('nsg:load-save', async () => readSaveFile());
ipcMain.handle('nsg:write-save', async (_event, save) => {
  await writeSaveFile(save);
  return true;
});
```

(El resto de `main.js` —crear la `BrowserWindow`, cargar `index.html`,
etc.— es boilerplate estándar de Electron y no tiene relación con el
guardado.)

### 3.2. Preload script (`preload.js`)

Expone de forma segura solo esas dos funciones al `renderer`, sin dar
acceso a Node.js completo:

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nsgElectronBridge', {
  loadSave: () => ipcRenderer.invoke('nsg:load-save'),
  writeSave: (save) => ipcRenderer.invoke('nsg:write-save', save),
});
```

Y en la configuración de la `BrowserWindow`, apuntar a este preload:

```js
new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
  },
});
```

### 3.3. Reescritura de `scripts/storage.js`

La idea: si `window.nsgElectronBridge` existe (estamos dentro de
Electron), usarlo; si no (seguimos abriendo el `index.html` suelto en un
navegador normal para probar), seguir usando `localStorage` como hasta
ahora. Esto permite seguir desarrollando/depurando en el navegador sin
Electron si hace falta.

`pendingScore` (los puntos de la sesión actual sin guardar) **sigue
viviendo en `sessionStorage`** — no tiene por qué pasar a disco, porque
justamente representa "lo que se pierde si no guardas". Solo el guardado
confirmado (`totalScore`, `playedGames`) pasa a ser asíncrono y basado en
archivo.

```js
(function () {
  const PENDING_KEY = 'nsg_pending_v1';
  const TARGET_SCORE = 1000000;
  const hasElectronBridge = typeof window.nsgElectronBridge !== 'undefined';

  function defaultSave() {
    return { totalScore: 0, playedGames: [] };
  }

  // --- Lectura/escritura del guardado confirmado ---
  // OJO: en Electron esto pasa a ser asíncrono (Promesas), a diferencia de
  // la versión actual con localStorage que era síncrona. Cualquier código
  // que llame a loadSave/writeSave/commitSave tiene que poder esperar
  // (await) el resultado.

  async function loadSave() {
    if (hasElectronBridge) {
      return window.nsgElectronBridge.loadSave();
    }
    try {
      const raw = localStorage.getItem('nsg_save_v1');
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw);
      return {
        totalScore: Number.isFinite(parsed.totalScore) ? parsed.totalScore : 0,
        playedGames: Array.isArray(parsed.playedGames) ? parsed.playedGames : [],
      };
    } catch (err) {
      return defaultSave();
    }
  }

  async function writeSave(save) {
    if (hasElectronBridge) {
      await window.nsgElectronBridge.writeSave(save);
      return;
    }
    localStorage.setItem('nsg_save_v1', JSON.stringify(save));
  }

  // --- Pendiente de guardar: sigue en sessionStorage, sin cambios ---

  function getPendingScore() {
    const raw = sessionStorage.getItem(PENDING_KEY);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  }

  function setPendingScore(value) {
    sessionStorage.setItem(PENDING_KEY, String(Math.max(0, Math.round(value))));
  }

  function addPendingScore(amount) {
    if (!amount) return getPendingScore();
    const next = getPendingScore() + amount;
    setPendingScore(next);
    return next;
  }

  // --- API pública: mismos nombres, ahora async donde toca ---

  async function markGamePlayed(gameId) {
    const save = await loadSave();
    if (!save.playedGames.includes(gameId)) {
      save.playedGames.push(gameId);
      await writeSave(save);
    }
  }

  async function getDisplayTotal() {
    const save = await loadSave();
    return save.totalScore + getPendingScore();
  }

  function hasUnsavedProgress() {
    return getPendingScore() > 0;
  }

  async function commitSave() {
    const save = await loadSave();
    const pending = getPendingScore();
    save.totalScore += pending;
    await writeSave(save);
    setPendingScore(0);
    return save.totalScore;
  }

  window.NSG = {
    TARGET_SCORE,
    loadSave,
    getPendingScore,
    addPendingScore,
    markGamePlayed,
    getDisplayTotal,
    hasUnsavedProgress,
    commitSave,
  };
})();
```

## 4. Qué hay que revisar en el resto del código al migrar

Como `loadSave`, `markGamePlayed`, `getDisplayTotal` y `commitSave` pasan
de síncronas a **asíncronas** (devuelven una Promesa) en la versión con
Electron, hay que revisar sus llamadas:

- `scripts/menu.js`: `renderScore()`, `init()` y el listener del botón
  "Guardar progreso" deben marcarse `async` y usar `await` al llamar a
  `window.NSG.getDisplayTotal()` / `commitSave()`.
- `juegos/<categoria>/<id>/<id>.js`: las llamadas a `window.NSG.markGamePlayed(id)` ya
  no necesitan esperar su resultado (se puede seguir llamando "en
  paralelo", sin `await`, igual que ahora), pero si algún juego llega a
  depender del resultado habrá que añadir `await`.
- `addPendingScore` y `hasUnsavedProgress` **siguen siendo síncronas**
  (operan sobre `sessionStorage`), así que no cambian en los juegos.

## 5. Checklist para el día de la migración

1. Añadir Electron al proyecto (`electron`, `electron-builder` o similar)
   y crear `main.js` + `preload.js` con el código del punto 3.1 y 3.2.
2. Sustituir el contenido de `scripts/storage.js` por la versión del
   punto 3.3 (misma API pública, con "modo Electron" + "modo navegador"
   de reserva), adaptada a todos los métodos actuales como se indica al inicio.
3. Revisar `scripts/menu.js` para `await` las llamadas que ahora son
   asíncronas (punto 4).
4. Probar el flujo completo: jugar una partida → ver que "Progreso sin
   guardar" aparece → pulsar "Guardar progreso" → cerrar la app → volver
   a abrirla → comprobar que el archivo `save.json` en `userData` tiene
   el total correcto.
5. (Opcional) Migración de datos antiguos: si alguien probó la versión
   web antes de la versión de escritorio, se puede añadir un paso único
   en el arranque que lea el `localStorage` del navegador embebido de
   Electron (si existiera) y lo vuelque al archivo nuevo la primera vez.
   No es crítico: al ser builds distintos, es poco probable que haya
   datos previos que migrar.
