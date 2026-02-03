//'use strict';
/*jslint browser:true */
/* global store, ns, DEBUG */

/* NoteProvider Class*/
//Mockable
{
    function NoteProvider() {
        //Bindings for preserving 'this' in member calls
        this.saveNote = NoteProvider.prototype.saveNote.bind(this);
    }

    NoteProvider.prototype.login = function (login, callback) {
        //Todo: Can add validation to check if user/password is empty etc not needed tho
        //this runs on separate thread

        //defaults
        var status = {};
        status.isSuccess = false;
        status.code = 0;

        console.log('Attempting OAuth');

        api.signIn();
    };

    NoteProvider.prototype.logOut = function (login) {
        api.signOut();
    };

    NoteProvider.prototype.isLoggedIn = function () {
        if (isOffline) return true;
        return api.isLoggedIn();
    };

    NoteProvider.prototype.getNoteIndex = function (callback) {
        if (api == null || api == undefined) return; //log fatal

        api.retrieveIndex({
            success: function (resultsArray) {
                console.debug(
                    'Found ' + resultsArray.length + ' notes in index'
                );
                callback(resultsArray);
            },
            error: function (code) {
                console.error(
                    'Fatal Error: Failed to get note indices ' + code
                );
                callback(code);
            }
        });
    };

    NoteProvider.prototype.getNote = function (note, callback, errorCallback) {
        api.retrieveNote({
            key: note.key,
            success: function (content) {
                //console.info("Successfully retrieved note " + noteHash.key); //noise

                callback({ ...note, content });

                // >> {
                // >>   body: "my example note",
                // >>   key: "[SimpleNote-internal ID string]",
                // >>   modifydate: [Date object],
                // >>   createdate: [Date object],
                // >>   deleted: false
                // >> }
                // this becomes your interface for bare noteObj
            },
            error: function (code) {
                console.error('Failed to retrieve note ' + key + ' \n' + code);
                errorCallback(code);
            }
        });
    };

    NoteProvider.prototype.saveNote = function (
        body,
        tag,
        callback,
        errorCallback
    ) {
        api.createNote({
            body,
            success: function (note) {
                callback(note);
            },
            error: function (errorCode) {
                console.error('Failed to save note. \n' + errorCode);
                errorCallback(errorCode);
            }
        });
    };

    NoteProvider.prototype.updateNote = function (
        key,
        noteBody,
        tag,
        version,
        deleted,
        callback,
        errorCallback
    ) {
        api.updateNote({
            key: key,
            body: noteBody,
            success: function (note) {
                callback(note);
            },
            error: function (errorCode) {
                console.error('Failed to update note. \n' + errorCode);
                errorCallback(errorCode, { status: errorCode });
            }
        });
    };

    NoteProvider.prototype.deleteNote = function (
        key,
        callback,
        errorCallback
    ) {
        api.deleteNote({
            key: key,
            success: function (key) {
                callback({ key, deleted: 1 });
            },
            error: function (errorCode) {
                console.error('Failed to delete note. \n' + errorCode);
                errorCallback(errorCode, { status: errorCode });
            }
        });
    };

    NoteProvider.prototype.initPolling = function (callback) {
        api.initPolling(callback);
    };

    NoteProvider.prototype.getChanges = function (callback) {
        api.getChanges({
            success: function (changes) {
                callback(changes);
            },
            error: function (code) {
                console.error('Failed to poll changes: ' + code);
            }
        });
    };

    NoteProvider.prototype.searchNotes = function (searchTerm, callback) {
        /* if (this.sn == null || this.sn == undefined) return; //log fatal

        var results = {};
        results.isSucces = false;
        results.error = '';

        this.sn.searchNotes({
            query: searchTerm,
            maxResults: 50,
            success: function (resultsHash) {
                console.info("Get Notes Success, Total records " + resultsHash.totalRecords);
                results.data = resultsHash;
                results.isSuccess = true;
                callback(results);
            },
            error: function (code) {
                console.error("Get notes error " + code);
                results.error = code;
                callback(results);
            }
        }); */
    };

    NoteProvider.prototype.getNotesByTag = function (tag) {
        // search index for tag
        //underscore
    };
}

/* NoteService */
/*using alternate way of defining a class
- Pros, easier to write up
- Cons, doesn't collapse'*/
function NoteService(concord) {
    this.np = new NoteProvider();
    this.outliner = concord;
    this.ngScope = null; //MainScope
    this.noteCacheManager = null;

    this.m = {
        sessionExpired: 'Session expired.',
        unauthorized: 'Authorization failed.'
    };

    var pendingNotes = 0; //counter to track # notes requested / saving
    this.incrementPendingNotes = function () {
        pendingNotes++;
        console.debug(
            '------- Incrementing Pending Notes, new count ' + pendingNotes
        );
    }.bind(this);

    this.decrementPendingNotes = function () {
        --pendingNotes;
        this.ngScope.setLoadingCountdown(
            store.notes.length - pendingNotes,
            store.notes.length
        );
        console.debug(
            '------- Decrementing Pending Notes, new count ' + pendingNotes
        );
    }.bind(this);

    this.getPendingNotes = function () {
        return pendingNotes;
    }.bind(this);

    this.setPendingNotes = function (v) {
        pendingNotes = v;
    }.bind(this);

    this.start = function () {
        var controllerElement = document.querySelector('#main');
        this.ngScope = angular.element(controllerElement).scope();

        if (!store) store = new NoteStore();
        this.ngScope.store = store;
        this.ngScope.initialize();

        if (!this.noteCacheManager)
            this.noteCacheManager = new NoteCacheManager(store);

        if (store.requiresUpdate()) {
            store = new NoteStore();
            store.save();
        } else if (this.isCookieValid()) {
            if (api.isStoredTokenExpired()) {
                hideSplash();
                this.ngScope.showDisabledDialog('Click to continue', true);
                return;
            }
            try {
                this.loadNotes(true);
                hideSplash();
            } catch (err) {
                console.log('Failed to refresh notes. ' + err.message);
                this.launchNote(null, true);
            }

            this.ngScope.hideLoginDialog();
            return;
        } else if (store.tokenSaveDateTime) return;

        this.ngScope.showHello();
        this.ngScope.showLoginDialog();
        hideSplash();
    }.bind(this);

    this.login = function (u, p) {
        //if (!u || !p)
        //    throw "Arguments not valid";

        this.np.login(
            {
                username: u,
                password: p
            },
            this.onLoginResponse
        );
    }.bind(this);

    this.logOut = function () {
        if (store) store.clear();

        opXmlToOutline(initialOpmltext);
        this.np.logOut();
        this.ngScope.setDefaults();

        this.start();
    }.bind(this);

    /**
     * Saves the currently active (Store.note) note
     */
    this.saveNote = function () {
        if (this.canPersist() == false) return;
        opClearChanged(); // Done optimistically, Tooo: async

        if (store.note) {
            store.note.value = ns.outlineToXml();
            store.save();

            if (this.noteCacheManager)
                this.noteCacheManager.updateNote(store.note);
        }

        this.ngScope.setSaveState(saveStates.saving);
        var noteText = this.outlineToXml();

        if (store.note && store.note.key) {
            //If key exists, update
            console.debug(
                '=> Saving/updating note. ' +
                    store.note.value.length +
                    ' chars.'
            );
            this.np.updateNote(
                store.note.key,
                noteText,
                TAG,
                null,
                0,
                this.parseReceivedNote,
                this.onNoteActionFailure
            );
        } //create new
        else {
            console.debug('=> Creating note.');
            this.np.saveNote(
                noteText,
                TAG,
                this.onNoteCreated,
                this.onNoteActionFailure
            );
        }
        this.incrementPendingNotes();
    }.bind(this);

    this.deleteNote = function () {
        if (!store.note) return;
        console.debug('=> Deleting note');

        const onDelete = (snote) => {
            this.parseReceivedNote(snote);

            if (store.notes.length >= 1) this.launchNote(null, true);
            else this.createNote();
        };

        this.np.deleteNote(store.note.key, onDelete, this.onNoteActionFailure);
    }.bind(this);

    this.pollChanges = function () {
        if (!store || !this.isCookieValid() || this.ngScope.isAppDisabled)
            return;
        if (this.isModelReady() == false) return;
        if (this.getPendingNotes() > 0) return;

        this.np.getChanges(this.parseChanges);
    }.bind(this);

    this.parseChanges = function (changes) {
        if (!changes || changes.length === 0) return;

        console.debug('Processing ' + changes.length + ' change(s)');

        changes.forEach((change) => {
            if (change.removed) {
                var removedNote = store.getNote(change.fileId);
                if (removedNote) {
                    store.removeNote(change.fileId);
                    if (this.noteCacheManager)
                        this.noteCacheManager.deleteNote(change.fileId);
                }
                return;
            }

            if (!change.file) return;

            var file = change.file;
            var existingNote = store.getNote(file.id);
            var newModifydate = new Date(file.modifiedTime).getTime();

            if (existingNote) {
                if (existingNote.modifydate !== newModifydate) {
                    this.loadNote(existingNote, {
                        key: file.id,
                        version: file.version,
                        modifydate: newModifydate
                    });
                }
            } else {
                var n = new Note();
                n.key = file.id;
                store.addNote(n);
                this.loadNote(n, {
                    key: file.id,
                    version: file.version,
                    modifydate: newModifydate
                });
            }
        });

        store.save();
    }.bind(this);

    this.loadNotes = function (forceRefresh) {
        if (!store || !this.isCookieValid() || this.ngScope.isAppDisabled)
            return;

        if (this.isModelReady() == false) return;
        if (!forceRefresh) forceRefresh = false;

        if (forceRefresh) {
            this.ngScope.startMainRefresh();
            this.ngScope.showWorkingDialog();
        }
        console.debug('Refreshing Notes');
        this.np.getNoteIndex(this.parseNoteIndex);
    }.bind(this);

    let delay = 0;
    /* Fetch latest note object using arg.key then fire routine to set on ui*/
    this.loadNote = function (note, noteMetadata) {
        if (note == undefined) throw 'Note argument not specified';

        this.incrementPendingNotes();
        delay = this.getPendingNotes() > 0 ? delay + 500 : 0;

        this.ngScope.setSaveState(saveStates.updating);

        setTimeout(() => {
            this.np.getNote(
                { ...note, ...noteMetadata },
                this.parseReceivedNote,
                this.onNoteActionFailure
            );
        }, delay);
    }.bind(this);

    /* Parse note index array and constructs note object from outline tagged note*/
    this.parseNoteIndex = function (outlineNotes) {
        // temp
        const cd = (m) => console.debug('parseNoteIndex: ' + m);
        let count = outlineNotes ? outlineNotes.length : 0;
        cd(
            'Called parseNoteIndex with ' +
                count +
                ' notes & pending notes ' +
                this.getPendingNotes()
        );

        if (outlineNotes == undefined || outlineNotes.length == 0) {
            console.log('Unable to fetch any notes');

            /* Todo: Make offline on start
             if (!res)
                this.setOffline("Offline"); */

            let n = new Note();
            store.addNote(n);

            this.launchNote(n, true);
            this.ngScope.finishMainRefresh();
            this.tryFinishLoading();
            return;
        }

        //Remove unrecognized notes
        store.notes = _.filter(store.notes, function (storedNote) {
            return (
                null !=
                _.find(outlineNotes, function (newNote) {
                    return storedNote.key == newNote.key;
                })
            );
        });

        var that = this;
        var updateSelectedNote = false;
        outlineNotes.forEach(function (outlineNote) {
            delay += 500;
            var sn = outlineNote;
            var storedNote = _.find(store.notes, function (note) {
                return note.key == sn.key;
            });
            if (storedNote) {
                if (sn.modifydate === storedNote.modifydate) {
                    if (
                        storedNote.key == store.selectedNoteKey &&
                        opIsLoaded() == false
                    )
                        updateSelectedNote = true;
                    return;
                }
            } else {
                var n = new Note();
                n.key = sn.key;
                store.addNote(n);
                storedNote = n;
            }

            that.loadNote(storedNote, sn);
        });

        if (updateSelectedNote) {
            this.launchNote(
                store.note,
                this.ngScope.saveState != saveStates.saving
            );
            this.ngScope.finishMainRefresh();
        }

        this.tryFinishLoading();
    }.bind(this);

    this.onNoteActionFailure = function (code, errXHR) {
        console.debug('Unable to load/save/update note. ' + code);
        this.decrementPendingNotes();

        if (errXHR) {
            if (errXHR.status == 401)
                //errXHR.statusText
                this.killSession(this.m.unauthorized);
            if (errXHR.status == 403) this.killSession(this.m.sessionExpired);
            if (errXHR.status == 0)
                this.setOffline('Unable to save note. Try refreshing.');
        }
        this.ngScope.setSaveState(saveStates.saved);

        this.tryFinishLoading();
    }.bind(this);

    this.onNoteCreated = function (snote) {
        //snote.content is undefined at this stage
        store.addNote(new Note(null, snote.key));
        store.selectedNoteKey = snote.key;

        this.parseReceivedNote(snote);
    }.bind(this);

    this.parseReceivedNote = function (snote) {
        if (!snote || !snote.key) return;
        var forceLaunch = false;

        console.debug('<= Received note');
        this.decrementPendingNotes();

        var saveNote = store.getNote(snote.key);
        if (
            !saveNote ||
            !saveNote.modifydate ||
            saveNote.modifydate < snote.modifydate ||
            snote.deleted == 1
        ) {
            if (snote.deleted == 1) {
                console.debug('Removing deleted note...');
                store.removeNote(snote.key);

                // Remove from search cache
                if (this.noteCacheManager)
                    this.noteCacheManager.deleteNote(snote.key);
            } else {
                var isNewNote = false;

                if (!saveNote) {
                    saveNote = new Note();
                    isNewNote = true;
                }

                try {
                    saveNote.key = snote.key;
                    forceLaunch =
                        snote.content != undefined &&
                        (saveNote.modifydate == undefined ||
                            (saveNote.modifydate != snote.modifydate &&
                                store.selectedNoteKey == snote.key));
                    saveNote.version = snote.version;
                    saveNote.modifydate = snote.modifydate;
                    if (snote.content != undefined) {
                        saveNote.value = snote.content;
                    }
                    if (isNewNote) {
                        store.addNote(saveNote);
                    }
                    store.save();

                    if (this.noteCacheManager && snote.content != undefined)
                        this.noteCacheManager.updateNote(saveNote);

                    console.log(
                        'Saved note: ' +
                            saveNote.title +
                            ' v' +
                            saveNote.version
                    );
                } catch (error) {
                    console.log(
                        'Error occured when trying to save note. ' +
                            error.message
                    );
                }
            }
        }

        if (
            store.selectedNoteKey &&
            saveNote &&
            store.selectedNoteKey == saveNote.key
        ) {
            this.launchNote(
                saveNote,
                forceLaunch && this.ngScope.saveState != saveStates.saving
            );
            this.ngScope.finishMainRefresh();
        }

        this.ngScope.setSaveState(saveStates.saved);
        this.tryFinishLoading();
    }.bind(this);

    this.canPersist = function () {
        if (appPrefs.readonly) return false;
        if (this.isModelReady() == false) return false;
        if (this.ngScope.isAppDisabled) return false;
        if (this.ngScope.showWorking) return false;
        // Safety check: prevent saving empty content if note previously had content
        var nodeCount = opGetNodeCount();
        if (nodeCount === 0 && store.note && store.note.key) return false;

        return true;
    }.bind(this);

    this.isCookieValid = function () {
        return this.np.isLoggedIn();
    }.bind(this);

    this.isModelReady = function () {
        return !(this.np == undefined || this.np.isLoggedIn() == false);
    }.bind(this);

    this.setNoteState = function (saveState) {
        //Should be on the note level
        this.ngScope.setSaveState(saveState);
    }.bind(this);

    this.tryFinishLoading = function () {
        if (this.getPendingNotes() == 0) {
            store.notes.sort(function (a, b) {
                return (
                    new Date(a.modifydate).getTime() -
                    new Date(b.modifydate).getTime()
                );
            });

            // Rebuild cache only on first load (when empty);
            // incremental updates handle ongoing changes
            if (this.noteCacheManager && !Object.keys(store.noteCache).length)
                this.noteCacheManager.rebuildCache();

            if (!store.note && store.notes.length > 0)
                this.launchNote(null, true);
            this.ngScope.hideWorkingDialog();
            this.ngScope.finishMainRefresh();
            delay = 0;

            // Initialize changes page token for delta polling
            this.np.initPolling();
        }
    }.bind(this);

    this.createNote = function () {
        var n = new Note(initialOpmltext);
        this.launchNote(n);
        this.saveNote();
    }.bind(this);

    /**
     * Search across all notes using the search cache
     * @param {string} query - Search query string
     * @returns {Array} Array of search results with highlighted matches
     */
    this.searchNotes = function (query) {
        if (!this.noteCacheManager) {
            console.warn('Search cache not initialized');
            return [];
        }
        return this.noteCacheManager.search(query);
    }.bind(this);

    /**
     * Navigate to specific outline element by path indices
     * @param {Array} pathIndices - e.g., [0, 2, 1] means first outline → third child → second child
     */
    this.scrollToElement = function (pathIndices) {
        if (!pathIndices || pathIndices.length === 0) return;

        // Wait for the outline to render
        setTimeout(
            function () {
                try {
                    // .concord-root is the <ul> element itself
                    var root = $('.concord-root');
                    var currentNode = null;

                    // Navigate down the path
                    for (var i = 0; i < pathIndices.length; i++) {
                        var index = pathIndices[i];

                        if (i === 0) {
                            // First level: direct children of root (the ul.concord-root)
                            var topLevel = root.children('li.concord-node');
                            if (index < topLevel.length) {
                                currentNode = topLevel.eq(index);
                            } else {
                                console.warn(
                                    'Path index out of bounds at level 0:',
                                    index,
                                    'max:',
                                    topLevel.length
                                );
                                return;
                            }
                        } else {
                            // Expand if collapsed before accessing children
                            if (currentNode.hasClass('collapsed')) {
                                this.outliner.op.setCursor(currentNode);
                                this.outliner.op.expand();
                            }

                            // Get child at this index from the <ol> inside current node
                            var children = currentNode
                                .children('ol')
                                .children('li.concord-node');
                            if (index < children.length) {
                                currentNode = children.eq(index);
                            } else {
                                console.warn(
                                    'Path index out of bounds at level ' +
                                        i +
                                        ':',
                                    index,
                                    'max:',
                                    children.length
                                );
                                break;
                            }
                        }
                    }

                    if (currentNode && currentNode.length) {
                        // Set cursor on the found node (but don't enter edit mode)
                        this.outliner.op.setCursor(currentNode);
                        this.outliner.op.setTextMode(false);

                        // Scroll element into view
                        var wrapper = currentNode
                            .children('.concord-wrapper')
                            .first();
                        if (wrapper.length) {
                            wrapper[0].scrollIntoView({
                                behavior: 'smooth',
                                block: 'center'
                            });

                            // Flash highlight effect
                            wrapper.addClass('search-highlight');
                            setTimeout(function () {
                                wrapper.removeClass('search-highlight');
                            }, 2000);
                        }
                    }
                } catch (error) {
                    console.error('Error scrolling to element:', error);
                }
            }.bind(this),
            150
        );
    }.bind(this);

    this.launchNote = function (note, useDefault) {
        if (useDefault == undefined) useDefault = false;

        try {
            if (
                useDefault == true ||
                !note ||
                !note.key ||
                (note &&
                    store.note &&
                    store.note.key &&
                    note.key != store.note.key)
            ) {
                /* Optimistically setting the last selected Note and displaying GUI */
                if (useDefault && store.notes && store.notes.length > 0) {
                    if (!store.selectedNoteKey) {
                        note = _.max(store.notes, function (n) {
                            return n.modifydate;
                        });
                    } else {
                        note = store.getNote(store.selectedNoteKey);
                        if (!note || note.value == undefined)
                            note = store.notes[0];
                    }
                }

                if (!note || note.value == undefined) note = new Note();

                store.note = note;
                store.save();

                // Try to use cached tree for faster rendering
                var cachedTree = this.noteCacheManager
                    ? this.noteCacheManager.getTree(note.key)
                    : null;
                var cachedExpansionState =
                    this.noteCacheManager &&
                    typeof this.noteCacheManager.getExpansionState ===
                        'function'
                        ? this.noteCacheManager.getExpansionState(note.key)
                        : null;

                if (cachedTree && cachedTree.length > 0) {
                    try {
                        this.outliner.op.treeToOutline(
                            cachedTree,
                            note.title,
                            false,
                            cachedExpansionState
                        );
                    } catch (cacheError) {
                        console.warn(
                            'Cache data corrupted, falling back to XML parsing:',
                            cacheError
                        );
                        if (this.noteCacheManager) {
                            this.noteCacheManager.deleteNote(note.key);
                        }
                        this.outliner.op.xmlToOutline(note.value, false);
                    }
                } else {
                    // Fall back to XML parsing
                    this.outliner.op.xmlToOutline(note.value, false);
                }

                // Safety check: verify outline rendered correctly
                var nodeCount = opGetNodeCount();
                var noteHadContent =
                    note.value &&
                    note.value.indexOf('<outline ') !== -1 &&
                    note.value.indexOf('<outline text=""/>') === -1;

                if (nodeCount === 0 && noteHadContent) {
                    console.error(
                        'SAFETY: Outline failed to render - note had content but no nodes rendered'
                    );
                    return;
                }
            }

            this.ngScope.hideLoginDialog();
            hideSplash();
        } catch (error) {
            console.error(
                'Error occured when launching note. ' + error.message
            );
        }
    }.bind(this);

    this.outlineToXml = function () {
        return this.outliner.op.outlineToXml(
            null,
            store.email,
            null,
            store.note ? store.note.title : null
        );
    }.bind(this);

    this.killSession = function (msg) {
        if (!msg) msg = this.m.sessionExpired;

        if (store && store.note) {
            store.note.key = null;
            store.note.token = null;
        }
        this.np.logOut();
        this.ngScope.showLoginDialog(store.email, msg);
    }.bind(this);

    this.setOffline = function (msg) {
        //Presently can only recover by a page refresh
        appPrefs.readonly = true;
        this.ngScope.setStatus(msg);
    }.bind(this);

    this.applyStyle = function (style) {
        switch (style) {
            case 'bold':
                return this.outliner.op.bold();
            case 'italic':
                return this.outliner.op.italic();
            case 'underline':
                return this.outliner.op.underline();
            default:
                break;
        }
    }.bind(this);
}

/* Local Storage Object */
function NoteStore() {
    var minVersion = 2;
    this.email = null;
    this.token = null;
    this.tokenSaveDateTime = null;
    this.version = null;
    this.version = minVersion;
    this.notes = [];
    this.selectedNoteKey = null;
    this.storageName = 'nsxData';
    this.noteCache = {};
    //Remember: Add inflation code to load() for each new property

    //Current Note
    Object.defineProperty(this, 'note', {
        get: function () {
            if (!this.notes || this.notes.length == 0) return null;
            return this.getNote(this.selectedNoteKey);
        },
        set: function (val) {
            if (val && val.key) {
                if (!this.getNote(val.key)) this.addNote(val);
                this.selectedNoteKey = val.key;
                return;
            }
            this.selectedNoteKey = null;
        }
    });

    this.getNote = function (key) {
        var val = _.find(this.notes, function (note) {
            return note.key == key;
        });
        return val;
    };

    this.addNote = function (n) {
        if (!n.key || this.getNote(n.key)) return;
        this.notes.push(n);
    };

    this.removeNote = function (key) {
        if (!key || !this.getNote(key)) return;
        this.notes = _.reject(this.notes, function (note) {
            return note.key == key;
        });
        if (this.selectedNoteKey == key) this.selectedNoteKey = '';
    };

    this.save = function () {
        storage.set(JSON.stringify(this));
        localStorage.ctOpmlSaves++;
        localStorage.whenLastSave = new Date().toString();
    }.bind(this);

    this.load = function () {
        return new Promise((resolve, reject) => {
            storage
                .get()
                .then((data) => {
                    if (!data) {
                        resolve(null);
                        return;
                    }

                    try {
                        var obj = JSON.parse(data);

                        this.email = obj.email;
                        this.token = obj.token;
                        this.tokenSaveDateTime = obj.tokenSaveDateTime;

                        var self = this;
                        this.notes = [];
                        obj.notes.forEach(function (note) {
                            var n = new Note(
                                note.value,
                                note.key,
                                note.version,
                                note.modifydate
                            );
                            self.notes.push(n);
                        });

                        this.version = obj.version;
                        this.selectedNoteKey = obj.selectedNoteKey;
                        this.noteCache = obj.noteCache || obj.searchCache || {};

                        resolve(this);
                    } catch (err) {
                        console.error(
                            'Error occurred when parsing saved data:',
                            err.message
                        );
                        reject(err);
                    }
                })
                .catch((err) => {
                    console.error(
                        'Error occurred while getting data:',
                        err.message
                    );
                    reject(err);
                });
        });
    };

    this.clear = function () {
        storage.clear();
        this.email = null;
        this.token = null;
        this.tokenSaveDateTime = null;
        this.note = null;
        this.notes = null;
        this.version = null;
    };

    this.requiresUpdate = function () {
        if (this.version && this.version >= minVersion) return false;
        return true;
    };
}

/* Local Note Object */
function Note(v, k, ver, date) {
    this.key = k;
    this.version = ver; //Server Last Saved Version
    this.modifydate = date; //Server Last modify date

    var isModified;
    var val = v; //OPML
    var _title = '';

    if (!val || val == undefined || val == null) val = initialOpmltext;

    function setTitle() {
        if (val && typeof val == 'string') {
            var doc = createXML(val);
            var out = doc.getElementsByTagName('outline');
            if (out && out.length > 0)
                _title = strip(out[0].getAttribute('text'));
            if (_title.length > 30) _title = _title.substring(0, 30) + '...';
        }
    }

    Object.defineProperty(this, 'value', {
        get: function () {
            return val;
        },
        set: function (v) {
            val = v;
            setTitle();
        },
        enumerable: true
    });

    Object.defineProperty(this, 'title', {
        get: function () {
            return _title;
        },
        enumerable: true
    });

    setTitle();
}

/* Utils */
{
    var TAG = 'Outline-OPML';

    var saveStates = {
        modified: 'Modified',
        saving: 'Saving',
        updating: 'Updating',
        saved: 'Saved',
        failed: 'Error'
    };

    var navigationKeystrokes = new Set([16, 17, 37, 38, 39, 40]);

    function createXML(xmlString) {
        if (window.DOMParser) {
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        } // Internet Explorer
        else {
            xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
            xmlDoc.async = false;
            xmlDoc.loadXML(xmlString);
        }
        return xmlDoc;
    }

    function CreateNoteService(outliner) {
        var ns = new NoteService(outliner);
        return ns;
    }

    String.prototype.escapeSpecialChars = function () {
        return this.replace(/[\\]/g, '\\\\')
            .replace(/[\"]/g, '\\"')
            .replace(/[\/]/g, '\\/')
            .replace(/[\b]/g, '\\b')
            .replace(/[\f]/g, '\\f')
            .replace(/[\n]/g, '\\n')
            .replace(/[\r]/g, '\\r')
            .replace(/[\t]/g, '\\t'); //g is for all
    };

    function encode_utf8(s) {
        return unescape(encodeURIComponent(s));
    }

    function decode_utf8(s) {
        return decodeURIComponent(escape(s));
    }

    function strip(html) {
        var tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    $(document).on('touchend', function (e) {
        var target = $(e.target);
        var isBarTouch = target.is('#footer *, #footer');
        if (
            !target.is('.divOutlinerContainer') &&
            !target.is('#main') &&
            (isBarTouch == false || target.is('.bar-icon-left'))
        )
            return;

        concord.removeFocus(!isBarTouch);
    });
}

/* Angular */
{
    var myApp = angular.module('nsx', ['velocity.ui', 'ngAnimate']);

    myApp.service('context', function () {
        var context = {
            hello: {
                isVisible: false
            }
        };
        return context;
    });

    myApp.controller('helloController', [
        '$scope',
        'context',
        function ($scope, context) {
            $scope.context = context;
        }
    ]);

    myApp.controller('MainCtrl', [
        '$scope',
        '$timeout',
        '$sce',
        'context',
        function ($scope, $timeout, $sce, context) {
            /* Safe Apply */
            {
                $scope.update = function (fn) {
                    var phase = this.$root ? this.$root.$$phase : undefined;
                    if (phase == '$apply' || phase == '$digest') this.$eval(fn);
                    else this.$apply(fn);
                };
            }

            $scope.name = 'MainCtrl';
            $scope.context = context;

            var loginStates = {
                submit: 'Sign In',
                loggingIn: 'Logging in...',
                failed: 'Login Failed, Retry',
                loggedIn: 'Logged in! Fetching data...'
            };
            var defaultloadingSuffix = '...';

            $scope.shortcuts = [
                {
                    function: 'Indent',
                    code: 'Tab'
                },
                {
                    function: 'Un-indent',
                    code: 'Shift + Tab'
                },
                {
                    function: 'Move note',
                    code: 'Shift + Alt + Up/Down'
                },
                {
                    function: 'Expand / Collapse Current',
                    code: 'Ctrl + Space'
                },
                {
                    function: 'Expand / Collapse Current Tree',
                    code: 'Alt + Down/Up'
                },
                {
                    function: 'Collapse All',
                    code: 'Alt + 1'
                },
                {
                    function: 'Expand All',
                    code: 'Alt + Shift + 1'
                },
                {
                    function: 'Select',
                    code: 'Click Bullet / Shift + Up/Down'
                },
                {
                    function: 'Delete',
                    code: 'Shift + Ctrl + Backspace'
                },
                {
                    function: 'Insert Date',
                    code: 'Ctrl + ;'
                },
                {
                    function: 'Mark Complete',
                    code: 'Ctrl + Enter'
                },
                {
                    function: 'Indent all below ',
                    code: 'Ctrl + Shift + [ or ]'
                },
                {
                    function: 'Search',
                    code: 'Ctrl + F'
                }
            ];

            $scope.setDefaults = function () {
                $scope.loginButtonText = loginStates.submit;
                $scope.sessionAlert = '';
                $scope.showLoginInfo = false;
                $scope.showOverlay = false;
                $scope.showLogin = false;
                $scope.isAppDisabled = false;
                $scope.isDebug = isDebug;
                $scope.appDisabledMessage = '';
                $scope.showShortcuts = false;
                $scope.showBarMenu = false;
                $scope.showFontSizeModal = false;
                $scope.showExportModal = false;
                $scope.exportTab = 'formatted';
                $scope.exportContent = '';
                $scope.exportContentHtml = '';
                $scope.idleTimeout = false;
                $scope.showWorking = false;
                $scope.showSearch = false;
                $scope.searchQuery = '';
                $scope.searchResults = [];
                $scope.searchInputFocused = false;
                $scope.showMainRefresh = false;
                $scope.statusMessage = '';
                $scope.loadingCountdownMessage = defaultloadingSuffix;
                $scope.user = {
                    email: '',
                    password: ''
                };
                $scope.log = `Version: ${appVersionHash} \r\nLog Messages --------------`;
            };

            $scope.hidePopUps = function () {
                $scope.showLogin = false;
                $scope.showBarMenu = false;
                $scope.showShortcuts = false;
                $scope.showFontSizeModal = false;
                $scope.showExportModal = false;
            };

            //Display force refresh gui
            $scope.startMainRefresh = function () {
                $scope.showMainRefresh = true;
                $scope.showOverlay = true;
                $scope.update();
            };

            $scope.finishMainRefresh = function () {
                $scope.showMainRefresh = false;
                $scope.hideOverlay();
                $scope.update();
            };

            //Todo: Use Getters and Setters instead! #enough
            //standardize use of Is vs Show, isLoginVisible vs showLogin
            $scope.hideOverlay = function () {
                if ($scope.showLogin || $scope.isAppDisabled) return;
                $scope.showOverlay = false;
            };

            $scope.setDefaults();

            $scope.initialize = function () {
                if (ns.outliner) {
                    var nse = ns.outliner.events;
                    nse.addEventListener(
                        nse.textModeChangedEvent.type,
                        concordEvent
                    );
                }
            };

            function concordEvent(e) {
                $scope.update();
                if (opInTextMode() == false) {
                    //Remove focus hack
                    var h = document.getElementById('hide');
                    var nh = h.cloneNode();
                    h.focus();
                    var parent = h.parentNode;
                    h.remove();
                    parent.appendChild(nh);
                }
            }

            /* Login */
            {
                $scope.isLoggedIn = function () {
                    if (ns) return ns.np.isLoggedIn();
                    return false;
                };

                $scope.login = function () {
                    ns.ngScope = $scope;

                    // if ((!$scope.user.email || !$scope.user.password) || (loginForm.email.validity.valid === false || loginForm.password.validity.valid === false)) return;

                    // $scope.loginButtonText = loginStates.loggingIn;

                    ns.login($scope.user.email, $scope.user.password);
                };

                $scope.isLoginButtonDisabled = function () {
                    return (
                        $scope.loginButtonText == loginStates.loggingIn ||
                        $scope.loginButtonText == loginStates.loggedIn
                    );
                };

                $scope.loginResponse = function (isSuccess) {
                    if (isSuccess) {
                        $scope.loginButtonText = loginStates.loggedIn;
                    } else {
                        $scope.loginButtonText = loginStates.failed;
                    }
                    $scope.update();
                };

                $scope.showLoginDialog = function (email, e) {
                    $scope.setDefaults();
                    $scope.showOverlay = true;
                    $scope.showLogin = true;
                    $scope.user.email = email;
                    if (e) {
                        $scope.sessionAlert = e;
                        $scope.showLoginInfo = false;
                    } else {
                        $scope.showLoginInfo = true;
                    }
                    $scope.update();
                };

                $scope.hideLoginDialog = function () {
                    $scope.hideOverlay();
                    $scope.showLogin = false;
                    $scope.sessionAlert = '';
                    $scope.update();
                };
            }

            $scope.showDisabledDialog = function (e, doTimeout) {
                $scope.hidePopUps();
                $scope.showOverlay = true;
                $scope.isAppDisabled = true;
                $scope.appDisabledMessage = e;
                $scope.update();
                if (doTimeout) $scope.idleTimeout = true;
            };
            $scope.hideDisabledDialog = function () {
                $scope.hideOverlay();
                $scope.isAppDisabled = false;
                $scope.idleTimeout = false;
                $scope.showOverlay = false;
                $scope.appDisabledMessage = '';
                $scope.loadingCountdownMessage = defaultloadingSuffix;
                $scope.update();
            };
            $scope.resetTimeout = function () {
                if ($scope.idleTimeout == false) return;
                $scope.hideDisabledDialog();
                $scope.startMainRefresh();

                if (appPrefs.readonly) return;

                var onReady = () => {
                    clearTimers();
                    startTimers();
                    ns.loadNotes(true);
                };

                if (api.isStoredTokenExpired()) {
                    // Token expired — use click gesture to re-auth via popup
                    api.signInAndInitialize(onReady);
                } else {
                    api.initialize(onReady);
                }
            };

            /* Working overlay */
            {
                $scope.showWorkingDialog = function () {
                    if ($scope.showWorking) return;
                    $scope.showWorking = true;
                    $scope.update();
                };
                $scope.hideWorkingDialog = function () {
                    if ($scope.showWorking == false) return;
                    $scope.showWorking = false;
                    $scope.update();
                };
                $scope.setLoadingCountdown = function (loaded, total) {
                    if ($scope.showWorking == false) return;
                    $scope.loadingCountdownMessage =
                        ' ' + loaded + ' of ' + total;
                    $scope.update();
                };
            }

            /* Save */
            {
                $scope.statusColor = function () {
                    if ($scope.saveState == saveStates.modified) return 'white';
                    if ($scope.saveState == saveStates.saved) return '#A3AAAC';
                    if ($scope.saveState == saveStates.saving) return 'yellow';
                    if ($scope.saveState == saveStates.updating)
                        return 'yellow';
                    if ($scope.saveState == saveStates.failed) return 'red';
                };

                $scope.statusOpacity = function () {
                    if (
                        $scope.saveState == saveStates.modified ||
                        $scope.saveState == saveStates.saving
                    )
                        return 0.5;
                    if ($scope.saveState == saveStates.saved) return 1;
                };

                $scope.setSaveState = _.debounce(function (state) {
                    $scope.saveState = state; //todo: not called when expansion changed
                    $scope.update();
                }, 300);

                $scope.forceSync = function () {
                    if (
                        $scope.saveState == saveStates.saving ||
                        appPrefs.readonly
                    )
                        return;

                    event.stopPropagation();
                    event.preventDefault();
                    console.debug(
                        'Force Sync, changed status:' + opHasChanged()
                    );
                    console.log('calling save inside forcesync');
                    ns.saveNote();
                    concord.removeFocus(true);
                };

                $scope.makeBold = function (e, style) {
                    e.stopPropagation();
                    e.preventDefault();
                    ns.applyStyle(style);
                };

                $scope.setStatus = function (e) {
                    $scope.statusMessage = e;
                    $scope.update();
                };
            }

            // Do not remove
            $scope.isMobile = function () {
                return isMobile;
            };

            $scope.isReadOnly = function () {
                return appPrefs.readonly;
            };

            $scope.storage = function () {
                return store;
            };

            /* Shortcuts */
            {
                $scope.showShortcutDialog = function () {
                    $scope.showBarMenu = false;
                    $scope.showShortcuts = true;
                };
                $scope.hideShortcutDialog = function () {
                    $scope.showShortcuts = false;
                };
            }

            /* Bar + Bar Menu*/
            {
                $scope.isAppReady = function () {
                    return (
                        !context.hello.isVisible &&
                        !$scope.isAppDisabled &&
                        $scope.isLoggedIn()
                    );
                };

                $scope.showHello = function () {
                    $scope.context.hello.isVisible = true;
                };

                $scope.toggleHello = function () {
                    $scope.context.hello.isVisible =
                        !$scope.context.hello.isVisible;
                };

                $scope.toggleBarMenuDialog = function () {
                    $scope.showBarMenu = !$scope.showBarMenu;
                    if ($scope.showBarMenu) $scope.hideAllBarMenuChildren();
                };
                $scope.hideAllBarMenuChildren = function () {
                    $scope.hideShortcutDialog();
                    $scope.showNotesList = false;
                    $scope.showFontSizeModal = false;
                    $scope.showExportModal = false;
                };
                $scope.hideDialogs = function ($event) {
                    if ($event.target.id != 'taskBarOptions') {
                        if ($scope.showBarMenu == true) {
                            $scope.showBarMenu = false;
                        }
                    }
                };

                /* Font Size */
                $scope.toggleFontSizeModal = function () {
                    $scope.showBarMenu = false;
                    $scope.showFontSizeModal = !$scope.showFontSizeModal;
                };

                $scope.increaseFontSize = function ($event) {
                    $event.stopPropagation();
                    var current = appPrefs.outlineFontSize;
                    if (current >= fontSizeSettings.max) return;
                    $scope.applyFontSize(
                        Math.min(
                            current + fontSizeSettings.step,
                            fontSizeSettings.max
                        )
                    );
                };

                $scope.decreaseFontSize = function ($event) {
                    $event.stopPropagation();
                    var current = appPrefs.outlineFontSize;
                    if (current <= fontSizeSettings.min) return;
                    $scope.applyFontSize(
                        Math.max(
                            current - fontSizeSettings.step,
                            fontSizeSettings.min
                        )
                    );
                };

                $scope.applyFontSize = function (em) {
                    em = Math.round(em * 100) / 100;
                    appPrefs.outlineFontSize = em;
                    appPrefs.nodeLineHeight = em * LINE_HEIGHT_MULTIPLIER;
                    appPrefs.iconSize = em * 0.5;
                    $('#outliner')
                        .concord()
                        .prefs({
                            outlineFontSize: em,
                            nodeLineHeight: em * LINE_HEIGHT_MULTIPLIER,
                            iconSize: em * 0.5
                        });
                    localStorage.fontSize = em;
                };

                $scope.resetFontSize = function ($event) {
                    $event.stopPropagation();
                    $scope.applyFontSize(fontSizeSettings.default);
                };

                /* Export */
                $scope.toggleExportModal = function () {
                    $scope.showBarMenu = false;
                    $scope.showExportModal = !$scope.showExportModal;
                    if ($scope.showExportModal) {
                        $scope.exportTab = 'formatted';
                        $scope.generateExportContent();
                    }
                };

                $scope.setExportTab = function (tab) {
                    $scope.exportTab = tab;
                    $scope.generateExportContent();
                };

                $scope.generateExportContent = function () {
                    var root = ns.outliner.root;

                    var selected = root.find('.concord-node.selected');
                    var isSelection = selected.length > 0;
                    var nodes = isSelection
                        ? selected
                        : root.children('.concord-node');

                    switch ($scope.exportTab) {
                        case 'formatted':
                            var html = ExportUtils.toFormattedText(
                                nodes,
                                ns.outliner
                            );
                            $scope.exportContentHtml = $sce.trustAsHtml(html);
                            $scope.exportContent = html;
                            break;
                        case 'plain':
                            $scope.exportContent =
                                ExportUtils.toPlainText(nodes);
                            break;
                        case 'opml':
                            $scope.exportContent = ExportUtils.toOpml(
                                nodes,
                                ns.outliner,
                                isSelection
                            );
                            break;
                    }
                };

                $scope.copyExportContent = function ($event) {
                    $event.stopPropagation();
                    if ($scope.exportTab === 'formatted') {
                        var rendered =
                            document.getElementById('exportRendered');
                        if (rendered) {
                            var selection = window.getSelection();
                            var range = document.createRange();
                            range.selectNodeContents(rendered);
                            selection.removeAllRanges();
                            selection.addRange(range);
                            document.execCommand('copy');
                            selection.removeAllRanges();
                        }
                    } else {
                        var textarea =
                            document.getElementById('exportTextarea');
                        if (textarea) {
                            textarea.select();
                            textarea.setSelectionRange(
                                0,
                                textarea.value.length
                            );
                        }
                        if (
                            navigator.clipboard &&
                            navigator.clipboard.writeText
                        ) {
                            navigator.clipboard.writeText($scope.exportContent);
                        } else {
                            document.execCommand('copy');
                        }
                    }

                    // Close modal after copy
                    $scope.showExportModal = false;

                    // On mobile, exit edit mode
                    if (isMobile && ns.outliner) {
                        ns.outliner.op.setTextMode(false);
                    }
                };

                $scope.toggleNotesDialog = function () {
                    $scope.showNotesList = !$scope.showNotesList;
                };

                /* Search */
                $scope.toggleSearchDialog = function () {
                    $scope.showSearch = !$scope.showSearch;

                    if ($scope.showSearch) {
                        // Reset search state
                        $scope.searchQuery = '';
                        $scope.searchResults = [];

                        // Focus search input after UI renders
                        $timeout(function () {
                            var searchInput =
                                document.getElementById('searchInput');
                            if (searchInput) searchInput.focus();
                        }, 100);
                    }
                };

                $scope.performSearch = function () {
                    if (!$scope.searchQuery || $scope.searchQuery.length < 2) {
                        $scope.searchResults = [];
                        if (ns.noteCacheManager)
                            ns.noteCacheManager.setNavigationResults([]);
                        return;
                    }

                    $scope.searchResults = ns.searchNotes($scope.searchQuery);
                    if (ns.noteCacheManager)
                        ns.noteCacheManager.setNavigationResults(
                            $scope.searchResults
                        );
                };

                // Check if a search result match is focused (for keyboard navigation)
                $scope.isResultFocused = function (result, match) {
                    return (
                        ns.noteCacheManager &&
                        ns.noteCacheManager.isFocused(result, match)
                    );
                };

                $scope.openSearchResult = function (result, match) {
                    var note = store.notes.find(function (n) {
                        return n.key === result.noteKey;
                    });

                    if (note) {
                        // Only save and launch if switching to a different note
                        if (!store.note || note.key !== store.note.key) {
                            saveOutlineNow();
                            ns.launchNote(note);
                        }

                        // Navigate to specific element if match has path info
                        if (match && match.pathIndices) {
                            ns.scrollToElement(match.pathIndices);
                        }

                        $scope.showSearch = false;
                        $scope.searchQuery = '';
                        $scope.searchResults = [];
                    }
                };

                // Helper function for ng-bind-html to trust HTML content
                $scope.trustAsHtml = function (html) {
                    return $sce.trustAsHtml(html);
                };

                // Keyboard shortcuts for search
                document.addEventListener('keydown', function (e) {
                    // Ctrl+F or Cmd+F to open search
                    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                        e.preventDefault();
                        $scope.$apply(function () {
                            if (!$scope.showSearch) {
                                $scope.toggleSearchDialog();
                            }
                        });
                    }

                    // Escape to close search
                    if (e.key === 'Escape' && $scope.showSearch) {
                        e.preventDefault();
                        $scope.$apply(function () {
                            $scope.toggleSearchDialog();
                        });
                    }

                    // Arrow Down - navigate to next search result
                    if (
                        e.key === 'ArrowDown' &&
                        $scope.showSearch &&
                        ns.noteCacheManager
                    ) {
                        e.preventDefault();
                        $scope.$apply(function () {
                            ns.noteCacheManager.navNext();
                        });
                    }

                    // Arrow Up - navigate to previous search result
                    if (
                        e.key === 'ArrowUp' &&
                        $scope.showSearch &&
                        ns.noteCacheManager
                    ) {
                        e.preventDefault();
                        $scope.$apply(function () {
                            ns.noteCacheManager.navPrev();
                            if (ns.noteCacheManager.focusedIndex === -1) {
                                document.getElementById('searchInput').focus();
                            }
                        });
                    }

                    // Enter - select focused search result
                    if (
                        e.key === 'Enter' &&
                        $scope.showSearch &&
                        ns.noteCacheManager &&
                        ns.noteCacheManager.focusedIndex >= 0
                    ) {
                        e.preventDefault();
                        var focused = ns.noteCacheManager.getFocused();
                        if (focused) {
                            $scope.$apply(function () {
                                $scope.openSearchResult(
                                    focused.result,
                                    focused.match
                                );
                            });
                        }
                    }
                });
            }

            /* Notes */
            {
                $scope.notes = function () {
                    return store ? store.notes : null;
                };

                $scope.launchNote = function (note) {
                    //check if note modified
                    saveOutlineNow();
                    $scope.showNotesList = false;
                    ns.launchNote(note);
                };

                $scope.createNote = function () {
                    ns.createNote();
                    $scope.showNotesList = false;
                };

                $scope.deleteNote = function () {
                    $scope.showNotesList = false;
                    ns.deleteNote();
                };

                $scope.isSelectedNote = function (note) {
                    if (store && store.note && note) {
                        return store.note.key == note.key;
                    }
                };
            }

            /* Touch */
            {
                $scope.isTouchEdit = function () {
                    if (ns && ns.outliner) {
                        return (
                            !appPrefs.readOnly &&
                            isMobile &&
                            ns.outliner.op.inTextMode()
                        );
                    }
                    return false;
                };

                $scope.move = function (direction) {
                    ns.outliner.op.reorg(direction);
                };

                $scope.strikethrough = function () {
                    if (ns) ns.outliner.op.strikethroughLine();
                };

                $scope.isStrikethrough = function () {
                    if (ns) return ns.outliner.op.isStrikethrough();
                    return false;
                };

                $scope.deleteText = function () {
                    if ($scope.readyToDelete) {
                        if (ns) ns.outliner.op.deleteLine();
                        $scope.readyToDelete = false;
                        return;
                    }
                    ns.outliner.op.focusCursor();
                    $scope.readyToDelete = true;
                    $timeout(function () {
                        $scope.readyToDelete = false;
                    }, 3500);
                };
            }

            /* Debug */
            {
                $scope.logDebug = function (message) {
                    $scope.log += '\r\n' + message;
                    $scope.update();
                };
            }
        }
    ]);
}
