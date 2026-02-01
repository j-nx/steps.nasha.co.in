function NoteProviderMock() {
    this.isLoggedInInternal = false; //namespace collisions
    this.authData = {};
}

NoteProviderMock.prototype.login = function (login, callback) {
    var status = {};
    status.isSuccess = false;
    status.code = 0;

    var that = this;
    setTimeout(function () {
        if (login.username == 'jnx@nasha.co.in') {
            status.isSuccess = true;
            that.isLoggedInInternal = true;
        }

        callback(status);
    }, 2500);
};

NoteProviderMock.prototype.logOut = function (login) {
    var clear = {};
    clear.email = '';
    clear.token = '';
    //this.sn.setAuthDetails(clear);
};

NoteProviderMock.prototype.isLoggedIn = function () {
    return this.isLoggedInInternal;
};

NoteProviderMock.prototype.getAuthDetails = function () {
    if (this.isLoggedInInternal == false) return null;

    //new authdata after login
    var auth = {};
    auth.token = '12345678';
    auth.email = 'jnx@nasha.co.in';

    return auth;
};

NoteProviderMock.prototype.setAuthDetails = function (authDetails) {
    this.isLoggedInInternal = true;
    this.authData.token = authDetails.token;
    this.authData.email = authDetails.email;
};

NoteProviderMock.prototype.getNotes = function (callback) {
    var results = {};

    results.isSuccess = true;

    results.data = {};

    var n1 = {};
    var n2 = {};
    var n3 = {};
    n1.key = 'huptoothree4';
    n1.body =
        'here is the body, \nhmmtisshouldbehiddenInnotesvlistviuew \n\n\n' +
        "Truffaut lomo eu pinterest, fanny pack occupy fugiat skateboard fingerstache dolor synth. Esse american apparel tempor banh mi reprehenderit food truck, readymade selvage tousled. Shoreditch literally authentic cred kogi fingerstache. Banjo narwhal godard, fap 90's leggings sartorial qui sustainable blog ethical culpa. Letterpress VHS mollit vinyl banh mi nihil occupy, vice cred cliche bespoke nesciunt accusamus mustache. Ad authentic four loko, echo park selfies voluptate pickled williamsburg 90's. Whatever est ad, helvetica jean shorts quinoa direct trade meggings mumblecore wayfarers eu artisan laborum. \n " +
        'Neutra non vice, try-hard qui placeat flexitarian wolf post-ironic umami ea semiotics viral bicycle rights. Lo-fi meggings brunch placeat. Sunt vinyl blue bottle yr, cardigan quinoa proident banksy. Aliqua consectetur meh trust fund sapiente irony helvetica tattooed. Blog keffiyeh banh mi keytar, dolor cosby sweater tousled yr artisan. Bicycle rights eiusmod ut veniam. Organic mustache magna iphone. \n\n\n\n' +
        "Leggings duis exercitation, tumblr DIY selvage eiusmod vinyl sartorial irony tattooed chambray tempor. Flannel banh mi et, hella meh street art organic high life terry richardson actually do farm-to-table ullamco nesciunt neutra. Excepteur culpa craft beer, raw denim pitchfork consectetur forage fingerstache hashtag keffiyeh mustache placeat mcsweeney's. Adipisicing nihil squid et iphone. Shoreditch hoodie single-origin coffee aliqua sriracha tumblr nesciunt, keytar farm-to-table iphone helvetica. Before they sold out street art organic mustache Austin cillum reprehenderit, banjo pariatur lomo. Trust fund nisi pork belly VHS, laborum laboris truffaut nulla keffiyeh aute eiusmod tonx exercitation. \n";
    n2.key = 'key2wooeyy';
    n2.body = 'insert a longer body perhaps?';
    n3.key = 'keeeeey3333wheeeowoo';
    n3.body = '3 body woozzz, special chars etc';

    results.data = new Array();
    results.data[0] = n1;
    results.data[1] = n2;
    results.data[2] = n3;

    setTimeout(function () {
        callback(results);
    }, 1000);
};

NoteProviderMock.prototype.getNote = function (key, callback, errorCallback) {};

NoteProviderMock.prototype.updateNote = function (
    key,
    noteBody,
    tag,
    version,
    deleted,
    callback,
    errorCallback
) {};

NoteProviderMock.prototype.deleteNote = function (key, onDelete, onFailure) {
    onDelete({ key, deleted: 1 });
};

NoteProviderMock.prototype.initPolling = function (callback) {
    if (callback) callback('mock-token');
};

NoteProviderMock.prototype.getChanges = function (callback) {
    callback([]);
};

/**
 *  Storage layer (IndexedDB get/set) - used by global
 */
function StorageMock() {
    this.data = null;
    this.db = true;
}

StorageMock.prototype.set = function (data) {
    this.data = data;
};

StorageMock.prototype.get = function () {
    return Promise.resolve(this.data);
};

StorageMock.prototype.clear = function () {
    this.data = null;
};
