function API() {
    this.api = new gApi();

    this.initialize = (onInitComplete = () => {}) => {
        this.api.initialize(onInitComplete);
    };

    this.isLoggedIn = () => {
        return this.api.isLoggedIn();
    };

    this.hasExpiredSession = () => {
        return this.api.hasExpiredSession();
    };

    this.isStoredTokenExpired = () => {
        return this.api.isStoredTokenExpired();
    };

    this.signIn = () => {
        this.api.signIn();
    };

    this.signInAndInitialize = (onInitComplete) => {
        this.api.onInitComplete = onInitComplete;
        this.api.signIn({ prompt: '' });
    };

    this.signOut = () => {
        this.api.signOut();
    };

    // returns [{key, version, modifiedTime}]
    this.retrieveIndex = (obj) => {
        console.debug('Fetching Index');
        this.api.retrieveIndex(obj.success, obj.error);
    };

    this.retrieveNote = (obj) => {
        console.debug('Retrieving Note');
        this.api.retrieveNote(obj.key, obj.success, obj.error);
    };

    this.createNote = (obj) => {
        console.debug('Creating Note');
        this.api.createFile(obj.body, obj.success, obj.error);
    };

    this.updateNote = (obj) => {
        console.debug('Updating Note');
        this.api.updateFile(obj.key, obj.body, obj.success, obj.error);
    };

    this.deleteNote = (obj) => {
        console.debug('Deleting Note');
        this.api.deleteFile(obj.key, obj.success, obj.error);
    };

    this.initPolling = (callback) => {
        this.api.initPolling(callback);
    };

    this.getChanges = (obj) => {
        this.api.getChanges(obj.success, obj.error);
    };
}
// #region GDrive
function gApi() {
    // Logging helper with [OAUTH] prefix
    const log = {
        info: (msg, ...args) => console.info('[OAUTH]', msg, ...args),
        error: (msg, ...args) => console.error('[OAUTH]', msg, ...args),
        debug: (msg, ...args) => console.debug('[OAUTH]', msg, ...args)
    };

    this.CLIENT_ID = config.CLIENT_ID;

    this.API_KEY = config.API_KEY;

    this.DISCOVERY_DOCS = [
        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
    ];

    // Authorization scopes required by the API; multiple scopes can be
    // included, separated by spaces.
    this.SCOPES = 'https://www.googleapis.com/auth/drive.file';

    this.folderId = undefined;

    this.onInitComplete = undefined;

    // Google Identity Services (GIS) token state
    this.accessToken = null;
    this.tokenExpiresAt = null;
    this.tokenClient = null;
    this._tokenPromise = null;

    // LocalStorage keys
    const TOKEN_KEY = 'gis_access_token';
    const EXPIRY_KEY = 'gis_token_expires_at';

    // Token storage helpers
    this.getStoredToken = () => {
        const token = localStorage.getItem(TOKEN_KEY);
        const expiry = parseInt(localStorage.getItem(EXPIRY_KEY));
        return { token, expiry: expiry || 0 };
    };

    this.saveToken = (token, expiry) => {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(EXPIRY_KEY, String(expiry));
    };

    this.clearStoredToken = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EXPIRY_KEY);
    };

    this.calculateTokenExpiry = (expiresInSeconds) => {
        return Date.now() + expiresInSeconds * 1000;
    };

    this.isStoredTokenExpired = () => {
        const { expiry } = this.getStoredToken();
        return expiry > 0 && Date.now() >= expiry;
    };

    this.initialize = (onInitComplete) => {
        this.onInitComplete = onInitComplete;

        // Load the API client library (auth handled by GIS)
        gapi.load('client', this.initClient);
    };

    this.isLoggedIn = () => {
        return this.accessToken !== null;
    };

    this.hasExpiredSession = () => {
        return this.accessToken !== null && Date.now() >= this.tokenExpiresAt;
    };

    this.refreshToken = () => {
        return new Promise((resolve, reject) => {
            if (!this.tokenClient) {
                reject(new Error('Token client not initialized'));
                return;
            }
            this._tokenPromise = { resolve, reject };
            this.tokenClient.requestAccessToken({ prompt: '' });
        });
    };

    this.signIn = (options) => {
        if (this.hasExpiredSession()) {
            log.info('Token expired, requesting refresh from Google');
        }
        this.tokenClient.requestAccessToken(options);
    };

    this.signOut = () => {
        if (this.accessToken) {
            google.accounts.oauth2.revoke(this.accessToken, () => {
                log.info('Token revoked');
            });
        }
        this.accessToken = null;
        this.tokenExpiresAt = null;
        gapi.client.setToken(null);
        this.clearStoredToken();
    };

    this.retrieveIndex = (successCallback, failCallback) => {
        var retrievePageOfFiles = function (request, result) {
            request.execute(function (resp) {
                const files = [];
                if (resp.files)
                    resp.files.forEach((r) => {
                        files.push({
                            key: r.id,
                            version: r.version,
                            modifydate: new Date(r.modifiedTime).getTime()
                        });
                    });

                successCallback(files);
            });
        };

        var initialRequest = gapi.client.drive.files.list({
            q: `'${this.folderId}' in parents and trashed = false`,
            fields: 'files(id, version, modifiedTime)'
        });
        retrievePageOfFiles(initialRequest, []);
    };

    this.retrieveNote = (key, successCallback, failCallback) => {
        var request = gapi.client.drive.files.get({
            fileId: key,
            alt: 'media'
        });
        request.then(
            function (response) {
                successCallback(response.body);
            },
            function (error) {
                log.error(error);
                failCallback(error);
            }
        );
        return request; //for batch request
    };

    this.createFile = (body, successCallback, failCallback) => {
        const that = this;
        try {
            var file = new Blob([body], { type: 'text/plain' });
            var metadata = {
                name: `${this.uuidv4()}.opml`,
                mimeType: 'text/plain',
                parents: [this.folderId],
                body: file
            };

            var accessToken = this.accessToken;
            var form = new FormData();
            form.append(
                'metadata',
                new Blob([JSON.stringify(metadata)], {
                    type: 'application/json'
                })
            );
            form.append('file', file);

            fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
                {
                    method: 'POST',
                    headers: new Headers({
                        Authorization: 'Bearer ' + accessToken
                    }),
                    body: form,
                    keepalive: true
                }
            )
                .then((res) => {
                    return res.json();
                })
                .then(function (resp) {
                    that.getFilesMetadata([{ id: resp.id }])
                        .then((fileList) => successCallback(fileList[0]))
                        .catch((e) => failCallback(e));
                })
                .catch((error) => {
                    log.error('Error:', error);
                    failCallback(error);
                });
        } catch (error) {
            log.error(error);
        }
    };

    this.updateFile = (key, body, successCallback, failCallback) => {
        const that = this;

        var file = new Blob([body], { type: 'text/plain' });
        var metadata = {
            body: file
        };

        var accessToken = this.accessToken;
        var form = new FormData();
        form.append(
            'metadata',
            new Blob([JSON.stringify(metadata)], {
                type: 'application/json'
            })
        );
        form.append('file', file);

        fetch(
            'https://www.googleapis.com/upload/drive/v3/files/' +
                key +
                '?uploadType=media',
            {
                method: 'PATCH',
                headers: new Headers({
                    Authorization: 'Bearer ' + accessToken
                }),
                body: body,
                fields: 'files(id, version, modifiedTime)',
                keepalive: true
            }
        )
            .then((res) => {
                return res.json();
            })
            .then(function (resp) {
                if (resp.code && resp.code != 200) failCallback(resp.code);
                else
                    that.getFilesMetadata([{ id: resp.id }])
                        .then((fileList) => successCallback(fileList[0]))
                        .catch((e) => failCallback(e));
            })
            .catch(function (error) {
                if (error.toString() === 'TypeError: Failed to fetch')
                    error = 0; // disconnected
                failCallback(error);
            });
    };

    this.deleteFile = (key, successCallback, failCallback) => {
        var request = gapi.client.drive.files.delete({
            fileId: key
        });

        request.execute(function (resp) {
            if (resp.code && resp.code != 200) failCallback(resp.code);
            else successCallback(key);
        });
    };

    // #region Private
    this.initClient = () => {
        const that = this;

        gapi.client
            .init({
                apiKey: this.API_KEY,
                discoveryDocs: this.DISCOVERY_DOCS
            })
            .then(() => {
                if (typeof google === 'undefined' || !google)
                    throw Error('Failed to initialize GIS');
                log.info('Initialized Google');

                that.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: that.CLIENT_ID,
                    scope: that.SCOPES,
                    callback: (resp) => that.handleTokenResponse(resp)
                });

                // Try to restore a stored token from a previous session
                let { token, expiry } = that.getStoredToken();

                if (token && expiry > Date.now()) {
                    that.accessToken = token;
                    that.tokenExpiresAt = expiry;
                    gapi.client.setToken({ access_token: token });
                    log.info('Restored session from stored token');
                    that.getRemoteFolderId()
                        .then((id) => {
                            that.folderId = id;
                            that.onInitComplete();
                        })
                        .catch((e) => {
                            log.error('Failed to get folder', e);
                            that.onInitComplete();
                        });
                } else {
                    if (token) {
                        // Token expired - keep it to trigger lock screen, not login screen
                        that.accessToken = token;
                        that.tokenExpiresAt = expiry;
                        log.info('Stored token expired, will show lock screen');
                    }
                    that.onInitComplete();
                }
            })
            .catch((e) => {
                log.error(
                    'Error Occured when initializing Google ',
                    e.details || e
                );
                that.onInitComplete();
            });
    };

    this.handleTokenResponse = (tokenResponse) => {
        // Handle pending refresh promise (from refreshToken())
        if (this._tokenPromise) {
            const { resolve, reject } = this._tokenPromise;
            this._tokenPromise = null;

            if (tokenResponse.error) {
                reject(tokenResponse);
            } else {
                this.accessToken = tokenResponse.access_token;
                this.tokenExpiresAt = this.calculateTokenExpiry(
                    tokenResponse.expires_in
                );
                gapi.client.setToken({
                    access_token: tokenResponse.access_token
                });
                this.saveToken(this.accessToken, this.tokenExpiresAt);
                log.info('Token refresh successful');
                resolve(tokenResponse);
            }
            return;
        }

        // Normal init/sign-in flow
        if (tokenResponse.error) {
            log.info('Needs Sign in');
            this.accessToken = null;
            this.tokenExpiresAt = null;
            this.onInitComplete();
            return;
        }

        this.accessToken = tokenResponse.access_token;
        this.tokenExpiresAt = this.calculateTokenExpiry(
            tokenResponse.expires_in
        );
        gapi.client.setToken({ access_token: tokenResponse.access_token });
        this.saveToken(this.accessToken, this.tokenExpiresAt);
        log.info('User Signed In');

        this.getRemoteFolderId()
            .then((id) => {
                this.folderId = id;
                this.onInitComplete();
            })
            .catch((e) => {
                log.error('Failed to get folder after sign-in', e);
                this.onInitComplete();
            });
    };

    this.changesPageToken = null;

    this.initPolling = (callback) => {
        gapi.client.drive.changes.getStartPageToken().then(
            (response) => {
                this.changesPageToken = response.result.startPageToken;
                log.debug('Changes page token initialized');
                if (callback) callback(this.changesPageToken);
            },
            (error) => {
                log.error('Failed to get start page token', error);
            }
        );
    };

    this.getChanges = (successCallback, failCallback) => {
        if (!this.changesPageToken) {
            if (failCallback) failCallback('No page token');
            return;
        }

        gapi.client.drive.changes
            .list({
                pageToken: this.changesPageToken,
                fields: 'newStartPageToken, changes(fileId, removed, file(id, version, modifiedTime))'
            })
            .then(
                (response) => {
                    var result = response.result;
                    if (result.newStartPageToken) {
                        this.changesPageToken = result.newStartPageToken;
                    }
                    successCallback(result.changes || []);
                },
                (error) => {
                    log.error('Failed to get changes', error);
                    if (failCallback) failCallback(error);
                }
            );
    };

    this.getRemoteFolderId = () => {
        let id = undefined;

        const promise = function (resolve, reject) {
            const getFoldersSuccess = function (response) {
                var files = response.result.files;
                if (files && files.length > 0) {
                    for (var i = 0; i < files.length; i++) {
                        var file = files[i];
                        if (file.name === 'steps-notes') {
                            id = file.id;
                            break;
                        }
                    }
                } else {
                    log.info('No folders found.');
                }

                // If not found, create folder
                if (id) resolve(id);
                else createFolder();
            }.bind(this);

            const createFolder = function () {
                this.createFolder().then(
                    function s(id) {
                        resolve(id);
                    }.bind(this),
                    function e(err) {
                        log.error(err);
                        reject(id);
                    }
                );
            }.bind(this);

            gapi.client.drive.files
                .list({
                    pageSize: 1000,
                    q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
                    fields: 'nextPageToken, files(id, name)'
                })
                .then(getFoldersSuccess);
        }.bind(this);

        return new Promise(promise);
    };

    this.createFolder = () => {
        return new Promise(function (resolve, reject) {
            var fileMetadata = {
                name: 'steps-notes',
                mimeType: 'application/vnd.google-apps.folder'
            };
            gapi.client.drive.files
                .create({
                    resource: fileMetadata
                })
                .then(function (response) {
                    if (response.status != 200) {
                        log.error('Error Creating folder');
                        reject(Error());
                    } else {
                        log.debug('Created folder ' + response.result.id);
                        resolve(response.result.id);
                    }
                })
                .catch((e) => {
                    log.error('Exception ' + e);
                    reject(Error());
                });
        });
    };

    this.getFilesMetadata = (files) => {
        return new Promise((resolve, reject) => {
            const fileList = [];
            const promises = [];
            files.forEach((f) => {
                promises.push(
                    new Promise((resolve, reject) => {
                        gapi.client
                            .request({
                                path:
                                    'https://www.googleapis.com/drive/v3/files/' +
                                    f.id,
                                params: {
                                    fields: 'id, version, modifiedTime'
                                },
                                method: 'GET'
                            })
                            .then(
                                (fInfo) => {
                                    const r = fInfo.result;
                                    fileList.push({
                                        key: r.id,
                                        version: r.version,
                                        modifydate: new Date(
                                            r.modifiedTime
                                        ).getTime()
                                    });
                                    resolve();
                                },
                                (error) => {
                                    reject(error);
                                }
                            )
                            .catch((e) => reject(e));
                    })
                );
            });
            Promise.all(promises).then(() => resolve(fileList));
        });
    };

    this.uuidv4 = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
            /[xy]/g,
            function (c) {
                var r = (Math.random() * 16) | 0,
                    v = c == 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            }
        );
    };

    //#endregion
}
// #endregion
