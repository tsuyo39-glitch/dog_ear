const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dogEarDesktop", {
  isElectron: true,
  setIgnoreMouseEvents(shouldIgnore) {
    return ipcRenderer.invoke("dog-ear:set-ignore-mouse-events", shouldIgnore);
  },
});
