describe("Note Safety Checks", function () {

    describe("Empty content detection", function () {

        it("should detect when OPML has real content (not empty outline)", function () {
            var opmlWithContent = '<opml><head/><body><outline text="Hello world"/></body></opml>';
            var hasContent = opmlWithContent.indexOf('<outline ') !== -1 &&
                opmlWithContent.indexOf('<outline text=""/>') === -1;
            expect(hasContent).toBe(true);
        });

        it("should detect when OPML has only empty outline", function () {
            var emptyOpml = '<opml><head/><body><outline text=""/></body></opml>';
            var hasContent = emptyOpml.indexOf('<outline ') !== -1 &&
                emptyOpml.indexOf('<outline text=""/>') === -1;
            expect(hasContent).toBe(false);
        });

        it("should detect when OPML has no outline at all", function () {
            var noOutline = '<opml><head/><body></body></opml>';
            var hasContent = noOutline.indexOf('<outline ') !== -1 &&
                noOutline.indexOf('<outline text=""/>') === -1;
            expect(hasContent).toBe(false);
        });

        it("should detect nested content as having content", function () {
            var nestedOpml = '<opml><head/><body><outline text="Parent"><outline text="Child"/></outline></body></opml>';
            var hasContent = nestedOpml.indexOf('<outline ') !== -1 &&
                nestedOpml.indexOf('<outline text=""/>') === -1;
            expect(hasContent).toBe(true);
        });

    });

    describe("Save safety rules", function () {

        it("should block save when nodeCount is 0 and note has a key (existing note)", function () {
            var nodeCount = 0;
            var storeNote = { key: 'abc123', value: '<opml><head/><body><outline text="content"/></body></opml>' };

            var shouldBlockSave = (nodeCount === 0 && storeNote && storeNote.key);
            expect(shouldBlockSave).toBe(true);
        });

        it("should allow save when nodeCount is 0 but note is new (no key)", function () {
            var nodeCount = 0;
            var storeNote = { key: null, value: '' };

            var shouldBlockSave = (nodeCount === 0 && storeNote && storeNote.key);
            expect(shouldBlockSave).toBe(false);
        });

        it("should allow save when nodeCount > 0", function () {
            var nodeCount = 5;
            var storeNote = { key: 'abc123', value: '<opml><head/><body><outline text="content"/></body></opml>' };

            var shouldBlockSave = (nodeCount === 0 && storeNote && storeNote.key);
            expect(shouldBlockSave).toBe(false);
        });

    });

    describe("Render safety rules", function () {

        it("should detect render failure when note had content but nodeCount is 0", function () {
            var nodeCount = 0;
            var noteValue = '<opml><head/><body><outline text="Important note"/></body></opml>';
            var noteHadContent = noteValue && noteValue.indexOf('<outline ') !== -1 &&
                noteValue.indexOf('<outline text=""/>') === -1;

            var renderFailed = (nodeCount === 0 && noteHadContent);
            expect(renderFailed).toBe(true);
        });

        it("should not flag render failure when note was empty and nodeCount is 0", function () {
            var nodeCount = 0;
            var noteValue = '<opml><head/><body><outline text=""/></body></opml>';
            var noteHadContent = noteValue && noteValue.indexOf('<outline ') !== -1 &&
                noteValue.indexOf('<outline text=""/>') === -1;

            var renderFailed = (nodeCount === 0 && noteHadContent);
            expect(renderFailed).toBe(false);
        });

        it("should not flag render failure when nodeCount > 0", function () {
            var nodeCount = 3;
            var noteValue = '<opml><head/><body><outline text="Important note"/></body></opml>';
            var noteHadContent = noteValue && noteValue.indexOf('<outline ') !== -1 &&
                noteValue.indexOf('<outline text=""/>') === -1;

            var renderFailed = (nodeCount === 0 && noteHadContent);
            expect(renderFailed).toBe(false);
        });

    });

});
