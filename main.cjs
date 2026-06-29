const path = require("path");
const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require("electron");
const Storage = require("./lib/storage.cjs");
const WindowManager = require("./lib/window-manager.cjs");
const NoteSync = require("./lib/note-sync.cjs");

let splashWindow;
let windowManager;
let noteSync;
let notes = [];

async function initializeApp() {
  // Create window manager and sync
  windowManager = new WindowManager();
  noteSync = new NoteSync({
    debounceMs: 500,
    onFlush: async (batch) => {
      // Apply all changes to notes array
      for (const [noteId, changes] of Object.entries(batch)) {
        const note = notes.find(n => n.id === noteId);
        if (note) {
          Object.assign(note, changes, { updatedAt: new Date().toISOString() });
        }
      }

      // Save to disk
      await Storage.saveNotes(notes);

      // Broadcast updates to all windows
      for (const [noteId, changes] of Object.entries(batch)) {
        windowManager.broadcastToAll("note:updated", { id: noteId, changes });
      }
    }
  });

  // Load persisted data
  notes = await Storage.loadNotes();
  const session = await Storage.loadSession();

  // Create splash window
  createSplashWindow();

  // Restore note windows from session
  for (const windowState of session.openNotes) {
    const note = notes.find(n => n.id === windowState.id);
    if (note) {
      const { x, y, width, height } = windowState;
      windowManager.createNoteWindow(note.id, note, { x, y, width, height });
    }
  }

  // Setup IPC handlers
  setupIpcHandlers();

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  console.log(`Loaded ${notes.length} notes from storage`);
}

function createSplashWindow() {
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;

  splashWindow = new BrowserWindow({
    x: workArea.x + workArea.width - 120,
    y: workArea.y + workArea.height - 120,
    width: 100,
    height: 100,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, "splash.html"));
  splashWindow.setIgnoreMouseEvents(true, { forward: true });

  return splashWindow;
}

function setupIpcHandlers() {
  // Create new note
  ipcMain.handle("note:create", async (event, params = {}) => {
    const {
      color = "#fff3a8",
      shape = "dog",
      x = 100,
      y = 100
    } = params;

    const note = {
      id: generateUUID(),
      text: "",
      color,
      shape,
      x,
      y,
      width: 400,
      height: 500,
      fontSize: 14,
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    notes.push(note);
    await Storage.saveNotes(notes);

    // Create window
    windowManager.createNoteWindow(note.id, note, { x, y, width: 400, height: 500 });

    // Broadcast to all windows
    windowManager.broadcastToAll("note:opened", note.id);

    return note;
  });

  // Get note data
  ipcMain.handle("note:get", async (event, noteId) => {
    return notes.find(n => n.id === noteId) || null;
  });

  // Update note (debounced)
  ipcMain.on("note:update", (event, { id, changes }) => {
    noteSync.enqueueUpdate(id, changes);
  });

  // Delete note
  ipcMain.handle("note:delete", async (event, { id }) => {
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
      notes.splice(index, 1);
      await Storage.saveNotes(notes);

      windowManager.closeNoteWindow(id);
      windowManager.broadcastToAll("note:deleted", id);

      return { success: true };
    }
    return { success: false };
  });

  // Add image to note
  ipcMain.handle("image:paste", async (event, { id, base64, width, height }) => {
    const note = notes.find(n => n.id === id);
    if (!note) return null;

    const imageId = `img-${Date.now()}`;
    const image = {
      id: imageId,
      base64,
      width,
      height
    };

    if (!note.images) {
      note.images = [];
    }
    note.images.push(image);

    // Sync the update
    noteSync.enqueueUpdate(id, { images: note.images });

    return { imageId };
  });

  // Window position/size update
  ipcMain.on("window:bounds-changed", (event, { noteId, x, y, width, height }) => {
    noteSync.enqueueUpdate(noteId, { x, y, width, height });
  });

  // Set mouse passthrough (for splash window)
  ipcMain.handle("set-ignore-mouse-events", (event, shouldIgnore) => {
    const sender = BrowserWindow.fromWebContents(event.sender);
    if (sender && !sender.isDestroyed()) {
      sender.setIgnoreMouseEvents(shouldIgnore, { forward: true });
    }
  });
}

function setupKeyboardShortcuts() {
  // Quit app
  globalShortcut.register("CommandOrControl+Shift+Q", () => {
    app.quit();
  });

  // New note
  globalShortcut.register("CommandOrControl+N", async () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send("focus:create-note");
    }
  });
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// App lifecycle
app.on("ready", initializeApp);

app.on("window-all-closed", () => {
  // On macOS, keep app running
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // Re-create splash if needed (macOS)
  if (!splashWindow || splashWindow.isDestroyed()) {
    createSplashWindow();
  }
});

app.on("will-quit", async () => {
  // Unregister shortcuts
  globalShortcut.unregisterAll();

  // Flush any pending updates
  await noteSync.flush();

  // Save session (window positions)
  const bounds = windowManager.getWindowBounds();
  const session = {
    openNotes: bounds,
    savedAt: new Date().toISOString()
  };
  await Storage.saveSession(session);

  console.log("Saved session with", bounds.length, "windows");
});
