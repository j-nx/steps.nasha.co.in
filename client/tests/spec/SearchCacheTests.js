describe('SearchCacheManager', function () {
    var searchCache;
    var mockStore;

    function createNote(key, title, content) {
        return {
            key: key,
            title: title,
            value:
                '<opml version="2.0"><head></head><body><outline text="' +
                content +
                '"/></body></opml>'
        };
    }

    function createNoteWithMultipleLines(key, title, lines) {
        var outlines = lines
            .map(function (line) {
                return '<outline text="' + line + '"/>';
            })
            .join('');
        return {
            key: key,
            title: title,
            value:
                '<opml version="2.0"><head></head><body>' +
                outlines +
                '</body></opml>'
        };
    }

    function createNoteWithHierarchy(key, title) {
        return {
            key: key,
            title: title,
            value:
                '<opml version="2.0"><head></head><body>' +
                '<outline text="Parent">' +
                '<outline text="Child 1"/>' +
                '<outline text="Child 2"/>' +
                '</outline>' +
                '</body></opml>'
        };
    }

    beforeEach(function () {
        mockStore = {
            notes: [],
            searchCache: {}
        };
        searchCache = new SearchCacheManager(mockStore);
    });

    describe('extractTreeFromNote', function () {
        it('should extract tree from OPML note', function () {
            var note = createNote('123', 'My Title', 'Hello World');
            var result = searchCache.extractTreeFromNote(note);

            expect(result.tree.length).toBe(1);
            expect(result.tree[0][0]).toBe('Hello World'); // text
            expect(result.tree[0][1]).toBe(null); // no attrs
            expect(result.tree[0][2]).toEqual([]); // no children
            expect(result.expansionState).toEqual([]); // no expansion state
        });

        it('should return empty arrays for null note', function () {
            var result = searchCache.extractTreeFromNote(null);
            expect(result.tree).toEqual([]);
            expect(result.expansionState).toEqual([]);
        });

        it('should return empty arrays for note without value', function () {
            var result = searchCache.extractTreeFromNote({ key: '123' });
            expect(result.tree).toEqual([]);
            expect(result.expansionState).toEqual([]);
        });

        it('should preserve hierarchy', function () {
            var note = createNoteWithHierarchy('123', 'Test');
            var result = searchCache.extractTreeFromNote(note);

            expect(result.tree.length).toBe(1);
            expect(result.tree[0][0]).toBe('Parent');
            expect(result.tree[0][2].length).toBe(2); // 2 children
            expect(result.tree[0][2][0][0]).toBe('Child 1');
            expect(result.tree[0][2][1][0]).toBe('Child 2');
        });

        it('should extract attributes', function () {
            var note = {
                key: '123',
                title: 'Test',
                value:
                    '<opml><body><outline text="Task" type="task" icon="check"/></body></opml>'
            };
            var result = searchCache.extractTreeFromNote(note);

            expect(result.tree[0][1]).toEqual({ type: 'task', icon: 'check' });
        });

        it('should extract expansion state from OPML', function () {
            var note = {
                key: '123',
                title: 'Test',
                value:
                    '<opml><head><expansionState>1,2,5</expansionState></head><body>' +
                    '<outline text="Parent"><outline text="Child"/></outline>' +
                    '</body></opml>'
            };
            var result = searchCache.extractTreeFromNote(note);

            expect(result.expansionState).toEqual([1, 2, 5]);
        });

        it('should handle empty expansion state', function () {
            var note = {
                key: '123',
                title: 'Test',
                value:
                    '<opml><head><expansionState></expansionState></head><body>' +
                    '<outline text="Content"/></body></opml>'
            };
            var result = searchCache.extractTreeFromNote(note);

            expect(result.expansionState).toEqual([]);
        });

        it('should handle expansion state with whitespace', function () {
            var note = {
                key: '123',
                title: 'Test',
                value:
                    '<opml><head><expansionState>1, 3 , 7</expansionState></head><body>' +
                    '<outline text="Content"/></body></opml>'
            };
            var result = searchCache.extractTreeFromNote(note);

            expect(result.expansionState).toEqual([1, 3, 7]);
        });
    });

    describe('updateNote', function () {
        it('should add note to cache with tree structure', function () {
            var note = createNote('123', 'Test', 'Content');
            searchCache.updateNote(note);

            expect(mockStore.searchCache['123']).toBeDefined();
            expect(mockStore.searchCache['123'].title).toBe('Test');
            expect(mockStore.searchCache['123'].tree).toBeDefined();
            expect(mockStore.searchCache['123'].tree.length).toBe(1);
        });

        it('should not add note without key', function () {
            searchCache.updateNote({ title: 'No Key' });

            expect(Object.keys(mockStore.searchCache).length).toBe(0);
        });

        it('should update existing cache entry', function () {
            var note = createNote('123', 'Test', 'Original');
            searchCache.updateNote(note);

            note.value = '<opml><body><outline text="Updated"/></body></opml>';
            searchCache.updateNote(note);

            expect(mockStore.searchCache['123'].tree[0][0]).toBe('Updated');
        });

        it('should store expansion state in cache', function () {
            var note = {
                key: '123',
                title: 'Test',
                value:
                    '<opml><head><expansionState>1,3,5</expansionState></head><body>' +
                    '<outline text="Parent"><outline text="Child"/></outline>' +
                    '</body></opml>'
            };
            searchCache.updateNote(note);

            expect(mockStore.searchCache['123'].expansionState).toEqual([1, 3, 5]);
        });
    });

    describe('deleteNote', function () {
        it('should remove note from cache', function () {
            mockStore.searchCache['123'] = { title: 'test', tree: [] };
            searchCache.deleteNote('123');

            expect(mockStore.searchCache['123']).toBeUndefined();
        });

        it('should handle deleting non-existent note', function () {
            expect(function () {
                searchCache.deleteNote('nonexistent');
            }).not.toThrow();
        });
    });

    describe('rebuildCache', function () {
        it('should rebuild cache from all notes', function () {
            mockStore.notes = [
                createNote('1', 'First', 'Content One'),
                createNote('2', 'Second', 'Content Two')
            ];

            searchCache.rebuildCache();

            expect(Object.keys(mockStore.searchCache).length).toBe(2);
            expect(mockStore.searchCache['1'].tree[0][0]).toBe('Content One');
            expect(mockStore.searchCache['2'].tree[0][0]).toBe('Content Two');
        });

        it('should clear existing cache before rebuilding', function () {
            mockStore.searchCache['old'] = { title: 'old', tree: [] };
            mockStore.notes = [createNote('new', 'New', 'New Content')];

            searchCache.rebuildCache();

            expect(mockStore.searchCache['old']).toBeUndefined();
            expect(mockStore.searchCache['new']).toBeDefined();
        });
    });

    describe('search', function () {
        beforeEach(function () {
            mockStore.notes = [
                createNote('1', 'JavaScript Guide', 'Learn JavaScript basics'),
                createNote('2', 'Python Tutorial', 'Python programming intro'),
                createNote('3', 'Web Development', 'HTML CSS JavaScript')
            ];
            searchCache.rebuildCache();
        });

        it('should find notes matching query', function () {
            var results = searchCache.search('javascript');

            expect(results.length).toBe(2);
        });

        it('should be case insensitive', function () {
            var results = searchCache.search('JAVASCRIPT');

            expect(results.length).toBe(2);
        });

        it('should return empty array for short queries', function () {
            expect(searchCache.search('a').length).toBe(0);
            expect(searchCache.search('').length).toBe(0);
            expect(searchCache.search(null).length).toBe(0);
        });

        it('should return empty array when no matches', function () {
            var results = searchCache.search('nonexistent');

            expect(results.length).toBe(0);
        });

        it('should include note key and title in results', function () {
            var results = searchCache.search('python');

            expect(results.length).toBe(1);
            expect(results[0].noteKey).toBe('2');
            expect(results[0].noteTitle).toBe('Python Tutorial');
        });

        it('should include matches with highlighted text', function () {
            var results = searchCache.search('python');

            expect(results[0].matches.length).toBeGreaterThan(0);
            expect(results[0].matches[0].highlightedText).toContain('<mark>');
        });

        it('should include pathIndices in matches', function () {
            var results = searchCache.search('python');

            expect(results[0].matches[0].pathIndices).toBeDefined();
            expect(Array.isArray(results[0].matches[0].pathIndices)).toBe(true);
        });
    });

    describe('findMatchesInTree', function () {
        it('should find matching nodes in tree', function () {
            var note = createNoteWithMultipleLines('1', 'Test', [
                'First line with apple',
                'Second line without',
                'Third line with apple too'
            ]);
            searchCache.updateNote(note);

            var matches = searchCache.findMatches(note, 'apple');

            expect(matches.length).toBe(2);
        });

        it('should limit matches to 5 per note', function () {
            var lines = [];
            for (var i = 0; i < 10; i++) {
                lines.push('Line ' + i + ' with keyword');
            }
            var note = createNoteWithMultipleLines('1', 'Test', lines);
            searchCache.updateNote(note);

            var matches = searchCache.findMatches(note, 'keyword');

            expect(matches.length).toBe(5);
        });

        it('should include correct pathIndices for nested items', function () {
            var note = createNoteWithHierarchy('1', 'Test');
            searchCache.updateNote(note);

            var matches = searchCache.findMatches(note, 'child 1');

            expect(matches.length).toBe(1);
            expect(matches[0].pathIndices).toEqual([0, 0]); // First child of first parent
        });
    });

    describe('highlightMatch', function () {
        it('should wrap match in mark tags', function () {
            var result = searchCache.highlightMatch('Hello World', 'world');

            expect(result).toContain('<mark>World</mark>');
        });

        it('should preserve original case in highlighted text', function () {
            var result = searchCache.highlightMatch(
                'JavaScript is great',
                'javascript'
            );

            expect(result).toContain('<mark>JavaScript</mark>');
        });

        it('should truncate long text with context', function () {
            var longText = 'A'.repeat(100) + 'MATCH' + 'B'.repeat(100);
            var result = searchCache.highlightMatch(longText, 'match');

            expect(result.length).toBeLessThan(longText.length);
            expect(result).toContain('...');
            expect(result).toContain('<mark>MATCH</mark>');
        });
    });

    describe('getTree', function () {
        it('should return cached tree for a note', function () {
            var note = createNote('123', 'Test', 'Content');
            searchCache.updateNote(note);

            var tree = searchCache.getTree('123');

            expect(tree).toBeDefined();
            expect(tree.length).toBe(1);
            expect(tree[0][0]).toBe('Content');
        });

        it('should return null for non-existent note', function () {
            var tree = searchCache.getTree('nonexistent');

            expect(tree).toBeNull();
        });
    });

    describe('getExpansionState', function () {
        it('should return cached expansion state for a note', function () {
            var note = {
                key: '123',
                title: 'Test',
                value:
                    '<opml><head><expansionState>1,2,3</expansionState></head><body>' +
                    '<outline text="Content"/></body></opml>'
            };
            searchCache.updateNote(note);

            var expansionState = searchCache.getExpansionState('123');

            expect(expansionState).toEqual([1, 2, 3]);
        });

        it('should return null for non-existent note', function () {
            var expansionState = searchCache.getExpansionState('nonexistent');

            expect(expansionState).toBeNull();
        });

        it('should return empty array for note without expansion state', function () {
            var note = createNote('123', 'Test', 'Content');
            searchCache.updateNote(note);

            var expansionState = searchCache.getExpansionState('123');

            expect(expansionState).toEqual([]);
        });
    });

    describe('getStats', function () {
        it('should return cache statistics', function () {
            mockStore.notes = [
                createNote('1', 'First', 'Content'),
                createNote('2', 'Second', 'Content')
            ];
            searchCache.rebuildCache();

            var stats = searchCache.getStats();

            expect(stats.cachedNotes).toBe(2);
            expect(stats.totalNotes).toBe(2);
            expect(stats.syncStatus).toBe('synced');
        });

        it('should detect out of sync cache', function () {
            mockStore.notes = [createNote('1', 'First', 'Content')];
            // Don't rebuild cache - leave it empty

            var stats = searchCache.getStats();

            expect(stats.syncStatus).toBe('out of sync');
        });
    });

    describe('Keyboard Navigation', function () {
        var mockResults;

        beforeEach(function () {
            // Create mock search results with 2 groups, 3 total matches
            mockResults = [
                {
                    noteKey: '1',
                    noteTitle: 'Note One',
                    matches: [
                        { text: 'Match 1', pathIndices: [0] },
                        { text: 'Match 2', pathIndices: [1] }
                    ]
                },
                {
                    noteKey: '2',
                    noteTitle: 'Note Two',
                    matches: [
                        { text: 'Match 3', pathIndices: [0] }
                    ]
                }
            ];
        });

        describe('setNavigationResults', function () {
            it('should store results and reset focusedIndex', function () {
                searchCache.focusedIndex = 5;
                searchCache.setNavigationResults(mockResults);

                expect(searchCache.lastResults).toBe(mockResults);
                expect(searchCache.focusedIndex).toBe(-1);
            });
        });

        describe('getTotalMatches', function () {
            it('should count all matches across groups', function () {
                searchCache.setNavigationResults(mockResults);

                expect(searchCache.getTotalMatches()).toBe(3);
            });

            it('should return 0 for empty results', function () {
                searchCache.setNavigationResults([]);

                expect(searchCache.getTotalMatches()).toBe(0);
            });
        });

        describe('navNext', function () {
            beforeEach(function () {
                searchCache.setNavigationResults(mockResults);
            });

            it('should move from -1 to 0 on first call', function () {
                var moved = searchCache.navNext();

                expect(moved).toBe(true);
                expect(searchCache.focusedIndex).toBe(0);
            });

            it('should increment focusedIndex', function () {
                searchCache.navNext();
                searchCache.navNext();

                expect(searchCache.focusedIndex).toBe(1);
            });

            it('should not go past last result', function () {
                searchCache.focusedIndex = 2; // last item (0-indexed)
                var moved = searchCache.navNext();

                expect(moved).toBe(false);
                expect(searchCache.focusedIndex).toBe(2);
            });

            it('should return false for empty results', function () {
                searchCache.setNavigationResults([]);
                var moved = searchCache.navNext();

                expect(moved).toBe(false);
            });
        });

        describe('navPrev', function () {
            beforeEach(function () {
                searchCache.setNavigationResults(mockResults);
            });

            it('should decrement focusedIndex', function () {
                searchCache.focusedIndex = 2;
                var moved = searchCache.navPrev();

                expect(moved).toBe(true);
                expect(searchCache.focusedIndex).toBe(1);
            });

            it('should go from 0 to -1', function () {
                searchCache.focusedIndex = 0;
                var moved = searchCache.navPrev();

                expect(moved).toBe(true);
                expect(searchCache.focusedIndex).toBe(-1);
            });

            it('should return false when already at -1', function () {
                searchCache.focusedIndex = -1;
                var moved = searchCache.navPrev();

                expect(moved).toBe(false);
                expect(searchCache.focusedIndex).toBe(-1);
            });
        });

        describe('getFocused', function () {
            beforeEach(function () {
                searchCache.setNavigationResults(mockResults);
            });

            it('should return null when focusedIndex is -1', function () {
                expect(searchCache.getFocused()).toBeNull();
            });

            it('should return first match at index 0', function () {
                searchCache.focusedIndex = 0;
                var focused = searchCache.getFocused();

                expect(focused.result).toBe(mockResults[0]);
                expect(focused.match).toBe(mockResults[0].matches[0]);
            });

            it('should return correct match across groups', function () {
                searchCache.focusedIndex = 2; // Third match (in second group)
                var focused = searchCache.getFocused();

                expect(focused.result).toBe(mockResults[1]);
                expect(focused.match).toBe(mockResults[1].matches[0]);
            });

            it('should return null for out of bounds index', function () {
                searchCache.focusedIndex = 99;
                expect(searchCache.getFocused()).toBeNull();
            });
        });

        describe('isFocused', function () {
            beforeEach(function () {
                searchCache.setNavigationResults(mockResults);
            });

            it('should return false when nothing is focused', function () {
                var result = searchCache.isFocused(mockResults[0], mockResults[0].matches[0]);
                expect(result).toBe(false);
            });

            it('should return true for focused match', function () {
                searchCache.focusedIndex = 0;
                var result = searchCache.isFocused(mockResults[0], mockResults[0].matches[0]);
                expect(result).toBe(true);
            });

            it('should return false for non-focused match', function () {
                searchCache.focusedIndex = 0;
                var result = searchCache.isFocused(mockResults[0], mockResults[0].matches[1]);
                expect(result).toBe(false);
            });
        });

        describe('resetNav', function () {
            it('should reset focusedIndex to -1', function () {
                searchCache.focusedIndex = 5;
                searchCache.resetNav();

                expect(searchCache.focusedIndex).toBe(-1);
            });
        });
    });
});
