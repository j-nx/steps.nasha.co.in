'use strict';
/*jslint browser:true */
// Copyright 2013, Small Picture, Inc.
$(function () {
    if ($.fn.tooltip !== undefined) {
        $('a[rel=tooltip]').tooltip({
            live: true
        });
    }
});
$(function () {
    if ($.fn.popover !== undefined) {
        $('a[rel=popover]').on('mouseenter mouseleave', function () {
            $(this).popover('toggle');
        });
    }
});
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (obj, start) {
        for (var i = start || 0, j = this.length; i < j; i++) {
            if (this[i] === obj) {
                return i;
            }
        }
        return -1;
    };
}
var concord = {
    version: '2.49',
    mobile: isMobile,
    animationSpeed: 150, // ms - controls expand/collapse animation speed
    ready: false,
    handleEvents: true,
    resumeCallbacks: [],
    onResume: function (cb) {
        this.resumeCallbacks.push(cb);
    },
    resumeListening: function () {
        if (!this.handleEvents) {
            this.handleEvents = true;
            var r = this.getFocusRoot();
            if (r !== null) {
                var c = new ConcordOutline(r.parent());
                if (c.op.inTextMode()) {
                    c.op.focusCursor();
                    c.editor.restoreSelection();
                } else {
                    c.pasteBinFocus();
                }
                for (var i in this.resumeCallbacks) {
                    var cb = this.resumeCallbacks[i];
                    cb();
                }
                this.resumeCallbacks = [];
            }
        }
    },
    stopListening: function () {
        if (this.handleEvents) {
            this.handleEvents = false;
            var r = this.getFocusRoot();
            if (r !== null) {
                var c = new ConcordOutline(r.parent());
                if (c.op.inTextMode()) {
                    c.editor.saveSelection();
                }
            }
        }
    },
    focusRoot: null,
    getFocusRoot: function () {
        if ($('.concord-root:visible').length == 1) {
            return this.setFocusRoot($('.concord-root:visible:first'));
        }
        if ($('.modal').is(':visible')) {
            if ($('.modal').find('.concord-root:visible:first').length == 1) {
                return this.setFocusRoot(
                    $('.modal').find('.concord-root:visible:first')
                );
            }
        }
        if (this.focusRoot == null) {
            if ($('.concord-root:visible').length > 0) {
                return this.setFocusRoot($('.concord-root:visible:first'));
            } else {
                return null;
            }
        }
        if (!this.focusRoot.is(':visible')) {
            return this.setFocusRoot($('.concord-root:visible:first'));
        }
        return this.focusRoot;
    },
    setFocusRoot: function (root) {
        var origRoot = this.focusRoot;

        if (origRoot !== null && !(origRoot[0] === root[0])) {
            var concordInstance = new ConcordOutline(root.parent());
            var origConcordInstance = new ConcordOutline(origRoot.parent());
            origConcordInstance.editor.hideContextMenu();
            origConcordInstance.editor.dragModeExit();
            if (concordInstance.op.inTextMode()) {
                concordInstance.op.focusCursor();
            } else {
                concordInstance.pasteBinFocus();
            }
        }
        this.focusRoot = root;
        return this.focusRoot;
    },
    updateFocusRootEvent: function (event) {
        var root = $(event.target).parents('.concord-root:first');
        if (root.length == 1) {
            concord.setFocusRoot(root);
        }
    },
    removeFocus: function (preventDefaults) {
        opSetTextMode(false, false);
        if (preventDefaults) event.preventDefault();
    },
    bringIntoView: function (element) {
        /* If element is not in view scroll to it */

        if (isDom(element) === false) return;
        if (!element || !element.offset() || !concord.mobile) return;

        var headerHt = 62;
        var footerHt = 24;
        var fromTop = 25;

        var offset = element.offset().top + element.height() + headerHt;
        var windowHt = window.innerHeight - footerHt;

        var position = offset - window.pageYOffset;
        if (
            position > 0 &&
            (position > windowHt || position < fromTop + headerHt)
        ) {
            $('html,body').animate(
                {
                    scrollTop: element.offset().top - fromTop
                },
                1000
            );
        }
    }
};
var concordEnvironment = {
    version: concord.version
};
var concordClipboard = undefined;
jQuery.fn.reverse = [].reverse;
//Constants
var nil = null;
var infinity = Number.MAX_VALUE;
var down = 'down';
var left = 'left';
var right = 'right';
var up = 'up';
var flatup = 'flatup';
var flatdown = 'flatdown';
var nodirection = 'nodirection';
var XML_CHAR_MAP = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&' + 'quot;'
};

var ie =
    typeof document.selection != 'undefined' &&
    document.selection.type != 'Control' &&
    true;
var w3 = typeof window.getSelection != 'undefined' && true;

var ConcordUtil = {
    mobile: isMobile,
    escapeXml: function (s) {
        s = s.toString();
        s = s.replace(/\u00A0/g, ' ');
        var escaped = s.replace(/[<>&"]/g, function (ch) {
            return XML_CHAR_MAP[ch];
        });
        return escaped;
    },
    getCaret: function (element) {
        //http://jsfiddle.net/cpatik/3QAeC/

        // Does not return the correct value with shift selection, when cursor is at the start or at the end of a line

        var caretOffset = 0;
        if (w3) {
            var selection = window.getSelection();
            if (selection.rangeCount === 0) return 0;
            var range = selection.getRangeAt(0);
            var preCaretRange = range.cloneRange();
            if (preCaretRange.startOffset == 0) return 0;
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        } else if (ie) {
            var textRange = document.selection.createRange();
            var preCaretTextRange = document.body.createTextRange();
            preCaretTextRange.moveToElementText(element);
            preCaretTextRange.setEndPoint('EndToEnd', textRange);
            caretOffset = preCaretTextRange.text.length;
        }
        return caretOffset;
    },
    /**
     * Get the selection range in plain text coordinates
     * @param {Element} element - Container element
     * @returns {{start: number, end: number}|null} Selection range or null if no selection
     */
    getSelectionRange: function (element) {
        var selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;

        var range = selection.getRangeAt(0);

        // Calculate start offset
        var startRange = document.createRange();
        startRange.selectNodeContents(element);
        startRange.setEnd(range.startContainer, range.startOffset);
        var start = startRange.toString().length;

        // Calculate end offset
        var endRange = document.createRange();
        endRange.selectNodeContents(element);
        endRange.setEnd(range.endContainer, range.endOffset);
        var end = endRange.toString().length;

        return { start: start, end: end };
    },
    /**
     * Set the selection range in plain text coordinates
     * @param {Element} element - Container element
     * @param {number} start - Start offset in plain text
     * @param {number} end - End offset in plain text
     */
    setSelectionRange: function (element, start, end) {
        var selection = window.getSelection();
        if (!selection) return;

        // Helper function to find node and offset for a text position
        function findPosition(container, targetOffset) {
            var offset = 0;
            var stack = [container];

            while (stack.length > 0) {
                var node = stack.pop();

                if (node.nodeType === Node.TEXT_NODE) {
                    var nodeLen = node.textContent.length;
                    if (offset + nodeLen >= targetOffset) {
                        return { node: node, offset: targetOffset - offset };
                    }
                    offset += nodeLen;
                } else if (node.childNodes) {
                    // Push children in reverse order so we process them left-to-right
                    for (var i = node.childNodes.length - 1; i >= 0; i--) {
                        stack.push(node.childNodes[i]);
                    }
                }
            }

            // If we've exhausted all nodes, return the last position
            return { node: container, offset: container.childNodes.length };
        }

        var startPos = findPosition(element, start);
        var endPos = findPosition(element, end);

        var range = document.createRange();
        range.setStart(startPos.node, startPos.offset);
        range.setEnd(endPos.node, endPos.offset);

        selection.removeAllRanges();
        selection.addRange(range);
    },
    getCaret2: function () {
        if (window.getSelection && window.getSelection().getRangeAt) {
            let range = window.getSelection().getRangeAt(0);
            let selectedObj = window.getSelection();
            let rangeCount = 0;

            let siblingOnLeft = selectedObj.anchorNode.previousSibling;

            while (siblingOnLeft !== null) {
                rangeCount += siblingOnLeft.textContent.length;
                siblingOnLeft = siblingOnLeft.previousSibling;
            }

            var pNode = selectedObj.anchorNode.parentNode;
            while (
                pNode.localName != 'div' //has in classList "concord-text"
            ) {
                rangeCount += `<${pNode.localName}>`.length;
                pNode = pNode.parentNode;
            }
            return range.startOffset + rangeCount;
        }
    },
    setCaretAtStart: function (el) {
        //http://stackoverflow.com/a/4238971
        el.focus();
        var atStart = true;
        if (
            typeof window.getSelection != 'undefined' &&
            typeof document.createRange != 'undefined'
        ) {
            var range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(atStart);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (typeof document.body.createTextRange != 'undefined') {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(el);
            textRange.collapse(atStart);
            textRange.select();
        }
    },
    setCaret: function (el, index) {
        if (index === 0) {
            ConcordUtil.setCaretAtStart(el);
            return;
        }
        //V1 - Not IE<9 (+FF?) friendly
        var sel = window.getSelection();
        var innerDivText = el.firstChild;
        if (sel) sel.collapse(innerDivText, index);
        el.parentNode.focus();
    },
    setCaret2(el, pos) {
        //via https://stackoverflow.com/questions/36869503/set-caret-position-in-contenteditable-div-that-has-children

        for (var node of el.childNodes) {
            if (node.nodeType == 3) {
                if (node.length >= pos) {
                    var range = document.createRange(),
                        sel = window.getSelection();
                    range.setStart(node, pos);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    return -1; // we are done
                } else {
                    pos -= node.length;
                }
            } else {
                pos = this.setCaret2(node, pos);
                if (pos == -1) {
                    return -1;
                }
            }
        }
        return pos; // recursion
    },
    getLineInfo: function (caret, element) {
        var d = $(element),
            l = parseInt(d.css('lineHeight')),
            s = Math.round(d.height() / l),
            v = {
                numberOfLines: s
            };
        if (s === 1) {
            v.caretPositionLine = 1;
            return v;
        }
        //Send the content from the beginning of the textarea to the cursor to the mirror
        //Use the height of the mirror to extract the current row
        s = element.innerText;
        var eString = s.substring(0, caret);

        // to correctly mimic wrap around!
        var tillNewLine = s.substring(caret, s.length).indexOf('\n');
        var tillEndOfChar = s.substring(caret, s.length).indexOf(' ');
        var till =
            tillNewLine >= 0 && tillNewLine < tillEndOfChar
                ? tillNewLine
                : tillEndOfChar;
        var restOfWord = s.substring(caret, eString.length + till);
        if (caret == 0) restOfWord = '';
        var e = $(
            '<div class="concord-text">' + eString + restOfWord + '</div>'
        );

        e.css({
            lineHeight: l + 'px',
            width: d.width() + 'px'
        });
        d.after(e);
        d.next('.concord-text')[0];
        v.caretPositionLine = Math.round(e.height() / l);
        e.remove();
        return v;
    },
    selectElementContents: function (el) {
        if (window.getSelection && document.createRange) {
            var sel = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(el);
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (document.selection && document.body.createTextRange) {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(el);
            textRange.select();
        }
    },
    deselectElementContents: function (el) {
        if (document.selection) document.selection.empty();
        if (window.getSelection) window.getSelection().removeAllRanges();
    },
    canMoveWithinContent: function (target, direction) {
        // Move up/down in soft broken div content
        var lineInfo = ConcordUtil.getLineInfo(
            ConcordUtil.getCaret2(target),
            target
        );
        if (!lineInfo) return false; //log?

        if (
            direction == 'down' &&
            lineInfo.caretPositionLine < lineInfo.numberOfLines
        )
            return true;

        if (
            direction == 'up' &&
            lineInfo.caretPositionLine != 1 &&
            lineInfo.caretPositionLine != 0
        )
            return true;

        return false;
    },
    selectMultipleNodes: function (direction, op) {
        var node = op.getCursor();
        var isMulti = false;
        if (op.inTextMode() == false) {
            if (direction == 'down') node = op._walk_down(node);
            else if (direction == 'up') node = op._walk_up(node);
            isMulti = true;
            if (node == null || node == undefined) return;
        }
        op.setCursor(node, isMulti, isMulti);
        op.setTextMode(false);
    },
    getCurrentDate: function () {
        var monthNames = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December'
        ];

        var date = new Date();
        var monthIndex = date.getMonth();

        return (
            date.getDate() +
            ' ' +
            monthNames[monthIndex] +
            ' ' +
            date.getFullYear()
        );
    },
    getIcon: function (iconName) {
        return '<span class="node-icon icon-' + iconName + '"></i>';
    },
    consolidateTags: function (a, b) {
        const bTag = '<b';

        const checkTag = (tagOpen, tagClose, aM, bM) => {
            if (aM.endsWith(tagClose) && bM.startsWith(tagOpen)) {
                a = aM.substring(0, aM.length - tagClose.length);
                b = bM.substring(tagOpen.length);
            }
        };

        checkTag('<b>', '</b>', a, b);
        checkTag('<i>', '</i>', a, b);
        checkTag('<u>', '</u>', a, b);

        return a + b;
    },
    getTextNode: function (op) {
        return op
            .getCursor()
            .children('.concord-wrapper')
            .children('.concord-text')[0];
    },
    selectRangeInTextNode: function (textNode, startIndex, endIndex) {
        // https://newbedev.com/programmatically-select-text-in-a-contenteditable-html-element

        var r = document.createRange();
        if (startIndex === undefined) startIndex = 0;
        if (endIndex === undefined) endIndex = textNode.textContent.length;

        r.setStart(textNode, startIndex);
        r.setEnd(textNode, endIndex);

        var s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
    }
};

String.prototype.insertAt = function (index, chars) {
    return this.substr(0, index) + chars + this.substr(index);
};

var iconName = 'circle';

function ConcordOutline(container, options) {
    this.container = container;
    this.options = options;
    this.id = null;
    this.root = null;
    this.editor = null;
    this.op = null;
    this.script = null;
    this.pasteBin = null;
    this.events = null;
    this.pasteBinFocus = function () {
        if (!concord.ready) {
            return;
        }
        if (concord.mobile) {
            return;
        }
        if (this.root.is(':visible')) {
            var node = this.op.getCursor();
            var nodeOffset = node.offset();
            this.pasteBin.offset(nodeOffset);
            this.pasteBin.css('z-index', '1000');
            if (this.pasteBin.text() == '' || this.pasteBin.text() == '\n') {
                this.pasteBin.text('...');
            }
            this.op.focusCursor();
            this.pasteBin.trigger('focus');
            if (this.pasteBin[0] === document.activeElement) {
                document.execCommand('selectAll');
            }
        }
    };
    this.zoomHelper = { // no-op defaults; zoom.js overrides in init()
        isHidden: function () { return false; },
        isRoot: function () { return false; },
        skipHidden: function (node) { return node; }
    };
    this.callbacks = function (callbacks) {
        if (callbacks) {
            this.root.data('callbacks', callbacks);
            return callbacks;
        } else {
            if (this.root.data('callbacks')) {
                return this.root.data('callbacks');
            } else {
                return {};
            }
        }
    };
    this.fireCallback = function (name, value) {
        var cb = this.callbacks()[name];
        if (cb) {
            return cb(value);
        }
    };
    this.prefs = function (newprefs) {
        var prefs = this.root.data('prefs');
        if (prefs == undefined) {
            prefs = {};
        }
        if (newprefs) {
            for (var key in newprefs) {
                prefs[key] = newprefs[key];
            }
            this.root.data('prefs', prefs);
            if (prefs.readonly) {
                this.root.addClass('readonly');
            }
            if (prefs.renderMode !== undefined) {
                this.root.data('renderMode', prefs.renderMode);
            }
            if (prefs.contextMenu) {
                $(prefs.contextMenu).hide();
            }
            var style = {};
            var nodeStyle = {};
            if (prefs.outlineFont) {
                nodeStyle['font-family'] = style['font-family'] =
                    prefs.outlineFont;
            }
            if (prefs.outlineFontSize) {
                var diff =
                    prefs.nodeLineHeight * 16 - prefs.outlineFontSize * 16; // Rem to Px = REM*BASE_FONT_SIZE e.g. 1.2*16
                nodeStyle['font-size'] = style['font-size'] =
                    prefs.outlineFontSize + 'em';
                nodeStyle['min-height'] = style['min-height'] =
                    prefs.outlineFontSize * 16 + diff + 'px';
                nodeStyle['line-height'] = style['line-height'] =
                    prefs.outlineFontSize * 16 + diff + 'px';
            }

            this.root.parent().find('style.prefsStyle').remove();
            var css = '<style type="text/css" class="prefsStyle">\n';
            var cssId = '';
            if (this.root.parent().attr('id')) {
                cssId = '#' + this.root.parent().attr('id');
            }
            css += cssId + ' .concord .concord-node .concord-wrapper{';
            for (var attribute in style) {
                css += attribute + ': ' + style[attribute] + ';';
            }
            css += '}\n';
            css += cssId + ' .concord-text {';
            for (var attribute in nodeStyle) {
                css += attribute + ': ' + nodeStyle[attribute] + ';';
            }
            css += '}\n';
            css +=
                cssId + ' .concord .concord-node .concord-wrapper .node-icon {';
            for (var attrib in style) {
                if (attrib != 'font-family' && attrib != 'font-size') {
                    css += attrib + ': ' + style[attrib] + ';';
                }
            }
            if (prefs.iconSize) {
                css += 'font-size:' + prefs.iconSize * 16 + 'px;';
            }
            css += '}\n';
            var olPaddingLeft = prefs.paddingLeft;
            if (olPaddingLeft === undefined) {
                olPaddingLeft = prefs.outlineFontSize;
            }
            if (olPaddingLeft !== undefined) {
                css += cssId + ' .concord ol {';
                css += 'padding-left: ' + olPaddingLeft + 'px';
                css += '}\n';
            }
            css += '</style>\n';
            this.root.before(css);
            if (newprefs.css) {
                this.op.setStyle(newprefs.css);
            }
        }
        return prefs;
    };
    this.afterInit = function () {
        this.editor = new ConcordEditor(this.root, this);
        this.op = new ConcordOp(this.root, this);
        this.script = new ConcordScript(this.root, this);
        if (options) {
            if (options.prefs) {
                this.prefs(options.prefs);
            }
            if (options.open) {
                this.root.data('open', options.open);
            }
            if (options.save) {
                this.root.data('save', options.save);
            }
            if (options.callbacks) {
                this.callbacks(options.callbacks);
            }
            if (options.id) {
                this.root.data('id', options.id);
                this.open();
            }
        }
    };
    this.init = function () {
        if ($(container).find('.concord-root:first').length > 0) {
            this.root = $(container).find('.concord-root:first');
            this.pasteBin = $(container).find('.pasteBin:first');
            this.afterInit();
            return;
        }
        var root = $('<ol></ol>');
        root.addClass('concord concord-root');
        root.appendTo(container);
        this.root = root;
        var pasteBin = $(
            '<div class="pasteBin" contenteditable="true" style="position: absolute; height: 1px; width:1px; outline:none; overflow:hidden;"></div>'
        );
        pasteBin.appendTo(container);
        this.pasteBin = pasteBin;
        this.afterInit();
        this.events = new ConcordEvents(this.root, this.editor, this.op, this);
    };
    this['new'] = function () {
        this.op.wipe();
    };
    this.open = function (cb) {
        var opmlId = this.root.data('id');
        if (!opmlId) {
            return;
        }
        var root = this.root;
        var op = this.op;
        var openUrl = 'http://concord.smallpicture.com/open';
        if (root.data('open')) {
            openUrl = root.data('open');
        }
        var params = {};
        if (opmlId.match(/^http.+$/)) {
            params['url'] = opmlId;
        } else {
            params['id'] = opmlId;
        }
        $.ajax({
            type: 'POST',
            url: openUrl,
            data: params,
            dataType: 'xml',
            success: function (opml) {
                if (opml) {
                    op.xmlToOutline(opml);
                    if (cb) {
                        cb();
                    }
                }
            },
            error: function () {
                if (root.find('.concord-node').length == 0) {
                    op.wipe();
                }
            }
        });
    };
    this.save = function (cb) {
        var opmlId = this.root.data('id');
        if (opmlId && this.op.changed()) {
            var saveUrl = 'http://concord.smallpicture.com/save';
            if (this.root.data('save')) {
                saveUrl = this.root.data('save');
            }
            var concordInstance = this;
            var opml = this.op.outlineToXml();
            $.ajax({
                type: 'POST',
                url: saveUrl,
                data: {
                    opml: opml,
                    id: opmlId
                },
                dataType: 'json',
                success: function (json) {
                    concordInstance.op.clearChanged();
                    if (cb) {
                        cb(json);
                    }
                }
            });
        }
    };
    this['import'] = function (opmlId, cb) {
        var openUrl = 'http://concordold.smallpicture.com/open';
        var root = this.root;
        var concordInstance = this;
        if (root.data('open')) {
            openUrl = root.data('open');
        }
        var params = {};
        if (opmlId.match(/^http.+$/)) {
            params['url'] = opmlId;
        } else {
            params['id'] = opmlId;
        }
        $.ajax({
            type: 'POST',
            url: openUrl,
            data: params,
            dataType: 'xml',
            success: function (opml) {
                if (opml) {
                    var cursor = root.find('.concord-cursor:first');
                    $(opml)
                        .find('body')
                        .children('outline')
                        .each(function () {
                            var node = concordInstance.editor.build($(this));
                            cursor.after(node);
                            cursor = node;
                        });
                    concordInstance.op.markChanged();
                    if (cb) {
                        cb();
                    }
                }
            },
            error: function () {}
        });
    };
    this['export'] = function () {
        var context = this.root.find('.concord-cursor:first');
        if (context.length == 0) {
            context = this.root.find('.concord-root:first');
        }
        return this.editor.opml(context);
    };
    this.init();
}

function ConcordEditor(root, concordInstance) {
    this.makeNode = function () {
        var node = $('<li></li>');
        node.addClass('concord-node');
        var wrapper = $("<div class='concord-wrapper'></div>");
        var icon = ConcordUtil.getIcon(iconName);
        wrapper.append(icon);
        wrapper.addClass('type-icon');
        var text = $("<div class='concord-text' contenteditable='true'></div>");
        var outline = $('<ol></ol>');
        text.appendTo(wrapper);
        wrapper.appendTo(node);
        outline.appendTo(node);
        return node;
    };
    this.dragMode = function () {
        root.data('draggingChange', root.children().clone(true, true));
        root.addClass('dragging');
        root.data('dragging', true);
    };
    this.dragModeExit = function () {
        if (root.data('dragging')) {
            concordInstance.op.markChanged();
            root.data('change', root.data('draggingChange'));
            root.data('changeTextMode', false);
            root.data('changeRange', undefined);
        }
        root.find('.draggable').removeClass('draggable');
        root.find('.drop-sibling').removeClass('drop-sibling');
        root.find('.drop-child').removeClass('drop-child');
        root.removeClass('dragging');
        root.data('dragging', false);
        root.data('mousedown', false);
    };
    this.edit = function (node, empty) {
        var text = node
            .children('.concord-wrapper:first')
            .children('.concord-text:first');
        if (empty) {
            text.html('');
        }
        text.trigger('focus');
        var el = text.get(0);
        if (el && el.childNodes && el.childNodes[0]) {
            if (
                typeof window.getSelection != 'undefined' &&
                typeof document.createRange != 'undefined'
            ) {
                var range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(true);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } else if (typeof document.body.createTextRange != 'undefined') {
                var textRange = document.body.createTextRange();
                textRange.moveToElementText(el);
                textRange.collapse(true);
                textRange.select();
            }
        }
        text.addClass('editing');
        if (!empty) {
            if (root.find('.concord-node.dirty').length > 0) {
                concordInstance.op.markChanged();
            }
        }
    };
    this.editable = function (target) {
        var editable = false;
        if (!target.hasClass('concord-text')) {
            target = target.parents('.concord-text:first');
        }
        if (target.length == 1) {
            editable =
                target.hasClass('concord-text') && target.hasClass('editing');
        }
        return editable;
    };
    this.editorMode = function () {
        root.find('.selected').removeClass('selected');
        root.find('.editing').each(function () {
            //$(this).blur();
            $(this).removeClass('editing');
        });
        root.find('.selection-toolbar').remove();
    };
    this.opml = function (_root, flsubsonly) {
        if (flsubsonly == undefined) {
            //8/5/13 by DW
            flsubsonly = false;
        }

        if (_root) {
            root = _root;
        }
        var title = root.data('title');
        if (!title) {
            if (root.hasClass('concord-node')) {
                title = root
                    .children('.concord-wrapper:first')
                    .children('.concord-text:first')
                    .text();
            } else {
                title = '';
            }
        }
        var opml = '<?xml version="1.0"?>\n';
        opml += '<opml version="2.0">\n';
        opml += '<head>\n';
        opml += '<title>' + ConcordUtil.escapeXml(title) + '</title>\n';
        opml += '</head>\n';
        opml += '<body>\n';
        if (root.hasClass('concord-cursor')) {
            opml += this.opmlLine(root, 0, flsubsonly);
        } else {
            var editor = this;
            root.children('.concord-node').each(function () {
                opml += editor.opmlLine($(this));
            });
        }
        opml += '</body>\n';
        opml += '</opml>\n';
        return opml;
    };
    this.opmlLine = function (node, indent, flsubsonly) {
        if (indent == undefined) {
            indent = 0;
        }

        if (flsubsonly == undefined) {
            //8/5/13 by DW
            flsubsonly = false;
        }

        var text = this.unescape(
            node
                .children('.concord-wrapper:first')
                .children('.concord-text:first')
                .html()
        );
        var textMatches = text.match(/^(.+)<br>\s*$/);
        if (textMatches) {
            text = textMatches[1];
        }
        var opml = '';
        for (var i = 0; i < indent; i++) {
            opml += '\t';
        }

        text = ConcordUtil.escapeXml(text);
        text = text.replace(/\n/g, '&#10;');
        text = text.replace(/&amp;#10;/g, '&#10;');

        var subheads;
        if (!flsubsonly) {
            //8/5/13 by DW
            opml += '<outline text="' + text + '"';
            var attributes = node.data('attributes');
            if (attributes === undefined) {
                attributes = {};
            }
            for (var name in attributes) {
                if (name !== undefined && name != '' && name != 'text') {
                    if (attributes[name] !== undefined) {
                        opml +=
                            ' ' +
                            name +
                            '="' +
                            ConcordUtil.escapeXml(attributes[name]) +
                            '"';
                    }
                }
            }
            subheads = node.children('ol').children('.concord-node');
            if (subheads.length == 0) {
                opml += '/>\n';
                return opml;
            }
            opml += '>\n';
        } else {
            subheads = node.children('ol').children('.concord-node');
        }

        var editor = this;
        indent++;
        subheads.each(function () {
            opml += editor.opmlLine($(this), indent);
        });

        if (!flsubsonly) {
            //8/5/13 by DW
            for (var i = 0; i < indent; i++) {
                opml += '\t';
            }
            opml += '</outline>\n';
        }

        return opml;
    };
    this.textLine = function (node, indent, bulletChar) {
        if (!indent) {
            indent = 0;
        }
        var text = '';
        for (var i = 0; i < indent; i++) {
            text += '\t';
        }
        if (bulletChar) text += bulletChar + ' ';
        text += this.unescape(
            node
                .children('.concord-wrapper:first')
                .children('.concord-text:first')
                .html()
        );
        text += '\n';
        var editor = this;
        node.children('ol')
            .children('.concord-node')
            .each(function () {
                text += editor.textLine($(this), indent + 1, bulletChar);
            });
        return text;
    };
    this.plainTextLine = function (node, indent) {
        if (!indent) indent = 0;
        var text = '';
        for (var i = 0; i < indent; i++) text += '\t';
        text += concordInstance.op.getTextModel(node).text;
        text += '\n';
        var self = this;
        node.children('ol')
            .children('.concord-node')
            .each(function () {
                text += self.plainTextLine($(this), indent + 1);
            });
        return text;
    };
    this.styledLine = function (node) {
        var model = concordInstance.op.getTextModel(node);
        var html = '<li>' + model.toHTML();
        var self = this;
        var children = node.children('ol').children('.concord-node');
        if (children.length > 0) {
            html += '<ul>';
            children.each(function () {
                html += self.styledLine($(this));
            });
            html += '</ul>';
        }
        html += '</li>';
        return html;
    };
    this.select = function (node, multiple, multipleRange) {
        if (multiple == undefined) {
            multiple = false;
        }
        if (multipleRange == undefined) {
            multipleRange = false;
        }
        if (node.length == 1) {
            this.selectionMode(multiple);
            if (multiple) {
                node.parents('.concord-node.selected').removeClass('selected');
                node.find('.concord-node.selected').removeClass('selected');
            }
            if (multiple && multipleRange) {
                var prevNodes = node.prevAll('.selected');
                if (prevNodes.length > 0) {
                    var stamp = false;
                    node.prevAll()
                        .reverse()
                        .each(function () {
                            if ($(this).hasClass('selected')) {
                                stamp = true;
                            } else if (stamp) {
                                $(this).addClass('selected');
                            }
                        });
                } else {
                    var nextNodes = node.nextAll('.selected');
                    if (nextNodes.length > 0) {
                        var stamp = true;
                        node.nextAll().each(function () {
                            if ($(this).hasClass('selected')) {
                                stamp = false;
                            } else if (stamp) {
                                $(this).addClass('selected');
                            }
                        });
                    }
                }
            }
            var text = node
                .children('.concord-wrapper:first')
                .children('.concord-text:first');
            if (text.hasClass('editing')) {
                text.removeClass('editing');
            }
            //text.blur();
            node.addClass('selected');
            if (text.text().length > 0) {
                //root.data("currentChange", root.children().clone());
            }
            this.dragModeExit();
        }
        if (root.find('.concord-node.dirty').length > 0) {
            concordInstance.op.markChanged();
        }
    };
    this.selectionMode = function (multiple) {
        if (multiple == undefined) {
            multiple = false;
        }
        var node = root.find('.concord-cursor');
        if (node.length == 1) {
            var text = node
                .children('.concord-wrapper:first')
                .children('.concord-text:first');
            if (text.length == 1) {
                //text.blur();
            }
        }
        if (!multiple) {
            root.find('.selected').removeClass('selected');
        }
        root.find('.selection-toolbar').remove();
    };
    this.build = function (outline, collapsed, level) {
        if (!level) {
            level = 1;
        }
        var node = $('<li></li>');
        node.addClass('concord-node');
        node.addClass('concord-level-' + level);
        var attributes = {};
        $(outline[0].attributes).each(function () {
            if (this.name != 'text') {
                attributes[this.name] = this.value;
                if (this.name == 'type') {
                    node.attr('opml-' + this.name, this.value);
                }
            }
        });
        node.data('attributes', attributes);
        var wrapper = $("<div class='concord-wrapper'></div>");
        var nodeIcon = attributes['icon'];
        if (!nodeIcon) {
            nodeIcon = attributes['type'];
        }
        if (nodeIcon) {
            if (
                nodeIcon == node.attr('opml-type') &&
                concordInstance.prefs() &&
                concordInstance.prefs().typeIcons &&
                concordInstance.prefs().typeIcons[nodeIcon]
            ) {
                iconName = concordInstance.prefs().typeIcons[nodeIcon];
            } else if (nodeIcon == attributes['icon']) {
                iconName = nodeIcon;
            }
        }
        var icon = '<span class="node-icon icon-' + iconName + '"></span>';
        wrapper.append(icon);
        wrapper.addClass('type-icon');
        if (attributes['isComment'] == 'true') {
            node.addClass('concord-comment');
        }
        var text = $("<div class='concord-text' contenteditable='true'></div>");
        text.addClass('concord-level-' + level + '-text');
        text.html(this.escape(outline.attr('text')));
        if (attributes['cssTextClass'] !== undefined) {
            var cssClasses = attributes['cssTextClass'].split(/\s+/);
            for (var c in cssClasses) {
                var newClass = cssClasses[c];
                text.addClass(newClass);
            }
        }
        var children = $('<ol></ol>');
        var editor = this;
        outline.children('outline').each(function () {
            var child = editor.build($(this), collapsed, level + 1);
            child.appendTo(children);
        });
        if (collapsed) {
            if (outline.children('outline').length > 0) {
                node.addClass('collapsed');
            }
        }
        text.appendTo(wrapper);
        wrapper.appendTo(node);
        children.appendTo(node);
        return node;
    };
    /**
     * Build DOM node from cached tree format [text, attrs, children]
     */
    this.buildFromTree = function (treeNode, collapsed, level) {
        if (!level) {
            level = 1;
        }
        var nodeText = treeNode[0] || '';
        var attrs = treeNode[1] || {};
        var nodeChildren = treeNode[2] || [];

        var node = $('<li></li>');
        node.addClass('concord-node');
        node.addClass('concord-level-' + level);

        node.data('attributes', attrs);

        var wrapper = $("<div class='concord-wrapper'></div>");
        var nodeIcon = attrs['icon'] || attrs['type'];
        var localIcon = iconName; // Use global default (circle)

        if (nodeIcon) {
            if (
                concordInstance.prefs() &&
                concordInstance.prefs().typeIcons &&
                concordInstance.prefs().typeIcons[nodeIcon]
            ) {
                localIcon = concordInstance.prefs().typeIcons[nodeIcon];
            } else if (attrs['icon']) {
                localIcon = attrs['icon'];
            }
            if (attrs['type']) {
                node.attr('opml-type', attrs['type']);
            }
        }

        var icon = '<span class="node-icon icon-' + localIcon + '"></span>';
        wrapper.append(icon);
        wrapper.addClass('type-icon');

        if (attrs['isComment'] == 'true') {
            node.addClass('concord-comment');
        }

        var text = $("<div class='concord-text' contenteditable='true'></div>");
        text.addClass('concord-level-' + level + '-text');
        text.html(this.escape(nodeText));

        if (attrs['cssTextClass']) {
            var cssClasses = attrs['cssTextClass'].split(/\s+/);
            for (var c in cssClasses) {
                text.addClass(cssClasses[c]);
            }
        }

        var childrenOl = $('<ol></ol>');
        var editor = this;
        for (var i = 0; i < nodeChildren.length; i++) {
            var child = editor.buildFromTree(
                nodeChildren[i],
                collapsed,
                level + 1
            );
            child.appendTo(childrenOl);
        }

        if (collapsed && nodeChildren.length > 0) {
            node.addClass('collapsed');
        }

        text.appendTo(wrapper);
        wrapper.appendTo(node);
        childrenOl.appendTo(node);
        return node;
    };
    this.hideContextMenu = function () {
        if (root.data('dropdown')) {
            root.data('dropdown').hide();
            root.data('dropdown').remove();
            root.removeData('dropdown');
        }
    };
    this.showContextMenu = function (x, y) {
        if (concordInstance.prefs().contextMenu) {
            this.hideContextMenu();
            root.data(
                'dropdown',
                $(concordInstance.prefs().contextMenu)
                    .clone()
                    .appendTo(concordInstance.container)
            );
            var editor = this;
            root.data('dropdown').on('click', 'a', function (event) {
                editor.hideContextMenu();
            });
            root.data('dropdown').css({
                position: 'absolute',
                top: y + 'px',
                left: x + 'px',
                cursor: 'default'
            });
            root.data('dropdown').show();
        }
    };
    this.sanitize = function () {
        root.find('.concord-text.paste').each(function () {
            var concordText = $(this);
            if (concordInstance.pasteBin.text() == '...') {
                return;
            }
            // Use raw clipboard HTML if available (preserves whitespace/tabs)
            var rawHtml =
                concordInstance.rawClipboardHtml ||
                concordInstance.pasteBin.html();
            console.log(
                '[paste] source:',
                concordInstance.rawClipboardHtml ? 'rawClipboard' : 'pasteBin'
            );
            console.log('[paste] html:', rawHtml.substring(0, 500));
            concordInstance.rawClipboardHtml = null; // Clear for next paste

            // Strip document-level tags that browsers add to clipboard
            rawHtml = rawHtml
                .replace(/<meta[^>]*>/gi, '')
                .replace(/<\/?html[^>]*>/gi, '')
                .replace(/<\/?head[^>]*>/gi, '')
                .replace(/<\/?body[^>]*>/gi, '')
                .replace(/<!--[\s\S]*?-->/g, '')
                .trim();

            // Check if the pasted content has rich formatting (tags or CSS styles)
            var hasRichFormatting =
                /<(b|strong|i|em|u|strike|del|s|a)[\s>]/i.test(rawHtml) ||
                /<(ul|ol)[\s>]/i.test(rawHtml) ||
                /style\s*=\s*"[^"]*(?:text-decoration|font-weight|font-style)[^"]*"/i.test(
                    rawHtml
                );

            // Convert block elements to newlines for plain text processing
            var h = rawHtml.replace(
                new RegExp(
                    '<(div|p|blockquote|pre|li|br|dd|dt|code|h\\d)[^>]*(/)?>',
                    'gi'
                ),
                '\n'
            );

            if (h[0] === '\n') h = h.substring(1); // Remove first new line character

            var plainText = $('<div/>').html(h).text();
            var clipboardMatch = false;
            if (concordClipboard !== undefined) {
                var trimmedClipboardText = concordClipboard.text.replace(
                    /^[\s\r\n]+|[\s\r\n]+$/g,
                    ''
                );
                var trimmedPasteText = plainText.replace(
                    /^[\s\r\n]+|[\s\r\n]+$/g,
                    ''
                );
                if (trimmedClipboardText == trimmedPasteText) {
                    var clipboardNodes = concordClipboard.data;
                    if (clipboardNodes) {
                        var collapseNode = function (node) {
                            node.find('ol').each(function () {
                                if ($(this).children().length > 0) {
                                    $(this).parent().addClass('collapsed');
                                }
                            });
                        };
                        clipboardNodes.each(function () {
                            collapseNode($(this));
                        });
                        root.data('clipboard', clipboardNodes);
                        concordInstance.op.setTextMode(false);
                        concordInstance.op.paste();
                        clipboardMatch = true;
                    }
                }
            }
            if (!clipboardMatch) {
                concordClipboard = undefined;
                var numberoflines = 0;
                var lines = plainText.split('\n');
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line != '' && !line.match(/^\s+$/)) {
                        numberoflines++;
                    }
                }

                // Use rich text paste if formatting detected
                if (hasRichFormatting) {
                    if (!concordInstance.op.inTextMode() || numberoflines > 1) {
                        // Multiple lines with formatting - create nodes
                        concordInstance.op.insertRichText(rawHtml);
                    } else {
                        // Single line with formatting - insert inline
                        concordInstance.op.saveState();
                        concordText.focus();
                        var range = concordText
                            .parents('.concord-node:first')
                            .data('range');
                        if (range) {
                            try {
                                var sel = window.getSelection();
                                sel.removeAllRanges();
                                sel.addRange(range);
                            } catch (e) {
                                console.log(e);
                            } finally {
                                concordText
                                    .parents('.concord-node:first')
                                    .removeData('range');
                            }
                        }
                        // Parse the HTML and insert with formatting
                        var node = concordText.parents('.concord-node:first');
                        var model = concordInstance.op.getTextModel(node);
                        var pastedModel = ConcordTextModel.fromHTML(rawHtml);
                        // Get current caret position using selection range
                        var selRange = ConcordUtil.getSelectionRange(
                            concordText[0]
                        );
                        var caretPos = selRange ? selRange.end : 0;
                        // Insert the pasted text at caret position
                        var newModel = model.insertAt(
                            caretPos,
                            pastedModel.text
                        );
                        // Shift pasted marks to correct position and add them
                        for (var i = 0; i < pastedModel.marks.length; i++) {
                            var mark = pastedModel.marks[i];
                            newModel = newModel.addMark(
                                mark.start + caretPos,
                                mark.end + caretPos,
                                mark.type,
                                mark.attrs
                            );
                        }
                        concordInstance.op.setTextModel(newModel, node);
                        // Set caret to end of pasted text
                        var newCaretPos = caretPos + pastedModel.text.length;
                        ConcordUtil.setSelectionRange(
                            concordText[0],
                            newCaretPos,
                            newCaretPos
                        );
                        concordInstance.root.removeData('clipboard');
                        concordInstance.op.markChanged();
                    }
                } else if (
                    !concordInstance.op.inTextMode() ||
                    numberoflines > 1
                ) {
                    concordInstance.op.insertText(plainText);
                } else {
                    concordInstance.op.saveState();
                    concordText.focus();
                    var range = concordText
                        .parents('.concord-node:first')
                        .data('range');
                    if (range) {
                        try {
                            var sel = window.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(range);
                        } catch (e) {
                            console.log(e);
                        } finally {
                            concordText
                                .parents('.concord-node:first')
                                .removeData('range');
                        }
                    }
                    document.execCommand('insertText', null, plainText);
                    concordInstance.root.removeData('clipboard');
                    concordInstance.op.markChanged();
                }
            }
            concordText.removeClass('paste');
        });
    };
    this.escape = function (s) {
        var h = $('<div/>').text(s).html();
        h = h.replace(/\u00A0/g, ' ');
        if (concordInstance.op.getRenderMode()) {
            // Render HTML if op.getRenderMode() returns true - 2/17/13 by KS
            var allowedTags = [
                'b',
                'u',
                'strong',
                'i',
                'em',
                'a',
                'img',
                'strike',
                'del'
            ];
            for (var tagIndex in allowedTags) {
                var tag = allowedTags[tagIndex];
                if (tag == 'img') {
                    h = h.replace(
                        new RegExp('&lt;' + tag + '((?!&gt;).+)(/)?&gt;', 'gi'),
                        '<' + tag + '$1' + '/>'
                    );
                } else if (tag == 'a') {
                    h = h.replace(
                        new RegExp(
                            '&lt;' +
                                tag +
                                '((?!&gt;).*?)&gt;((?!&lt;/' +
                                tag +
                                '&gt;).+?)&lt;/' +
                                tag +
                                '&gt;',
                            'gi'
                        ),
                        '<' + tag + '$1' + '>$2' + '<' + '/' + tag + '>'
                    );
                } else {
                    h = h.replace(
                        new RegExp(
                            '&lt;' +
                                tag +
                                '&gt;((?!&lt;/' +
                                tag +
                                '&gt;).+?)&lt;/' +
                                tag +
                                '&gt;',
                            'gi'
                        ),
                        '<' + tag + '>$1' + '<' + '/' + tag + '>'
                    );
                }
            }
        }
        return h;
    };
    this.unescape = function (s) {
        var h = s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        h = $('<div/>').html(h).text();
        return h ? h : '';
    };
    this.getSelection = function () {
        var range = undefined;
        if (window.getSelection) {
            var sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                if (
                    $(range.startContainer).parents('.concord-node:first')
                        .length == 0
                ) {
                    range = undefined;
                }
            }
        }
        return range;
    };
    this.saveSelection = function () {
        var range = this.getSelection();
        if (range !== undefined) {
            concordInstance.op.getCursor().data('range', range.cloneRange());
        }
        return range;
    };
    this.restoreSelection = function (range) {
        var cursor = concordInstance.op.getCursor();
        if (range === undefined) {
            range = cursor.data('range');
        }
        if (range !== undefined) {
            if (window.getSelection) {
                try {
                    var cloneRanger = range.cloneRange();
                    var sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(cloneRanger);
                } catch (e) {
                    console.log(e);
                } finally {
                    cursor.removeData('range');
                }
            }
        }
        return range;
    };
    this.recalculateLevels = function (context) {
        if (!context) {
            context = root.find('.concord-node');
        }
        context.each(function () {
            var text = $(this)
                .children('.concord-wrapper')
                .children('.concord-text');
            var levelMatch = $(this)
                .attr('class')
                .match(/.*concord-level-(\d+).*/);
            if (levelMatch) {
                $(this).removeClass('concord-level-' + levelMatch[1]);
                text.removeClass('concord-level-' + levelMatch[1] + '-text');
            }
            var level = $(this).parents('.concord-node').length + 1;
            $(this).addClass('concord-level-' + level);
            text.addClass('concord-level-' + level + '-text');
        });
    };
    this.exportText = function (node, bulletChar) {
        if (!node) return '';
        var sb = [];
        node.children('.concord-node').each(function () {
            sb.push(concordInstance.editor.textLine($(this), null, bulletChar));
        });
        return sb.join('');
    };
    this.parseText = function (text, bulletChar) {
        var opml = concordInstance.op.textToOutline(text, bulletChar);
        var str = new XMLSerializer().serializeToString(opml);
        return str;
    };
}

function ConcordEvents(root, editor, op, concordInstance) {
    var instance = this;
    this.wrapperDoubleClick = function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (root.data('dropdown')) {
            editor.hideContextMenu();
            return;
        }
        if (event.shiftKey) return;
        if (!editor.editable($(event.target))) {
            var wrapper = $(event.target);
            if (wrapper.hasClass('node-icon')) {
                wrapper = wrapper.parent();
                event.preventDefault();
                op.setTextMode(false);
                if (op.subsExpanded()) {
                    op.collapse();
                } else {
                    op.expand();
                }
            }
        }
        concordInstance.fireCallback('opIconClicked', event);
    };
    this.clickSelect = function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (root.data('dropdown')) {
            event.stopPropagation();
            editor.hideContextMenu();
            return;
        }
        if (concordInstance.prefs()['readonly']) {
            var node = $(event.target);
            if (concordInstance.op.getCursor()[0] === node[0]) {
                instance.doubleClick(event);
                return;
            }
        }
        if (event.which == 1 && !editor.editable($(event.target))) {
            var node = $(event.target);
            if (!node.hasClass('concord-node')) {
                return;
            }
            if (node.length == 1) {
                event.stopPropagation();
                if (
                    event.shiftKey &&
                    node.parents('.concord-node.selected').length > 0
                ) {
                    return;
                }
                op.setTextMode(false);
                op.setCursor(
                    node,
                    event.shiftKey || event.metaKey,
                    event.shiftKey
                );
            }
        }
    };
    this.doubleClick = function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (root.data('dropdown')) {
            editor.hideContextMenu();
            return;
        }
        if (!editor.editable($(event.target))) {
            var node = $(event.target);
            if (
                node.hasClass('concord-node') &&
                node.hasClass('concord-cursor')
            ) {
                event.stopPropagation();
                op.setTextMode(false);
                op.setCursor(node);
                if (op.subsExpanded()) {
                    op.collapse();
                } else {
                    op.expand();
                }
            }
        }
    };
    this.keyPress = function (event) {
        if (!concord.handleEvents) {
            return;
        }
        var keycode = event.keyCode ? event.keyCode : event.which;
        if (keycode == 32)
            if (event.ctrlKey)
                if (!editor.editable($(event.target))) {
                    var wrapper = $(event.target);
                    if (wrapper.hasClass('node-icon')) {
                        wrapper = wrapper.parent();
                    }
                    if (wrapper.hasClass('concord-text')) {
                        event.stopPropagation();
                        event.preventDefault();
                        op.setTextMode(true);
                        if (op.subsExpanded()) {
                            op.collapse();
                        } else {
                            op.expand();
                        }
                    }
                }
    };
    this.wrapperClickSelect = function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (root.data('dropdown')) {
            editor.hideContextMenu();
            return;
        }
        if (concordInstance.prefs()['readonly']) {
            var target = $(event.target);
            var node = target.parents('.concord-node:first');
            concordInstance.op.setCursor(node);
            instance.wrapperDoubleClick(event);
            return;
        }
        if (event.which == 1 && !editor.editable($(event.target))) {
            var wrapper = $(event.target);
            var isIconClicked = false;
            if (wrapper.hasClass('node-icon')) {
                wrapper = wrapper.parent();
                isIconClicked = true;
            }
            if (wrapper.hasClass('concord-wrapper')) {
                var node = wrapper.parents('.concord-node:first');
                if (
                    event.shiftKey &&
                    node.parents('.concord-node.selected').length > 0
                ) {
                    return;
                }

                if (isIconClicked) {
                    //Expand / Collapse
                    op.setTextMode(false);
                    op.setCursor(
                        node,
                        event.shiftKey || event.metaKey,
                        event.shiftKey
                    );
                    instance.wrapperDoubleClick(event);
                } else {
                    //Edit mode
                    op.setTextMode(true);
                    op.setCursor(
                        node,
                        event.shiftKey || event.metaKey,
                        event.shiftKey
                    );
                    var caretPosition = op.getLineText().length;
                    const el = ConcordUtil.getTextNode(op);
                    ConcordUtil.setCaret(el, caretPosition);
                    instance.clickSelect(event);
                }
            }
        }
    };
    this.contextmenu = function (event) {
        if (!concord.handleEvents) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        var node = $(event.target);
        if (node.hasClass('concord-wrapper') || node.hasClass('node-icon')) {
            op.setTextMode(false);
        }
        if (!node.hasClass('concord-node')) {
            node = node.parents('.concord-node:first');
        }
        concordInstance.fireCallback(
            'opContextMenu',
            op.setCursorContext(node)
        );
        op.setCursor(node);
        editor.showContextMenu(event.pageX, event.pageY);
    };
    this.addEventListener = function (eventName, myFunction) {
        root[0].addEventListener(eventName, myFunction);
    };
    this.removeEventListener = function (eventName, myFunction) {
        root[0].removeEventListener(eventName, myFunction);
    };
    this.dispatchEvent = function (event) {
        root[0].dispatchEvent(event);
    };
    root.on('dblclick', '.concord-wrapper', this.wrapperDoubleClick);
    root.on('dblclick', '.concord-node', this.doubleClick);
    root.on('keydown', '.concord-wrapper', this.keyPress);
    root.on('dblclick', '.concord-text', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs()['readonly'] == true) {
            event.preventDefault();
            event.stopPropagation();
            var node = $(event.target).parents('.concord-node:first');
            op.setCursor(node);
            if (op.subsExpanded()) {
                op.collapse();
            } else {
                op.expand();
            }
        }
    });
    root.on('click', '.concord-wrapper', this.wrapperClickSelect);
    root.on('click', '.concord-node', this.clickSelect);
    root.on('mouseover', '.concord-wrapper', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        var node = $(event.target).parents('.concord-node:first');
        concordInstance.fireCallback('opHover', op.setCursorContext(node));
    });
    if (concordInstance.prefs.contextMenu) {
        root.on('contextmenu', '.concord-text', this.contextmenu);
        root.on('contextmenu', '.concord-node', this.contextmenu);
        root.on('contextmenu', '.concord-wrapper', this.contextmenu);
    }
    root.on('blur', '.concord-text', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs()['readonly'] == true) {
            return;
        }
        if (
            $(this)
                .html()
                .match(/^\s*<br>\s*$/)
        ) {
            $(this).html('');
        }
        var node = $(this).parents('.concord-node:first');
        if (concordInstance.op.inTextMode()) {
            editor.saveSelection();
        }
        if (concordInstance.op.inTextMode() && node.hasClass('dirty')) {
            node.removeClass('dirty');
        }
    });
    root.on('input', '.concord-text', function () {
        if (!concord.handleEvents) return;
        var node = $(this).parents('.concord-node:first');
        if (node.length === 1) concordInstance.op.invalidateTextModel(node);
    });
    root.on('paste', '.concord-text', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs()['readonly'] == true) {
            return;
        }
        // Try to get raw clipboard data before browser normalizes it
        var clipboardData =
            event.originalEvent && event.originalEvent.clipboardData;
        if (clipboardData) {
            var rawHtml = clipboardData.getData('text/html');
            if (rawHtml) {
                concordInstance.rawClipboardHtml = rawHtml;
            }
        }
        $(this).addClass('paste');
        concordInstance.editor.saveSelection();
        concordInstance.pasteBin.html('');
        concordInstance.pasteBin.focus();
        setTimeout(editor.sanitize, 10);
    });
    concordInstance.pasteBin.on('copy', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        var selected = root.find('.selected');
        if (selected.length === 0) {
            var cursor = concordInstance.op.getCursor();
            if (cursor && cursor.length === 1) selected = cursor;
        }
        var copyText = '';
        selected.each(function () {
            copyText += concordInstance.editor.textLine($(this));
        });
        if (copyText != '' && copyText != '\n') {
            concordClipboard = {
                text: copyText,
                data: selected.clone(true, true)
            };
            var clipData =
                event.originalEvent && event.originalEvent.clipboardData;
            if (clipData) {
                var copyHtml = '<ul>';
                var plainText = '';
                selected.each(function () {
                    copyHtml += concordInstance.editor.styledLine($(this));
                    plainText += concordInstance.editor.plainTextLine($(this));
                });
                copyHtml += '</ul>';
                event.preventDefault();
                clipData.setData('text/html', copyHtml);
                clipData.setData('text/plain', plainText);
            } else {
                concordInstance.pasteBin.html(
                    '<pre>' + $('<div/>').text(copyText).html() + '</pre>'
                );
                concordInstance.pasteBin.focus();
                document.execCommand('selectAll');
            }
        }
    });
    concordInstance.pasteBin.on('paste', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs()['readonly'] == true) {
            return;
        }
        var clipboardData =
            event.originalEvent && event.originalEvent.clipboardData;
        if (clipboardData) {
            var rawHtml = clipboardData.getData('text/html');
            if (rawHtml) {
                concordInstance.rawClipboardHtml = rawHtml;
            }
        }
        var concordText = concordInstance.op
            .getCursor()
            .children('.concord-wrapper')
            .children('.concord-text');
        concordText.addClass('paste');
        concordInstance.pasteBin.html('');
        setTimeout(editor.sanitize, 10);
    });
    concordInstance.pasteBin.on('cut', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs()['readonly'] == true) {
            return;
        }
        var selected = root.find('.selected');
        if (selected.length === 0) {
            var cursor = concordInstance.op.getCursor();
            if (cursor && cursor.length === 1) selected = cursor;
        }
        var copyText = '';
        selected.each(function () {
            copyText += concordInstance.editor.textLine($(this));
        });
        if (copyText != '' && copyText != '\n') {
            concordClipboard = {
                text: copyText,
                data: selected.clone(true, true)
            };
            var clipData =
                event.originalEvent && event.originalEvent.clipboardData;
            if (clipData) {
                var copyHtml = '<ul>';
                var plainText = '';
                selected.each(function () {
                    copyHtml += concordInstance.editor.styledLine($(this));
                    plainText += concordInstance.editor.plainTextLine($(this));
                });
                copyHtml += '</ul>';
                event.preventDefault();
                clipData.setData('text/html', copyHtml);
                clipData.setData('text/plain', plainText);
            } else {
                concordInstance.pasteBin.html(
                    '<pre>' + $('<div/>').text(copyText).html() + '</pre>'
                );
                concordInstance.pasteBinFocus();
            }
        }
        concordInstance.op.deleteLine();
        setTimeout(function () {
            concordInstance.pasteBinFocus();
        }, 200);
    });
    root.on('mousedown', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        var target = $(event.target);
        if (target.is('a')) {
            if (target.attr('href') && event.which === 1) {
                event.preventDefault();
                window.open(target.attr('href'));
            }
            return;
        }
        if (concordInstance.prefs()['readonly'] == true) {
            event.preventDefault();
            var target = $(event.target);
            if (target.parents('.concord-text:first').length == 1) {
                target = target.parents('.concord-text:first');
            }
            if (target.hasClass('concord-text')) {
                var node = target.parents('.concord-node:first');
                if (node.length == 1) {
                    op.setCursor(node);
                }
            }
            return;
        }
        if (event.which == 1) {
            if (root.data('dropdown')) {
                editor.hideContextMenu();
                return;
            }
            if (target.parents('.concord-text:first').length == 1) {
                target = target.parents('.concord-text:first');
            }
            if (target.hasClass('concord-text')) {
                var node = target.parents('.concord-node:first');
                if (node.length == 1) {
                    if (!root.hasClass('textMode')) {
                        root.find('.selected').removeClass('selected');
                        root.addClass('textMode');
                    }
                    if (
                        node
                            .children('.concord-wrapper')
                            .children('.concord-text')
                            .hasClass('editing')
                    ) {
                        root.find('.editing').removeClass('editing');
                        node.children('.concord-wrapper')
                            .children('.concord-text')
                            .addClass('editing');
                    }
                    if (!node.hasClass('concord-cursor')) {
                        root.find('.concord-cursor').removeClass(
                            'concord-cursor'
                        );
                        node.addClass('concord-cursor');
                        concordInstance.fireCallback(
                            'opCursorMoved',
                            op.setCursorContext(node)
                        );
                    }
                    concord.bringIntoView($(event.target));
                }
            } else {
                event.preventDefault();
                root.data('mousedown', true);
            }
        }
    });
    root.on('mousemove', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs()['readonly'] == true) {
            return;
        }
        if (
            !editor.editable($(event.target)) &&
            concordInstance.op.inTextMode() == false
        ) {
            event.preventDefault();
            if (root.data('mousedown') && !root.data('dragging')) {
                var target = $(event.target);
                if (target.hasClass('node-icon')) {
                    target = target.parent();
                }
                if (
                    target.hasClass('concord-wrapper') &&
                    target.parent().hasClass('selected')
                ) {
                    editor.dragMode();
                }
            }
        }
    });
    root.on('mouseup', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs()['readonly'] == true) {
            return;
        }
        var target = $(event.target);
        if (target.hasClass('concord-node')) {
            target = target
                .children('.concord-wrapper:first')
                .children('.concord-text:first');
        } else if (target.hasClass('concord-wrapper')) {
            target = target.children('.concord-text:first');
        }
        if (!editor.editable(target)) {
            root.data('mousedown', false);
            if (root.data('dragging')) {
                var target = $(event.target);
                var node = target.parents('.concord-node:first');
                var draggable = root.find('.selected');
                if (node.length == 1 && draggable.length >= 1) {
                    var isDraggableTarget = false;
                    draggable.each(function () {
                        if (this == node[0]) {
                            isDraggableTarget = true;
                        }
                    });
                    if (!isDraggableTarget) {
                        var draggableIsTargetParent = false;
                        node.parents('.concord-node').each(function () {
                            var nodeParent = $(this)[0];
                            draggable.each(function () {
                                if ($(this)[0] == nodeParent) {
                                    draggableIsTargetParent = true;
                                }
                            });
                        });
                        if (!draggableIsTargetParent) {
                            if (
                                target.hasClass('concord-wrapper') ||
                                target.hasClass('node-icon')
                            ) {
                                var clonedDraggable = draggable.clone(
                                    true,
                                    true
                                );
                                clonedDraggable.insertAfter(node);
                                draggable.remove();
                            } else {
                                var clonedDraggable = draggable.clone(
                                    true,
                                    true
                                );
                                var outline = node.children('ol');
                                clonedDraggable.prependTo(outline);
                                node.removeClass('collapsed');
                                draggable.remove();
                            }
                        }
                    } else {
                        var prev = node.prev();
                        if (prev.length == 1) {
                            if (prev.hasClass('drop-child')) {
                                var clonedDraggable = draggable.clone(
                                    true,
                                    true
                                );
                                var outline = prev.children('ol');
                                clonedDraggable.appendTo(outline);
                                prev.removeClass('collapsed');
                                draggable.remove();
                            }
                        }
                    }
                }
                editor.dragModeExit();
                concordInstance.editor.recalculateLevels();
            }
        }
    });
    root.on('mouseover', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs()['readonly'] == true) {
            return;
        }
        if (root.data('dragging')) {
            event.preventDefault();
            var target = $(event.target);
            var node = target.parents('.concord-node:first');
            var draggable = root.find('.selected');
            if (node.length == 1 && draggable.length >= 1) {
                var isDraggableTarget = false;
                draggable.each(function () {
                    if (this == node[0]) {
                        isDraggableTarget = true;
                    }
                });
                if (!isDraggableTarget) {
                    var draggableIsTargetParent = false;
                    node.parents('.concord-node').each(function () {
                        var nodeParent = $(this)[0];
                        draggable.each(function () {
                            if ($(this)[0] == nodeParent) {
                                draggableIsTargetParent = true;
                            }
                        });
                    });
                    if (!draggableIsTargetParent) {
                        node.removeClass('drop-sibling').remove('drop-child');
                        if (
                            target.hasClass('concord-wrapper') ||
                            target.hasClass('node-icon')
                        ) {
                            node.addClass('drop-sibling');
                        } else {
                            node.addClass('drop-child');
                        }
                    }
                } else if (draggable.length == 1) {
                    var prev = node.prev();
                    if (prev.length == 1) {
                        prev.removeClass('drop-sibling').remove('drop-child');
                        prev.addClass('drop-child');
                    }
                }
            }
        }
    });
    root.on('mouseout', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs()['readonly'] == true) {
            return;
        }
        if (root.data('dragging')) {
            root.find('.drop-sibling').removeClass('drop-sibling');
            root.find('.drop-child').removeClass('drop-child');
        }
    });
    this.textModeChangedEvent = new Event('textModeChanged');
}

function ConcordOp(root, concordInstance, _cursor) {
    var zh = concordInstance.zoomHelper;
    this._walk_up = function (context) {
        var prev = context.prev();
        if (prev.length == 0) {
            var parent = context.parents('.concord-node:first');
            if (parent.length == 1 && !zh.isRoot(parent)) {
                return parent;
            } else {
                return null;
            }
        } else {
            // Skip hidden siblings (e.g. nodes hidden by zoom).
            prev = zh.skipHidden(prev, 'prev');
            // If no visible sibling remains, walk up to parent — unless
            // the parent is a view boundary (zoom root), in which case stop.
            if (prev.length == 0) {
                var parent = context.parents('.concord-node:first');
                if (parent.length == 1 && !zh.isRoot(parent)) {
                    return parent;
                }
                return null;
            }
            return this._last_child(prev);
        }
    };
    this._walk_down = function (context, skipZoom) {
        var skipHidden = skipZoom ? (n) => n : (n) => zh.skipHidden(n, 'next');
        var isRoot = skipZoom ? () => false : (p) => zh.isRoot(p);
        var next = skipHidden(context.next());
        if (next.length == 1) {
            return next;
        } else {
            var parent = context.parents('.concord-node:first');
            if (parent.length == 1 && !isRoot(parent)) {
                return this._walk_down(parent, skipZoom);
            } else {
                return null;
            }
        }
    };
    this._last_child = function (context) {
        if (context.hasClass('collapsed')) {
            return context;
        }
        var outline = context.children('ol');
        if (outline.length == 0) {
            return context;
        } else {
            var lastChild = outline.children('.concord-node:last');
            if (lastChild.length == 1) {
                return this._last_child(lastChild);
            } else {
                return context;
            }
        }
    };
    this.bold = function () {
        this.stylize('bold');
    };
    this.underline = function () {
        this.stylize('underline');
    };
    this.italic = function () {
        this.stylize('italic');
    };
    this.stylize = function (style) {
        // Map execCommand style names to ConcordTextModel mark types
        const styleMap = {
            bold: 'bold',
            italic: 'italic',
            underline: 'underline',
            strikeThrough: 'strike'
        };

        const markType = styleMap[style];
        if (!markType) return;

        this.saveState();

        const node = this.getCursor();
        const textElement = node
            .children('.concord-wrapper:first')
            .children('.concord-text:first')[0];

        if (!textElement) return;

        // Check if multiple nodes are selected
        const selectedNodes = root.find('.selected');

        if (selectedNodes.length > 1) {
            // Multiple nodes selected - style all of them
            const self = this;
            selectedNodes.each(function () {
                const selectedNode = $(this);
                const model = self.getTextModel(selectedNode);
                if (model.length > 0) {
                    const newModel = model.toggleMark(
                        0,
                        model.length,
                        markType
                    );
                    self.invalidateTextModel(selectedNode);
                    self.setTextModel(newModel, selectedNode);
                }
            });

            this.focusCursor();
            this.blurCursor();
            concordInstance.pasteBinFocus();
        } else if (this.inTextMode()) {
            // Text mode with single node: style selection range
            const selRange = ConcordUtil.getSelectionRange(textElement);
            if (!selRange || selRange.start === selRange.end) {
                // No selection - nothing to style
                return;
            }

            // Get current model and toggle the mark
            const model = this.getTextModel(node);
            const newModel = model.toggleMark(
                selRange.start,
                selRange.end,
                markType
            );

            // Invalidate cache and set the new model
            this.invalidateTextModel(node);
            this.setTextModel(newModel, node);

            // Restore selection
            ConcordUtil.setSelectionRange(
                textElement,
                selRange.start,
                selRange.end
            );
        } else {
            // Non-text mode with single node: style entire node
            const model = this.getTextModel(node);
            const newModel = model.toggleMark(0, model.length, markType);

            this.invalidateTextModel(node);
            this.setTextModel(newModel, node);

            this.focusCursor();
            this.blurCursor();
            concordInstance.pasteBinFocus();
        }

        this.markChanged();
    };
    this.changed = function () {
        return root.data('changed') == true;
    };
    this.clearChanged = function () {
        root.data('changed', false);
        return true;
    };
    this.collapse = function (triggerCallbacks) {
        if (triggerCallbacks == undefined) {
            triggerCallbacks = true;
        }
        var node = this.getCursor();
        if (node.length == 1) {
            if (triggerCallbacks) {
                concordInstance.fireCallback(
                    'opCollapse',
                    this.setCursorContext(node)
                );
            }
            // Animate collapse: slideUp then add collapsed class
            var ol = node.children('ol');
            if (ol.length && ol.children().length > 0) {
                ol.stop(true, true).slideUp(
                    concord.animationSpeed,
                    function () {
                        node.addClass('collapsed');
                        ol.css('display', ''); // Clear inline style, let CSS handle it
                        node.find('ol').each(function () {
                            if ($(this).children().length > 0) {
                                $(this).parent().addClass('collapsed');
                            }
                        });
                    }
                );
            } else {
                node.addClass('collapsed');
            }
            this.markChanged();
        }
    };
    this.copy = function () {
        if (!this.inTextMode()) {
            root.data('clipboard', root.find('.selected').clone(true, true));
        }
    };
    this.countSubs = function (n) {
        var node = n;
        if (!node) node = this.getCursor();
        if (node.length == 1) {
            return node.children('ol').children().length;
        }
        return 0;
    };
    this.cursorToXml = function () {
        return concordInstance.editor.opml(this.getCursor());
    };
    this.cursorToXmlSubsOnly = function () {
        //8/5/13 by DW
        return concordInstance.editor.opml(this.getCursor(), true);
    };
    this.cut = function () {
        if (!this.inTextMode()) {
            this.copy();
            this.deleteLine();
        }
    };
    this.deleteLine = function () {
        this.saveState();
        if (this.inTextMode()) {
            var cursor = this.getCursor();
            var p = cursor.prev();
            if (p.length == 0) {
                p = cursor.parents('.concord-node:first');
            }
            cursor.remove();
            if (p.length == 1) {
                this.setCursor(p);
            } else {
                if (root.find('.concord-node:first').length == 1) {
                    this.setCursor(root.find('.concord-node:first'));
                } else {
                    this.wipe();
                }
            }
        } else {
            var selected = root.find('.selected');
            if (selected.length == 1) {
                var p = selected.prev();
                if (p.length == 0) {
                    p = selected.parents('.concord-node:first');
                }
                selected.remove();
                if (p.length == 1) {
                    this.setCursor(p);
                } else {
                    if (root.find('.concord-node:first').length == 1) {
                        this.setCursor(root.find('.concord-node:first'));
                    } else {
                        this.wipe();
                    }
                }
            } else if (selected.length > 1) {
                var first = root.find('.selected:first');
                var p = first.prev();
                if (p.length == 0) {
                    p = first.parents('.concord-node:first');
                }
                selected.each(function () {
                    $(this).remove();
                });
                if (p.length == 1) {
                    this.setCursor(p);
                } else {
                    if (root.find('.concord-node:first').length == 1) {
                        this.setCursor(root.find('.concord-node:first'));
                    } else {
                        this.wipe();
                    }
                }
            }
        }
        if (root.find('.concord-node').length == 0) {
            var node = this.insert('', down);
            this.setCursor(node);
        }
        this.markChanged();
        concordInstance.fireCallback('onNodeDeleted');
    };
    this.deleteSubs = function () {
        var node = this.getCursor();
        if (node.length == 1) {
            if (node.children('ol').children().length > 0) {
                this.saveState();
                node.children('ol').empty();
            }
        }
        this.markChanged();
    };
    this.demote = function () {
        var node = this.getCursor();
        var movedSiblings = false;
        if (node.nextAll().length > 0) {
            this.saveState();
            node.nextAll().each(function () {
                var sibling = $(this).clone(true, true);
                $(this).remove();
                sibling.appendTo(node.children('ol'));
                node.removeClass('collapsed');
            });
            concordInstance.editor.recalculateLevels(
                node.find('.concord-node')
            );
            this.markChanged();
        }
    };
    this.expand = function (triggerCallbacks) {
        if (triggerCallbacks == undefined) {
            triggerCallbacks = true;
        }
        var node = this.getCursor();
        if (node.length == 1) {
            if (triggerCallbacks) {
                concordInstance.fireCallback(
                    'opExpand',
                    this.setCursorContext(node)
                );
            }
            if (!node.hasClass('collapsed')) {
                return;
            }
            // Animate expand: clear inline styles, keep hidden via CSS, then slideDown
            var ol = node.children('ol');
            if (ol.length) {
                ol.stop(true, true); // Stop any running animation
                ol.css('display', ''); // Clear any inline display style
                ol.hide(); // Now hide with jQuery
                node.removeClass('collapsed'); // CSS no longer hides it
                ol.slideDown(concord.animationSpeed, function () {
                    ol.css('display', ''); // Clear inline style after animation
                });
            } else {
                node.removeClass('collapsed');
            }
            var cursorPosition = node.offset().top;
            var cursorHeight = node.height();
            var windowPosition = $(window).scrollTop();
            var windowHeight = $(window).height();
            if (
                cursorPosition < windowPosition ||
                cursorPosition + cursorHeight > windowPosition + windowHeight
            ) {
                if (cursorPosition < windowPosition) {
                    $(window).scrollTop(cursorPosition);
                } else if (
                    cursorPosition + cursorHeight >
                    windowPosition + windowHeight
                ) {
                    var lineHeight =
                        parseInt(
                            node
                                .children('.concord-wrapper')
                                .children('.concord-text')
                                .css('line-height')
                        ) + 6;
                    if (cursorHeight + lineHeight < windowHeight) {
                        $(window).scrollTop(
                            cursorPosition -
                                (windowHeight - cursorHeight) +
                                lineHeight
                        );
                    } else {
                        $(window).scrollTop(cursorPosition);
                    }
                }
            }
            this.markChanged();
        }
    };
    this.expandAllLevels = function () {
        var node = this.getCursor();
        if (node.length == 1) {
            node.removeClass('collapsed');
            node.find('.concord-node').removeClass('collapsed');
        }
    };
    this.focusCursor = function () {
        this.getCursor()
            .children('.concord-wrapper')
            .children('.concord-text')
            .trigger('focus');
        ConcordUtil.setCaretAtStart(
            this.getCursor()
                .children('.concord-wrapper')
                .children('.concord-text')[0]
        );
    };
    this.blurCursor = function () {
        this.getCursor()
            .children('.concord-wrapper')
            .children('.concord-text')
            .trigger('blur');
    };
    this.fullCollapse = function () {
        root.find('.concord-node').each(function () {
            if ($(this).children('ol').children().length > 0) {
                $(this).addClass('collapsed');
            }
        });
        var cursor = this.getCursor();
        var topParent = cursor.parents('.concord-node:last');
        if (topParent.length == 1) {
            concordInstance.editor.select(topParent);
        }
        this.markChanged();
    };
    this.fullExpand = function () {
        root.find('.concord-node').removeClass('collapsed');
        this.markChanged();
    };
    this.getCursor = function () {
        if (_cursor) {
            return _cursor;
        }
        return root.find('.concord-cursor:first');
    };
    this.getCursorRef = function () {
        return this.setCursorContext(this.getCursor());
    };
    this.getHeaders = function () {
        var headers = {};
        if (root.data('head')) {
            headers = root.data('head');
        }
        headers['title'] = this.getTitle();
        return headers;
    };
    this.getLineText = function (n, getHtml = false) {
        var node = n;
        if (!node) node = this.getCursor();
        if (node.length === 0) return null;
        const textNode = node
            .children('.concord-wrapper:first')
            .children('.concord-text:first');

        var text = textNode
            ? getHtml
                ? textNode[0].innerHTML
                : textNode[0].innerText
            : '';

        var textMatches = text.match(/^(.+)<br>\s*$/);
        if (textMatches) {
            text = textMatches[1];
        }
        // Only unescape when returning plain text (not HTML)
        // When getHtml=true, we want raw HTML with entities preserved
        return getHtml ? text : concordInstance.editor.unescape(text);
    };
    /**
     * Get the ConcordTextModel for a node
     * @param {jQuery} [node] - Node to get model for (defaults to cursor)
     * @returns {ConcordTextModel} The text model
     */
    this.getTextModel = function (node) {
        if (!node) node = this.getCursor();
        if (node.length === 0) return new ConcordTextModel('', []);

        const textNode = node
            .children('.concord-wrapper:first')
            .children('.concord-text:first');

        if (!textNode || !textNode[0]) {
            return new ConcordTextModel('', []);
        }

        // Check if model is cached
        let model = node.data('textModel');
        if (!model) {
            // Parse from raw HTML - fromHTML now handles entities correctly
            // &lt;b&gt; becomes literal "<b>" text
            // <b> becomes bold formatting
            const html = textNode[0].innerHTML || '';
            model = ConcordTextModel.fromHTML(html);
            node.data('textModel', model);
        }
        return model;
    };
    /**
     * Set the ConcordTextModel for a node
     * @param {ConcordTextModel|string} modelOrText - Model or plain text
     * @param {jQuery} [node] - Node to set (defaults to cursor)
     * @returns {boolean} Success
     */
    this.setTextModel = function (modelOrText, node) {
        if (!node) node = this.getCursor();
        if (node.length !== 1) return false;

        let model;
        if (typeof modelOrText === 'string') {
            // Check if it's HTML or plain text
            if (modelOrText.includes('<') && modelOrText.includes('>')) {
                model = ConcordTextModel.fromHTML(modelOrText);
            } else {
                model = new ConcordTextModel(modelOrText, []);
            }
        } else if (modelOrText instanceof ConcordTextModel) {
            model = modelOrText;
        } else {
            return false;
        }

        // Cache the model
        node.data('textModel', model);

        // Render to HTML - toHTML() already escapes text content properly
        // Don't escape again or tags like <b> become &lt;b&gt;
        const html = model.toHTML();
        node.children('.concord-wrapper:first')
            .children('.concord-text:first')
            .html(html);

        return true;
    };
    /**
     * Invalidate the cached text model for a node
     * @param {jQuery} [node] - Node to invalidate (defaults to cursor)
     */
    this.invalidateTextModel = function (node) {
        if (!node) node = this.getCursor();
        node.removeData('textModel');
    };
    this.getRenderMode = function () {
        if (root.data('renderMode') !== undefined) {
            return root.data('renderMode') === true;
        } else {
            return true;
        }
    };
    this.getTitle = function () {
        return root.data('title');
    };
    this.go = function (direction, count, multiple, textMode) {
        if (count === undefined) {
            count = 1;
        }
        var cursor = this.getCursor();
        if (textMode == undefined) {
            textMode = false;
        }
        this.setTextMode(textMode);
        var ableToMoveInDirection = false;
        switch (direction) {
            case up:
                for (var i = 0; i < count; i++) {
                    var prev = cursor.prev();
                    prev = zh.skipHidden(prev, 'prev');
                    if (prev.length == 1) {
                        cursor = prev;
                        ableToMoveInDirection = true;
                    } else {
                        break;
                    }
                }
                this.setCursor(cursor, multiple);
                break;
            case down:
                for (var i = 0; i < count; i++) {
                    var next = cursor.next();
                    next = zh.skipHidden(next, 'next');
                    if (next.length == 1) {
                        cursor = next;
                        ableToMoveInDirection = true;
                    } else {
                        break;
                    }
                }
                this.setCursor(cursor, multiple);
                break;
            case left:
                for (var i = 0; i < count; i++) {
                    var parent = cursor.parents('.concord-node:first');
                    if (parent.length == 1 && !zh.isRoot(parent)) {
                        cursor = parent;
                        ableToMoveInDirection = true;
                    } else {
                        break;
                    }
                }
                this.setCursor(cursor, multiple);
                break;
            case right:
                for (var i = 0; i < count; i++) {
                    var firstSibling = cursor
                        .children('ol')
                        .children('.concord-node:first');
                    if (firstSibling.length == 1) {
                        cursor = firstSibling;
                        ableToMoveInDirection = true;
                    } else {
                        break;
                    }
                }
                this.setCursor(cursor, multiple);
                break;
            case flatup:
                var nodeCount = 0;
                while (cursor && nodeCount < count) {
                    var cursor = this._walk_up(cursor);
                    if (cursor) {
                        if (
                            !cursor.hasClass('collapsed') &&
                            cursor.children('ol').children().length > 0
                        ) {
                            nodeCount++;
                            ableToMoveInDirection = true;
                            if (nodeCount == count) {
                                this.setCursor(cursor, multiple);
                                break;
                            }
                        }
                    }
                }
                break;
            case flatdown:
                var nodeCount = 0;
                while (cursor && nodeCount < count) {
                    var next = null;
                    if (!cursor.hasClass('collapsed')) {
                        var outline = cursor.children('ol');
                        if (outline.length == 1) {
                            var firstChild = outline.children(
                                '.concord-node:first'
                            );
                            if (firstChild.length == 1) {
                                next = firstChild;
                            }
                        }
                    }
                    if (!next) {
                        next = this._walk_down(cursor);
                    }
                    cursor = next;
                    if (cursor) {
                        if (
                            !cursor.hasClass('collapsed') &&
                            cursor.children('ol').children().length > 0
                        ) {
                            nodeCount++;
                            ableToMoveInDirection = true;
                            if (nodeCount == count) {
                                this.setCursor(cursor, multiple);
                            }
                        }
                    }
                }
                break;
        }
        this.markChanged();
        return ableToMoveInDirection;
    };
    this.insert = function (insertText, insertDirection, _unused, isRawHtml) {
        this.saveState();
        var level = this.getCursor().parents('.concord-node').length + 1;
        var node = $('<li></li>');
        node.addClass('concord-node');
        switch (insertDirection) {
            case right:
                level += 1;
                break;
            case left:
                level -= 1;
                break;
        }
        node.addClass('concord-level-' + level);
        var wrapper = $("<div class='concord-wrapper'></div>");
        var icon = ConcordUtil.getIcon(iconName);
        wrapper.append(icon);
        wrapper.addClass('type-icon');
        var text = $("<div class='concord-text' contenteditable='true'></div>");
        text.addClass('concord-level-' + level + '-text');
        var outline = $('<ol></ol>');
        text.appendTo(wrapper);
        wrapper.appendTo(node);
        outline.appendTo(node);
        if (insertText && insertText != '') {
            var html = isRawHtml
                ? insertText
                : concordInstance.editor.escape(insertText);
            text.html(html);
        }
        var cursor = this.getCursor();
        if (!insertDirection) {
            insertDirection = down;
        }
        switch (insertDirection) {
            case down:
                cursor.after(node);
                break;
            case right:
                cursor.children('ol').prepend(node);
                this.expand(false);
                break;
            case up:
                cursor.before(node);
                break;
            case left:
                var parent = cursor.parents('.concord-node:first');
                if (parent.length == 1) {
                    parent.after(node);
                }
                break;
        }
        this.setCursor(node);
        this.markChanged();
        concordInstance.fireCallback('opInsert', this.setCursorContext(node));
        return node;
    };
    this.insertImage = function (url) {
        if (this.inTextMode()) {
            document.execCommand('insertImage', null, url);
        } else {
            this.insert('<img src="' + url + '">', down, undefined, true); // isRawHtml
        }
    };
    /**
     * Insert rich text (HTML with formatting) as nodes, preserving styling
     * @param {string} html - HTML string with formatting
     */
    this.insertRichText = function (html) {
        var nodes = $('<ol></ol>');
        var lastLevel = 0;
        var lastNode = null;
        var parent = null;
        var parents = {};
        var lineElements = [];

        // Formatting tags to preserve
        var formattingTags = [
            'b',
            'strong',
            'i',
            'em',
            'u',
            'strike',
            'del',
            's',
            'a'
        ];

        // Helper: extract formatted HTML from a string (unwrap non-formatting tags)
        // Converts CSS-based styles (e.g. text-decoration: line-through) to semantic tags
        var cleanHtml = function (htmlStr) {
            var $temp = $('<div>').html(htmlStr);

            // Map of CSS style patterns to formatting wrapper tags
            var styleToTag = [
                {
                    prop: 'text-decoration',
                    match: /line-through/,
                    tag: 'strike'
                },
                { prop: 'text-decoration', match: /underline/, tag: 'u' },
                { prop: 'font-weight', match: /bold|[7-9]00/, tag: 'b' },
                { prop: 'font-style', match: /italic/, tag: 'i' }
            ];

            var processNode = function (node) {
                $(node)
                    .contents()
                    .each(function () {
                        if (this.nodeType === 3) return; // text node - keep
                        if (this.nodeType === 1) {
                            var tagName = this.tagName.toLowerCase();
                            processNode(this); // always process children first
                            if (formattingTags.indexOf(tagName) === -1) {
                                // Before unwrapping, check for CSS-based formatting
                                var style = this.getAttribute('style') || '';
                                var $el = $(this);
                                var $contents = $el.contents();
                                if (style) {
                                    for (
                                        var s = 0;
                                        s < styleToTag.length;
                                        s++
                                    ) {
                                        var rule = styleToTag[s];
                                        if (rule.match.test(style)) {
                                            $contents = $(
                                                '<' + rule.tag + '>'
                                            ).append($contents);
                                        }
                                    }
                                }
                                $el.replaceWith($contents);
                            }
                        }
                    });
            };

            processNode($temp[0]);
            return $temp.html();
        };

        // Strip non-content elements injected by external sources (TextEdit, Word, etc.)
        html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        html = html.replace(/<meta[^>]*\/?>/gi, '');

        var hasBlocks = false;
        var $container = $('<div>').html(html);
        var hasLists = $container.find('ul, ol').length > 0;

        if (hasLists) {
            // Find root lists: <ul>/<ol> not nested inside another <ul>/<ol>
            // Handles any wrapper depth (e.g. <div><ul>...</ul></div>)
            var $rootLists = $container.find('ul, ol').filter(function () {
                return $(this).parentsUntil($container, 'ul, ol').length === 0;
            });

            $rootLists.each(function () {
                var $list = $(this);
                $list.find('li').each(function () {
                    var depth = 0;
                    var el = this.parentNode;
                    while (el && el !== $list[0]) {
                        if (el.nodeName === 'UL' || el.nodeName === 'OL')
                            depth++;
                        el = el.parentNode;
                    }
                    // Flat lists: check margin-left/padding-left for indentation
                    if (depth === 0) {
                        var style = this.getAttribute('style') || '';
                        var indentMatch = style.match(
                            /(?:margin|padding)-left:\s*([\d.]+)\s*(pt|px|em|in)/
                        );
                        if (indentMatch) {
                            var val = parseFloat(indentMatch[1]);
                            var unit = indentMatch[2];
                            var px =
                                unit === 'pt'
                                    ? (val * 4) / 3
                                    : unit === 'em'
                                      ? val * 16
                                      : unit === 'in'
                                        ? val * 96
                                        : val;
                            depth = Math.round(px / 48);
                        }
                    }
                    var $clone = $(this).clone();
                    $clone.find('ul, ol').remove();
                    var content = cleanHtml($clone.html());
                    lineElements.push({
                        html: content && content.trim() ? content.trim() : '',
                        indent: depth
                    });
                });
            });
        } else if (
            /<[^>]+style\s*=\s*"[^"]*(?:margin|padding)-left/i.test(html)
        ) {
            // Google Docs / Word: <p> or <div> with margin-left/padding-left
            $container.find('p, div, li').each(function () {
                var style = this.getAttribute('style') || '';
                var match = style.match(
                    /(?:margin|padding)-left:\s*([\d.]+)\s*(pt|px|em|in)/
                );
                var indent = 0;
                if (match) {
                    var val = parseFloat(match[1]);
                    var unit = match[2];
                    var px =
                        unit === 'pt'
                            ? (val * 4) / 3
                            : unit === 'em'
                              ? val * 16
                              : unit === 'in'
                                ? val * 96
                                : val;
                    indent = Math.round(px / 48);
                }
                var content = cleanHtml($(this).html());
                if (content && content.trim()) {
                    lineElements.push({ html: content.trim(), indent: indent });
                }
            });
        } else {
            // No lists - use string-based extraction to preserve tab indentation
            // First, insert newlines before block opening tags to ensure proper splitting
            // Preserve leading whitespace (tabs) with block tags for hierarchy detection
            var normalizedHtml = html.replace(
                /([\t ]*)(<(?:div|p|blockquote|pre|section|article|header|footer|h[1-6]|tr|td|th|dt|dd)[\s>])/gi,
                '\n$1$2'
            );

            // Split by newlines
            var lines = normalizedHtml.split(/\n/);

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (!line) continue;

                // Count leading tabs (preserved from raw clipboard)
                var tabMatch = line.match(/^(\t*)/);
                var indent = tabMatch ? tabMatch[1].length : 0;

                // Remove block tags but keep content
                var content = line
                    .replace(/^\t*/, '')
                    .replace(
                        /<\/?(?:div|p|li|blockquote|pre|section|article|header|footer|h[1-6]|tr|td|th|dt|dd|ul|ol)[^>]*>/gi,
                        ''
                    );

                // Clean the HTML
                content = cleanHtml(content);

                // Preserve empty items as intentional empty nodes
                lineElements.push({
                    html: content && content.trim() ? content.trim() : '',
                    indent: indent
                });
                hasBlocks = true;
            }

            // If string parsing didn't find blocks, try DOM walking
            if (!hasBlocks) {
                var walkDOM = function ($el, depth) {
                    $el.contents().each(function () {
                        var $this = $(this);
                        var nodeName = this.nodeName.toLowerCase();

                        if (this.nodeType === 3) {
                            var text = this.textContent.trim();
                            if (text) {
                                lineElements.push({
                                    html: text,
                                    indent: depth
                                });
                            }
                        } else if (this.nodeType === 1) {
                            var isBlock =
                                [
                                    'div',
                                    'p',
                                    'blockquote',
                                    'pre',
                                    'section',
                                    'article',
                                    'header',
                                    'footer',
                                    'tr',
                                    'td',
                                    'th',
                                    'dt',
                                    'dd',
                                    'h1',
                                    'h2',
                                    'h3',
                                    'h4',
                                    'h5',
                                    'h6'
                                ].indexOf(nodeName) >= 0;

                            if (isBlock) {
                                var $clone = $this.clone();
                                $clone
                                    .find('div, p, ul, ol, li, blockquote, pre')
                                    .remove();
                                var content = cleanHtml($clone.html());
                                if (content && content.trim()) {
                                    lineElements.push({
                                        html: content.trim(),
                                        indent: depth
                                    });
                                }
                                walkDOM($this, depth);
                            } else if (formattingTags.indexOf(nodeName) >= 0) {
                                lineElements.push({
                                    html: this.outerHTML,
                                    indent: depth
                                });
                            } else {
                                walkDOM($this, depth);
                            }
                        }
                    });
                };
                walkDOM($container, 0);
            }
        }

        // If nothing extracted, try whole content as single item
        if (lineElements.length === 0) {
            var content = cleanHtml(html);
            if (content && content.trim()) {
                lineElements.push({ html: content.trim(), indent: 0 });
            }
        }

        // Normalize indent offset: if content starts at non-zero indent,
        // shift all items so the first starts at 0.
        if (lineElements.length > 1 && lineElements[0].indent > 0) {
            var offset = lineElements[0].indent;
            for (var i = 0; i < lineElements.length; i++) {
                lineElements[i].indent -= offset;
            }
        }

        // Build nodes from extracted lines
        for (var i = 0; i < lineElements.length; i++) {
            var lineData = lineElements[i];
            var lineHtml = lineData.html;
            var level = lineData.indent;

            var node = concordInstance.editor.makeNode();

            // Use ConcordTextModel.fromHTML to parse and preserve formatting
            var model = lineHtml
                ? ConcordTextModel.fromHTML(lineHtml)
                : new ConcordTextModel('');
            node.data('textModel', model);
            node.children('.concord-wrapper')
                .children('.concord-text')
                .html(model.toHTML());

            // Handle hierarchy based on indent level
            if (level > lastLevel && lastNode) {
                parents[lastLevel] = lastNode;
                parent = lastNode;
            } else if (level < lastLevel && level > 0) {
                parent = parents[level - 1] || null;
            } else if (level === 0) {
                parent = null;
                parents = {};
            }

            if (parent && level > 0) {
                parent.children('ol').append(node);
                parent.addClass('collapsed');
            } else {
                nodes.append(node);
            }

            lastNode = node;
            lastLevel = level;
        }

        // Insert the nodes
        if (nodes.children().length > 0) {
            this.saveState();
            this.setTextMode(false);
            var cursor = this.getCursor();

            if (cursor.text() === '') {
                nodes.children().insertBefore(cursor);
                this.setCursor(cursor.prev());
            } else {
                nodes.children().insertAfter(cursor);
                this.setCursor(cursor.next());
            }
            this.setTextMode(true);

            concordInstance.root.removeData('clipboard');
            this.markChanged();
            concordInstance.editor.recalculateLevels();
        }
    };

    this.insertText = function (text) {
        var nodes = $('<ol></ol>');
        var lastLevel = 0;
        var startingline = 0;
        var startinglevel = 0;
        var lastNode = null;
        var parent = null;
        var parents = {};
        var lines = text.split('\n');
        var isBulletedText = true;
        var bulletParent = null;
        var firstlinewithcontent = 0;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!line.match(/^\s*$/)) {
                firstlinewithcontent = i;
                break;
            }
        }
        if (lines.length > firstlinewithcontent + 2) {
            if (
                lines[firstlinewithcontent].match(/^([\t\s]*)\-.*$/) == null &&
                lines[firstlinewithcontent].match(/^.+$/) &&
                lines[firstlinewithcontent + 1] == ''
            ) {
                startingline = firstlinewithcontent + 2;
                var bulletParent = concordInstance.editor.makeNode();
                bulletParent
                    .children('.concord-wrapper')
                    .children('.concord-text')
                    .html(lines[firstlinewithcontent]);
            }
        }
        for (var i = startingline; i < lines.length; i++) {
            var line = lines[i];
            if (
                line != '' &&
                !line.match(/^\s+$/) &&
                line.match(/^([\t\s]*)\-.*$/) == null
            ) {
                isBulletedText = false;
                break;
            }
        }
        if (!isBulletedText) {
            startingline = 0;
            bulletParent = null;
        }
        for (var i = startingline; i < lines.length; i++) {
            var line = lines[i];
            if (line != '' && !line.match(/^\s+$/)) {
                var matches = line.match(/^([\t\s]*)(.+)$/);
                var node = concordInstance.editor.makeNode();
                var nodeText = concordInstance.editor.escape(matches[2]);
                if (isBulletedText) {
                    var nodeTextMatches =
                        nodeText.match(/^([\t\s]*)\-\s*(.+)$/);
                    if (nodeTextMatches !== null) {
                        nodeText = nodeTextMatches[2];
                    }
                }
                node.children('.concord-wrapper')
                    .children('.concord-text')
                    .html(nodeText);
                var level = startinglevel;
                if (matches[1]) {
                    if (isBulletedText) {
                        level = matches[1].length / 2 + startinglevel;
                    } else {
                        level = matches[1].length + startinglevel;
                    }
                    if (level > lastLevel) {
                        parents[lastLevel] = lastNode;
                        parent = lastNode;
                    } else if (level > 0 && level < lastLevel) {
                        parent = parents[level - 1];
                    }
                }
                if (parent && level > 0) {
                    parent.children('ol').append(node);
                    parent.addClass('collapsed');
                } else {
                    parents = {};
                    nodes.append(node);
                }
                lastNode = node;
                lastLevel = level;
            }
        }
        if (bulletParent) {
            if (nodes.children().length > 0) {
                bulletParent.addClass('collapsed');
            }
            var clonedNodes = nodes.clone();
            clonedNodes.children().appendTo(bulletParent.children('ol'));
            nodes = $('<ol></ol>');
            nodes.append(bulletParent);
        }
        if (nodes.children().length > 0) {
            this.saveState();
            this.setTextMode(false);
            var cursor = this.getCursor();

            if (cursor.text() === '') {
                nodes.children().insertBefore(cursor);
                this.setCursor(cursor.prev());
            } else {
                nodes.children().insertAfter(cursor);
                this.setCursor(cursor.next());
            }
            this.setTextMode(true);

            concordInstance.root.removeData('clipboard');
            this.markChanged();
            concordInstance.editor.recalculateLevels();
        }
    };
    this.insertXml = function (opmltext, dir) {
        this.saveState();
        var doc = null;
        var nodes = $('<ol></ol>');
        var cursor = this.getCursor();
        var level = cursor.parents('.concord-node').length + 1;
        if (!dir) {
            dir = down;
        }
        switch (dir) {
            case right:
                level += 1;
                break;
            case left:
                level -= 1;
                break;
        }
        if (typeof opmltext == 'string') {
            doc = $($.parseXML(opmltext));
        } else {
            doc = $(opmltext);
        }
        doc.find('body')
            .children('outline')
            .each(function () {
                nodes.append(
                    concordInstance.editor.build($(this), true, level)
                );
            });
        var expansionState = doc.find('expansionState');
        if (
            expansionState &&
            expansionState.text() &&
            expansionState.text() != ''
        ) {
            var expansionStates = expansionState.text().split(',');
            var nodeId = 1;
            nodes.find('.concord-node').each(function () {
                if (expansionStates.indexOf('' + nodeId) >= 0) {
                    $(this).removeClass('collapsed');
                }
                nodeId++;
            });
        }
        switch (dir) {
            case down:
                nodes.children().insertAfter(cursor);
                break;
            case right:
                nodes.children().prependTo(cursor.children('ol'));
                this.expand(false);
                break;
            case up:
                nodes.children().insertBefore(cursor);
                break;
            case left:
                var parent = cursor.parents('.concord-node:first');
                if (parent.length == 1) {
                    nodes.children().insertAfter(parent);
                }
                break;
        }
        this.markChanged();
        return true;
    };
    this.inTextMode = function () {
        return root.hasClass('textMode');
    };
    this.level = function () {
        return this.getCursor().parents('.concord-node').length + 1;
    };
    this.link = function (url) {
        if (this.inTextMode()) {
            if (!concord.handleEvents) {
                var instance = this;
                concord.onResume(function () {
                    instance.link(url);
                });
                return;
            }

            const node = this.getCursor();
            const textElement = node
                .children('.concord-wrapper:first')
                .children('.concord-text:first')[0];

            if (!textElement) return;

            // Get selection range in plain text coordinates
            const selRange = ConcordUtil.getSelectionRange(textElement);
            if (!selRange || selRange.start === selRange.end) {
                // No selection - nothing to link
                return;
            }

            this.saveState();

            // Get current model and add the link mark
            const model = this.getTextModel(node);
            const newModel = model.addMark(
                selRange.start,
                selRange.end,
                'link',
                { href: url }
            );

            // Invalidate cache and set the new model
            this.invalidateTextModel(node);
            this.setTextModel(newModel, node);

            // Restore selection
            ConcordUtil.setSelectionRange(
                textElement,
                selRange.start,
                selRange.end
            );

            this.markChanged();
        }
    };
    this.markChanged = function () {
        root.data('changed', true);
        if (!this.inTextMode()) {
            root.find('.concord-node.dirty').removeClass('dirty');
        }
        return true;
    };
    this.paste = function () {
        if (!this.inTextMode()) {
            if (root.data('clipboard') !== null) {
                var pasteNodes = root.data('clipboard').clone(true, true);
                if (pasteNodes.length > 0) {
                    this.saveState();
                    root.find('.selected').removeClass('selected');
                    pasteNodes.insertAfter(this.getCursor());
                    this.setCursor($(pasteNodes[0]), pasteNodes.length > 1);
                    this.markChanged();
                }
            }
        }
    };
    this.promote = function () {
        var node = this.getCursor();
        if (node.children('ol').children().length > 0) {
            this.saveState();
            node.children('ol')
                .children()
                .reverse()
                .each(function () {
                    var child = $(this).clone(true, true);
                    $(this).remove();
                    node.after(child);
                });
            concordInstance.editor.recalculateLevels(
                node.parent().find('.concord-node')
            );
            this.markChanged();
        }
    };
    this.redraw = function () {
        var ct = 1;
        var cursorIndex = 1;
        var wasChanged = this.changed();
        root.find('.concord-node:visible').each(function () {
            if ($(this).hasClass('concord-cursor')) {
                cursorIndex = ct;
                return false;
            }
            ct++;
        });
        this.xmlToOutline(this.outlineToXml());
        ct = 1;
        var thisOp = this;
        root.find('.concord-node:visible').each(function () {
            if (cursorIndex == ct) {
                thisOp.setCursor($(this));
                return false;
            }
            ct++;
        });
        if (wasChanged) {
            this.markChanged();
        }
    };
    this.reorg = function (direction, count) {
        if (count === undefined) {
            count = 1;
        }
        var ableToMoveInDirection = false;
        var cursor = this.getCursor();
        var range = undefined;
        var toMove = this.getCursor();
        var selected = root.find('.selected');
        var iteration = 1;
        if (selected.length > 1) {
            cursor = root.find('.selected:first');
            toMove = root.find('.selected');
        }
        switch (direction) {
            case up:
                var prev = cursor.prev();
                if (prev.length == 1) {
                    while (iteration < count) {
                        if (prev.prev().length == 1) {
                            prev = prev.prev();
                        } else {
                            break;
                        }
                        iteration++;
                    }
                    this.saveState();
                    var clonedMove = toMove.clone(true, true);
                    toMove.remove();
                    clonedMove.insertBefore(prev);
                    ableToMoveInDirection = true;
                } else {
                    //Check if first
                    if (concordInstance.op.reorg(left)) {
                        concordInstance.op.reorg(up);
                        concordInstance.op.reorg(right);
                    }
                }
                break;
            case down:
                if (!this.inTextMode()) {
                    cursor = root.find('.selected:last');
                }
                var next = cursor.next();
                if (next.length == 1) {
                    while (iteration < count) {
                        if (next.next().length == 1) {
                            next = next.next();
                        } else {
                            break;
                        }
                        iteration++;
                    }
                    this.saveState();
                    var clonedMove = toMove.clone(true, true);
                    toMove.remove();
                    clonedMove.insertAfter(next);
                    ableToMoveInDirection = true;
                } else {
                    if (concordInstance.op.reorg(left)) {
                        concordInstance.op.reorg(down);
                        concordInstance.op.reorg(right);
                    }
                }
                break;
            case left:
                var outline = cursor.parent();
                if (!outline.hasClass('concord-root')) {
                    var parent = outline.parent();
                    while (iteration < count) {
                        var parentParent = parent.parents(
                            '.concord-node:first'
                        );
                        if (parentParent.length == 1) {
                            parent = parentParent;
                        } else {
                            break;
                        }
                        iteration++;
                    }
                    this.saveState();
                    var clonedMove = toMove.clone(true, true);
                    toMove.remove();
                    clonedMove.insertAfter(parent);
                    concordInstance.editor.recalculateLevels(
                        parent.nextAll('.concord-node')
                    );
                    ableToMoveInDirection = true;
                }
                break;
            case right:
                var prev = cursor.prev();
                if (prev.length == 1) {
                    this.saveState();
                    while (iteration < count) {
                        if (prev.children('ol').length == 1) {
                            var prevNode = prev
                                .children('ol')
                                .children('.concord-node:last');
                            if (prevNode.length == 1) {
                                prev = prevNode;
                            } else {
                                break;
                            }
                        } else {
                            break;
                        }
                        iteration++;
                    }
                    var prevOutline = prev.children('ol');
                    if (prevOutline.length == 0) {
                        prevOutline = $('<ol></ol>');
                        prevOutline.appendTo(prev);
                    }
                    var clonedMove = toMove.clone(true, true);
                    toMove.remove();
                    clonedMove.appendTo(prevOutline);
                    prev.removeClass('collapsed');
                    concordInstance.editor.recalculateLevels(
                        prev.find('.concord-node')
                    );
                    ableToMoveInDirection = true;
                }
                break;
        }
        if (ableToMoveInDirection) {
            if (this.inTextMode()) {
                this.setCursor(this.getCursor());
            }
            this.markChanged();
        }
        return ableToMoveInDirection;
    };
    this.runSelection = function () {
        var value = eval(this.getLineText());
        this.deleteSubs();
        this.insert(value, 'right');
        concordInstance.script.makeComment();
        this.go('left', 1);
    };
    this.saveState = function () {
        root.data('change', root.children().clone(true, true));
        root.data('changeTextMode', this.inTextMode());
        if (this.inTextMode()) {
            var range = concordInstance.editor.getSelection();
            if (range) {
                root.data('changeRange', range.cloneRange());
            } else {
                root.data('changeRange', undefined);
            }
        } else {
            root.data('changeRange', undefined);
        }
        return true;
    };
    this.setCursor = function (node, multiple, multipleRange) {
        root.find('.concord-cursor').removeClass('concord-cursor');
        node.addClass('concord-cursor');
        if (this.inTextMode()) {
            concordInstance.editor.edit(node);
        } else {
            concordInstance.editor.select(node, multiple, multipleRange);
            concordInstance.pasteBinFocus();
        }
        concordInstance.fireCallback(
            'opCursorMoved',
            this.setCursorContext(node)
        );
        concordInstance.editor.hideContextMenu();
    };
    this.navigateToPath = function (pathIndices) {
        if (!pathIndices || !pathIndices.length) return null;
        concordInstance.fireCallback('onBeforeNavigate');
        var currentNode = null;
        for (var i = 0; i < pathIndices.length; i++) {
            if (i === 0) {
                currentNode = root.children('li.concord-node').eq(pathIndices[i]);
            } else {
                if (currentNode.hasClass('collapsed')) {
                    this.setCursor(currentNode);
                    this.expand();
                }
                currentNode = currentNode.children('ol').children('li.concord-node').eq(pathIndices[i]);
            }
            if (!currentNode.length) return null;
        }
        this.setCursor(currentNode);
        this.setTextMode(false);
        return currentNode;
    };
    this.setCursorContext = function (cursor) {
        return new ConcordOp(root, concordInstance, cursor);
    };
    this.setHeaders = function (headers) {
        root.data('head', headers);
        this.markChanged();
    };
    this.setLineText = function (text, isRawHtml) {
        this.saveState();
        var node = this.getCursor();
        if (node.length == 1) {
            var html = isRawHtml ? text : concordInstance.editor.escape(text);
            node.children('.concord-wrapper:first')
                .children('.concord-text:first')
                .html(html);
            return true;
        } else {
            return false;
        }
        this.markChanged();
    };
    this.setRenderMode = function (mode) {
        root.data('renderMode', mode);
        this.redraw();
        return true;
    };
    this.setStyle = function (css) {
        root.parent().find('style.customStyle').remove();
        root.before(
            '<style type="text/css" class="customStyle">' + css + '</style>'
        );
        return true;
    };
    this.setTextMode = function (textMode, doSelect) {
        if (doSelect == null) doSelect = true;
        var readonly = concordInstance.prefs()['readonly'];
        if (readonly == undefined) {
            readonly = false;
        }
        if (readonly) {
            return;
        }
        if (root.hasClass('textMode') == textMode) {
            return;
        }
        if (textMode == true) {
            if (this.inTextMode() == false) {
                root.addClass('textMode');
                concordInstance.editor.editorMode();
                concordInstance.editor.edit(this.getCursor());
            }
            if (event) concord.bringIntoView($(event.target));
        } else {
            root.removeClass('textMode');
            root.find('.editing').removeClass('editing');
            this.blurCursor();
            if (doSelect) concordInstance.editor.select(this.getCursor());
        }
        if (concordInstance.events)
            concordInstance.events.dispatchEvent(
                concordInstance.events.textModeChangedEvent
            );
    };
    this.inTextMode = function () {
        return root.hasClass('textMode') == true;
    };
    this.setTitle = function (title) {
        root.data('title', title);
        return true;
    };
    this.strikethrough = function () {
        this.saveState();
        this.stylize('strikeThrough');
    };
    this.strikethroughLine = function () {
        // Check if multiple nodes are selected
        const selectedNodes = root.find('.selected');

        if (selectedNodes.length > 1) {
            // Multiple nodes selected - strikethrough all of them
            this.saveState();
            const self = this;
            selectedNodes.each(function () {
                const selectedNode = $(this);
                const model = self.getTextModel(selectedNode);
                if (model.length > 0) {
                    const newModel = model.toggleMark(
                        0,
                        model.length,
                        'strike'
                    );
                    self.invalidateTextModel(selectedNode);
                    self.setTextModel(newModel, selectedNode);
                }
            });
            this.markChanged();
        } else {
            // Single node
            var el = this.getCursor()
                .children('.concord-wrapper')
                .children('.concord-text')[0];
            ConcordUtil.selectElementContents(el);
            this.strikethrough();
            ConcordUtil.deselectElementContents(el);
            ConcordUtil.setCaretAtStart(el);
        }
    };
    this.isStrikethrough = function (node) {
        if (!node) node = this.getCursor();
        return $(node).contents().slice(0, 1).find('strike').length > 0;
    };
    this.subsExpanded = function (node) {
        if (!node) node = this.getCursor();
        if (node.length == 1) {
            if (
                !node.hasClass('collapsed') &&
                node.children('ol').children().length > 0
            ) {
                return true;
            } else {
                return false;
            }
        }
        return false;
    };
    this.outlineToText = function () {
        var text = '';
        root.children('.concord-node').each(function () {
            text += concordInstance.editor.textLine($(this));
        });
        return text;
    };
    this.outlineToXml = function (ownerName, ownerEmail, ownerId, title) {
        var head = this.getHeaders();
        if (ownerName) {
            head['ownerName'] = ownerName;
        }
        if (ownerEmail) {
            head['ownerEmail'] = ownerEmail;
        }
        if (ownerId) {
            head['ownerId'] = ownerId;
        }
        if (title == null || title == undefined) {
            title = this.getTitle();
            if (!title) {
                title = '';
            }
        }
        head['title'] = title;
        head['dateModified'] = new Date().toGMTString();
        var expansionStates = [];
        var nodeId = 1;
        var cursor = root.find('.concord-node:first');
        do {
            if (cursor) {
                if (
                    !cursor.hasClass('collapsed') &&
                    cursor.children('ol').children().length > 0
                ) {
                    expansionStates.push(nodeId);
                }
                nodeId++;
            } else {
                break;
            }
            var next = null;
            if (!cursor.hasClass('collapsed')) {
                var outline = cursor.children('ol');
                if (outline.length == 1) {
                    var firstChild = outline.children('.concord-node:first');
                    if (firstChild.length == 1) {
                        next = firstChild;
                    }
                }
            }
            if (!next) {
                next = this._walk_down(cursor, true);
            }
            cursor = next;
        } while (cursor !== null);
        head['expansionState'] = expansionStates.join(',');
        var opml = '';
        var indent = 0;
        var add = function (s) {
            for (var i = 0; i < indent; i++) {
                opml += '\t';
            }
            opml += s + '\n';
        };
        add('<?xml version="1.0"?>');
        add('<opml version="2.0">');
        indent++;
        add('<head>');
        indent++;
        for (var headName in head) {
            if (head[headName] !== undefined) {
                add(
                    '<' +
                        headName +
                        '>' +
                        ConcordUtil.escapeXml(head[headName]) +
                        '</' +
                        headName +
                        '>'
                );
            }
        }
        add('</head>');
        indent--;
        add('<body>');
        indent++;
        if (root.children('.concord-node').length == 0)
            opml += '<outline text=""/>';
        else
            root.children('.concord-node').each(function () {
                opml += concordInstance.editor.opmlLine($(this), indent);
            });
        add('</body>');
        indent--;
        add('</opml>');
        return opml;
    };
    this.undo = function () {
        var stateBeforeChange = root.children().clone(true, true);
        var textModeBeforeChange = this.inTextMode();
        var beforeRange = undefined;
        if (this.inTextMode()) {
            var range = concordInstance.editor.getSelection();
            if (range) {
                beforeRange = range.cloneRange();
            }
        }
        if (root.data('change')) {
            root.empty();
            root.data('change').appendTo(root);
            this.setTextMode(root.data('changeTextMode'));
            if (this.inTextMode()) {
                this.focusCursor();
                var range = root.data('changeRange');
                if (range) {
                    concordInstance.editor.restoreSelection(range);
                }
            }
            root.data('change', stateBeforeChange);
            root.data('changeTextMode', textModeBeforeChange);
            root.data('changeRange', beforeRange);
            return true;
        }
        return false;
    };
    this.visitLevel = function (cb) {
        var cursor = this.getCursor();
        var op = this;
        cursor
            .children('ol')
            .children()
            .each(function () {
                var subCursorContext = op.setCursorContext($(this));
                cb(subCursorContext);
            });
        return true;
    };
    this.visitToSummit = function (cb) {
        var cursor = this.getCursor();
        while (cb(this.setCursorContext(cursor))) {
            var parent = cursor.parents('.concord-node:first');
            if (parent.length == 1) {
                cursor = parent;
            } else {
                break;
            }
        }
        return true;
    };
    this.visitAll = function (cb) {
        var op = this;
        root.find('.concord-node').each(function () {
            var subCursorContext = op.setCursorContext($(this));
            var retVal = cb(subCursorContext);
            if (retVal !== undefined && retVal === false) {
                return false;
            }
        });
    };
    this.wipe = function () {
        if (root.find('.concord-node').length > 0) {
            this.saveState();
        }
        root.empty();
        var node = concordInstance.editor.makeNode();
        root.append(node);
        this.setTextMode(false);
        this.setCursor(node);
        this.markChanged();
    };
    this.xmlToOutline = function (xmlText, flSetFocus) {
        if (flSetFocus == undefined) {
            flSetFocus = true;
        }

        var doc = null;
        if (typeof xmlText == 'string') {
            doc = $($.parseXML(xmlText));
        } else {
            doc = $(xmlText);
        }
        root.empty();
        var title = '';
        if (doc.find('title:first').length == 1) {
            title = doc.find('title:first').text();
        }
        this.setTitle(title);
        var headers = {};
        doc.find('head')
            .children()
            .each(function () {
                headers[$(this).prop('tagName')] = $(this).text();
            });
        root.data('head', headers);
        doc.find('body')
            .children('outline')
            .each(function () {
                root.append(concordInstance.editor.build($(this), true));
            });
        root.data('changed', false);
        root.removeData('previousChange');
        var expansionState = doc.find('expansionState');
        if (
            expansionState &&
            expansionState.text() &&
            expansionState.text() != ''
        ) {
            var expansionStates = expansionState.text().split(/\s*,\s*/);
            var nodeId = 1;
            var cursor = root.find('.concord-node:first');
            do {
                if (cursor) {
                    if (expansionStates.indexOf('' + nodeId) >= 0) {
                        cursor.removeClass('collapsed');
                    }
                    nodeId++;
                } else {
                    break;
                }
                var next = null;
                if (!cursor.hasClass('collapsed')) {
                    var outline = cursor.children('ol');
                    if (outline.length == 1) {
                        var firstChild = outline.children(
                            '.concord-node:first'
                        );
                        if (firstChild.length == 1) {
                            next = firstChild;
                        }
                    }
                }
                if (!next) {
                    next = this._walk_down(cursor);
                }
                cursor = next;
            } while (cursor !== null);
        }

        this.setCursor(root.find('.concord-node:first'));

        this.setTextMode(!flSetFocus && !concord.mobile);

        root.data('currentChange', root.children().clone(true, true));
        return true;
    };
    /**
     * Build outline from cached tree format (faster than parsing OPML)
     * @param {Array} tree - Array of [text, attrs, children] nodes
     * @param {string} title - Note title
     * @param {boolean} flSetFocus - Whether to set focus after building
     * @param {number[]} expansionState - Array of node IDs that should be expanded
     */
    this.treeToOutline = function (tree, title, flSetFocus, expansionState) {
        if (flSetFocus == undefined) {
            flSetFocus = true;
        }

        root.empty();
        this.setTitle(title || '');
        root.data('head', {});

        for (var i = 0; i < tree.length; i++) {
            root.append(concordInstance.editor.buildFromTree(tree[i], true));
        }

        root.data('changed', false);
        root.removeData('previousChange');

        // Restore expansion state if provided
        if (expansionState && expansionState.length > 0) {
            var nodeId = 1;
            var cursor = root.find('.concord-node:first');
            while (cursor && cursor.length === 1) {
                if (expansionState.indexOf(nodeId) >= 0) {
                    cursor.removeClass('collapsed');
                }
                nodeId++;

                // Navigate to next node in depth-first order
                var next = null;
                if (!cursor.hasClass('collapsed')) {
                    var outline = cursor.children('ol');
                    if (outline.length == 1) {
                        var firstChild = outline.children(
                            '.concord-node:first'
                        );
                        if (firstChild.length == 1) {
                            next = firstChild;
                        }
                    }
                }
                if (!next) {
                    next = this._walk_down(cursor);
                }
                cursor = next;
            }
        }

        this.setCursor(root.find('.concord-node:first'));
        this.setTextMode(!flSetFocus && !concord.mobile);

        root.data('currentChange', root.children().clone(true, true));
        return true;
    };
    this.textToOutline = function (text, bulletChar) {
        var c = bulletChar; //currently unused
        var rows = text.split('\n');

        var parser = new DOMParser();
        var xd = parser.parseFromString('<opml><head /></opml>', 'text/xml');

        var body = xd.createElement('body');
        var root = xd.getElementsByTagName('opml');
        root[0].appendChild(body);

        var parents = {};

        $.each(rows, function (index, value) {
            var indents = rows[index].split(/[\t]/g).length - 1;
            var outline = xd.createElement('outline');
            outline.setAttribute('text', rows[index].trim());

            if (indents == 0) parents = {};

            parents['' + indents] = outline;

            if (indents == 0) {
                body.appendChild(outline);
            } else {
                var immediateParent = parents[indents - 1];
                if (immediateParent) {
                    immediateParent.appendChild(outline);
                } else {
                    console.log(
                        'Error Parsing text, skipping line: ' + rows[index]
                    );
                }
            }
        });

        return xd;
    };
    this.attributes = new ConcordOpAttributes(
        concordInstance,
        this.getCursor()
    );
}

function ConcordOpAttributes(concordInstance, cursor) {
    this._cssTextClassName = 'cssTextClass';
    this._cssTextClass = function (newValue) {
        if (newValue === undefined) {
            return;
        }
        var newCssClasses = newValue.split(/\s+/);
        var concordText = cursor
            .children('.concord-wrapper:first')
            .children('.concord-text:first');
        var currentCssClass = concordText.attr('class');
        if (currentCssClass) {
            var cssClassesArray = currentCssClass.split(/\s+/);
            for (var i in cssClassesArray) {
                var className = cssClassesArray[i];
                if (className.match(/^concord\-.+$/) == null) {
                    concordText.removeClass(className);
                }
            }
        }
        for (var j in newCssClasses) {
            var newClass = newCssClasses[j];
            concordText.addClass(newClass);
        }
    };
    this.addGroup = function (attributes) {
        if (attributes['type']) {
            cursor.attr('opml-type', attributes['type']);
        } else {
            cursor.removeAttr('opml-type');
        }
        this._cssTextClass(attributes[this._cssTextClassName]);
        var finalAttributes = this.getAll();
        var iconAttribute = 'type';
        if (attributes['icon']) {
            iconAttribute = 'icon';
        }
        for (var name in attributes) {
            finalAttributes[name] = attributes[name];
            if (name == iconAttribute) {
                var value = attributes[name];
                var wrapper = cursor.children('.concord-wrapper');
                var iconName = null;
                if (
                    name == 'type' &&
                    concordInstance.prefs() &&
                    concordInstance.prefs().typeIcons &&
                    concordInstance.prefs().typeIcons[value]
                ) {
                    iconName = concordInstance.prefs().typeIcons[value];
                } else if (name == 'icon') {
                    iconName = value;
                }
                if (iconName) {
                    var icon = ConcordUtil.getIcon(iconName);
                    wrapper.children('.node-icon:first').replaceWith(icon);
                }
            }
        }
        cursor.data('attributes', finalAttributes);
        concordInstance.op.markChanged();
        return finalAttributes;
    };
    this.setGroup = function (attributes) {
        if (attributes[this._cssTextClassName] !== undefined) {
            this._cssTextClass(attributes[this._cssTextClassName]);
        } else {
            this._cssTextClass('');
        }
        cursor.data('attributes', attributes);
        var wrapper = cursor.children('.concord-wrapper');
        $(cursor[0].attributes).each(function () {
            var matches = this.name.match(/^opml-(.+)$/);
            if (matches) {
                var name = matches[1];
                if (!attributes[name]) {
                    cursor.removeAttr(this.name);
                }
            }
        });
        var iconAttribute = 'type';
        if (attributes['icon']) {
            iconAttribute = 'icon';
        }
        if (name == 'type') {
            cursor.attr('opml-' + name, attributes[name]);
        }
        for (var name in attributes) {
            if (name == iconAttribute) {
                var value = attributes[name];
                var wrapper = cursor.children('.concord-wrapper');
                var iconName = null;
                if (
                    name == 'type' &&
                    concordInstance.prefs() &&
                    concordInstance.prefs().typeIcons &&
                    concordInstance.prefs().typeIcons[value]
                ) {
                    iconName = concordInstance.prefs().typeIcons[value];
                } else if (name == 'icon') {
                    iconName = value;
                }
                if (iconName) {
                    var icon = ConcordUtil.getIcon(iconName);
                    wrapper.children('.node-icon:first').replaceWith(icon);
                }
            }
        }
        concordInstance.op.markChanged();
        return attributes;
    };
    this.getAll = function () {
        if (cursor.data('attributes') !== undefined) {
            return cursor.data('attributes');
        }
        return {};
    };
    this.getOne = function (name) {
        return this.getAll()[name];
    };
    this.makeEmpty = function () {
        this._cssTextClass('');
        var numAttributes = 0;
        var atts = this.getAll();
        if (atts !== undefined) {
            for (var i in atts) {
                numAttributes++;
            }
        }
        cursor.removeData('attributes');
        var removedAnyAttributes = numAttributes > 0;
        var attributes = {};
        $(cursor[0].attributes).each(function () {
            var matches = this.name.match(/^opml-(.+)$/);
            if (matches) {
                cursor.removeAttr(this.name);
            }
        });
        if (removedAnyAttributes) {
            concordInstance.op.markChanged();
        }
        return removedAnyAttributes;
    };
    this.setOne = function (name, value) {
        if (name == this._cssTextClassName) {
            this._cssTextClass(value);
        }
        var atts = this.getAll();
        atts[name] = value;
        cursor.data('attributes', atts);
        if (name == 'type' || name == 'icon') {
            cursor.attr('opml-' + name, value);
            var wrapper = cursor.children('.concord-wrapper');
            var iconName = null;
            if (
                name == 'type' &&
                concordInstance.prefs() &&
                concordInstance.prefs().typeIcons &&
                concordInstance.prefs().typeIcons[value]
            ) {
                iconName = concordInstance.prefs().typeIcons[value];
            } else if (name == 'icon') {
                iconName = value;
            }
            if (iconName) {
                var icon = ConcordUtil.getIcon(iconName);
                wrapper.children('.node-icon:first').replaceWith(icon);
            }
        }
        concordInstance.op.markChanged();
        return true;
    };
    this.exists = function (name) {
        if (this.getOne(name) !== undefined) {
            return true;
        } else {
            return false;
        }
    };
    this.removeOne = function (name) {
        if (this.getAll()[name]) {
            if (name == this._cssTextClassName) {
                this._cssTextClass('');
            }
            delete this.getAll()[name];
            concordInstance.op.markChanged();
            return true;
        }
        return false;
    };
}

function ConcordScript(root, concordInstance) {
    this.isComment = function () {
        if (concordInstance.op.attributes.getOne('isComment') !== undefined) {
            return concordInstance.op.attributes.getOne('isComment') == 'true';
        }
        var parentIsAComment = false;
        concordInstance.op
            .getCursor()
            .parents('.concord-node')
            .each(function () {
                if (
                    concordInstance.op
                        .setCursorContext($(this))
                        .attributes.getOne('isComment') == 'true'
                ) {
                    parentIsAComment = true;
                    return;
                }
            });
        return parentIsAComment;
    };
    this.makeComment = function () {
        concordInstance.op.attributes.setOne('isComment', 'true');
        concordInstance.op.getCursor().addClass('concord-comment');
        return true;
    };
    this.unComment = function () {
        concordInstance.op.attributes.setOne('isComment', 'false');
        concordInstance.op.getCursor().removeClass('concord-comment');
        return true;
    };
}

function Op(opmltext) {
    var fakeDom = $('<div></div>');
    fakeDom.concord().op.xmlToOutline(opmltext);
    return fakeDom.concord().op;
}

window.currentInstance;
(function ($) {
    $.fn.concord = function (options) {
        if (typeof window.currentInstance != 'undefined')
            return window.currentInstance;
        window.currentInstance = new ConcordOutline($(this), options);
        return window.currentInstance;
    };

    function handleInput(event, which = undefined) {
        if (
            !concord.handleEvents ||
            (event.which === 229 && which === undefined)
        ) {
            return;
        }
        if (!which) which = event.which;

        if ($(event.target).is('input') || $(event.target).is('textarea')) {
            return;
        }
        var focusRoot = concord.getFocusRoot();
        if (focusRoot == null) {
            return;
        }
        var context = focusRoot;
        context.data('keydownEvent', event);
        var concordInstance = window.currentInstance;
        var readonly = concordInstance.prefs()['readonly'];
        if (readonly == undefined) {
            readonly = false;
        }
        // Readonly exceptions for arrow keys and cmd-comma
        if (readonly) {
            if (event.which >= 37 && event.which <= 40) {
                readonly = false;
            } else if ((event.metaKey || event.ctrlKey) && (event.which == 188 || event.which == 190)) {
                readonly = false;
            }
        }
        if (!readonly) {
            concordInstance.fireCallback('opKeystroke', event);
            var keyCaptured = false;
            var commandKey = event.metaKey || event.ctrlKey;
            var altKey = event.altKey;
            var shiftKey = event.shiftKey;
            if (altKey) event.preventDefault();

            let currentCursor = concordInstance.op.getCursor();
            let caretPosition = ConcordUtil.getCaret(event.target);
            let lineText = concordInstance.op.getLineText();
            if (!lineText) lineText = '';
            let isCaretAtEndOfLine = caretPosition >= lineText.trimEnd().length;

            switch (which) {
                case 8:
                    //Backspace
                    {
                        if (concordInstance.op.inTextMode() && !commandKey) {
                            if (
                                !concordInstance.op
                                    .getCursor()
                                    .hasClass('dirty')
                            ) {
                                concordInstance.op.saveState();
                                concordInstance.op
                                    .getCursor()
                                    .addClass('dirty');
                            }
                            var isParent = concordInstance.op.countSubs() > 0;
                            var sel = window.getSelection();
                            var isTextSelected =
                                sel.anchorOffset != sel.focusOffset;
                            var currentNode = concordInstance.op.getCursor();
                            var prevNode = currentNode
                                ? currentNode.prev()
                                : null;

                            if (
                                ConcordUtil.canMoveWithinContent(
                                    event.target,
                                    'up'
                                )
                            ) {
                                keyCaptured = true;
                                break;
                            }

                            //check if the current sibling is strikethrough
                            if (
                                concordInstance.op.isStrikethrough() &&
                                caretPosition == 0
                            ) {
                                if (prevNode) {
                                    if ($(prevNode).text().length > 0) break;
                                } else break;
                            }

                            //Check if the prev node is strikethrough
                            if (prevNode) {
                                if (
                                    concordInstance.op.isStrikethrough(
                                        prevNode
                                    ) &&
                                    concordInstance.op.getLineText().length != 0
                                )
                                    break;
                            }

                            /*
                            Backspacing on 
                            - first position 
                            - not a parent
                            - no text selection
                            - is a child and has no siblings
                            deletes the current row
                            */
                            if (
                                caretPosition == 0 &&
                                !isParent &&
                                !isTextSelected
                            ) {
                                //Save text (do not move)
                                let text = concordInstance.op.getLineText(
                                    null,
                                    true
                                );

                                if (text === '<br>') text = '';

                                //Check if the previous sibling is a parent and has subs expanded
                                if (
                                    prevNode &&
                                    concordInstance.op.countSubs(prevNode) >
                                        0 &&
                                    concordInstance.op.subsExpanded(prevNode)
                                )
                                    break;

                                //Check if is first child and has siblings
                                if (
                                    prevNode &&
                                    prevNode.length == 0 &&
                                    currentNode.parent() &&
                                    concordInstance.op._walk_down(currentNode)
                                )
                                    break;

                                //Delete row
                                keyCaptured = true;
                                event.preventDefault();
                                concordInstance.op.deleteLine();

                                /* Future: 
                                   - Allow deleting if empty row + move to 'last opened child'
                                   - Recursive: If concordInstance.op.subsExpanded() move to last child
                                */

                                //Append text to previous (now focused) row and set caret
                                var newCaretPosition =
                                    concordInstance.op.getLineText().length;
                                concordInstance.op.setLineText(
                                    ConcordUtil.consolidateTags(
                                        concordInstance.op.getLineText(
                                            null,
                                            true
                                        ),
                                        text
                                    ),
                                    true // isRawHtml - consolidateTags returns HTML
                                );
                                ConcordUtil.setCaret2(
                                    ConcordUtil.getTextNode(concordInstance.op),
                                    newCaretPosition
                                );
                            }
                            /*
                            if caret in 1st position, is parent, and prev node not parent and same indent
                            then delete prev node, merge text with current node and set caret
                            */
                            if (
                                cursor &&
                                isParent &&
                                caretPosition == 0 &&
                                !isTextSelected
                            ) {
                                if (prevNode) {
                                    if (
                                        concordInstance.op.countSubs(
                                            prevNode
                                        ) == 0
                                    ) {
                                        var prevNodeText =
                                            concordInstance.op.getLineText(
                                                prevNode
                                            );
                                        if (
                                            prevNodeText == undefined ||
                                            prevNodeText == null
                                        )
                                            break;
                                        var sel = window.getSelection();

                                        concordInstance.op.setLineText(
                                            prevNodeText +
                                                concordInstance.op.getLineText()
                                        );

                                        concordInstance.op.setCursor(prevNode);
                                        concordInstance.op.deleteLine();

                                        concordInstance.op.setCursor(cursor);
                                        ConcordUtil.setCaret(
                                            ConcordUtil.getTextNode(
                                                concordInstance.op
                                            ),
                                            prevNodeText.length
                                        );
                                        event.preventDefault();
                                    }
                                }
                            }
                        } else {
                            if (shiftKey) {
                                keyCaptured = true;
                                event.preventDefault();
                                concordInstance.op.deleteLine();
                            }
                        }
                    }
                    break;
                case 9:
                    // Tab
                    keyCaptured = true;
                    event.preventDefault();
                    event.stopPropagation();
                    if (event.shiftKey) {
                        concordInstance.op.reorg(left);
                    } else {
                        concordInstance.op.reorg(right);
                    }
                    break;
                case 65:
                    //CMD+A
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        var cursor = concordInstance.op.getCursor();
                        if (concordInstance.op.inTextMode()) {
                            concordInstance.op.focusCursor();
                            document.execCommand('selectAll', false, null);
                        } else {
                            concordInstance.editor.selectionMode();
                            cursor.parent().children().addClass('selected');
                        }
                    }
                    break;
                case 85:
                    //CMD+U
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.underline(up);
                    }
                    break;
                case 76:
                    //CMD+L
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.reorg(left);
                    }
                    break;
                case 82:
                    //CMD+R
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.reorg(right);
                    }
                    break;
                case 219:
                    //CMD+[
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.promote();
                    }
                    break;
                case 221:
                    //CMD+]
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.demote();
                    }
                    break;
                case 229: {
                    // The cursed Android Chromium Key Code issue https://bugs.chromium.org/p/chromium/issues/detail?id=118639 Since 2013
                    keyCaptured = true;
                    break;
                }
                case 13: // Enter
                    {
                        keyCaptured = true;
                        if (
                            event.originalEvent &&
                            event.originalEvent.location &&
                            event.originalEvent.location != 0
                        ) {
                            event.preventDefault();
                            concordInstance.op.setTextMode(
                                !concordInstance.op.inTextMode()
                            );
                        } else {
                            if (shiftKey) {
                                event.preventDefault();
                                break; //To enable shift+return, do not preventDefault
                            }

                            //CMD+ENTER
                            //STRIKE NOTE
                            if (commandKey) {
                                concordInstance.op.strikethroughLine();
                                event.preventDefault();
                                keyCaptured = true;
                                break;
                            }

                            event.preventDefault();

                            var direction = down;

                            /*
                            if caret in 1st position - move current node + children to next, focus on new (above)				
                            if caret in middle position - move current node + children to next, focus on current (below)
                            if caret in end position - do not move current node, focus on new (below)
                            */

                            // Use ConcordTextModel for reliable text splitting
                            // This fixes the bug where Enter key would break HTML tags
                            // e.g., <strike>strike</strike> -> <strik\ne>strike</strike>

                            const model =
                                concordInstance.op.getTextModel(currentCursor);
                            var isActionAllowed = true;
                            var isStrike = concordInstance.op.isStrikethrough();

                            // Split the model at the caret position
                            // beforeModel = text before caret
                            // afterModel = text after caret
                            const [beforeModel, afterModel] =
                                model.splitAt(caretPosition);

                            // Original logic: when Enter is pressed in middle of line,
                            // text AFTER caret stays on current line (becomes "bottom")
                            // text BEFORE caret is inserted ABOVE (becomes "top")
                            let bottomLineText = afterModel.toHTML();
                            let topLineText = beforeModel.toHTML();

                            if (isCaretAtEndOfLine) {
                                // Caret at end: insert empty line below/right
                                // bottomLineText is empty (from afterModel), topLineText has full text
                                // But we want full text to stay, empty line below
                                // So swap them for this case
                                bottomLineText = topLineText; // full text stays on current
                                topLineText = ''; // empty line inserted below
                                caretPosition = 0;

                                direction = concordInstance.op.subsExpanded()
                                    ? right
                                    : down;
                            } else {
                                // Caret in middle: split the text
                                // bottomLineText = text after caret (stays on current line)
                                // topLineText = text before caret (goes to new line above)
                                direction = up;
                                isActionAllowed =
                                    !isStrike || caretPosition == 0;
                            }

                            if (isActionAllowed) {
                                // Invalidate cached model since we're changing the text
                                concordInstance.op.invalidateTextModel(
                                    currentCursor
                                );

                                // Set current line to bottomLineText (text after caret, or full text at end)
                                // Use isRawHtml=true because toHTML() already produces properly escaped HTML
                                concordInstance.op.setLineText(
                                    bottomLineText,
                                    true
                                );

                                // Insert topLineText (text before caret, or empty at end) in direction
                                var node = concordInstance.op.insert(
                                    topLineText,
                                    direction,
                                    undefined,
                                    true // isRawHtml
                                );

                                if (
                                    caretPosition != 0 &&
                                    caretPosition != lineText.length
                                )
                                    concordInstance.op.setCursor(currentCursor);

                                concordInstance.op.setTextMode(true);
                                concordInstance.op.focusCursor();
                            }
                        }
                    }
                    break;
                case 37:
                    // left
                    var active = false;
                    if ($(event.target).hasClass('concord-text')) {
                        if (event.target.selectionStart > 0) {
                            active = false;
                        }
                    }
                    if (context.find('.concord-cursor.selected').length == 1) {
                        active = true;
                    }
                    if (active) {
                        keyCaptured = true;
                        event.preventDefault();
                        var cursor = concordInstance.op.getCursor();
                        var prev = concordInstance.op._walk_up(cursor);
                        if (prev) {
                            concordInstance.op.setCursor(prev);
                        }
                    }
                    break;
                case 38:
                    // SHIFT+ALT+UP
                    if (shiftKey && altKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.reorg(up);
                        break;
                    }

                    //ALT+UP
                    if (altKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        if (concordInstance.op.subsExpanded())
                            concordInstance.op.collapse();
                        break;
                    }

                    //SHIFT+UP
                    if (shiftKey && !altKey) {
                        if (caretPosition === 0 || isCaretAtEndOfLine) {
                            keyCaptured = true;
                            event.preventDefault();
                            ConcordUtil.selectMultipleNodes(
                                'up',
                                concordInstance.op
                            );
                        }
                        break;
                    }

                    //CTRL+UP
                    if (commandKey && !altKey) {
                        if (ConcordUtil.getCaret(event.target) != 0) {
                            keyCaptured = true;
                            event.preventDefault();
                            ConcordUtil.setCaret(event.target, 0);
                            break;
                        }
                    }

                    if (
                        ConcordUtil.canMoveWithinContent(event.target, 'up') &&
                        concordInstance.op.inTextMode()
                    )
                        break;

                    // up
                    keyCaptured = true;
                    event.preventDefault();
                    if (concordInstance.op.inTextMode()) {
                        var cursor = concordInstance.op.getCursor();
                        var prev = concordInstance.op._walk_up(cursor);
                        if (prev) {
                            concordInstance.op.setCursor(prev);
                        }
                    } else {
                        concordInstance.op.go(up, 1, event.shiftKey, true);
                    }
                    break;
                case 39:
                    // right
                    var active = false;
                    if (context.find('.concord-cursor.selected').length == 1) {
                        active = true;
                    }
                    if (active) {
                        keyCaptured = true;
                        event.preventDefault();
                        var next = null;
                        var cursor = concordInstance.op.getCursor();
                        if (!cursor.hasClass('collapsed')) {
                            var outline = cursor.children('ol');
                            if (outline.length == 1) {
                                var firstChild = outline.children(
                                    '.concord-node:first'
                                );
                                if (firstChild.length == 1) {
                                    next = firstChild;
                                }
                            }
                        }
                        if (!next) {
                            next = concordInstance.op._walk_down(cursor);
                        }
                        if (next) {
                            concordInstance.op.setCursor(next);
                        }
                    }
                    break;
                case 40:
                    // SHIFT+ALT+DOWN
                    if (shiftKey && altKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.reorg(down);
                        break;
                    }

                    //ALT+DOWN
                    if (altKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.expandAllLevels();
                        break;
                    }

                    //SHIFT+DOWN
                    if (shiftKey && !altKey) {
                        if (caretPosition === 0 || isCaretAtEndOfLine) {
                            keyCaptured = true;
                            event.preventDefault();
                            ConcordUtil.selectMultipleNodes(
                                'down',
                                concordInstance.op
                            );
                        }
                        break;
                    }

                    //CTRL+DOWN
                    if (commandKey && !altKey) {
                        var len = concordInstance.op.getLineText().length;
                        if (ConcordUtil.getCaret(event.target) != len) {
                            keyCaptured = true;
                            event.preventDefault();
                            ConcordUtil.setCaret(event.target, len);
                            break;
                        }
                    }

                    // down
                    if (
                        ConcordUtil.canMoveWithinContent(
                            event.target,
                            'down'
                        ) &&
                        concordInstance.op.inTextMode()
                    )
                        break;

                    keyCaptured = true;
                    event.preventDefault();
                    if (concordInstance.op.inTextMode()) {
                        var next = null;
                        var cursor = concordInstance.op.getCursor();
                        if (!cursor.hasClass('collapsed')) {
                            var outline = cursor.children('ol');
                            if (outline.length == 1) {
                                var firstChild = outline.children(
                                    '.concord-node:first'
                                );
                                if (firstChild.length == 1) {
                                    next = firstChild;
                                }
                            }
                        }
                        if (!next) {
                            next = concordInstance.op._walk_down(cursor);
                        }
                        if (next) {
                            concordInstance.op.setCursor(next);
                        }
                    } else {
                        concordInstance.op.go(down, 1, event.shiftKey, true);
                    }
                    break;
                case 46:
                    // delete
                    if (concordInstance.op.inTextMode()) {
                        if (!concordInstance.op.getCursor().hasClass('dirty')) {
                            concordInstance.op.saveState();
                            concordInstance.op.getCursor().addClass('dirty');
                        }
                    } else {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.deleteLine();
                    }
                    break;
                case 49:
                    //ALT+1 and ALT+SHIFT+1
                    if (altKey && shiftKey) concordInstance.op.fullExpand();
                    else if (altKey) concordInstance.op.fullCollapse();
                    keyCaptured = true;
                    break;
                case 90:
                    //CMD+Z
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.undo();
                    }
                    break;
                case 88:
                    //CMD+X
                    if (commandKey) {
                        if (concordInstance.op.inTextMode()) {
                            if (concordInstance.op.getLineText() == '') {
                                keyCaptured = true;
                                event.preventDefault();
                                concordInstance.op.deleteLine();
                            } else {
                                concordInstance.op.saveState();
                            }
                        }
                    }
                    break;
                case 67:
                    //CMD+C
                    if (commandKey && !concordInstance.op.inTextMode()) {
                        concordInstance.pasteBinFocus();
                    }
                    break;
                case 86:
                    //CMD+V
                    break;
                case 220:
                    // CMD+Backslash
                    if (commandKey) {
                        if (concordInstance.script.isComment()) {
                            concordInstance.script.unComment();
                        } else {
                            concordInstance.script.makeComment();
                        }
                    }
                    break;
                case 73:
                    //CMD+I
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.italic();
                    }
                    break;
                case 66:
                    //CMD+B
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.bold();
                    }
                    break;
                case 192:
                    //CMD+`
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.setRenderMode(
                            !concordInstance.op.getRenderMode()
                        );
                    }
                    break;
                case 32:
                    //CMD+space
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        if (concordInstance.op.subsExpanded()) {
                            concordInstance.op.collapse();
                        } else {
                            concordInstance.op.expand();
                        }
                        break;
                    }

                    let text = concordInstance.op.getLineText();
                    let html = concordInstance.op.getLineText(undefined, true); // since we want to preserve other tags
                    let caret = ConcordUtil.getCaret2(event.target);
                    const lastWord = getLastWord(text, caret);

                    /** Apply URL formatting on space */
                    const detectedUrl = detectUrl(lastWord);
                    if (detectedUrl) {
                        const lineHtml = convertToHref(
                            detectedUrl.display,
                            html,
                            caret,
                            detectedUrl.href
                        );
                        concordInstance.op.invalidateTextModel();
                        concordInstance.op.setLineText(lineHtml, true);
                        ConcordUtil.setCaret2(
                            ConcordUtil.getTextNode(concordInstance.op),
                            caret
                        );
                    }

                    if (
                        false &&
                        lastWord.startsWith('**') &&
                        lastWord.endsWith('**')
                    ) {
                        /** This is a feature to allow you to type 
                         **hello there**, press space --> <b>hello there</b> 
                         It's disabled right now as it only works with the last word not a range
                         e.g. **works** **does not work**

                         execCommand is not working as expected on mobile)
                         */

                        // Select Text
                        const selection = window.getSelection();
                        const startSelection =
                            selection.anchorOffset - lastWord.length;
                        const endSelection = selection.anchorOffset;
                        ConcordUtil.selectRangeInTextNode(
                            selection.anchorNode,
                            startSelection,
                            endSelection
                        );

                        // Apply style - not stylize?
                        concordInstance.op.bold();

                        /** Strip prefix, postfix **
                         * BUG: Will replace all **!
                         */
                        // Get new styled html
                        html = concordInstance.op.getLineText(undefined, true);
                        html = html.replace(
                            lastWord,
                            lastWord.replaceAll('**', '')
                        );
                        concordInstance.op.setLineText(html, true); // isRawHtml

                        // Unselect text
                        window.getSelection().empty();

                        // Set caret
                        ConcordUtil.setCaret2(
                            ConcordUtil.getTextNode(concordInstance.op),
                            caret - 4
                        );
                    }

                    break;
                case 186:
                case 59:
                    //CMD + SEMICOLON
                    if (commandKey) {
                        let text = concordInstance.op.getLineText();
                        let date = `${ConcordUtil.getCurrentDate()} `;
                        let caret = ConcordUtil.getCaret(event.target);

                        text = text.insertAt(caret, date);
                        concordInstance.op.setLineText(text);
                        ConcordUtil.setCaret(
                            ConcordUtil.getTextNode(concordInstance.op),
                            caret + date.length
                        );
                        keyCaptured = true;
                    }
                    break;
                case 191:
                    //CMD+/
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.runSelection();
                    }
                    break;
                case 190:
                    // CMD+. → Zoom in
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.fireCallback('zoomIn', concordInstance.op.getCursor());
                    }
                    break;
                case 188:
                    // CMD+, → Zoom out
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.fireCallback('zoomOut');
                    }
                    break;
                default:
                    keyCaptured = false;
            }
            if (!keyCaptured) {
                if (
                    event.which >= 32 &&
                    (event.which < 112 || event.which > 123) &&
                    event.which < 1000 &&
                    !commandKey
                ) {
                    var node = concordInstance.op.getCursor();
                    if (concordInstance.op.inTextMode()) {
                        if (!node.hasClass('dirty')) {
                            concordInstance.op.saveState();
                        }
                        node.addClass('dirty');
                    } else {
                        concordInstance.op.setTextMode(true);
                        concordInstance.op.saveState();
                        concordInstance.editor.edit(node, true);
                        node.addClass('dirty');
                    }
                    concordInstance.op.markChanged();
                }
            }
            concord.bringIntoView($(event.target));
        }
    }

    $(document).on('keydown', handleInput);

    function handleInput_Mobile(event) {
        /** We want to move away from using event.which in HandleInput as mobile keyboards don't reliably relay a keyCode
         * Till that is done this method will relay those key presses that are required immediately
         */

        if (event && event.originalEvent.data) {
            if (event.originalEvent.data === ' ') handleInput(event, 32); // space

            // enter pressed. Enter is a textInput event if node has text, not otherwise 🤷‍♂️
            if (event.originalEvent.data.endsWith('\n')) handleInput(event, 13);
        }
    }

    if (isMobile) $(document).on('textInput', handleInput_Mobile);

    $(document).on('mouseup', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if ($('.concord-root').length == 0) {
            return;
        }
        if (
            $(event.target).is('a') ||
            $(event.target).is('input') ||
            $(event.target).is('textarea') ||
            $(event.target).parents('a:first').length == 1 ||
            $(event.target).hasClass('dropdown-menu') ||
            $(event.target).parents('.dropdown-menu:first').length > 0
        ) {
            return;
        }
        var context = $(event.target).parents('.concord-root:first');
        if (context.length == 0) {
            $('.concord-root').each(function () {
                var concordInstance = new ConcordOutline($(this).parent());
                concordInstance.editor.hideContextMenu();
                concordInstance.editor.dragModeExit();
            });
            var focusRoot = concord.getFocusRoot();
        }
    });

    $(document).on('click', concord.updateFocusRootEvent);

    $(document).on('dblclick', concord.updateFocusRootEvent);

    $(document).on('show', function (e) {
        if ($(e.target).is('.modal')) {
            if ($(e.target).attr('concord-events') != 'true') {
                concord.stopListening();
            }
        }
    });

    $(document).on('hidden', function (e) {
        if ($(e.target).is('.modal')) {
            if ($(e.target).attr('concord-events') != 'true') {
                concord.resumeListening();
            }
        }
    });

    concord.ready = true;
})(jQuery);
