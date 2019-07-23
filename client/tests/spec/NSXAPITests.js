/*
Disabled till we find a better way to test the API

describe('NoteProvider / NSX API Functions', function() {
    var np = new NoteProvider(); //todo: use another copy of NP for now (when ready replace in notes.js)
    var u = 'jnx@nasha.co.in';
    var p = 'jamwal';
    var otag = 'Outline-OPML';
    var _TEMP_KEY = 'abf0908cedee11e59fc13fb8f9b364cc';
    var _TEMP_TOKEN =
        'B0E2C192EE80454B387668E0250A830BE544BCB59248ED1C04A7084FA45CA146';

    beforeEach(function() {
        api = new API();
        api.initialize(() => {});
    });

    it('should be able to login', function() {
        np.login(
            {
                username: u,
                password: p
            },
            onResponse
        );
    });

    it('should fail login', function() {
        np.login(
            {
                username: 'foo@bar.com',
                password: 'wrong'
            },
            onResponse
        );
    });

    it('should fail get note index', function() {
        np.trySetAuthDetails(u, p);
        np.getNoteIndex(onResponse);
    });

    it('should get the note index', function() {
        loginExecute(function() {
            np.getNoteIndex(onResponse);
        });
    });

    it('should get note', function() {
        loginExecute(function() {
            np.getNote(_TEMP_KEY, onResponse, onResponse);
        });
    });

    it('should update the note', function() {
        loginExecute(function() {
            np.updateNote(
                _TEMP_KEY,
                'UNIT TESTING ' + makeid(),
                otag,
                null,
                0,
                onResponse,
                onResponse
            );
        });
    });

    it('should create a new  note', function() {
        loginExecute(function() {
            np.saveNote(
                'UNIT TESTING ' + makeid(),
                otag,
                onResponse,
                onResponse
            );
        });
    });

    it('should try to set auth details', function() {
        np.trySetAuthDetails(_TEMP_TOKEN, u);
        setTimeout(function() {
            np.saveNote(
                'UNIT TESTING ' + makeid(),
                otag,
                onResponse,
                onResponse
            );
        }, 5000);
    });

    it('should logout', function() {
        loginExecute(function() {
            np.logOut();
        });
    });

    function loginExecute(callback) {
        np.login(
            {
                username: u,
                password: p
            },
            function() {
                callback();
            }
        );
    }

    function onResponse() {
        console.log('Response received in test');
    }

    function makeid() {
        var text = '';
        var possible =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (var i = 0; i < 5; i++)
            text += possible.charAt(
                Math.floor(Math.random() * possible.length)
            );

        return text;
    }
});
 */
