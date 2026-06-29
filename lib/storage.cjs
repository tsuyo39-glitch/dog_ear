const fs = require("fs").promises;
const path = require("path");
const { app } = require("electron");

const APP_DATA_DIR = path.join(app.getPath("appData"), "dog_ear");
const NOTES_FILE = path.join(APP_DATA_DIR, "notes.json");
const SESSION_FILE = path.join(APP_DATA_DIR, "session.json");

async function ensureDir() {
  try {
    await fs.mkdir(APP_DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create app data directory:", err);
  }
}

async function loadNotes() {
  await ensureDir();
  try {
    const data = await fs.readFile(NOTES_FILE, "utf8");
    const parsed = JSON.parse(data);
    return parsed.notes || [];
  } catch (err) {
    if (err.code === "ENOENT") {
      return [];
    }
    console.error("Failed to load notes:", err);
    return [];
  }
}

async function saveNotes(notes) {
  await ensureDir();
  try {
    const data = {
      notes,
      lastSync: new Date().toISOString()
    };

    // Write to temp file first for atomicity
    const tempFile = NOTES_FILE + ".tmp";
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");

    // Atomic rename
    await fs.rename(tempFile, NOTES_FILE);
  } catch (err) {
    console.error("Failed to save notes:", err);
    throw err;
  }
}

async function loadSession() {
  await ensureDir();
  try {
    const data = await fs.readFile(SESSION_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      return { openNotes: [], savedAt: new Date().toISOString() };
    }
    console.error("Failed to load session:", err);
    return { openNotes: [], savedAt: new Date().toISOString() };
  }
}

async function saveSession(session) {
  await ensureDir();
  try {
    const data = {
      ...session,
      savedAt: new Date().toISOString()
    };

    const tempFile = SESSION_FILE + ".tmp";
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tempFile, SESSION_FILE);
  } catch (err) {
    console.error("Failed to save session:", err);
  }
}

async function migrate() {
  // One-time migration from localStorage to file-based storage
  // This would run if we had access to localStorage from main process
  // For now, just ensure directories exist
  await ensureDir();
}

module.exports = {
  loadNotes,
  saveNotes,
  loadSession,
  saveSession,
  migrate,
  APP_DATA_DIR,
  NOTES_FILE,
  SESSION_FILE
};
