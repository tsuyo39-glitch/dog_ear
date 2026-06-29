const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dogEarDesktop", {
  isElectron: true,

  // Note CRUD operations
  createNote(params) {
    return ipcRenderer.invoke("note:create", params);
  },

  getNote(noteId) {
    return ipcRenderer.invoke("note:get", noteId);
  },

  updateNote(id, changes) {
    ipcRenderer.send("note:update", { id, changes });
  },

  deleteNote(id) {
    return ipcRenderer.invoke("note:delete", { id });
  },

  // Image handling
  pasteImage(id, base64, width, height) {
    return ipcRenderer.invoke("image:paste", { id, base64, width, height });
  },

  // Window management
  notifyBoundsChanged(noteId, x, y, width, height) {
    ipcRenderer.send("window:bounds-changed", { noteId, x, y, width, height });
  },

  setIgnoreMouseEvents(shouldIgnore) {
    return ipcRenderer.invoke("set-ignore-mouse-events", shouldIgnore);
  },

  // Event listeners
  onNoteOpened(callback) {
    ipcRenderer.on("note:opened", (event, noteId) => callback(noteId));
  },

  onNoteUpdated(callback) {
    ipcRenderer.on("note:updated", (event, { id, changes }) => callback(id, changes));
  },

  onNoteDeleted(callback) {
    ipcRenderer.on("note:deleted", (event, noteId) => callback(noteId));
  },

  onNoteLoaded(callback) {
    ipcRenderer.on("note:load", (event, note) => callback(note));
  },

  onWindowPositionChanged(callback) {
    ipcRenderer.on("window:position-changed", (event, { x, y }) => callback(x, y));
  },

  onWindowSizeChanged(callback) {
    ipcRenderer.on("window:size-changed", (event, { width, height }) => callback(width, height));
  }
});
