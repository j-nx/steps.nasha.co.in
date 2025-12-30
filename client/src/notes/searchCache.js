//'use strict';
/*jslint browser:true */
/* global store */

/**
 * SearchCacheManager - Manages search cache for fast note searching
 *
 * This class maintains a cache of searchable text extracted from OPML notes.
 * The cache is updated on every note save/update/delete to stay in sync.
 *
 */
class SearchCacheManager {
    constructor(noteStore) {
        this.store = noteStore;

        // Initialize cache from existing notes
        if (!this.store.searchCache) {
            this.store.searchCache = {};
        }
    }

    /**
     * Extract all text from OPML note value
     * Returns: Plain text string with all outline text concatenated
     */
    extractTextFromNote(note) {
        if (!note || !note.value) return '';

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(note.value, 'text/xml');
            const outlines = xmlDoc.getElementsByTagName('outline');

            const textParts = [note.title || '']; // Start with title

            for (let i = 0; i < outlines.length; i++) {
                const text = outlines[i].getAttribute('text') || '';
                if (text.trim()) {
                    // Strip HTML tags but keep text
                    const cleanText = this.stripHtml(text);
                    textParts.push(cleanText);
                }
            }

            // Join with newlines and convert to lowercase for case-insensitive search
            const fullText = textParts.join('\n').toLowerCase();

            // Limit cache size per note to 500KB to prevent bloat
            return fullText.substring(0, 500000);
        } catch (error) {
            console.error('Error extracting text from note:', error);
            return '';
        }
    }

    /**
     * Strip HTML tags from text
     */
    stripHtml(html) {
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    updateNote(note) {
        if (!note || !note.key) return;

        const searchText = this.extractTextFromNote(note);
        this.store.searchCache[note.key] = searchText;

        console.debug(
            `Search cache updated for note: ${note.title || note.key}`
        );
    }

    deleteNote(noteKey) {
        if (this.store.searchCache[noteKey]) {
            delete this.store.searchCache[noteKey];
            console.debug(`Search cache removed for note: ${noteKey}`);
        }
    }

    /**
     * Rebuild entire cache from all notes
     * Call this on app startup or when cache gets out of sync
     */
    rebuildCache() {
        console.debug('Rebuilding search cache...');
        const startTime = performance.now();

        this.store.searchCache = {};

        this.store.notes.forEach((note) => {
            this.updateNote(note);
        });

        const duration = Math.round(performance.now() - startTime);
        console.debug(
            `Search cache rebuilt: ${
                Object.keys(this.store.searchCache).length
            } notes indexed in ${duration}ms`
        );
    }

    /**
     * Search across all cached notes
     * Returns: Array of {noteKey, noteTitle, matches: [...]}
     */
    search(query) {
        if (!query || query.length < 2) return [];

        const lowerQuery = query.toLowerCase();
        const results = [];

        this.store.notes.forEach((note) => {
            const cachedText = this.store.searchCache[note.key];

            // Skip if note not in cache
            if (!cachedText) {
                console.warn(`Note ${note.key} not in cache, updating...`);
                this.updateNote(note);
                return;
            }

            if (cachedText.includes(lowerQuery)) {
                const matches = this.findMatches(note, lowerQuery);
                if (matches.length > 0) {
                    results.push({
                        noteKey: note.key,
                        noteTitle: note.title || 'Untitled',
                        matches: matches
                    });
                }
            }
        });

        console.debug(`Search for "${query}" found ${results.length} results`);
        return results;
    }

    /**
     * Find specific matching lines in the note
     * Re-parses OPML to get original (non-lowercase) text for display
     */
    findMatches(note, lowerQuery) {
        const matches = [];

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(note.value, 'text/xml');
            const outlines = xmlDoc.getElementsByTagName('outline');

            for (let i = 0; i < outlines.length; i++) {
                const text = outlines[i].getAttribute('text') || '';
                const cleanText = this.stripHtml(text);

                if (cleanText.toLowerCase().includes(lowerQuery)) {
                    matches.push({
                        text: cleanText,
                        highlightedText: this.highlightMatch(
                            cleanText,
                            lowerQuery
                        )
                    });

                    // Limit to 5 matches per note to avoid clutter
                    if (matches.length >= 5) break;
                }
            }
        } catch (error) {
            console.error('Error finding matches in note:', error);
        }

        return matches;
    }

    /**
     * Highlight query matches in text
     */
    highlightMatch(text, query) {
        // Escape special regex characters
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');

        // Truncate long text for display (show context around match)
        let displayText = text;
        if (text.length > 150) {
            const matchIndex = text.toLowerCase().indexOf(query.toLowerCase());
            if (matchIndex !== -1) {
                // Show 50 chars before and after match
                const start = Math.max(0, matchIndex - 50);
                const end = Math.min(
                    text.length,
                    matchIndex + query.length + 100
                );
                displayText =
                    (start > 0 ? '...' : '') +
                    text.substring(start, end) +
                    (end < text.length ? '...' : '');
            } else {
                displayText = text.substring(0, 150) + '...';
            }
        }

        return displayText.replace(regex, '<mark>$1</mark>');
    }

    /**
     * Get cache statistics for debugging
     */
    getStats() {
        const cacheSize = Object.keys(this.store.searchCache).length;
        const noteCount = this.store.notes.length;
        const totalBytes = JSON.stringify(this.store.searchCache).length;

        return {
            cachedNotes: cacheSize,
            totalNotes: noteCount,
            cacheSize: `${Math.round(totalBytes / 1024)}KB`,
            syncStatus: cacheSize === noteCount ? 'synced' : 'out of sync'
        };
    }
}
