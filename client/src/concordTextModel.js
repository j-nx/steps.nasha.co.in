/**
 * ConcordTextModel - A range-based text styling model
 * Separates plain text from style metadata for reliable text manipulation
 *
 * @file /Users/jnx/workspace/steps.nasha.co.in/client/src/concordTextModel.js
 */

/**
 * Represents a style mark applied to a text range
 * @typedef {Object} Mark
 * @property {number} start - Start offset in plain text (inclusive)
 * @property {number} end - End offset in plain text (exclusive)
 * @property {string} type - Style type: 'bold', 'italic', 'underline', 'strike', 'link'
 * @property {Object} [attrs] - Additional attributes (e.g., { href: 'url' } for links)
 */

class ConcordTextModel {
    /**
     * @param {string} text - Plain text content (no HTML tags)
     * @param {Mark[]} marks - Array of style marks
     */
    constructor(text = '', marks = []) {
        this._text = text;
        this._marks = this._normalizeMarks(marks);
    }

    // === Core Properties ===

    /** @returns {string} Plain text content */
    get text() {
        return this._text;
    }

    /** @returns {number} Text length in characters */
    get length() {
        return this._text.length;
    }

    /** @returns {Mark[]} Copy of marks array */
    get marks() {
        return this._marks.map((m) => ({ ...m, attrs: m.attrs ? { ...m.attrs } : null }));
    }

    // === Text Operations ===

    /**
     * Insert text at position, shifting all marks accordingly
     * @param {number} pos - Position to insert at
     * @param {string} str - String to insert
     * @returns {ConcordTextModel} New model instance
     */
    insertAt(pos, str) {
        if (!str) return this;
        pos = Math.max(0, Math.min(pos, this._text.length));

        const newText = this._text.slice(0, pos) + str + this._text.slice(pos);
        const insertLen = str.length;

        const newMarks = this._marks.map((mark) => {
            if (mark.end <= pos) {
                // Entirely before insertion - unchanged
                return { ...mark };
            } else if (mark.start >= pos) {
                // Entirely after insertion - shift forward
                return { ...mark, start: mark.start + insertLen, end: mark.end + insertLen };
            } else {
                // Spans insertion point - expand mark
                return { ...mark, end: mark.end + insertLen };
            }
        });

        return new ConcordTextModel(newText, newMarks);
    }

    /**
     * Delete text range, adjusting/removing affected marks
     * @param {number} start - Start position
     * @param {number} end - End position
     * @returns {ConcordTextModel} New model instance
     */
    deleteRange(start, end) {
        if (start >= end) return this;
        start = Math.max(0, start);
        end = Math.min(this._text.length, end);

        const deleteLen = end - start;
        const newText = this._text.slice(0, start) + this._text.slice(end);

        const newMarks = [];
        for (const mark of this._marks) {
            if (mark.end <= start) {
                // Entirely before deletion - unchanged
                newMarks.push({ ...mark });
            } else if (mark.start >= end) {
                // Entirely after deletion - shift backward
                newMarks.push({ ...mark, start: mark.start - deleteLen, end: mark.end - deleteLen });
            } else if (mark.start >= start && mark.end <= end) {
                // Entirely within deletion - remove (don't add)
            } else if (mark.start < start && mark.end > end) {
                // Spans deletion - shrink
                newMarks.push({ ...mark, end: mark.end - deleteLen });
            } else if (mark.start < start) {
                // Overlaps start of deletion - trim end
                newMarks.push({ ...mark, end: start });
            } else {
                // Overlaps end of deletion - trim start and shift
                newMarks.push({ ...mark, start: start, end: mark.end - deleteLen });
            }
        }

        return new ConcordTextModel(newText, newMarks);
    }

    /**
     * Split model at position (for Enter key)
     * @param {number} pos - Position to split at
     * @returns {[ConcordTextModel, ConcordTextModel]} [before, after]
     */
    splitAt(pos) {
        // Clamp position
        pos = Math.max(0, Math.min(pos, this._text.length));

        // Split text
        const textBefore = this._text.substring(0, pos);
        const textAfter = this._text.substring(pos);

        // Split marks
        const marksBefore = [];
        const marksAfter = [];

        for (const mark of this._marks) {
            if (mark.end <= pos) {
                // Entirely before split point
                marksBefore.push({ ...mark, attrs: mark.attrs ? { ...mark.attrs } : null });
            } else if (mark.start >= pos) {
                // Entirely after split point - shift positions
                marksAfter.push({
                    ...mark,
                    start: mark.start - pos,
                    end: mark.end - pos,
                    attrs: mark.attrs ? { ...mark.attrs } : null,
                });
            } else {
                // Spans split point - split the mark
                marksBefore.push({
                    ...mark,
                    end: pos,
                    attrs: mark.attrs ? { ...mark.attrs } : null,
                });
                marksAfter.push({
                    ...mark,
                    start: 0,
                    end: mark.end - pos,
                    attrs: mark.attrs ? { ...mark.attrs } : null,
                });
            }
        }

        return [new ConcordTextModel(textBefore, marksBefore), new ConcordTextModel(textAfter, marksAfter)];
    }

    /**
     * Join another model to the end of this one
     * @param {ConcordTextModel} other - Model to append
     * @returns {ConcordTextModel} New combined model
     */
    join(other) {
        const offset = this._text.length;
        const newText = this._text + other._text;

        const newMarks = [
            ...this._marks.map((m) => ({ ...m, attrs: m.attrs ? { ...m.attrs } : null })),
            ...other._marks.map((m) => ({
                ...m,
                start: m.start + offset,
                end: m.end + offset,
                attrs: m.attrs ? { ...m.attrs } : null,
            })),
        ];

        return new ConcordTextModel(newText, newMarks);
    }

    // === Mark Operations ===

    /**
     * Add a mark to a range, handling overlaps
     * @param {number} start - Start position
     * @param {number} end - End position
     * @param {string} type - Mark type
     * @param {Object} [attrs] - Optional attributes
     * @returns {ConcordTextModel} New model instance
     */
    addMark(start, end, type, attrs = null) {
        if (start >= end) return this;
        start = Math.max(0, start);
        end = Math.min(this._text.length, end);

        const newMarks = [];
        let newMark = { start, end, type, attrs };

        for (const existing of this._marks) {
            if (existing.type !== type) {
                // Different type - keep as is
                newMarks.push({ ...existing, attrs: existing.attrs ? { ...existing.attrs } : null });
                continue;
            }

            // Same type - check for overlap
            if (existing.end < start || existing.start > end) {
                // No overlap - keep existing
                newMarks.push({ ...existing, attrs: existing.attrs ? { ...existing.attrs } : null });
            } else {
                // Overlap - extend new mark to cover both
                newMark = {
                    start: Math.min(newMark.start, existing.start),
                    end: Math.max(newMark.end, existing.end),
                    type,
                    attrs: attrs || existing.attrs,
                };
            }
        }

        newMarks.push(newMark);
        return new ConcordTextModel(this._text, newMarks);
    }

    /**
     * Remove a mark type from a range
     * @param {number} start - Start position
     * @param {number} end - End position
     * @param {string} type - Mark type to remove
     * @returns {ConcordTextModel} New model instance
     */
    removeMark(start, end, type) {
        if (start >= end) return this;

        const newMarks = [];

        for (const mark of this._marks) {
            if (mark.type !== type) {
                newMarks.push({ ...mark, attrs: mark.attrs ? { ...mark.attrs } : null });
                continue;
            }

            // Same type - check overlap
            if (mark.end <= start || mark.start >= end) {
                // No overlap - keep
                newMarks.push({ ...mark, attrs: mark.attrs ? { ...mark.attrs } : null });
            } else if (mark.start >= start && mark.end <= end) {
                // Fully contained - remove (don't add)
            } else if (mark.start < start && mark.end > end) {
                // Removal splits the mark into two
                newMarks.push({ ...mark, end: start, attrs: mark.attrs ? { ...mark.attrs } : null });
                newMarks.push({ ...mark, start: end, attrs: mark.attrs ? { ...mark.attrs } : null });
            } else if (mark.start < start) {
                // Partial overlap at end
                newMarks.push({ ...mark, end: start, attrs: mark.attrs ? { ...mark.attrs } : null });
            } else {
                // Partial overlap at start
                newMarks.push({ ...mark, start: end, attrs: mark.attrs ? { ...mark.attrs } : null });
            }
        }

        return new ConcordTextModel(this._text, newMarks);
    }

    /**
     * Toggle a mark on a range
     * @param {number} start - Start position
     * @param {number} end - End position
     * @param {string} type - Mark type
     * @param {Object} [attrs] - Optional attributes
     * @returns {ConcordTextModel} New model instance
     */
    toggleMark(start, end, type, attrs = null) {
        if (start >= end) return this;

        // Check if the entire range is already covered by this mark type
        const isFullyCovered = this._isRangeFullyCovered(start, end, type);

        if (isFullyCovered) {
            return this.removeMark(start, end, type);
        } else {
            return this.addMark(start, end, type, attrs);
        }
    }

    /**
     * Check if a range is fully covered by a mark type
     * @private
     */
    _isRangeFullyCovered(start, end, type) {
        const relevantMarks = this._marks
            .filter((m) => m.type === type && m.start <= start && m.end >= end)
            .sort((a, b) => a.start - b.start);

        if (relevantMarks.length === 0) return false;

        // Check if any single mark covers the entire range
        return relevantMarks.some((m) => m.start <= start && m.end >= end);
    }

    /**
     * Get all marks that cover a specific position
     * @param {number} pos - Position to query
     * @returns {Mark[]} Marks at position
     */
    marksAt(pos) {
        return this._marks
            .filter((m) => m.start <= pos && m.end > pos)
            .map((m) => ({ ...m, attrs: m.attrs ? { ...m.attrs } : null }));
    }

    /**
     * Check if position has a specific mark type
     * @param {number} pos - Position to query
     * @param {string} type - Mark type
     * @returns {boolean}
     */
    hasMark(pos, type) {
        return this._marks.some((m) => m.type === type && m.start <= pos && m.end > pos);
    }

    // === Conversion ===

    /**
     * Convert to HTML string for rendering
     * Uses proper tag nesting - opens and closes tags at boundaries
     * @returns {string} HTML string
     */
    toHTML() {
        if (this._text.length === 0) {
            return '';
        }

        if (this._marks.length === 0) {
            return this._escapeHtml(this._text);
        }

        // Collect all boundary points
        const boundaries = new Set([0, this._text.length]);
        for (const mark of this._marks) {
            boundaries.add(Math.max(0, mark.start));
            boundaries.add(Math.min(this._text.length, mark.end));
        }
        const points = Array.from(boundaries).sort((a, b) => a - b);

        // Sort marks by: start position ASC, then end position DESC (outer tags first)
        // Also assign unique IDs for tracking
        const sortedMarks = this._marks.map((m, idx) => ({ ...m, id: idx }));
        sortedMarks.sort((a, b) => {
            if (a.start !== b.start) return a.start - b.start;
            // Same start - longer span (outer) comes first
            return b.end - a.end;
        });

        // Build HTML with proper nesting
        let html = '';
        const openStack = []; // Stack of currently open marks (by id)

        for (let i = 0; i < points.length; i++) {
            const pos = points[i];

            // 1. Close tags that end at this position (in reverse stack order)
            // Need to close in reverse order to maintain proper nesting
            const toClose = [];
            for (let j = openStack.length - 1; j >= 0; j--) {
                const mark = sortedMarks.find(m => m.id === openStack[j]);
                if (mark.end === pos) {
                    toClose.push(j);
                }
            }
            // Close from end of stack (most recently opened first)
            for (const idx of toClose) {
                const mark = sortedMarks.find(m => m.id === openStack[idx]);
                html += this._closeTag(mark);
                openStack.splice(idx, 1);
            }

            // 2. Open tags that start at this position
            const toOpen = sortedMarks.filter(m => m.start === pos);
            // Sort by nesting order: outer (bold) before inner (link)
            toOpen.sort((a, b) => {
                // Longer marks (outer) first
                if (a.end !== b.end) return b.end - a.end;
                // Same length - use type order: bold, italic, underline, strike, link
                const order = { bold: 0, italic: 1, underline: 2, strike: 3, link: 4 };
                return (order[a.type] ?? 99) - (order[b.type] ?? 99);
            });
            for (const mark of toOpen) {
                html += this._openTag(mark);
                openStack.push(mark.id);
            }

            // 3. Emit text until next boundary
            if (i < points.length - 1) {
                const nextPos = points[i + 1];
                html += this._escapeHtml(this._text.substring(pos, nextPos));
            }
        }

        return html;
    }

    /**
     * Generate opening tag for a mark
     * @private
     */
    _openTag(mark) {
        const tagMap = {
            bold: 'b',
            italic: 'i',
            underline: 'u',
            strike: 'strike',
            link: 'a',
        };
        const tag = tagMap[mark.type];
        if (!tag) return '';

        if (mark.type === 'link') {
            const href = mark.attrs?.href || '';
            return `<a href="${this._escapeAttr(href)}">`;
        }
        return `<${tag}>`;
    }

    /**
     * Generate closing tag for a mark
     * @private
     */
    _closeTag(mark) {
        const tagMap = {
            bold: 'b',
            italic: 'i',
            underline: 'u',
            strike: 'strike',
            link: 'a',
        };
        const tag = tagMap[mark.type];
        return tag ? `</${tag}>` : '';
    }

    /**
     * Escape HTML entities in text
     * @private
     */
    _escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Escape attribute value
     * @private
     */
    _escapeAttr(str) {
        return str.replace(/"/g, '&quot;').replace(/&/g, '&amp;');
    }

    /**
     * Allowed HTML tags that represent styling marks.
     * Any other tags (like <abc>) are treated as literal text.
     * @private
     */
    static _ALLOWED_TAGS = {
        b: 'bold',
        strong: 'bold',
        i: 'italic',
        em: 'italic',
        u: 'underline',
        strike: 'strike',
        del: 'strike',
        s: 'strike',
        a: 'link',
    };

    /**
     * Create model from HTML string using a custom parser.
     * Only recognizes allowed styling tags (b, i, u, strike, a, etc.).
     * Unknown tags like <abc> are preserved as literal text.
     * @param {string} html - HTML string
     * @returns {ConcordTextModel}
     */
    static fromHTML(html) {
        if (!html || html === '') {
            return new ConcordTextModel('', []);
        }

        // Parse HTML directly without pre-unescaping
        // This distinguishes between:
        // - &lt;b&gt; (escaped, user typed literal <b>) -> literal text "<b>"
        // - <b> (actual tag) -> bold formatting
        const textParts = [];
        const marks = [];
        const openMarks = []; // Stack of { type, attrs, startPos }
        let pos = 0;
        let i = 0;

        while (i < html.length) {
            // Check for HTML entity
            if (html[i] === '&') {
                const entityMatch = ConcordTextModel._parseEntity(html, i);
                if (entityMatch) {
                    textParts.push(entityMatch.char);
                    pos++;
                    i = entityMatch.endIndex;
                    continue;
                }
                // Not a recognized entity - treat '&' as literal
                textParts.push('&');
                pos++;
                i++;
                continue;
            }

            // Check for potential tag
            if (html[i] === '<') {
                const tagMatch = ConcordTextModel._parseTag(html, i);

                if (tagMatch) {
                    const { tagName, isClosing, attrs, endIndex } = tagMatch;
                    const tagLower = tagName.toLowerCase();

                    // Check if this is an allowed styling tag
                    if (ConcordTextModel._ALLOWED_TAGS[tagLower]) {
                        if (isClosing) {
                            // Find matching open tag and create mark
                            for (let j = openMarks.length - 1; j >= 0; j--) {
                                if (openMarks[j].tagName === tagLower) {
                                    const openMark = openMarks.splice(j, 1)[0];
                                    if (pos > openMark.startPos) {
                                        marks.push({
                                            start: openMark.startPos,
                                            end: pos,
                                            type: openMark.type,
                                            attrs: openMark.attrs,
                                        });
                                    }
                                    break;
                                }
                            }
                        } else {
                            // Opening tag - push to stack
                            const markType = ConcordTextModel._ALLOWED_TAGS[tagLower];
                            const markAttrs =
                                tagLower === 'a' ? { href: attrs.href || '' } : null;
                            openMarks.push({
                                tagName: tagLower,
                                type: markType,
                                attrs: markAttrs,
                                startPos: pos,
                            });
                        }
                        i = endIndex;
                        continue;
                    }

                    // Valid HTML tag but not one we support - skip the tag, keep inner text
                    i = endIndex;
                    continue;
                }

                // Not a valid HTML tag - treat '<' as literal text
                textParts.push('<');
                pos++;
                i++;
            } else {
                // Regular character
                textParts.push(html[i]);
                pos++;
                i++;
            }
        }

        // Handle any unclosed tags - still create marks for them
        for (const openMark of openMarks) {
            if (pos > openMark.startPos) {
                marks.push({
                    start: openMark.startPos,
                    end: pos,
                    type: openMark.type,
                    attrs: openMark.attrs,
                });
            }
        }

        const model = new ConcordTextModel(textParts.join(''), []);
        model._marks = model._normalizeMarks(marks);
        return model;
    }

    /**
     * Parse an HTML entity at position i
     * @private
     * @returns {{ char: string, endIndex: number } | null}
     */
    static _parseEntity(str, i) {
        if (str[i] !== '&') return null;

        // Find the semicolon
        const semiIdx = str.indexOf(';', i);
        if (semiIdx === -1 || semiIdx > i + 10) return null; // entities are short

        const entity = str.substring(i, semiIdx + 1);

        // Map common HTML entities
        const entities = {
            '&lt;': '<',
            '&gt;': '>',
            '&amp;': '&',
            '&quot;': '"',
            '&apos;': "'",
            '&nbsp;': '\u00A0',
        };

        if (entities[entity]) {
            return { char: entities[entity], endIndex: semiIdx + 1 };
        }

        // Handle numeric entities like &#60; or &#x3C;
        if (entity.startsWith('&#')) {
            const code = entity[2] === 'x' || entity[2] === 'X'
                ? parseInt(entity.substring(3, entity.length - 1), 16)
                : parseInt(entity.substring(2, entity.length - 1), 10);
            if (!isNaN(code)) {
                return { char: String.fromCharCode(code), endIndex: semiIdx + 1 };
            }
        }

        return null;
    }

    /**
     * Parse a potential HTML tag at position i
     * @private
     * @returns {{ tagName: string, isClosing: boolean, attrs: object, endIndex: number } | null}
     */
    static _parseTag(str, i) {
        if (str[i] !== '<') return null;

        const isClosing = str[i + 1] === '/';
        const startIdx = isClosing ? i + 2 : i + 1;

        // Tag name must start immediately after < or </ (no leading whitespace)
        // This prevents "< b >" from being parsed as "<b>"
        const firstChar = str[startIdx];
        if (!firstChar || !/[a-zA-Z]/.test(firstChar)) return null;

        // Find the end of the tag
        let endIdx = str.indexOf('>', startIdx);
        if (endIdx === -1) return null;

        // Extract tag content (don't trim - we already checked first char)
        let tagContent = str.substring(startIdx, endIdx);

        // For closing tags, just get the name (must be letters only, no spaces)
        if (isClosing) {
            const tagName = tagContent.trim();
            if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(tagName)) return null;
            return { tagName, isClosing: true, attrs: {}, endIndex: endIdx + 1 };
        }

        // For opening tags, parse name and attributes
        const spaceIdx = tagContent.search(/\s/);
        let tagName, attrString;

        if (spaceIdx === -1) {
            tagName = tagContent;
            attrString = '';
        } else {
            tagName = tagContent.substring(0, spaceIdx);
            attrString = tagContent.substring(spaceIdx);
        }

        // Validate tag name (must start with letter, contain only alphanumeric)
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(tagName)) return null;

        // Parse attributes (simple parsing for href)
        const attrs = {};
        const hrefMatch = attrString.match(/href\s*=\s*["']([^"']*)["']/i);
        if (hrefMatch) {
            attrs.href = hrefMatch[1];
        }

        return { tagName, isClosing: false, attrs, endIndex: endIdx + 1 };
    }

    /**
     * Unescape HTML entities
     * @private
     */
    // === Internal Methods ===

    /**
     * Normalize marks: merge adjacent same-type, remove empty, sort
     * @param {Mark[]} marks
     * @returns {Mark[]}
     * @private
     */
    _normalizeMarks(marks) {
        if (!marks || marks.length === 0) return [];

        // 1. Filter empty and out-of-bounds, deep copy
        let filtered = marks
            .map((m) => ({
                start: Math.max(0, m.start),
                end: Math.min(this._text.length, m.end),
                type: m.type,
                attrs: m.attrs ? { ...m.attrs } : null,
            }))
            .filter((m) => m.start < m.end);

        // 2. Sort by type, then by start, then by end
        filtered.sort((a, b) => {
            if (a.type !== b.type) return a.type.localeCompare(b.type);
            if (a.start !== b.start) return a.start - b.start;
            return a.end - b.end;
        });

        // 3. Merge adjacent/overlapping same-type marks
        const merged = [];
        for (const mark of filtered) {
            const last = merged[merged.length - 1];
            if (last && last.type === mark.type && last.end >= mark.start && this._attrsEqual(last.attrs, mark.attrs)) {
                // Merge: extend the end
                last.end = Math.max(last.end, mark.end);
            } else {
                merged.push({ ...mark });
            }
        }

        // 4. Sort by start position for consistent output
        merged.sort((a, b) => {
            if (a.start !== b.start) return a.start - b.start;
            return a.end - b.end;
        });

        return merged;
    }

    /**
     * Compare two attribute objects for equality
     * @private
     */
    _attrsEqual(a, b) {
        if (a === b) return true;
        if (!a || !b) return a === b;
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every((k) => a[k] === b[k]);
    }

    /**
     * Create a copy of this model
     * @returns {ConcordTextModel}
     */
    clone() {
        return new ConcordTextModel(this._text, this._marks);
    }

    /**
     * Check equality with another model
     * @param {ConcordTextModel} other
     * @returns {boolean}
     */
    equals(other) {
        if (!(other instanceof ConcordTextModel)) return false;
        if (this._text !== other._text) return false;
        if (this._marks.length !== other._marks.length) return false;
        for (let i = 0; i < this._marks.length; i++) {
            const a = this._marks[i];
            const b = other._marks[i];
            if (a.start !== b.start || a.end !== b.end || a.type !== b.type) return false;
            if (!this._attrsEqual(a.attrs, b.attrs)) return false;
        }
        return true;
    }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConcordTextModel;
}
