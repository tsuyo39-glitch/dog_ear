class NoteSync {
  constructor(options = {}) {
    this.debounceMs = options.debounceMs || 500;
    this.queue = new Map(); // Map<noteId, changes>
    this.timer = null;
    this.onFlush = options.onFlush || (() => {});
  }

  enqueueUpdate(noteId, changes) {
    if (!this.queue.has(noteId)) {
      this.queue.set(noteId, {});
    }

    // Merge changes
    const existing = this.queue.get(noteId);
    Object.assign(existing, changes);

    // Reset debounce timer
    this.resetTimer();
  }

  resetTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.flush();
    }, this.debounceMs);
  }

  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.size === 0) {
      return;
    }

    // Create batch of updates
    const batch = {};
    for (const [noteId, changes] of this.queue) {
      batch[noteId] = changes;
    }

    // Clear queue
    this.queue.clear();

    // Call flush handler
    try {
      await this.onFlush(batch);
    } catch (err) {
      console.error("NoteSync flush error:", err);
      // Re-enqueue failed updates
      for (const [noteId, changes] of Object.entries(batch)) {
        this.enqueueUpdate(noteId, changes);
      }
    }
  }

  getPendingUpdates() {
    const pending = {};
    for (const [noteId, changes] of this.queue) {
      pending[noteId] = changes;
    }
    return pending;
  }

  hasPendingUpdates() {
    return this.queue.size > 0;
  }
}

module.exports = NoteSync;
