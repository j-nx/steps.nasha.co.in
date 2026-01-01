window.isMobileFn = function () {
    return window.orientation !== undefined;
};

var betaMode = window.location.search.substring(1) == 'beta';

var isOffline = navigator.onLine === false;
var isMobile = isMobileFn();
console.log('isMobile evaluated to', isMobile);

var appPrefs = {
    readonly: isOffline,
    outlineFontSize: isMobile ? 0.95 : 1, // em
    iconSize: 0.5, // em
    paddingLeft: isMobile ? 8 : 11, // px
    nodeLineHeight: isMobile ? 1.4 : 1.6, // em
    authorName: 'DJ',
    authorEmail: 'jnx@nasha.co.in'
};
var BULLET = '';
var whenLastKeystroke = new Date(),
    whenLastAutoSave = new Date();
var ns;
var store;
var idler;
var api;

let TIMEOUT = 20; // min
let TIMEOUT_AUTO_REFRESH = 10; // min
let AUTOSAVE_DELAY = 5; // seconds
const MOBILE = {
    TIMEOUT: 0.2, // min, 0.2 = 12 seconds
    AUTOSAVE_DELAY: 1 // seconds
};

let interval_auto_refresh; // polling update
let interval_auto_save; // automatically save note
let interval_away_time; // auto-lock screen PC
let lastSeen = Date.now(); // epoch

var isLoaded = false;
var isDebug = false;
var appVersionHash = 'Development';

/* 
                        Desktop         Mobile
Auto-Refresh Interval        10              1
Time out Interval            20              1
Auto Save                    5s             2s
*/

function initLocalStorage() {
    return new Promise((resolve, reject) => {
        localStorage.ctOpmlSaves = 0;
        localStorage.flTextMode = 'true';

        store = new NoteStore();
        store
            .load()
            .then(() => {
                if (!store.note) store.note = new Note(initialOpmltext);
                resolve();
            })
            .catch((err) => {
                console.error('Error Initializeing', err);
                reject(err);
            });
    });
}

/**
 * Storage Class based on IndexedDB
 * use storage.clear() in place of localStorage.clear() */
class NSXStorage {
    constructor() {
        this.dbName = 'NSXStorageDB';
        this.storeName = 'nsxData';
        this.db = null;
        this.init();
    }

    init() {
        const request = indexedDB.open(this.dbName, 1);
        request.onupgradeneeded = (event) => {
            event.target.result.createObjectStore(this.storeName);
        };
        request.onsuccess = (event) => {
            this.db = event.target.result;
        };
        console.debug('NSXStorage Initialized');
    }

    set(data) {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        transaction.objectStore(this.storeName).put(data, this.storeName);
    }

    get() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(
                [this.storeName],
                'readonly'
            );
            const request = transaction
                .objectStore(this.storeName)
                .get(this.storeName);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    clear() {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        transaction.objectStore(this.storeName).delete(this.storeName);
        console.debug('Storage cleared');
    }
}

var storage = new NSXStorage();

function saveOutlineNow() {
    if (ns.canPersist() == false || ns.isCookieValid() === false) return;

    ns.saveNote();
    // Note: opClearChanged() is now called in the save success callback
    // to ensure we only clear the flag after the save actually completes
}

function backgroundProcess() {
    if (opHasChanged()) {
        if (secondsSince(whenLastKeystroke) >= AUTOSAVE_DELAY) {
            saveOutlineNow();
        }
    }
}

function startup(outliner, noInitialize) {
    //Post Outline Initialization
    console.debug('Starting up...');

    clearTimers();

    if (isMobile) {
        TIMEOUT = MOBILE.TIMEOUT;
        AUTOSAVE_DELAY = MOBILE.AUTOSAVE_DELAY;
    }

    const onAPIInitialized = () => {
        initLocalStorage()
            .then(() => {
                if (!noInitialize || noInitialize === false) {
                    var initVal = initialOpmltext;
                    if (!store.note || !store.note.value)
                        opXmlToOutline(initVal);
                }

                startTimers();

                ns = CreateNoteService(outliner);
                ns.start();

                if (isOffline) {
                    ns.setOffline('Offline');
                    ns.tryFinishLoading();
                }
            })
            .catch((err) => {});
    };

    if (isAppDisabled()) return;

    api = new API();
    isOffline ? onAPIInitialized() : api.initialize(onAPIInitialized);
}

function opKeystrokeCallback(event) {
    whenLastKeystroke = new Date();
    if (
        event.srcElement != null &&
        event.srcElement.className.indexOf('concord-wrapper') == -1 &&
        event.srcElement.className.indexOf('note-icon') === -1
    )
        return;
    if (navigationKeystrokes.has(event.which)) return;

    if (ns) ns.setNoteState(saveStates.modified);
    if (idler) idler.resetTimer();
}

function hideSplash() {
    var hs = 'hide-splash';
    var x = document.getElementById('splash');
    if (x) {
        if (_.contains(x.classList, hs) == false) x.className += ' ' + hs;
    }
}

function detectIdle() {
    if (appPrefs.readonly) return;

    document.onkeypress = this.resetTimer;

    this.away = function () {
        if (!ns) return;
        if (ns.ngScope.isLoggedIn() == false || ns.ngScope.isAppDisabled)
            return;

        console.debug('Activating Away Mode');
        clearTimers();
        ns.ngScope.showDisabledDialog('Click to continue', true);
    }.bind(this);

    this.resetTimer = function () {
        if (isMobile) return; // Timers do not work well on mobile
        clearInterval(interval_away_time);
        interval_away_time = setInterval(() => this.away(), TIMEOUT * 60000);
    }.bind(this);

    this.resetTimer();

    // SetInterval Has very unpredictable behavior on mobile (esp one plus), made worse with debounce
    // this.resetTimer = _.debounce(resetTimerInternal, 300).bind(this);
    // this.resetTimer();
}

//#region Timers

function startTimers() {
    // Automatic save note
    interval_auto_save = setInterval(function () {
        backgroundProcess();
    }, AUTOSAVE_DELAY * 1000);

    // To get fresh notes & versions
    startAutoRefreshTimer();

    // Start Idler
    idler = new detectIdle();
}

function clearTimers() {
    clearInterval(interval_auto_refresh);
    clearInterval(interval_auto_save);
    clearInterval(interval_away_time);
    console.debug('Timers cleared');
}

function startAutoRefreshTimer() {
    /** No Auto Refresh on Mobile since
     *  it is unlikely that the mobile view will remain open for a long time
     * */
    if (isMobile) return;

    // Polling for new notes (Poor man's push)
    interval_auto_refresh = setInterval(() => {
        if (isOnWake()) return;

        if (appPrefs.readonly === false && isAppDisabled() === false) {
            console.debug('Auto-Refresh Triggered');
            ns.loadNotes();
        }
    }, TIMEOUT_AUTO_REFRESH * 60000);
}

//#endregion

function isOnWake() {
    const isOnWake = Date.now() - lastSeen > TIMEOUT * 60000 + 120000;
    console.debug('isOnWake: ' + isOnWake);
    if (isOnWake) console.debug('On Wake Detected');

    return isOnWake;
}

function isAppDisabled() {
    if (!window.ns || !window.ns.ngScope) return false;
    return (
        window.ns.ngScope.isAppDisabled === true ||
        window.ns.ngScope.isAppDisabled === undefined
    );
}

document.addEventListener('touchstart', opKeystrokeCallback, false);
document.addEventListener('click', opKeystrokeCallback);

/** Use the visbility change listener to check is on wake */
document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
        onHidden();
    } else {
        onVisible();
    }
});

/** Sometimes visibilty change does not fire,
 * Therefore listening to 'focus' as a workaround for visibilityChange event failing to fire
 * e.g. after ~30 min on Mobile
 * Need to seek more alternatives as on some phones focus does not fire after a long sleep, either
 * */
window.addEventListener('focus', onFocus);

function onHidden() {
    console.debug('**** PAGE HIDDEN');
    lastSeen = Date.now();
}

function onVisible() {
    console.debug('**** PAGE VISIBLE');
    if (!isMobile || !lastSeen) return;

    if (isOnWake()) {
        if (idler) idler.away();
    }
}

function onFocus() {
    console.debug('**** ON FOCUS');
    onVisible();
}
