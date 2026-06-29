const { ipcRenderer } = require("electron");

const addButton = document.querySelector("#addButton");

addButton.addEventListener("click", createNote);
addButton.addEventListener("mouseenter", () => {
  ipcRenderer.send("mouse:hover");
});
addButton.addEventListener("mouseleave", () => {
  ipcRenderer.send("mouse:leave");
});

ipcRenderer.on("focus:create-note", () => {
  createNote();
});

async function createNote() {
  try {
    const note = await ipcRenderer.invoke("note:create", {
      color: "#fff3a8",
      shape: "dog",
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100
    });

    console.log("Note created:", note.id);
  } catch (err) {
    console.error("Failed to create note:", err);
  }
}
