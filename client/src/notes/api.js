function API() {
    this.api = new gApi();

    this.initialize = (onInitComplete = () => {}) => {
        this.api.initialize(onInitComplete);
    };

    this.isLoggedIn = () => {
        return this.api.isLoggedIn();
    };

    this.signIn = () => {
        this.api.signIn();
    };

    this.signOut = () => {
        this.api.signOut;
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
}
// #region GDrive
function gApi() {
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

    this.initialize = (onInitComplete) => {
        this.onInitComplete = onInitComplete;

        // Load the API client and auth2 library
        const init = () => gapi.load('client:auth2', this.initClient);

        // Delay to allow wake up
        setTimeout(init, 1000);
    };

    this.isLoggedIn = () => {
        return gapi.auth2.getAuthInstance().isSignedIn.get();
    };

    this.refreshToken = () => {
        return gapi.auth2
            .getAuthInstance()
            .currentUser.get()
            .reloadAuthResponse();
    };

    this.signIn = () => {
        gapi.auth2.getAuthInstance().signIn();
    };

    this.signOut = () => {
        gapi.auth2.getAuthInstance().signOut();
    };

    this.retrieveIndex = (successCallback, failCallback) => {
        const that = this;
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
        //return new Promise(function(resolve, reject) {});

        var request = gapi.client.drive.files.get({
            fileId: key,
            alt: 'media'
        });
        request.then(
            function (response) {
                successCallback(response.body);
            },
            function (error) {
                console.error(error);
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

            var accessToken = gapi.auth.getToken().access_token;
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
                    body: form
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
                    console.error('Error:', error);
                    failCallback(error);
                });
        } catch (error) {
            console.error(error);
        }
    };

    this.updateFile = (key, body, successCallback, failCallback) => {
        const that = this;

        var file = new Blob([body], { type: 'text/plain' });
        var metadata = {
            body: file
        };

        var accessToken = gapi.auth.getToken().access_token; // Here gapi is used for retrieving the access token.
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
                fields: 'files(id, version, modifiedTime)'
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
    // How make private?
    this.initClient = () => {
        const that = this;

        const success = function () {
            console.log('Initalized Google');
            // Listen for sign-in state changes.
            gapi.auth2
                .getAuthInstance()
                .isSignedIn.listen(that.updateSigninStatus);

            this.updateSigninStatus();

            console.log(
                this.isLoggedIn() ? 'User Signed In' : 'User not signed in'
            );
        }.bind(this);

        const error = function (e) {
            console.error('Error Occured when initializing Google ' + e);
            this.onInitComplete();
        };

        gapi.client
            .init({
                apiKey: this.API_KEY,
                clientId: this.CLIENT_ID,
                discoveryDocs: this.DISCOVERY_DOCS,
                scope: this.SCOPES
            })
            .then(success)
            .catch(error);
    };

    this.updateSigninStatus = () => {
        const isSignedIn = this.isLoggedIn();

        if (isSignedIn) {
            this.refreshToken().then((authResponse) => {
                console.log('Token updated');
                this.getRemoteFolderId().then((id) => {
                    this.folderId = id;
                    this.onInitComplete();
                });
            });
        } else {
            this.onInitComplete();
            console.log('Needs Sign in');
        }
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
                    console.info('No folders found.');
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
                        console.error(err);
                        reject(id);
                    }
                );
            }.bind(this);

            gapi.client.drive.files
                .list({
                    pageSize: 1000,
                    q:
                        "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
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
                        console.error('Error Creating folder');
                        reject(Error());
                    } else {
                        console.debug('Created folder ' + response.result.id);
                        resolve(response.result.id);
                    }
                })
                .catch((e) => {
                    console.error('Exception ' + e);
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
