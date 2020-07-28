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
        if (document.hidden) return;
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

    this.m = {
        sessionExpired: 'Session expired.',
        unauthorized: 'Authorization failed.'
    };

    var pendingNotes = 0; //counter to track # notes requested / saving
    this.incrementPendingNotes = function () {
        pendingNotes++;
    }.bind(this);

    this.decrementPendingNotes = function () {
        --pendingNotes;
        this.ngScope.setLoadingCountdown(
            store.notes.length - pendingNotes,
            store.notes.length
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

        if (store.requiresUpdate()) {
            store = new NoteStore();
            store.save();
        } else if (this.isCookieValid()) {
            // this.np.trySetAuthDetails(store.token, store.email); //Todo actually check
            try {
                this.loadNotes(true);
                hideSplash();
            } catch (err) {
                console.log('Failed to refresh notes. ' + err.message);
                this.launchNote(null, true);
            }

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

        if (store.note) {
            store.note.value = ns.outlineToXml();
            store.save();
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

    this.loadNotes = function (forceRefresh) {
        if (!store || !this.isCookieValid() || this.ngScope.isAppDisabled)
            return;

        if (this.isModelReady() == false) return;
        if (!forceRefresh) forceRefresh = false;

        if (forceRefresh) {
            this.ngScope.startMainRefresh();
            this.ngScope.showWorkingDialog();
        }

        this.np.getNoteIndex(this.parseNoteIndex);
    }.bind(this);

    let delay = 0;
    /* Fetch latest note object using arg.key then fire routine to set on ui*/
    this.loadNote = function (note, noteMetadata) {
        if (note == undefined) throw 'Note argument not specified';

        if (this.getPendingNotes() <= 0) this.setPendingNotes(1);
        else this.incrementPendingNotes();
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
        return true;
    }.bind(this);

    this.isCookieValid = function () {
        return api.isLoggedIn();
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
            if (!store.note && store.notes.length > 0)
                this.launchNote(null, true);
            this.ngScope.hideWorkingDialog();
            this.ngScope.finishMainRefresh();
        }
    }.bind(this);

    this.createNote = function () {
        var n = new Note(initialOpmltext);
        this.launchNote(n);
        this.saveNote();
    }.bind(this);

    this.launchNote = function (note, useDefault) {
        if (useDefault == undefined) useDefault = false;

        try {
            if (
                useDefault == true ||
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
                this.outliner.op.xmlToOutline(note.value, false);
            }

            this.ngScope.hideLoginDialog();
            hideSplash();
        } catch (error) {
            console.log('Error occured when launching note. ' + error.message);
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
        localStorage[this.storageName] = JSON.stringify(this);
        localStorage.ctOpmlSaves++;
    }.bind(this);

    this.load = function () {
        if (localStorage[this.storageName] == undefined) return null;

        try {
            var obj = JSON.parse(localStorage.nsxData);

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
        } catch (err) {
            console.error(
                'Error occured when parsing saved data ' + err.message
            );
            return null;
        }
    };

    this.clear = function () {
        localStorage.removeItem('nsxData');
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
        var token = localStorage.getItem(ns.TOKEN_NAME);
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

    $(document).bind('touchend', function (e) {
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
        'context',
        function ($scope, $timeout, context) {
            /* Safe Apply */
            {
                $scope.update = function (fn) {
                    var phase = this.$root.$$phase;
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
                }
            ];

            $scope.setDefaults = function () {
                $scope.loginButtonText = loginStates.submit;
                $scope.sessionAlert = '';
                $scope.showLoginInfo = false;
                $scope.showOverlay = false;
                $scope.showLogin = false;
                $scope.isAppDisabled = false;
                $scope.appDisabledMessage = '';
                $scope.showShortcuts = false;
                $scope.showBarMenu = false;
                $scope.idleTimeout = false;
                $scope.showWorking = false;
                $scope.showMainRefresh = false;
                $scope.statusMessage = '';
                $scope.loadingCountdownMessage = defaultloadingSuffix;
                $scope.user = {
                    email: '',
                    password: ''
                };
            };

            $scope.hidePopUps = function () {
                $scope.showLogin = false;
                $scope.showBarMenu = false;
                $scope.showShortcuts = false;
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
                api.initialize(() => ns.loadNotes(true));
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
                    else {
                        event.stopPropagation();
                        event.preventDefault();
                        ns.saveNote();
                        concord.removeFocus(true);
                    }
                };

                $scope.setStatus = function (e) {
                    $scope.statusMessage = e;
                    $scope.update();
                };
            }

            $scope.isMobile = function () {
                return $.browser.mobile;
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
                    $scope.context.hello.isVisible = !$scope.context.hello
                        .isVisible;
                };

                $scope.toggleBarMenuDialog = function () {
                    $scope.showBarMenu = !$scope.showBarMenu;
                    if ($scope.showBarMenu) $scope.hideAllBarMenuChildren();
                };
                $scope.hideAllBarMenuChildren = function () {
                    $scope.hideShortcutDialog();
                    $scope.showNotesList = false;
                };
                $scope.hideDialogs = function ($event) {
                    if ($event.target.id != 'taskBarOptions') {
                        if ($scope.showBarMenu == true) {
                            $scope.showBarMenu = false;
                        }
                    }
                };
                $scope.toggleNotesDialog = function () {
                    $scope.showNotesList = !$scope.showNotesList;
                };
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
                            $scope.isMobile() &&
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
        }
    ]);
}
