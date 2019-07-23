"use strict";

/**
 * Note.sx API wrapper module.
 *
 * @module     nsx-api-js
 */
function NSXAPI() {
    var api = new SimpleNoteAPI();
    var _email = "",
        _token = "";

    function _isLoggedIn() {
        return !!_email && !!_token;
    }

    function _authenticate(obj) {
        api._authenticate(obj);
    }

    function _retrieveIndex(obj) {
        api._retrieveIndex(obj);
    }

    function _retrieveNote(obj) {
        api._retrieveNote(obj);
    }

    function _updateNote(obj) {
        api._updateNote(obj);
    }

    function _signOut() {
        if (!_isLoggedIn()) return;
        api._signOut();
    }

    function _clearCredentials() {
        _email = "";
        _token = "";
    }

    function _trySetAuthDetails(token, user) {
        api._trySetAuthDetails(token, user);
    }

    // ============ PUBLIC METHODS & PROPERTIES ================================
    /**
     * Returns a boolean showing whether the user is currently logged in or not.
     *
     * @method     isLoggedIn
     * @return     {Boolean}
     */
    this.isLoggedIn = function() {
        return _isLoggedIn();
    };
    /**
     * Returns auth details, i.e. an object containing the current email address
     * and auth token returned by the API after a successful login.
     *
     * @method     getAuthDetails
     * @return     {Object} Auth info.
     */
    this.getAuthDetails = function() {
        return {
            token: _token,
            email: _email
        };
    };
    /**
     * Authenticates the client.  The request is made asynchronously via YQL.
     * Throws an exception if one of the arguments is missing or empty.
     *
     * @method     auth
     * @param      config.email {String} SimpleNote account email address
     * @param      config.password {String} SimpleNote account password
     * @param      config.success {Function} callback function to be called on
     *             successful authentication (optional)
     * @param      config.error {Function} callback function to be called on
     *             failure, is passed a plain text error string (optional)
     */
    this.auth = function(config) {
        _authenticate(config);
    };
    /**
     * Returns an index of all notes.
     *
     * @method     retrieveIndex
     * @param      config.success {Function} callback function to be called on
     *             success; the callback will be passed the array containing the
     *             notes index
     * @param      config.error {Function} callback function to be called on
     *             failure, is passed a plain text error string
     */
    this.retrieveIndex = function(obj) {
        _retrieveIndex(obj);
    };
    /**
     * Retrieves and returns a single note as a hash in the following form:
     *
     *     {
     *       body: "my example note",
     *       key: "agtzaW1wbG0LCxIETm90ZRjoBAw",
     *       modifydate: "2008-12-18 04:04:20.554442",
     *       createdate: "2008-12-18 04:04:20.554442",
     *       deleted: false
     *     }
     *
     * Throws an exception if one of the arguments is missing or empty.
     *
     * @method     retrieveNote
     * @param      config.key {String} the note ID
     * @param      config.success {Function} callback function to be called on
     *             success; the callback will be passed the note hash
     * @param      config.error {Function} callback function to be called on
     *             failure, is passed a clear text error string.
     */
    this.retrieveNote = function(obj) {
        _retrieveNote(obj);
    };
    /**
     * Creates a new note.  Returns the new note.  Throws an exception if one
     * of the arguments is missing or empty.
     *
     * @method     createNote
     * @param      config.body {String} the note body
     * @param      config.success {Function} callback function to be called on
     *             success; the callback will be passed the note object
     * @param      config.error {Function} callback function to be called on
     *             failure, is passed a clear text error string.
     */
    this.createNote = function(obj) {
        _updateNote(obj);
    };
    /**
     * Updates an existing note or creates a new one if key is empty.
     * Returns the note ID on success.  Throws an exception if one of the arguments is
     * missing or empty.
     *
     * @method     updateNote
     * @param      config.key {String} the ID of the note to update
     * @param      config.body {String} the note body
     * @param      config.success {Function} callback function to be called on
     *             success; the callback will be passed the note ID string
     * @param      config.error {Function} callback function to be called on
     *             failure, is passed a clear text error string.
     */
    this.updateNote = function(obj) {
        _updateNote(obj);
    };
    this.signOut = function() {
        _signOut();
        _clearCredentials();
    };
    this.trySetAuthDetails = function(token, email) {
        _token = token;
        _email = email;
        _trySetAuthDetails(_token, _email);
    };
    this.setAPIUrl = function(url) {
        _baseURL = url;
    };
}

function SimpleNoteAPI() {
    var $ = window.jQuery,
        _baseURL = "https://nsx2.us-east-1.elasticbeanstalk.com/",
        _token = "",
        _email = "",
        _debugEnabled = false,
        _post = "POST";
    function log() {
        if (window.console && _debugEnabled) {
            console.log(Array.prototype.slice.call(arguments));
        }
    }
    /**
     * Deletes both `_email` and `_token` variables.
     *
     * @method     _clearCredentials
     * @private
     */
    function _clearCredentials() {
        _email = "";
        _token = "";
    }
    /**
     * Parses a SN-supplied timestamp and returns a `Date` object.
     *
     * @method     _parseTimestamp
     * @param      timestamp {String}
     * @returns    {Date}
     * @private
     */
    function _parseTimestamp(string) {
        if (isNaN(string)) {
            throw "ArgumentError: string must be in the correct epoc form. e.g 1318023197289";
        }
        return new Date(string * 1000);
    }
    function _encodeJSON(jsonObj) {
        return $.base64.encode(encode_utf8(JSON.stringify(jsonObj)));
    }
    /**
     * Creates as base request object that is sent as POST data.
     *
     * @method     _createRequest
     * @returns    {BaseRequest}
     * @private
     */
    function _createRequest() {
        return {
            token: _token,
            username: _email
        };
    }
    function _query(caller, path, data, cbSuccess, cbError, context, method) {
        $.ajax({
            data: data,
            dataType: "json",
            method: method ? method : "GET",
            scriptCharset: "utf-8",
            url: _baseURL + path,
            context: context,
            success: function(data, status, req) {
                //Check status, req
                cbSuccess(data);
            },
            error: function(errXHR, status, error) {
                log(caller + " error #3", errXHR, status, error);
                cbError(error, errXHR);
            }
        });
    }
    function _getErrorCode(status) {
        var codes = {
            "400": "bad_request",
            "401": "unauthorized",
            "403": "forbidden",
            "404": "not_found",
            "500": "server_error"
        };
        status = String(status);
        return codes[status] || "unknown_error";
    }
    function _throwUnlessLoggedIn() {
        if (!_isLoggedIn()) {
            throw "AuthError";
        }
    }
    function _validateRetrievalConfig(obj) {
        if (!$.isPlainObject(obj)) {
            throw "ArgumentError: argument must be object";
        }
        if (!$.isFunction(obj.success) || !$.isFunction(obj.error)) {
            throw "ArgumentError: callbacks missing";
        }
    }
    function _isLoggedIn() {
        return !!_email && !!_token;
    }
    function _authenticate(obj) {
        if (!obj || !obj.email || !obj.password) {
            throw "ArgumentError: email and password required";
        }
        var config = $.extend(
            {
                data: {
                    username: obj.email,
                    password: obj.password
                },
                success: function() {
                    alert("SimpleNote auth success");
                },
                error: function(errorCode) {
                    alert("SimpleNote auth error: " + errorCode);
                }
            },
            obj
        );
        function __cbSuccess(result) {
            _email = config.email;
            _token = $.trim(result.token);
            config.success();
        }
        function __cbError(code) {
            _clearCredentials();
            config.error(code);
        }
        _query(
            "_authenticate",
            "login",
            config.data,
            __cbSuccess,
            __cbError,
            this,
            _post
        );
    }
    function _retrieveIndex(obj) {
        _throwUnlessLoggedIn();
        _validateRetrievalConfig(obj);
        var config = $.extend(
            {
                success: function(json) {},
                error: function(errorString) {}
            },
            obj
        );
        log("_retrieveIndex");
        function __cbSuccess(result) {
            var resp = {
                data: result
            };
            config.success(resp);
        }
        _query(
            "_retrieveIndex",
            "noteslist",
            _createRequest(),
            __cbSuccess,
            config.error,
            this,
            _post
        );
    }
    function _retrieveNote(obj) {
        _throwUnlessLoggedIn();
        _validateRetrievalConfig(obj);
        if (!obj.key) {
            throw "ArgumentError: key is missing";
        }
        var data = _createRequest();
        data.key = obj.key;
        var config = $.extend(
            {
                data: data,
                success: function(json) {},
                error: function(errorString) {}
            },
            obj
        );
        log("_retrieveNote");
        function __cbSuccess(result) {
            config.success({
                content: $.trim(result.content),
                key: result.key,
                modifydate: _parseTimestamp(result.modifydate),
                createdate: _parseTimestamp(result.createdate),
                version: result.version,
                deleted: result.deleted == 1
            });
        }
        _query(
            "_retrieveNote",
            "note",
            config.data,
            __cbSuccess,
            config.error,
            this,
            _post
        );
    }
    function _updateNote(obj) {
        _throwUnlessLoggedIn();
        _validateRetrievalConfig(obj);
        if (obj.body === undefined) {
            throw "ArgumentError: body is missing";
        }
        var config = $.extend(
            {
                success: function(json) {},
                error: function(errorString) {}
            },
            obj
        );
        var note = {
            content: $.trim(config.body),
            tags: config.tags,
            version: config.version,
            deleted: config.deleted
        };
        if (!obj.key) {
            log("Creating new note...");
        } else {
            note.key = obj.key;
        }
        var data = _createRequest();
        data.note = _encodeJSON(note);
        log("_updateNote");
        function __cbSuccess(result) {
            config.success(result);
        }
        _query(
            "_updateNote",
            "updatenote",
            data,
            __cbSuccess,
            config.error,
            this,
            _post
        );
    }
    function _trySetAuthDetails(token, user) {
        if (!token) {
            throw "ArgumentError: token is missing";
        }
        if (!user) {
            throw "ArgumentError: username is missing";
        }
        var config = {
            success: function(json) {},
            error: function(errorString) {
                log(errorString);
            }
        };
        var data = {
            token: token,
            username: user
        };
        function __cbSuccess(result) {
            log("Set Auth Response Received");
        }
        _query(
            "_trySetAuthDetails",
            "token",
            data,
            __cbSuccess,
            config.error,
            this,
            _post
        );
    }
    function _signOut() {
        if (!_isLoggedIn()) return;
        log("_signOut");
        var config = {
            success: function(json) {},
            error: function(errorString) {
                log(errorString);
            }
        };
        _query("_signOut", "logout", null, config.success, config.error, this);
    }
}
