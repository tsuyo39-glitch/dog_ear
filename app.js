const STORAGE_KEY = "dog_ear.notes.v1";
const NOTE_WIDTH = 260;
const NOTE_HEIGHT = 306;

const colors = [
  { name: "イエロー", value: "#fff3a8" },
  { name: "ピンク", value: "#ffd5df" },
  { name: "ブルー", value: "#cae9ff" },
  { name: "グリーン", value: "#d4f3c6" },
  { name: "パープル", value: "#e7d7ff" },
  { name: "グレー", value: "#e7e3dc" },
];

const animalShapes = {
  dog: "M44 74 L62 35 L91 61 C103 53 119 49 130 49 C141 49 157 53 169 61 L198 35 L216 74 C238 92 246 121 240 155 C233 195 199 217 130 217 C61 217 27 195 20 155 C14 121 22 92 44 74 Z",
  cat: "M35 84 L49 38 L89 69 C101 62 115 58 130 58 C145 58 159 62 171 69 L211 38 L225 84 C241 103 246 132 238 164 C228 199 191 217 130 217 C69 217 32 199 22 164 C14 132 19 103 35 84 Z",
  bear: "M50 86 C34 76 31 49 49 36 C68 23 91 33 95 55 C106 50 118 47 130 47 C142 47 154 50 165 55 C169 33 192 23 211 36 C229 49 226 76 210 86 C229 108 237 142 225 171 C211 204 177 217 130 217 C83 217 49 204 35 171 C23 142 31 108 50 86 Z",
  rabbit: "M81 78 C55 40 55 8 75 7 C94 6 105 38 107 70 C115 67 122 66 130 66 C138 66 145 67 153 70 C155 38 166 6 185 7 C205 8 205 40 179 78 C218 96 236 126 234 161 C231 199 195 217 130 217 C65 217 29 199 26 161 C24 126 42 96 81 78 Z",
  frog: "M46 88 C38 62 56 42 81 48 C95 51 104 62 107 76 C114 74 122 73 130 73 C138 73 146 74 153 76 C156 62 165 51 179 48 C204 42 222 62 214 88 C232 106 240 134 234 164 C226 201 189 217 130 217 C71 217 34 201 26 164 C20 134 28 106 46 88 Z",
  chick: "M44 94 C37 72 48 50 71 44 C86 40 101 45 111 56 L130 29 L149 56 C159 45 174 40 189 44 C212 50 223 72 216 94 C235 113 242 142 234 169 C224 202 189 217 130 217 C71 217 36 202 26 169 C18 142 25 113 44 94 Z",
  panda: "M48 91 C29 82 28 52 47 38 C66 24 91 33 95 56 C106 51 118 48 130 48 C142 48 154 51 165 56 C169 33 194 24 213 38 C232 52 231 82 212 91 C229 111 236 142 226 171 C214 204 179 217 130 217 C81 217 46 204 34 171 C24 142 31 111 48 91 Z",
  hedgehog: "M30 116 L46 100 L37 78 L61 82 L66 58 L87 70 L100 49 L116 68 L130 44 L144 68 L160 49 L173 70 L194 58 L199 82 L223 78 L214 100 L230 116 C240 148 230 184 200 202 C180 214 154 217 130 217 C106 217 80 214 60 202 C30 184 20 148 30 116 Z",
  koala: "M47 90 C22 74 29 39 57 30 C84 21 108 39 104 67 C112 63 121 61 130 61 C139 61 148 63 156 67 C152 39 176 21 203 30 C231 39 238 74 213 90 C228 111 234 141 225 169 C214 202 180 217 130 217 C80 217 46 202 35 169 C26 141 32 111 47 90 Z",
  penguin: "M130 26 C166 26 193 55 201 100 C235 119 244 155 226 184 C207 214 172 217 130 217 C88 217 53 214 34 184 C16 155 25 119 59 100 C67 55 94 26 130 26 Z",
};

const shapeNames = Object.keys(animalShapes);
const board = document.querySelector("#board");
const emptyState = document.querySelector("#emptyState");
const addButton = document.querySelector("#addButton");
const template = document.querySelector("#noteTemplate");
const desktopBridge = window.dogEarDesktop;

let notes = loadNotes();
let removedNotes = [];
let dragState = null;

if (desktopBridge?.isElectron) {
  document.body.classList.add("is-desktop-app");
  setupDesktopMousePassthrough();
}

renderAll();
addButton.addEventListener("click", addNote);
window.addEventListener("resize", keepAllNotesInBounds);

function addNote() {
  const now = new Date().toISOString();
  const offset = notes.length * 22;
  const note = {
    id: globalThis.crypto?.randomUUID?.() || `note-${Date.now()}-${Math.random()}`,
    text: "",
    color: colors[0].value,
    shape: shapeNames[notes.length % shapeNames.length],
    x: Math.round((window.innerWidth - NOTE_WIDTH) / 2 + offset),
    y: Math.round((window.innerHeight - NOTE_HEIGHT) / 2 + offset),
    width: NOTE_WIDTH,
    height: NOTE_HEIGHT,
    createdAt: now,
    updatedAt: now,
  };

  clampNotePosition(note);
  notes.push(note);
  saveNotes();
  renderNote(note);
  syncEmptyState();
}

function renderAll() {
  board.querySelectorAll(".note").forEach((noteElement) => noteElement.remove());
  notes.forEach((note) => {
    normalizeNote(note);
    clampNotePosition(note);
    renderNote(note);
  });
  saveNotes();
  syncEmptyState();
}

function renderNote(note) {
  const fragment = template.content.cloneNode(true);
  const noteElement = fragment.querySelector(".note");
  const fillPath = fragment.querySelector(".note-shape-fill");
  const outlinePath = fragment.querySelector(".note-shape-outline");
  const textArea = fragment.querySelector(".note-text");
  const palette = fragment.querySelector(".palette");
  const deleteButton = fragment.querySelector(".delete-button");
  const shapeSelect = fragment.querySelector(".shape-select");

  noteElement.dataset.noteId = note.id;
  noteElement.style.left = `${note.x}px`;
  noteElement.style.top = `${note.y}px`;
  noteElement.style.setProperty("--note-color", note.color);
  fillPath.setAttribute("d", animalShapes[note.shape]);
  outlinePath.setAttribute("d", animalShapes[note.shape]);
  textArea.value = note.text;
  shapeSelect.value = note.shape;

  colors.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-button";
    button.style.setProperty("--swatch", color.value);
    button.setAttribute("aria-label", `${color.name}に変更`);
    button.classList.toggle("is-active", color.value === note.color);
    button.addEventListener("click", () => updateNote(note.id, { color: color.value }));
    palette.append(button);
  });

  textArea.addEventListener("input", () => updateNote(note.id, { text: textArea.value }));
  shapeSelect.addEventListener("change", () => updateNote(note.id, { shape: shapeSelect.value }));
  deleteButton.addEventListener("click", () => deleteNote(note.id));
  noteElement.addEventListener("pointerdown", (event) => startDrag(event, note.id, noteElement));

  board.append(noteElement);
}

function updateNote(id, changes) {
  const note = notes.find((candidate) => candidate.id === id);
  if (!note) return;

  Object.assign(note, changes, { updatedAt: new Date().toISOString() });
  clampNotePosition(note);
  saveNotes();

  const noteElement = board.querySelector(`[data-note-id="${CSS.escape(id)}"]`);
  if (!noteElement) return;

  noteElement.style.left = `${note.x}px`;
  noteElement.style.top = `${note.y}px`;
  noteElement.style.setProperty("--note-color", note.color);
  noteElement.querySelector(".note-shape-fill").setAttribute("d", animalShapes[note.shape]);
  noteElement.querySelector(".note-shape-outline").setAttribute("d", animalShapes[note.shape]);
  noteElement.querySelector(".shape-select").value = note.shape;
  noteElement.querySelectorAll(".color-button").forEach((button, index) => {
    button.classList.toggle("is-active", colors[index].value === note.color);
  });
}

function deleteNote(id) {
  const index = notes.findIndex((note) => note.id === id);
  if (index === -1) return;

  const [removed] = notes.splice(index, 1);
  removedNotes.push({ ...removed, deletedAt: new Date().toISOString() });
  board.querySelector(`[data-note-id="${CSS.escape(id)}"]`)?.remove();
  saveNotes();
  syncEmptyState();
}

function startDrag(event, id, noteElement) {
  if (event.button !== 0) return;
  if (event.target.closest("button, select, textarea, input")) return;

  const note = notes.find((candidate) => candidate.id === id);
  if (!note) return;

  event.preventDefault();
  desktopBridge?.setIgnoreMouseEvents(false);
  noteElement.setPointerCapture(event.pointerId);
  noteElement.classList.add("is-dragging");
  dragState = {
    id,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    noteX: note.x,
    noteY: note.y,
    noteElement,
  };

  noteElement.addEventListener("pointermove", dragNote);
  noteElement.addEventListener("pointerup", finishDrag);
  noteElement.addEventListener("pointercancel", finishDrag);
}

function dragNote(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;

  const note = notes.find((candidate) => candidate.id === dragState.id);
  if (!note) return;

  note.x = Math.round(dragState.noteX + event.clientX - dragState.startX);
  note.y = Math.round(dragState.noteY + event.clientY - dragState.startY);
  clampNotePosition(note);
  dragState.noteElement.style.left = `${note.x}px`;
  dragState.noteElement.style.top = `${note.y}px`;
}

function finishDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;

  const note = notes.find((candidate) => candidate.id === dragState.id);
  if (note) {
    note.updatedAt = new Date().toISOString();
    saveNotes();
  }

  dragState.noteElement.classList.remove("is-dragging");
  dragState.noteElement.removeEventListener("pointermove", dragNote);
  dragState.noteElement.removeEventListener("pointerup", finishDrag);
  dragState.noteElement.removeEventListener("pointercancel", finishDrag);
  dragState = null;
}

function keepAllNotesInBounds() {
  let changed = false;
  notes.forEach((note) => {
    const before = `${note.x},${note.y}`;
    clampNotePosition(note);
    changed = changed || before !== `${note.x},${note.y}`;
    const noteElement = board.querySelector(`[data-note-id="${CSS.escape(note.id)}"]`);
    if (noteElement) {
      noteElement.style.left = `${note.x}px`;
      noteElement.style.top = `${note.y}px`;
    }
  });
  if (changed) saveNotes();
}

function clampNotePosition(note) {
  note.width = NOTE_WIDTH;
  note.height = NOTE_HEIGHT;
  const maxX = Math.max(0, window.innerWidth - NOTE_WIDTH);
  const maxY = Math.max(0, window.innerHeight - NOTE_HEIGHT);
  note.x = Math.min(Math.max(0, Number(note.x) || 0), maxX);
  note.y = Math.min(Math.max(0, Number(note.y) || 0), maxY);
}

function normalizeNote(note) {
  note.text = typeof note.text === "string" ? note.text : "";
  note.color = colors.some((color) => color.value === note.color) ? note.color : colors[0].value;
  note.shape = shapeNames.includes(note.shape) ? note.shape : "dog";
  note.width = NOTE_WIDTH;
  note.height = NOTE_HEIGHT;
  note.createdAt = note.createdAt || new Date().toISOString();
  note.updatedAt = note.updatedAt || note.createdAt;
}

function syncEmptyState() {
  emptyState.classList.toggle("is-hidden", notes.length > 0);
}

function loadNotes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function setupDesktopMousePassthrough() {
  let ignoringMouse = true;
  const interactiveSelector = ".note, .add-button";

  window.addEventListener("mousemove", (event) => {
    if (dragState) return;

    const target = document.elementFromPoint(event.clientX, event.clientY);
    const isInteractive = Boolean(target?.closest(interactiveSelector));
    const shouldIgnore = !isInteractive;

    if (shouldIgnore === ignoringMouse) return;
    ignoringMouse = shouldIgnore;
    desktopBridge.setIgnoreMouseEvents(shouldIgnore);
  });

  window.addEventListener("mouseleave", () => {
    ignoringMouse = true;
    desktopBridge.setIgnoreMouseEvents(true);
  });
}
