describe('Note Service functions', function() {
    var ns;
    var _store; //mimic global :/
    var otag = 'Outline-OPML';

    beforeEach(function() {
        module('nsx');
        inject(function(_$controller_) {
            $controller = _$controller_;
        });

        ns = new NoteService($(defaultUtilsOutliner).concord());
        ns.np = new NoteProviderMock();
        window.store = null;
        _store = window.store = new NoteStore();
        _store.storageName = 'nsxData-tests2';

        window.ns = ns;
    });

    beforeEach(inject(function($rootScope) {
        $scope = $rootScope.$new();
        controller = $controller('MainCtrl', {
            $scope: $scope
        });
        ns.ngScope = $scope;
    }));

    it('should add received notes to store.notes collection', function() {
        //pass 2 notes to parse received notes
        //check store.notes.count and properties of notes

        ns.parseReceivedNote(createSimpleNote('123', 0, 'hi', 2));
        ns.parseReceivedNote(createSimpleNote('456', 0, 'hello', 5));
        ns.parseReceivedNote(createSimpleNote('789', 1, 'deleted', 3));

        expect(_store.notes.length).toBe(2);

        expect(_store.notes[0].key).toBe('123');
        expect(_store.notes[0].version).toBe(2);
        expect(_store.notes[0].title).toBe('hi');

        expect(_store.notes[1].key).toBe('456');
        expect(_store.notes[1].version).toBe(5);
        expect(_store.notes[1].title).toBe('hello');
    });

    it('should maintain the requested note count when trying to download notes + fails', function() {
        ns.setPendingNotes(5);

        ns.parseReceivedNote(createSimpleNote('123', 0, 'hi', 2));
        ns.parseReceivedNote(createSimpleNote('456', 0, 'hi', 2));
        ns.parseReceivedNote(createSimpleNote('789', 0, 'hi', 2));
        ns.onNoteActionFailure('FAIL');
        ns.onNoteActionFailure('FAIL');

        expect(ns.getPendingNotes()).toBe(0);
    });

    it('should log a user out if there is a 401 error', function() {
        ns.onNoteActionFailure('wotev', {
            status: 401
        });

        expect(ns.ngScope.showLogin).toBe(true);
    });

    it('should set newest note as selected, if all notes received and none selected', function() {
        ns.setPendingNotes(2);

        ns.parseReceivedNote(createSimpleNote('123', 0, 'hi', 2, 1));
        ns.parseReceivedNote(createSimpleNote('456', 0, 'hello', 5, 2));

        ns.tryFinishLoading();

        expect(_store.note.key).toBe('456');
    });

    xit('should set pending notes equal to 1 if calling loadNote with no pending note set', function() {
        ns.setPendingNotes(-1);

        ns.loadNote(new Note());

        expect(ns.getPendingNotes()).toBe(1);
    });

    xit('should indicate which note failed to download - API does not indicate Key! ', function() {
        ns.onNoteActionFailure();
    });

    it('should erase cached notes that are not part of the index', function() {
        //456 does not exist
        addNotesToStore();
        expect(_store.notes.length).toBe(2);

        var r = createNoteIndexResponse();
        r.data.push(createOutlineSimpleNote('123', 0));
        ns.parseNoteIndex(r.data);

        expect(_store.notes.length).toBe(1);
        expect(_store.notes[0].key).toBe('123');
    });

    it('should erase a deleted note received in parseReceivedNote', function() {
        //456 does not exist
        addNotesToStore();
        expect(_store.notes.length).toBe(2);

        ns.parseReceivedNote(createOutlineSimpleNote('456', 1));

        expect(_store.notes.length).toBe(1);
        expect(_store.notes[0].key).toBe('123');
    });

    it('on launch, should look for selected key and launch that note', function() {
        //create store with notes and selectedkey
        addNotesToStore();
        _store.selectedNoteKey = '456';

        ns.launchNote(null, true);

        expect(ns.outliner.editor.exportText(ns.outliner.root).trim()).toBe(
            'Value of 456'
        );
    });

    it('on launch, launch first newest if no selected key saved', function() {
        //create store with notes and selectedkey
        addNotesToStore();
        _store.selectedNoteKey = null;

        ns.launchNote(null, true);

        expect(ns.outliner.editor.exportText(ns.outliner.root).trim()).toBe(
            'Value of 456'
        );
    });

    it('should be able to create a new Note', function() {
        ns.createNote();

        expect(ns.outliner.editor.exportText(ns.outliner.root).trim()).toBe('');

        //simulate server response
        ns.onNoteCreated(new createOutlineSimpleNote('1234', 0, ''));
        expect(store.notes.length).toBe(1);
        expect(store.selectedNoteKey).toBe('1234');
    });

    it('should be able to delete a Note', function() {
        addNotesToStore();
        _store.selectedNoteKey = '456';

        ns.deleteNote();

        expect(store.notes.length).toBe(1);
        expect(store.selectedNoteKey).toBe('123');
    });

    it('should save the modifydate', function() {
        var d = 1456874127;
        var n = createOutlineSimpleNote('123', 0, '', 1, d);

        ns.setPendingNotes(1);
        ns.parseReceivedNote(n);

        expect(store.notes.length).toBe(1);
        expect(store.note.modifydate).toBe(d);
    });

    it('should not set force refresh if incoming note has no content', function() {
        addNotesToStore();

        var replacedLaunchfn = function(n, force) {
            expect(force).toBe(false);
        };

        var sn = {};
        sn.key = 123;
        sn.version = 2;

        store.selectedNoteKey = sn.key;

        ns.launchNote = replacedLaunchfn;
        ns.parseReceivedNote(sn);
    });

    it('should set force refresh if saved note modify date is old', function() {
        //setup stored note with a version null
        //check usedefault / force

        addNotesToStore();
        store.notes[0].modifydate = 1;

        var replacedLaunchfn = function(n, force) {
            expect(force).toBe(true);
        };

        var sn = {};
        sn.key = 123;
        sn.modifydate = 100;
        sn.content = 'YO';
        store.selectedNoteKey = sn.key;

        ns.launchNote = replacedLaunchfn;
        ns.parseReceivedNote(sn);
    });

    it('should not force refresh if saved note version is old but note is open and being saved', function() {
        //setup stored note with a version null
        //check usedefault / force

        addNotesToStore();
        store.notes[0].version = 1;

        var replacedLaunchfn = function(n, force) {
            expect(force).toBe(false);
        };

        var n = new Note('Updated Content', '123');
        n.version = 2;
        store.selectedNoteKey = n.key;
        ns.ngScope.saveState = saveStates.saving;

        ns.launchNote = replacedLaunchfn;
        ns.parseReceivedNote(n);
    });

    it("should launch note if note.value is ''", function() {
        var n = new Note();
        n.key = '123';
        n.value = '';

        ns.launchNote(n, true);
        expect(store.note.key).toBe('123');
    });

    it('should not force launch on new note created (Expects current selection to be fresh note)', function() {
        var replacedLaunchfn = function(n, force) {
            expect(force).toBe(false);
        };

        var sn = {
            key: '123',
            deleted: 0
        };
        ns.launchNote = replacedLaunchfn;
        ns.onNoteCreated(sn);
    });

    it('should reset old note and request the newer version if the existing one is outtdated, and delete unrecognized notes', function() {
        var loadNoteCount = 0;
        var replacedLoadNotefn = function(n) {
            expect(n.key).toBe('456');
            loadNoteCount++;
        };

        addNotesToStore();
        var n = new Note(
            '<opml><head/><body><outline text="Value of 456"></outline></body></opml>'
        );
        n.version = 1;
        n.key = '789';
        _store.addNote(n);

        expect(_store.notes.length).toBe(3);

        var r = createNoteIndexResponse();
        r.data.push(createOutlineSimpleNote('123', 0, '', 1, 1));
        r.data.push(createOutlineSimpleNote('456', 0, '', 2, 10));
        ns.loadNote = replacedLoadNotefn;

        ns.parseNoteIndex(r.data);

        expect(_store.notes.length).toBe(2);
        expect(loadNoteCount).toBe(1);
    });

    it('should update the note title when text changed', function() {
        //Create note, verify title
        var note = createSimpleNote('123', 0, 'Title 1', 2);
        ns.parseReceivedNote(note);

        expect(_store.notes[0].title).toBe('Title 1');

        //Update title
        note.content = createNoteContent('Title 2');
        note.version = 3;
        ns.parseReceivedNote(note);

        expect(_store.notes[0].title).toBe('Title 2');
    });

    describe('The Utils Functions ', function() {
        it('should remove focus when clicking on empty body area', function() {
            spyOn(concord, 'removeFocus');
            var e = {
                type: 'touchend',
                target: createDiv('wot', 'divOutlinerContainer')
            };
            $(document).trigger(e);

            expect(concord.removeFocus).toHaveBeenCalled();

            var e = {
                type: 'touchend',
                target: createDiv('main')
            };
            $(document).trigger(e);

            expect(concord.removeFocus.calls.count()).toEqual(2);
        });

        it('should remove focus when clicking on footer', function() {
            spyOn(concord, 'removeFocus');
            var e = {
                type: 'touchend',
                target: createDiv('footer')
            };
            $(document).trigger(e);

            expect(concord.removeFocus).toHaveBeenCalled();
        });

        it('should NOT remove focus when clicking on indent icons', function() {
            spyOn(concord, 'removeFocus');
            var e = {
                type: 'touchend',
                target: createDiv('wot', 'bar-icon-left')
            };
            $(document).trigger(e);

            expect(concord.removeFocus).not.toHaveBeenCalled();
        });

        it('should NOT remove focus when clicking same row that is being edited', function() {
            spyOn(concord, 'removeFocus');
            var e = {
                type: 'touchend',
                target: createDiv('wot', 'concord-text')
            };
            $(document).trigger(e);

            expect(concord.removeFocus).not.toHaveBeenCalled();
        });
    });

    function createOutlineSimpleNote(k, del, c, v, d) {
        var n = createSimpleNote(k, del, c, v, d);
        n.tags = [otag];
        return n;
    }

    function createSimpleNote(k, del, c, v, d) {
        return {
            key: k,
            deleted: del,
            content:
                '<opml version="2.0"><head></head><body><outline text="' +
                c +
                '"/></body></opml>',
            version: v,
            modifydate: d
        };
    }

    function createNoteContent(content) {
        return (
            '<opml version="2.0"><head></head><body><outline text="' +
            content +
            '"/></body></opml>'
        );
    }

    function addNotesToStore() {
        var n = new Note(
            '<opml><head/><body><outline text="Value of 123"></outline></body></opml>'
        );
        n.key = '123';
        n.version = 1;
        n.modifydate = 1;
        _store.addNote(n);
        n = new Note(
            '<opml><head/><body><outline text="Value of 456"></outline></body></opml>'
        );
        n.version = 1;
        n.key = '456';
        n.modifydate = 2;
        _store.addNote(n);
    }

    function createNoteIndexResponse() {
        var resp = {};
        resp.count = 0;
        resp.data = [];
        return resp;
    }

    function createDiv(id, classes) {
        //no # prefix for id
        var div = document.createElement('div');
        div.innerHTML = 'oh hai!';
        if (classes) div.setAttribute('class', classes);
        if (id) div.id = id;
        return div;
    }
});
