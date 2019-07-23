describe("Note functions", function () {

    beforeEach(function () {

    });

    it("should be able to construct title from OPML value", function () {
        var note = new Note('<opml><head/><body><outline text="hi"/></body></opml>')
        expect(note.title).toBe("hi");
    });

    it("should be able to construct empty title", function () {
        var note = new Note('<opml><head/><body><outline text=""/></body></opml>')
        expect(note.title).toBe("");
    });

    it("should return value that is set in constructor", function () {
        var note = new Note("123");
        expect(note.value).toBe("123");
    });

    it("should truncate long titles", function () {
        var note = new Note('<opml><head/><body><outline text="hi this is a new note that I created that has a very long title so we should truncate it, OK?"/></body></opml>');
        expect(note.title).toBe("hi this is a new note that I c...");
    });


});