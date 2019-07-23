/* Detect Mobile Browser $.browser.mobile */
(function(a) {
    (jQuery.browser = jQuery.browser || {}).mobile =
        /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(
            a
        ) ||
        /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
            a.substr(0, 4)
        );
})(navigator.userAgent || navigator.vendor || window.opera);

var betaMode = window.location.search.substring(1) == "beta";

var appPrefs = {
    readonly: false,
    outlineFontSize: $.browser.mobile ? 15 : 13,
    iconSize: 8,
    paddingLeft: $.browser.mobile ? 8 : 11,
    nodeLineHeight: $.browser.mobile ? 25 : 22,
    authorName: "DJ",
    authorEmail: "jnx@nasha.co.in"
};
var BULLET = "";
var whenLastKeystroke = new Date(),
    whenLastAutoSave = new Date();
var ns;
var store;
var idler;
var TIMEOUT = 20; //min
var TIMEOUT_MOBILE = 3; //min
var TIMEOUT_AUTO_REFRESH = 10; //min
var AUTOSAVE_DELAY = 5; //seconds
var api;

function initLocalStorage() {
    localStorage.ctOpmlSaves = 0;

    if (localStorage.whenLastSave == undefined) {
        localStorage.whenLastSave = new Date().toString();
    }
    if (localStorage.flTextMode == undefined) {
        localStorage.flTextMode = "true";
    }

    store = new NoteStore();
    store.load();
    if (!store.note) store.note = new Note(initialOpmltext);
}

function saveOutlineNow() {
    if (ns.canPersist() == false || ns.isCookieValid() === false) return;

    ns.saveNote();

    opClearChanged();
}

function backgroundProcess() {
    if (opHasChanged()) {
        if (secondsSince(whenLastKeystroke) >= AUTOSAVE_DELAY) {
            saveOutlineNow();
        }
    }
}

function startup(outliner) {
    //Post Outline Initialization

    const onAPIInitialized = () => {
        initLocalStorage();
        var initVal = initialOpmltext;
        if (!store.note || !store.note.value) opXmlToOutline(initVal);

        self.setInterval(function() {
            backgroundProcess();
        }, 5000);

        //Check if notes updated remotely after every x minutes (Poor man's push)
        self.setInterval(function() {
            if (appPrefs.readonly == false) ns.loadNotes();
        }, TIMEOUT_AUTO_REFRESH * 60000);

        ns = CreateNoteService(outliner);
        ns.start();

        idler = new detectIdle();
    };

    api = new API();
    api.initialize(onAPIInitialized);
}

function opKeystrokeCallback(event) {
    whenLastKeystroke = new Date();
    if (
        event.srcElement != null &&
        event.srcElement.className.indexOf("concord-wrapper") == -1
    )
        return;
    if (_.contains(navigationKeystrokes, event.which)) return;

    if (ns) ns.setNoteState(saveStates.modified);
    idler.resetTimer();
}

function hideSplash() {
    var hs = "hide-splash";
    var x = document.getElementById("splash");
    if (x) {
        if (_.contains(x.classList, hs) == false) x.className += " " + hs;
    }
}

function detectIdle() {
    if (appPrefs.readonly) return;
    var timeoutInterval = TIMEOUT * 60000;
    if ($.browser.mobile) timeoutInterval = TIMEOUT_MOBILE * 60000;

    var t;
    document.onkeypress = this.resetTimer;

    function away() {
        if (!ns) return;
        if (ns.ngScope.isLoggedIn() == false || ns.ngScope.isAppDisabled)
            return;
        ns.ngScope.showDisabledDialog("Click to continue", true);
    }

    this.resetTimer = function() {
        clearInterval(t);
        t = setInterval(function() {
            away();
        }, timeoutInterval);
    }.bind(this);

    this.resetTimer();
}

function resetTimer(event) {
    opKeystrokeCallback(event);
    if (idler) idler.resetTimer();
}

document.addEventListener("touchstart", resetTimer, false);
document.addEventListener("click", resetTimer);
