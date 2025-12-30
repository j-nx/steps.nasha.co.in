describe('SearchCacheManager', function() {
    var searchCache;
    var mockStore;

    function createNote(key, title, content) {
        return {
            key: key,
            title: title,
            value: '<opml version="2.0"><head></head><body><outline text="' + content + '"/></body></opml>'
        };
    }

    function createNoteWithMultipleLines(key, title, lines) {
        var outlines = lines.map(function(line) {
            return '<outline text="' + line + '"/>';
        }).join('');
        return {
            key: key,
            title: title,
            value: '<opml version="2.0"><head></head><body>' + outlines + '</body></opml>'
        };
    }

    beforeEach(function() {
        mockStore = {
            notes: [],
            searchCache: {}
        };
        searchCache = new SearchCacheManager(mockStore);
    });

    describe('extractTextFromNote', function() {
        it('should extract text from OPML note', function() {
            var note = createNote('123', 'My Title', 'Hello World');
            var text = searchCache.extractTextFromNote(note);

            expect(text).toContain('my title');
            expect(text).toContain('hello world');
        });

        it('should return empty string for null note', function() {
            expect(searchCache.extractTextFromNote(null)).toBe('');
        });

        it('should return empty string for note without value', function() {
            expect(searchCache.extractTextFromNote({ key: '123' })).toBe('');
        });

        it('should strip HTML tags from text', function() {
            var note = {
                key: '123',
                title: 'Test',
                value: '<opml><body><outline text="Hello &lt;b&gt;World&lt;/b&gt;"/></body></opml>'
            };
            var text = searchCache.extractTextFromNote(note);

            expect(text).toContain('hello');
            expect(text).toContain('world');
            expect(text).not.toContain('<b>');
        });

        it('should convert text to lowercase', function() {
            var note = createNote('123', 'UPPERCASE', 'MiXeD CaSe');
            var text = searchCache.extractTextFromNote(note);

            expect(text).toContain('uppercase');
            expect(text).toContain('mixed case');
        });
    });

    describe('updateNote', function() {
        it('should add note to cache', function() {
            var note = createNote('123', 'Test', 'Content');
            searchCache.updateNote(note);

            expect(mockStore.searchCache['123']).toBeDefined();
            expect(mockStore.searchCache['123']).toContain('content');
        });

        it('should not add note without key', function() {
            searchCache.updateNote({ title: 'No Key' });

            expect(Object.keys(mockStore.searchCache).length).toBe(0);
        });

        it('should update existing cache entry', function() {
            var note = createNote('123', 'Test', 'Original');
            searchCache.updateNote(note);

            note.value = '<opml><body><outline text="Updated"/></body></opml>';
            searchCache.updateNote(note);

            expect(mockStore.searchCache['123']).toContain('updated');
            expect(mockStore.searchCache['123']).not.toContain('original');
        });
    });

    describe('deleteNote', function() {
        it('should remove note from cache', function() {
            mockStore.searchCache['123'] = 'cached text';
            searchCache.deleteNote('123');

            expect(mockStore.searchCache['123']).toBeUndefined();
        });

        it('should handle deleting non-existent note', function() {
            expect(function() {
                searchCache.deleteNote('nonexistent');
            }).not.toThrow();
        });
    });

    describe('rebuildCache', function() {
        it('should rebuild cache from all notes', function() {
            mockStore.notes = [
                createNote('1', 'First', 'Content One'),
                createNote('2', 'Second', 'Content Two')
            ];

            searchCache.rebuildCache();

            expect(Object.keys(mockStore.searchCache).length).toBe(2);
            expect(mockStore.searchCache['1']).toContain('content one');
            expect(mockStore.searchCache['2']).toContain('content two');
        });

        it('should clear existing cache before rebuilding', function() {
            mockStore.searchCache['old'] = 'old cached data';
            mockStore.notes = [createNote('new', 'New', 'New Content')];

            searchCache.rebuildCache();

            expect(mockStore.searchCache['old']).toBeUndefined();
            expect(mockStore.searchCache['new']).toBeDefined();
        });
    });

    describe('search', function() {
        beforeEach(function() {
            mockStore.notes = [
                createNote('1', 'JavaScript Guide', 'Learn JavaScript basics'),
                createNote('2', 'Python Tutorial', 'Python programming intro'),
                createNote('3', 'Web Development', 'HTML CSS JavaScript')
            ];
            searchCache.rebuildCache();
        });

        it('should find notes matching query', function() {
            var results = searchCache.search('javascript');

            expect(results.length).toBe(2);
        });

        it('should be case insensitive', function() {
            var results = searchCache.search('JAVASCRIPT');

            expect(results.length).toBe(2);
        });

        it('should return empty array for short queries', function() {
            expect(searchCache.search('a').length).toBe(0);
            expect(searchCache.search('').length).toBe(0);
            expect(searchCache.search(null).length).toBe(0);
        });

        it('should return empty array when no matches', function() {
            var results = searchCache.search('nonexistent');

            expect(results.length).toBe(0);
        });

        it('should include note key and title in results', function() {
            var results = searchCache.search('python');

            expect(results.length).toBe(1);
            expect(results[0].noteKey).toBe('2');
            expect(results[0].noteTitle).toBe('Python Tutorial');
        });

        it('should include matches with highlighted text', function() {
            var results = searchCache.search('python');

            expect(results[0].matches.length).toBeGreaterThan(0);
            expect(results[0].matches[0].highlightedText).toContain('<mark>');
        });
    });

    describe('findMatches', function() {
        it('should find matching lines in note', function() {
            var note = createNoteWithMultipleLines('1', 'Test', [
                'First line with apple',
                'Second line without',
                'Third line with apple too'
            ]);

            var matches = searchCache.findMatches(note, 'apple');

            expect(matches.length).toBe(2);
        });

        it('should limit matches to 5 per note', function() {
            var lines = [];
            for (var i = 0; i < 10; i++) {
                lines.push('Line ' + i + ' with keyword');
            }
            var note = createNoteWithMultipleLines('1', 'Test', lines);

            var matches = searchCache.findMatches(note, 'keyword');

            expect(matches.length).toBe(5);
        });
    });

    describe('highlightMatch', function() {
        it('should wrap match in mark tags', function() {
            var result = searchCache.highlightMatch('Hello World', 'world');

            expect(result).toContain('<mark>World</mark>');
        });

        it('should preserve original case in highlighted text', function() {
            var result = searchCache.highlightMatch('JavaScript is great', 'javascript');

            expect(result).toContain('<mark>JavaScript</mark>');
        });

        it('should truncate long text with context', function() {
            var longText = 'A'.repeat(100) + 'MATCH' + 'B'.repeat(100);
            var result = searchCache.highlightMatch(longText, 'match');

            expect(result.length).toBeLessThan(longText.length);
            expect(result).toContain('...');
            expect(result).toContain('<mark>MATCH</mark>');
        });
    });

    describe('getStats', function() {
        it('should return cache statistics', function() {
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

        it('should detect out of sync cache', function() {
            mockStore.notes = [createNote('1', 'First', 'Content')];
            // Don't rebuild cache - leave it empty

            var stats = searchCache.getStats();

            expect(stats.syncStatus).toBe('out of sync');
        });
    });
});
