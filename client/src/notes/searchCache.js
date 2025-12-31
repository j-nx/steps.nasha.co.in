//'use strict';
/*jslint browser:true */
/* global store */

/**
 * SearchCacheManager - Manages unified cache for search and rendering
 *
 * Cache format (compact tree): [text, attrs, children]
 * - text: original HTML text content
 * - attrs: null or object with attributes (type, icon, etc.)
 * - children: array of child nodes in same format
 *
 * Example:
 * ["Shopping List", null, [
 *   ["Groceries", {type:"task"}, [
 *     ["Milk", null, []],
 *     ["Eggs", null, []]
 *   ]]
 * ]]
 */
class SearchCacheManager {
    constructor(noteStore) {
        this.store = noteStore;

        if (!this.store.searchCache) {
            this.store.searchCache = {};
        }

        // Navigation state for keyboard navigation of search results
        this.lastResults = [];
        this.focusedIndex = -1; // -1 = input focused, 0+ = match index
    }

    /**
     * Extract compact tree and expansion state from OPML note
     * Returns: { tree: Array of [text, attrs, children] nodes, expansionState: number[] }
     */
    extractTreeFromNote(note) {
        if (!note || !note.value) return { tree: [], expansionState: [] };

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(note.value, 'text/xml');

            const buildNode = (outline) => {
                const text = outline.getAttribute('text') || '';

                // Collect non-text attributes
                let attrs = null;
                const attrNames = ['type', 'icon', 'isComment', 'cssTextClass'];
                for (const name of attrNames) {
                    const val = outline.getAttribute(name);
                    if (val) {
                        if (!attrs) attrs = {};
                        attrs[name] = val;
                    }
                }

                // Build children recursively
                const children = [];
                const childOutlines = outline.children;
                for (let i = 0; i < childOutlines.length; i++) {
                    if (childOutlines[i].tagName === 'outline') {
                        children.push(buildNode(childOutlines[i]));
                    }
                }

                return [text, attrs, children];
            };

            const body = xmlDoc.getElementsByTagName('body')[0];
            if (!body) return { tree: [], expansionState: [] };

            const tree = [];
            const topLevel = body.children;
            for (let i = 0; i < topLevel.length; i++) {
                if (topLevel[i].tagName === 'outline') {
                    tree.push(buildNode(topLevel[i]));
                }
            }

            // Extract expansion state from head
            let expansionState = [];
            const expansionStateEl = xmlDoc.getElementsByTagName('expansionState')[0];
            if (expansionStateEl && expansionStateEl.textContent) {
                expansionState = expansionStateEl.textContent
                    .split(/\s*,\s*/)
                    .filter(s => s !== '')
                    .map(s => parseInt(s, 10));
            }

            return { tree, expansionState };
        } catch (error) {
            console.error('Error extracting tree from note:', error);
            return { tree: [], expansionState: [] };
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

        const { tree, expansionState } = this.extractTreeFromNote(note);
        this.store.searchCache[note.key] = {
            title: note.title || '',
            tree: tree,
            expansionState: expansionState
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

            // Handle missing or old format cache
            if (!cached || !cached.tree) {
                console.warn(`Note ${note.key} not in cache, updating...`);
                this.updateNote(note);
                return;
            }

            const matches = this.findMatchesInTree(cached.tree, lowerQuery);
            if (matches.length > 0) {
                results.push({
                    noteKey: note.key,
                    noteTitle: note.title || 'Untitled',
                    matches: matches
                });
            }
        });

        return results;
    }

    /**
     * Traverse tree to find matches
     * Returns array of { text, pathIndices, highlightedText }
     */
    findMatchesInTree(tree, lowerQuery, pathPrefix = [], matches = []) {
        for (let i = 0; i < tree.length && matches.length < 5; i++) {
            const node = tree[i];
            const text = node[0];
            const children = node[2];
            const currentPath = [...pathPrefix, i];

            // Check if text matches
            const cleanText = this.stripHtml(text);
            if (cleanText.toLowerCase().includes(lowerQuery)) {
                matches.push({
                    text: cleanText,
                    pathIndices: currentPath,
                    highlightedText: this.highlightMatch(cleanText, lowerQuery)
                });
            }

            // Recurse into children
            if (children && children.length > 0 && matches.length < 5) {
                this.findMatchesInTree(children, lowerQuery, currentPath, matches);
            }
        }

        return matches;
    }

    /**
     * Find matches in a specific note (for backward compatibility)
     */
    findMatches(note, lowerQuery) {
        const cached = this.store.searchCache[note.key];
        if (!cached || !cached.tree) return [];

        return this.findMatchesInTree(cached.tree, lowerQuery);
    }

    /**
     * Highlight query matches in text
     */
    highlightMatch(text, query) {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');

        let displayText = text;
        if (text.length > 150) {
            const matchIndex = text.toLowerCase().indexOf(query.toLowerCase());
            if (matchIndex !== -1) {
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
     * Get cache statistics
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

    /**
     * Get cached tree for a note (for rendering)
     */
    getTree(noteKey) {
        const cached = this.store.searchCache[noteKey];
        return cached ? cached.tree : null;
    }

    /**
     * Get cached expansion state for a note
     */
    getExpansionState(noteKey) {
        const cached = this.store.searchCache[noteKey];
        return cached ? cached.expansionState : null;
    }

    // ========== Keyboard Navigation Methods ==========

    /**
     * Store results after search for keyboard navigation
     */
    setNavigationResults(results) {
        this.lastResults = results;
        this.focusedIndex = -1;
    }

    /**
     * Count total matches across all result groups
     */
    getTotalMatches() {
        let count = 0;
        this.lastResults.forEach(r => count += r.matches.length);
        return count;
    }

    /**
     * Navigate to next match, returns true if moved
     */
    navNext() {
        const total = this.getTotalMatches();
        if (total > 0 && this.focusedIndex < total - 1) {
            this.focusedIndex++;
            return true;
        }
        return false;
    }

    /**
     * Navigate to previous match, returns true if moved
     */
    navPrev() {
        if (this.focusedIndex > 0) {
            this.focusedIndex--;
            return true;
        } else if (this.focusedIndex === 0) {
            this.focusedIndex = -1;
            return true;
        }
        return false;
    }

    /**
     * Get the currently focused (result, match) pair
     */
    getFocused() {
        if (this.focusedIndex < 0) return null;
        let idx = 0;
        for (const result of this.lastResults) {
            for (const match of result.matches) {
                if (idx === this.focusedIndex) {
                    return { result, match };
                }
                idx++;
            }
        }
        return null;
    }

    /**
     * Check if a specific match is currently focused
     */
    isFocused(result, match) {
        const focused = this.getFocused();
        return focused !== null && focused.result === result && focused.match === match;
    }

    /**
     * Reset navigation to input focus
     */
    resetNav() {
        this.focusedIndex = -1;
    }
}
