/**
 * Rich text utilities for future rich formatting support.
 * MVP stores plain text; this module is prepared for JSON block format.
 */

/**
 * Parse plain text into rich text blocks (MVP: single block with default formatting).
 */
function parseTextToBlocks(text) {
  if (!text) {
    return [];
  }

  // MVP: return single block with plain text
  return [
    {
      text,
      bold: false,
      italic: false,
      fontSize: 14
    }
  ];
}

/**
 * Serialize rich text blocks back to plain text (MVP: concatenate all text).
 */
function serializeBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    return "";
  }

  return blocks.map((block) => block.text || "").join("\n");
}

/**
 * Create a new block with optional formatting.
 */
function createBlock(text = "", options = {}) {
  return {
    text,
    bold: options.bold || false,
    italic: options.italic || false,
    fontSize: options.fontSize || 14
  };
}

/**
 * Apply formatting to a specific range in blocks (future use).
 */
function applyFormatting(blocks, startIndex, endIndex, format) {
  // TODO: implement range-based formatting
  // For now, this is a placeholder for future implementation
  return blocks;
}

/**
 * Extract plain text from blocks for display or export.
 */
function getPlainText(blocks) {
  return serializeBlocks(blocks);
}

module.exports = {
  parseTextToBlocks,
  serializeBlocks,
  createBlock,
  applyFormatting,
  getPlainText
};
