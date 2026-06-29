const { BrowserWindow, screen } = require("electron");
const path = require("path");

class WindowManager {
  constructor() {
    this.windows = new Map(); // Map<noteId, BrowserWindow>
  }

  createNoteWindow(noteId, note, options = {}) {
    const {
      x = 100,
      y = 100,
      width = 400,
      height = 500
    } = options;

    // Validate position is within screen bounds
    const display = screen.getPrimaryDisplay();
    const workArea = display.workArea;

    let windowX = Math.max(0, Math.min(x, workArea.width - width));
    let windowY = Math.max(0, Math.min(y, workArea.height - height));

    const win = new BrowserWindow({
      x: windowX,
      y: windowY,
      width,
      height,
      show: false,
      alwaysOnTop: true,
      webPreferences: {
        preload: path.join(__dirname, "..", "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    win.loadFile(path.join(__dirname, "..", "note.html"));
    win.webContents.send("note:load", note);

    win.once("ready-to-show", () => win.show());

    // Track window close
    win.on("closed", () => {
      this.windows.delete(noteId);
    });

    // Track position changes
    win.on("move", () => {
      const bounds = win.getBounds();
      if (win.webContents && !win.isDestroyed()) {
        win.webContents.send("window:position-changed", {
          x: bounds.x,
          y: bounds.y
        });
      }
    });

    // Track resize
    win.on("resize", () => {
      const bounds = win.getBounds();
      if (win.webContents && !win.isDestroyed()) {
        win.webContents.send("window:size-changed", {
          width: bounds.width,
          height: bounds.height
        });
      }
    });

    this.windows.set(noteId, win);
    return win;
  }

  closeNoteWindow(noteId) {
    const win = this.windows.get(noteId);
    if (win && !win.isDestroyed()) {
      win.close();
    }
    this.windows.delete(noteId);
  }

  getWindow(noteId) {
    return this.windows.get(noteId);
  }

  getAllWindows() {
    return Array.from(this.windows.entries());
  }

  closeAllWindows() {
    for (const [noteId, win] of this.windows) {
      if (win && !win.isDestroyed()) {
        win.close();
      }
    }
    this.windows.clear();
  }

  getWindowBounds() {
    const bounds = [];
    for (const [noteId, win] of this.windows) {
      if (win && !win.isDestroyed()) {
        const windowBounds = win.getBounds();
        bounds.push({
          id: noteId,
          x: windowBounds.x,
          y: windowBounds.y,
          width: windowBounds.width,
          height: windowBounds.height
        });
      }
    }
    return bounds;
  }

  broadcastToAll(channel, ...args) {
    for (const win of this.windows.values()) {
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, ...args);
      }
    }
  }
}

module.exports = WindowManager;
