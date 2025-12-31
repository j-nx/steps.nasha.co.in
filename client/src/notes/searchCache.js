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
     * Extract all elements from OPML note with their path indices for navigation
     * Returns: Array of { pathIndices: [0,1,2], text: "lowercase", originalText: "Original" }
     */
    extractElementsFromNote(note) {
        if (!note || !note.value) return [];

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(note.value, 'text/xml');
            const elements = [];

            // Recursive function to traverse outline with path tracking
            const traverse = (node, pathIndices) => {
                const children = Array.from(node.children).filter(
                    (el) => el.tagName === 'outline'
                );

                children.forEach((child, index) => {
                    const currentPath = [...pathIndices, index];
                    const text = child.getAttribute('text') || '';
                    const cleanText = this.stripHtml(text);

                    if (cleanText.trim()) {
                        elements.push({
                            pathIndices: currentPath,
                            text: cleanText.toLowerCase(),
                            originalText: cleanText
                        });
                    }

                    // Recurse into children
                    traverse(child, currentPath);
                });
            };

            const body = xmlDoc.getElementsByTagName('body')[0];
            if (body) {
                traverse(body, []);
            }

            return elements;
        } catch (error) {
            console.error('Error extracting elements from note:', error);
            return [];
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

        const elements = this.extractElementsFromNote(note);
        this.store.searchCache[note.key] = {
            title: (note.title || '').toLowerCase(),
            elements: elements
        };
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
            const cached = this.store.searchCache[note.key];

            // Skip if note not in cache or has old format
            if (!cached || !cached.elements) {
                console.warn(`Note ${note.key} not in cache, updating...`);
                this.updateNote(note);
                return;
            }

            // Check title or any element matches
            const titleMatches = cached.title.includes(lowerQuery);
            const elementMatches = cached.elements.some((el) =>
                el.text.includes(lowerQuery)
            );

            if (titleMatches || elementMatches) {
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

        return results;
    }

    /**
     * Find specific matching elements in the note from cache
     * Returns matches with pathIndices for navigation
     */
    findMatches(note, lowerQuery) {
        const matches = [];
        const cached = this.store.searchCache[note.key];

        if (!cached || !cached.elements) return matches;

        for (const element of cached.elements) {
            if (element.text.includes(lowerQuery)) {
                matches.push({
                    text: element.originalText,
                    pathIndices: element.pathIndices,
                    highlightedText: this.highlightMatch(
                        element.originalText,
                        lowerQuery
                    )
                });

                // Limit to 5 matches per note to avoid clutter
                if (matches.length >= 5) break;
            }
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
