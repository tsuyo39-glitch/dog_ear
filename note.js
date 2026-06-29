const COLORS = [
  { name: "イエロー", value: "#fff3a8" },
  { name: "ピンク", value: "#ffd5df" },
  { name: "ブルー", value: "#cae9ff" },
  { name: "グリーン", value: "#d4f3c6" },
  { name: "パープル", value: "#e7d7ff" },
  { name: "グレー", value: "#e7e3dc" }
];

const DEBOUNCE_DELAY = 300;

let currentNote = null;
let updateTimeout = null;
let currentFontSize = 14;

const noteText = document.querySelector("#noteText");
const shapeSelect = document.querySelector("#shapeSelect");
const fontSizeSelect = document.querySelector("#fontSizeSelect");
const boldBtn = document.querySelector("#boldBtn");
const italicBtn = document.querySelector("#italicBtn");
const palette = document.querySelector("#palette");
const imageGallery = document.querySelector("#imageGallery");
const minimizeBtn = document.querySelector(".minimize-btn");
const maximizeBtn = document.querySelector(".maximize-btn");
const closeBtn = document.querySelector(".close-btn");

const { dogEarDesktop } = window;

async function initialize() {
  // Wait for note:load message
  dogEarDesktop.onNoteLoaded((note) => {
    currentNote = note;
    loadNoteData(note);
    setupEventListeners();
  });

  // Setup paste and drop for images
  setupImageHandling();
}

function loadNoteData(note) {
  noteText.value = note.text || "";
  noteText.style.fontSize = (note.fontSize || 14) + "px";
  currentFontSize = note.fontSize || 14;
  fontSizeSelect.value = currentFontSize;
  shapeSelect.value = note.shape || "dog";

  // Set background color
  document.body.style.backgroundColor = note.color || "#fff3a8";

  // Setup color palette
  palette.innerHTML = "";
  COLORS.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-button";
    button.style.setProperty("--swatch", color.value);
    button.setAttribute("aria-label", `${color.name}に変更`);
    button.title = color.name;

    if (color.value === note.color) {
      button.classList.add("is-active");
    }

    button.addEventListener("click", () => updateColor(color.value));
    palette.appendChild(button);
  });

  // Load images
  renderImages(note.images || []);

  // Update window title
  document.querySelector(".note-title-text").textContent =
    note.text.substring(0, 20) || "メモ";

  // Notify splash of mouse interaction
  document.addEventListener("mouseenter", () => {
    dogEarDesktop.setIgnoreMouseEvents(false);
  });

  document.addEventListener("mouseleave", () => {
    dogEarDesktop.setIgnoreMouseEvents(true);
  });
}

function setupEventListeners() {
  noteText.addEventListener("input", () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      updateNote({ text: noteText.value });
      document.querySelector(".note-title-text").textContent =
        noteText.value.substring(0, 20) || "メモ";
    }, DEBOUNCE_DELAY);
  });

  shapeSelect.addEventListener("change", () => {
    updateNote({ shape: shapeSelect.value });
  });

  fontSizeSelect.addEventListener("change", () => {
    currentFontSize = parseInt(fontSizeSelect.value, 10);
    noteText.style.fontSize = currentFontSize + "px";
    updateNote({ fontSize: currentFontSize });
  });

  boldBtn.addEventListener("click", () => {
    boldBtn.classList.toggle("active");
  });

  italicBtn.addEventListener("click", () => {
    italicBtn.classList.toggle("active");
  });

  minimizeBtn.addEventListener("click", () => {
    const { ipcRenderer } = require("electron");
    ipcRenderer.send("window:minimize");
  });

  maximizeBtn.addEventListener("click", () => {
    const { ipcRenderer } = require("electron");
    ipcRenderer.send("window:maximize");
  });

  closeBtn.addEventListener("click", () => {
    deleteNote();
  });

  // Listen for updates from other windows
  dogEarDesktop.onNoteUpdated((noteId, changes) => {
    if (noteId === currentNote.id) {
      Object.assign(currentNote, changes);
      // Reload UI if needed
      if (changes.color) {
        document.body.style.backgroundColor = changes.color;
        updateColorButtons();
      }
      if (changes.shape) {
        shapeSelect.value = changes.shape;
      }
      if (changes.fontSize) {
        currentFontSize = changes.fontSize;
        noteText.style.fontSize = currentFontSize + "px";
        fontSizeSelect.value = currentFontSize;
      }
      if (changes.images) {
        renderImages(changes.images);
      }
    }
  });
}

function setupImageHandling() {
  // Paste image from clipboard
  document.addEventListener("paste", async (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        event.preventDefault();
        const blob = item.getAsFile();
        await addImage(blob);
      }
    }
  });

  // Drag and drop images
  document.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });

  document.addEventListener("drop", async (event) => {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files) return;

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        await addImage(file);
      }
    }
  });
}

async function addImage(blob) {
  try {
    const base64 = await blobToBase64(blob);
    const compressed = await compressImage(base64, 1024, 768);

    const result = await dogEarDesktop.pasteImage(
      currentNote.id,
      compressed,
      200,
      200
    );

    if (result && result.imageId) {
      console.log("Image added:", result.imageId);
    }
  } catch (err) {
    console.error("Failed to add image:", err);
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function compressImage(base64, maxWidth, maxHeight) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const compressed = canvas.toDataURL("image/jpeg", 0.8);
      resolve(compressed);
    };

    img.onerror = () => {
      resolve(base64); // fallback to original
    };
  });
}

function renderImages(images) {
  imageGallery.innerHTML = "";

  if (!images || images.length === 0) {
    return;
  }

  images.forEach((image) => {
    const wrapper = document.createElement("div");
    wrapper.className = "note-image-wrapper";

    const img = document.createElement("img");
    img.className = "note-image";
    img.src = image.base64;
    img.alt = `Image ${image.id}`;

    const removeBtn = document.createElement("button");
    removeBtn.className = "note-image-remove";
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.title = "削除";
    removeBtn.addEventListener("click", () => removeImage(image.id));

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    imageGallery.appendChild(wrapper);
  });
}

function removeImage(imageId) {
  const images = currentNote.images.filter((img) => img.id !== imageId);
  updateNote({ images });
}

function updateNote(changes) {
  if (!currentNote) return;

  Object.assign(currentNote, changes);
  dogEarDesktop.updateNote(currentNote.id, changes);
}

function updateColor(color) {
  document.body.style.backgroundColor = color;
  const buttons = palette.querySelectorAll(".color-button");
  buttons.forEach((btn) => {
    const btnColor = btn.style.getPropertyValue("--swatch");
    btn.classList.toggle("is-active", btnColor === color);
  });

  updateNote({ color });
}

function updateColorButtons() {
  const buttons = palette.querySelectorAll(".color-button");
  buttons.forEach((btn) => {
    const btnColor = btn.style.getPropertyValue("--swatch");
    btn.classList.toggle("is-active", btnColor === currentNote.color);
  });
}

async function deleteNote() {
  const confirmed = confirm("このメモを削除しますか？");
  if (confirmed) {
    await dogEarDesktop.deleteNote(currentNote.id);
  }
}

// Initialize when ready
initialize();
