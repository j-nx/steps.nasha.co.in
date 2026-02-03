// Copyright 2013-2014, Small Picture, Inc.
var appTypeIcons = {
    blogpost: 'file-text-alt',
    code: 'laptop',
    html: 'file-text-alt',
    include: 'share-alt', //5/19/13 by DW
    index: 'file-text-alt',
    link: 'bookmark-empty',
    outline: 'file-text-alt',
    photo: 'camera',
    presentation: 'file-text-alt',
    redirect: 'refresh',
    river: 'file-text-alt',
    rss: 'rss',
    tabs: 'file-text-alt',
    thread: 'comments',
    thumblist: 'th',
    profile: 'user', //5/14/13 by DW
    calendar: 'calendar', //6/3/13 by DW
    markdown: 'file-text-alt', //6/3/13 by DW
    tweet: 'twitter', //6/10/13 by DW
    metaWeblogPost: 'file-text-alt'
};
var initialOpmltext =
    '<?xml version="1.0" encoding="ISO-8859-1"?><opml version="2.0"><head><title>Untitled</title></head><body><outline text=""/></body></opml>';
var defaultUtilsOutliner = '#outliner';
//op glue routines
function opUndo() {
    return $(defaultUtilsOutliner).concord().op.undo();
}

function opCut() {
    return $(defaultUtilsOutliner).concord().op.cut();
}

function opCopy() {
    return $(defaultUtilsOutliner).concord().op.copy();
}

function opPaste() {
    return $(defaultUtilsOutliner).concord().op.paste();
}

function opReorg(dir, count) {
    return $(defaultUtilsOutliner).concord().op.reorg(dir, count);
}

function opSetFont(font, fontsize, lineheight) {
    $(defaultUtilsOutliner).concord().prefs({
        outlineFont: font,
        outlineFontSize: fontsize
    });
}

function opPromote() {
    $(defaultUtilsOutliner).concord().op.promote();
}

function opDemote() {
    $(defaultUtilsOutliner).concord().op.demote();
}

function opBold() {
    return $(defaultUtilsOutliner).concord().op.bold();
}

function opItalic() {
    return $(defaultUtilsOutliner).concord().op.italic();
}

function opLink(url) {
    return $(defaultUtilsOutliner).concord().op.link(url);
}

function opSetTextMode(fltextmode, doSelect) {
    $(defaultUtilsOutliner).concord().op.setTextMode(fltextmode, doSelect);
}

function opInTextMode() {
    return $(defaultUtilsOutliner).concord().op.inTextMode();
}

function opGetAtts() {
    return $(defaultUtilsOutliner).concord().op.attributes.getAll();
}

function opGetOneAtt(name) {
    return $(defaultUtilsOutliner).concord().op.attributes.getOne(name);
}

function opHasAtt(name) {
    return opGetOneAtt(name) != undefined;
}

function opSetOneAtt(name, value) {
    return $(defaultUtilsOutliner).concord().op.attributes.setOne(name, value);
}

function opSetAtts(atts) {
    return $(defaultUtilsOutliner).concord().op.attributes.setGroup(atts);
}

function opAddAtts(atts) {
    return $(defaultUtilsOutliner).concord().op.attributes.addGroup(atts);
}

function opSetStyle(css) {
    return $(defaultUtilsOutliner).concord().op.setStyle(css);
}

function opGetLineText() {
    return $(defaultUtilsOutliner).concord().op.getLineText();
}

function opExpand() {
    return $(defaultUtilsOutliner).concord().op.expand();
}

function opExpandAllLevels() {
    return $(defaultUtilsOutliner).concord().op.expandAllLevels();
}

function opExpandEverything() {
    return $(defaultUtilsOutliner).concord().op.fullExpand();
}

function opCollapse() {
    return $(defaultUtilsOutliner).concord().op.collapse();
}

function opIsComment() {
    return $(defaultUtilsOutliner).concord().script.isComment();
}

function opMakeComment() {
    return $(defaultUtilsOutliner).concord().script.makeComment();
}

function opUnComment() {
    return $(defaultUtilsOutliner).concord().script.unComment();
}

function opToggleComment() {
    if (opIsComment()) {
        opUnComment();
    } else {
        opMakeComment();
    }
}

function opCollapseEverything() {
    return $(defaultUtilsOutliner).concord().op.fullCollapse();
}

function opInsert(s, dir) {
    return $(defaultUtilsOutliner).concord().op.insert(s, dir);
}

function opInsertImage(url) {
    return $(defaultUtilsOutliner).concord().op.insertImage(url);
}

function opSetLineText(s) {
    return $(defaultUtilsOutliner).concord().op.setLineText(s);
}

function opDeleteSubs() {
    return $(defaultUtilsOutliner).concord().op.deleteSubs();
}

function opCountSubs() {
    return $(defaultUtilsOutliner).concord().op.countSubs();
}

function opHasSubs() {
    return opCountSubs() > 0;
}

function opSubsExpanded() {
    return $(defaultUtilsOutliner).concord().op.subsExpanded();
}

function opGo(dir, ct) {
    return $(defaultUtilsOutliner).concord().op.go(dir, ct);
}

function opFirstSummit() {
    opGo(left, 32767);
    opGo(up, 32767);
}

function opXmlToOutline(xmltext) {
    return $(defaultUtilsOutliner).concord().op.xmlToOutline(xmltext, false);
}

function opInsertXml(xmltext, dir) {
    return $(defaultUtilsOutliner).concord().op.insertXml(xmltext, dir);
}

function opOutlineToXml(ownerName, ownerEmail, ownerId) {
    return $(defaultUtilsOutliner)
        .concord()
        .op.outlineToXml(ownerName, ownerEmail, ownerId);
}

function opCursorToXml() {
    return $(defaultUtilsOutliner).concord().op.cursorToXml();
}

function opIsLoaded() {
    return opGetTitle() != undefined;
}

function opSetTitle(title) {
    return $(defaultUtilsOutliner).concord().op.setTitle(title);
}

function opGetTitle() {
    return $(defaultUtilsOutliner).concord().op.getTitle();
}

function opHasChanged() {
    return $(defaultUtilsOutliner).concord().op.changed();
}

function opClearChanged() {
    return $(defaultUtilsOutliner).concord().op.clearChanged();
}

function opMarkChanged() {
    return $(defaultUtilsOutliner).concord().op.markChanged();
}

function opGetNodeCount() {
    return $(defaultUtilsOutliner).find('.concord-node').length;
}

function opRedraw() {
    return $(defaultUtilsOutliner).concord().op.redraw();
}

function opVisitAll(callback) {
    //9/13/13 by DW
    return $(defaultUtilsOutliner).concord().op.visitAll(callback);
}

function opWipe() {
    //9/14/13 by DW
    return $(defaultUtilsOutliner).concord().op.wipe();
}
//readText
var readHttpUrl = 'http://trex.smallpicture.com/ajax/httpReadUrl';

function readText(url, callback, op, flAcceptOpml) {
    var headerval = {};
    if (flAcceptOpml != undefined && flAcceptOpml) {
        //5/14/13 by DW
        headerval = {
            Accept: 'text/x-opml'
        };
    }
    var jxhr = $.ajax({
        url:
            readHttpUrl +
            '?url=' +
            encodeURIComponent(url) +
            '&type=' +
            encodeURIComponent('text/plain'),
        dataType: 'text',
        headers: headerval,
        timeout: 30000
    })
        .success(function (data, status) {
            callback(data, op);
        })
        .error(function (status) {
            httpReadStatus = status;
        });
}
//string routines
function filledString(s, ct) {
    var theString = '';
    for (var i = 0; i < ct; i++) {
        theString += s;
    }
    return theString;
}

function multipleReplaceAll(
    s,
    adrTable,
    flCaseSensitive,
    startCharacters,
    endCharacters
) {
    if (flCaseSensitive === undefined) {
        flCaseSensitive = false;
    }
    if (startCharacters === undefined) {
        startCharacters = '';
    }
    if (endCharacters === undefined) {
        endCharacters = '';
    }
    for (var item in adrTable) {
        var replacementValue = adrTable[item];
        var regularExpressionModifier = 'g';
        if (!flCaseSensitive) {
            regularExpressionModifier = 'gi';
        }
        var regularExpressionString = (
            startCharacters +
            item +
            endCharacters
        ).replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
        var regularExpression = new RegExp(
            regularExpressionString,
            regularExpressionModifier
        );
        s = s.replace(regularExpression, replacementValue);
    }
    return s;
}
//misc
function secondsSince(when) {
    var now = new Date();
    return (now - when) / 1000;
}

/**
 * Slice HTML Text
 * e.g
 * <div>Hello <strong>There</strong></div>, index 4
 * return
 *  a: <div>Hell</div>
 *  b: <div>o <strong>There</strong></div>
 * Assumes that the input string is well formed
 * This code only works because of the unit tests behind it
 *
 * @deprecated Use ConcordTextModel.fromHTML(html).splitAt(pos) instead.
 * The new approach separates text from styling metadata, eliminating
 * the bug where pressing Enter could break HTML tags (e.g., <strik\ne>).
 */
function sliceHtmlText(str, index, allowedTags = ['<b>', '<i>', '<u>', '<a ']) {
    // Up until index, how many incomplete tags exist
    if (str.length === 0) return [str, ''];
    if (index === 0) return ['', str];
    if (index > str.length) return { a: str, b: undefined };

    let includesTags = allowedTags && allowedTags.length > 0 ? false : true;
    for (let i = 0; i < allowedTags.length; i++) {
        if (str.includes(allowedTags[i])) {
            includesTags = true;
            break;
        }
    }
    if (includesTags === false || str.includes('<') === false)
        return [str.substring(0, index), str.substring(index)];

    const openTags = [];

    const getTagInfo = (i) => {
        let tagName = [];
        let isTag = false;
        for (var j = i + 1; j <= str.length; j++) {
            if (str[j] === '>') {
                isTag = true;
                break;
            }
            tagName.push(str[j]);
        }
        if (isTag) {
            return { name: tagName.join(''), newIndex: j };
        }
        return undefined;
    };

    const cleanTag = (tag) => {
        if (tag.startsWith('a')) return 'a';
        return tag;
    };

    for (var i = 0; i <= str.length && index >= 0; i++) {
        if (str[i] != '<') {
            index--;
            continue;
        }

        if (str[i] === '<') {
            if (i + 1 < str.length && str[i + 1] === '/') {
                // Close Tag
                const { name, newIndex } = getTagInfo(i + 1);
                if (!name && !newIndex) {
                    index--;
                    continue;
                } else {
                    openTags.pop();
                    i = newIndex;
                    if (index === 0) {
                        i = i + 2;
                        break;
                    }
                }
            } else {
                // New Tag
                const { name, newIndex } = getTagInfo(i);

                if (!name && !newIndex && index != 0) {
                    index--;
                    continue;
                } else {
                    if (index === 0) {
                        i++;
                        break;
                    }
                    i = newIndex;
                    openTags.push(name);
                }
            }
        }
    }

    i = i - 1; // for loop Overshoot

    let a = str.substring(0, i);
    let b = str.substring(i);

    // Check if 2nd line is </b> / empty (Only applies to single char tags)
    if (b.length > 3 && b[0] === '<' && b[1] === '/' && b[3] === '>') b = '';
    // Strike only allows new-line at last character
    if (b.includes('</strike>')) b = '';

    for (let ti = openTags.length - 1; ti >= 0; ti--) {
        const t = openTags[ti];
        a += `</${cleanTag(t)}>`;
        if (b) b = `<${t}>` + b;
    }

    return [a, b];
}

/** Known TLDs for bare domain detection (gTLDs, ccTLDs, new gTLDs) */
const KNOWN_TLDS = new Set([
    // gTLDs
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
    // ccTLDs
    'ac', 'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'as',
    'at', 'au', 'aw', 'ax', 'az', 'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh',
    'bi', 'bj', 'bm', 'bn', 'bo', 'br', 'bs', 'bt', 'bw', 'by', 'bz', 'ca',
    'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cr',
    'cu', 'cv', 'cw', 'cx', 'cy', 'cz', 'de', 'dj', 'dk', 'dm', 'do', 'dz',
    'ec', 'ee', 'eg', 'er', 'es', 'et', 'eu', 'fi', 'fj', 'fk', 'fm', 'fo',
    'fr', 'ga', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp',
    'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm', 'hn', 'hr', 'ht',
    'hu', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it', 'je',
    'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw',
    'ky', 'kz', 'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv',
    'ly', 'ma', 'mc', 'md', 'me', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo',
    'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz', 'na',
    'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om',
    'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt',
    'pw', 'py', 'qa', 're', 'ro', 'rs', 'ru', 'rw', 'sa', 'sb', 'sc', 'sd',
    'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss',
    'st', 'su', 'sv', 'sx', 'sy', 'sz', 'tc', 'td', 'tf', 'tg', 'th', 'tj',
    'tk', 'tl', 'tm', 'tn', 'to', 'tr', 'tt', 'tv', 'tw', 'tz', 'ua', 'ug',
    'uk', 'us', 'uy', 'uz', 'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu', 'wf',
    'ws', 'ye', 'yt', 'za', 'zm', 'zw',
    // New gTLDs
    'app', 'dev', 'xyz', 'tech', 'site', 'online', 'store', 'blog', 'cloud',
    'design', 'digital', 'studio', 'agency', 'media', 'group', 'team', 'world',
    'life', 'live', 'space', 'network', 'systems', 'tools', 'codes', 'run',
    'link', 'page', 'info', 'biz', 'pro', 'name', 'mobi', 'travel', 'jobs',
    'museum', 'aero', 'coop', 'asia', 'tel', 'gg'
]);

/** Second-level domain labels that require a third-level domain (e.g. co.uk needs bbc.co.uk) */
const SECOND_LEVEL_DOMAINS = new Set([
    'co', 'com', 'org', 'net', 'ac', 'gov', 'edu'
]);

/** File extensions that overlap with ccTLDs — treat as file when single-dot, no path */
const AMBIGUOUS_FILE_EXTS = new Set([
    'py', 'rs', 'pl', 'pm', 'cc', 'ph', 'do', 'si', 'mk', 'am'
]);

/** Structural regex for bare domains: labels.tld[/path] */
const BARE_DOMAIN_RE = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+([a-zA-Z]{2,})(\/[^\s]*)?$/;

/**
 * Detect if a word is a URL (http/https or bare domain with known TLD).
 * @param {string} word
 * @returns {{ display: string, href: string } | null}
 */
function detectUrl(word) {
    if (!word || word.length < 4) return null;

    // http:// or https:// URLs
    if (word.startsWith('http://') || word.startsWith('https://')) {
        return { display: word, href: word };
    }

    // Bare domain detection (e.g. hoho.io, sub.hoho.sh, example.com/path)
    const match = word.match(BARE_DOMAIN_RE);
    if (!match) return null;

    const tld = match[3].toLowerCase();
    if (!KNOWN_TLDS.has(tld)) return null;

    const hasPath = !!match[4];
    const domainPart = hasPath ? word.slice(0, -match[4].length) : word;
    const labels = domainPart.split('.');

    // Require 3+ labels for second-level domains (e.g. "co.uk" alone is not a URL)
    if (labels.length === 2 && SECOND_LEVEL_DOMAINS.has(labels[0].toLowerCase())) {
        return null;
    }

    // Single-dot, no path, and TLD overlaps with a common file extension → treat as file
    if (labels.length === 2 && !hasPath && AMBIGUOUS_FILE_EXTS.has(tld)) {
        return null;
    }

    return { display: word, href: 'https://' + word };
}

/**
 * Get previous word from endIndex. e.g. str: 'hello moto', endIndex 5 ==> hello
 * @param {*} str
 * @param {*} wordEndIndex
 */
function getLastWord(str, endIndex) {
    if (!str || endIndex === undefined || endIndex > str.length) return '';

    // from caret position (end index), move backwards till 0 or till ' ' ===> start index
    const wArray = [];
    for (let i = endIndex - 1; i >= 0; i--) {
        if (str[i] === ' ') break;
        wArray.unshift(str[i]);
    }
    return wArray.join('');
}

/**
 * Convert a URL word to a hyperlink using ConcordTextModel
 * @param {string} word - The display text to convert to a link
 * @param {string} lineHtml - The current line HTML
 * @param {number} caretPosition - The caret position (after the word)
 * @param {string} [href] - Optional explicit href (defaults to word)
 * @returns {string} The updated HTML with the link
 */
function convertToHref(word, lineHtml, caretPosition, href) {
    const linkHref = href || word;
    // Use ConcordTextModel for reliable link insertion
    // This fixes the bug where only the first occurrence was replaced
    const model = ConcordTextModel.fromHTML(lineHtml);
    const text = model.text;

    // Find the occurrence of the word that ends at or just before the caret
    // The word ends at caretPosition (before the space that was typed)
    const wordEnd = caretPosition;
    const wordStart = wordEnd - word.length;

    // Verify the word is at the expected position
    if (wordStart >= 0 && text.substring(wordStart, wordEnd) === word) {
        // Add link mark to this specific occurrence
        const newModel = model.addMark(wordStart, wordEnd, 'link', { href: linkHref });
        return newModel.toHTML();
    }

    // Fallback: search for the word ending closest to caret position
    let searchStart = 0;
    let bestMatch = -1;

    while (true) {
        const idx = text.indexOf(word, searchStart);
        if (idx === -1) break;

        const matchEnd = idx + word.length;
        // Prefer the match closest to (but not after) the caret
        if (matchEnd <= caretPosition) {
            bestMatch = idx;
        }
        searchStart = idx + 1;
    }

    if (bestMatch !== -1) {
        const newModel = model.addMark(bestMatch, bestMatch + word.length, 'link', { href: linkHref });
        return newModel.toHTML();
    }

    // If no match found, fall back to original behavior
    const link = document.createElement('a');
    link.innerHTML = word;
    link.setAttribute('href', linkHref);
    return lineHtml.replace(word, link.outerHTML);
}

function isDom(el) {
    return (
        (el && el instanceof Element) || (el.length && el[0] instanceof Element)
    );
}
