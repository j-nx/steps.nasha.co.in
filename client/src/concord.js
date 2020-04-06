'use strict';
/*jslint browser:true */
// Copyright 2013, Small Picture, Inc.
$(function () {
    if ($.fn.tooltip !== undefined) {
        $('a[rel=tooltip]').tooltip({
            live: true,
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
    mobile: $.browser.mobile,
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
        var concordInstance = new ConcordOutline(root.parent());
        if (origRoot !== null && !(origRoot[0] === root[0])) {
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
        //If element is not in view scroll to it
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
                    scrollTop: element.offset().top - fromTop,
                },
                1000
            );
        }
    },
};
var concordEnvironment = {
    version: concord.version,
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
    '"': '&' + 'quot;',
};

var ie =
    typeof document.selection != 'undefined' &&
    document.selection.type != 'Control' &&
    true;
var w3 = typeof window.getSelection != 'undefined' && true;

var ConcordUtil = {
    mobile: $.browser.mobile,
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
        var caretOffset = 0;
        if (w3) {
            var range = window.getSelection().getRangeAt(0);
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
    getCaret2: function () {
        if (window.getSelection && window.getSelection().getRangeAt) {
            var range = window.getSelection().getRangeAt(0);
            var selectedObj = window.getSelection();
            var rangeCount = 0;
            var pNode = selectedObj.anchorNode.parentNode;
            while (
                pNode.localName != 'div' //has in classList "concord-text"
            )
                pNode = pNode.parentNode;
            var childNodes = pNode.childNodes;
            for (var i = 0; i < childNodes.length; i++) {
                if (childNodes[i] == selectedObj.anchorNode) {
                    break;
                }
                if (childNodes[i].outerHTML)
                    rangeCount += childNodes[i].outerHTML.length;
                else if (childNodes[i].nodeType == 3) {
                    rangeCount += childNodes[i].textContent.length;
                }
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
        //V1 - Not IE<9 (+FF?) friendly
        var sel = window.getSelection();
        var innerDivText = el.firstChild;
        sel.collapse(innerDivText, index);
        el.parentNode.focus();
    },
    getLineInfo: function (caret, element) {
        var d = $(element),
            l = parseInt(d.css('lineHeight')),
            s = Math.round(d.height() / l),
            v = {
                numberOfLines: s,
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
            width: d.width() + 'px',
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
            'December',
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
            this.pasteBin.focus();
            if (this.pasteBin[0] === document.activeElement) {
                document.execCommand('selectAll');
            }
        }
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
            cb(value);
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
                prefs.outlineFontSize = parseFloat(prefs.outlineFontSize);
                var diff = prefs.nodeLineHeight - prefs.outlineFontSize;
                nodeStyle['font-size'] = style['font-size'] =
                    prefs.outlineFontSize + 'px';
                nodeStyle['min-height'] = style['min-height'] =
                    prefs.outlineFontSize + diff + 'px';
                nodeStyle['line-height'] = style['line-height'] =
                    prefs.outlineFontSize + diff + 'px';
            }

            if (prefs.nodeLineHeight) {
                prefs.nodeLineHeight = parseFloat(prefs.nodeLineHeight);
                nodeStyle['min-height'] = prefs.nodeLineHeight + 'px';
                nodeStyle['line-height'] = prefs.nodeLineHeight + 'px';
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
                css += 'font-size:' + prefs.iconSize + 'px;';
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
            },
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
                    id: opmlId,
                },
                dataType: 'json',
                success: function (json) {
                    concordInstance.op.clearChanged();
                    if (cb) {
                        cb(json);
                    }
                },
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
            error: function () {},
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
        var icon = '<i' + ' class="node-icon icon-' + iconName + '"><' + '/i>';
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
        text.focus();
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
        var icon = '<i' + ' class="node-icon icon-' + iconName + '"><' + '/i>';
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
            if (outline.children('outline').size() > 0) {
                node.addClass('collapsed');
            }
        }
        text.appendTo(wrapper);
        wrapper.appendTo(node);
        children.appendTo(node);
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
                cursor: 'default',
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
            var h = concordInstance.pasteBin.html();
            h = h.replace(
                new RegExp(
                    '<(div|p|blockquote|pre|li|br|dd|dt|code|h\\d)[^>]*(/)?>',
                    'gi'
                ),
                '\n'
            );
            h = $('<div/>').html(h).text();
            var clipboardMatch = false;
            if (concordClipboard !== undefined) {
                var trimmedClipboardText = concordClipboard.text.replace(
                    /^[\s\r\n]+|[\s\r\n]+$/g,
                    ''
                );
                var trimmedPasteText = h.replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');
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
                var lines = h.split('\n');
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    if (line != '' && !line.match(/^\s+$/)) {
                        numberoflines++;
                    }
                }
                if (!concordInstance.op.inTextMode() || numberoflines > 1) {
                    concordInstance.op.insertText(h);
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
                    document.execCommand('insertText', null, h);
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
                'strong',
                'i',
                'em',
                'a',
                'img',
                'strike',
                'del',
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
        return h;
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
            }
            event.preventDefault();
            op.setTextMode(false);
            if (op.subsExpanded()) {
                op.collapse();
            } else {
                op.expand();
            }
        }
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

                if (isIconClicked || !concord.mobile) {
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
                    ConcordUtil.setCaret(
                        op
                            .getCursor()
                            .children('.concord-wrapper')
                            .children('.concord-text')[0],
                        caretPosition
                    );
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
    root.on('paste', '.concord-text', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs()['readonly'] == true) {
            return;
        }
        $(this).addClass('paste');
        concordInstance.editor.saveSelection();
        concordInstance.pasteBin.html('');
        concordInstance.pasteBin.focus();
        setTimeout(editor.sanitize, 10);
    });
    concordInstance.pasteBin.on('copy', function () {
        if (!concord.handleEvents) {
            return;
        }
        var copyText = '';
        root.find('.selected').each(function () {
            copyText += concordInstance.editor.textLine($(this));
        });
        if (copyText != '' && copyText != '\n') {
            concordClipboard = {
                text: copyText,
                data: root.find('.selected').clone(true, true),
            };
            concordInstance.pasteBin.html(
                '<pre>' + $('<div/>').text(copyText).html() + '</pre>'
            );
            concordInstance.pasteBin.focus();
            document.execCommand('selectAll');
        }
    });
    concordInstance.pasteBin.on('paste', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs()['readonly'] == true) {
            return;
        }
        var concordText = concordInstance.op
            .getCursor()
            .children('.concord-wrapper')
            .children('.concord-text');
        concordText.addClass('paste');
        concordInstance.pasteBin.html('');
        setTimeout(editor.sanitize, 10);
    });
    concordInstance.pasteBin.on('cut', function () {
        if (!concord.handleEvents) {
            return;
        }
        if (concordInstance.prefs()['readonly'] == true) {
            return;
        }
        var copyText = '';
        root.find('.selected').each(function () {
            copyText += concordInstance.editor.textLine($(this));
        });
        if (copyText != '' && copyText != '\n') {
            concordClipboard = {
                text: copyText,
                data: root.find('.selected').clone(true, true),
            };
            concordInstance.pasteBin.html(
                '<pre>' + $('<div/>').text(copyText).html() + '</pre>'
            );
            concordInstance.pasteBinFocus();
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
            if (target.attr('href')) {
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
    this._walk_up = function (context) {
        var prev = context.prev();
        if (prev.length == 0) {
            var parent = context.parents('.concord-node:first');
            if (parent.length == 1) {
                return parent;
            } else {
                return null;
            }
        } else {
            return this._last_child(prev);
        }
    };
    this._walk_down = function (context) {
        var next = context.next();
        if (next.length == 1) {
            return next;
        } else {
            var parent = context.parents('.concord-node:first');
            if (parent.length == 1) {
                return this._walk_down(parent);
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
        /*        this.saveState();
                if (this.inTextMode()) {
                    document.execCommand("bold");
                } else {
                    this.focusCursor();
                    document.execCommand("selectAll");
                    document.execCommand("bold");
                    document.execCommand("unselect");
                    this.blurCursor();
                    concordInstance.pasteBinFocus();
                }
                this.markChanged();*/
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
            node.addClass('collapsed');
            node.find('ol').each(function () {
                if ($(this).children().length > 0) {
                    $(this).parent().addClass('collapsed');
                }
            });
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
            return node.children('ol').children().size();
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
            node.removeClass('collapsed');
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
            .focus();
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
            .blur();
    };
    this.fullCollapse = function () {
        root.find('.concord-node').each(function () {
            if ($(this).children('ol').children().size() > 0) {
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
    this.getLineText = function (n) {
        var node = n;
        if (!node) node = this.getCursor();
        if (node.length == 1) {
            var text = node
                .children('.concord-wrapper:first')
                .children('.concord-text:first')
                .html();
            var textMatches = text.match(/^(.+)<br>\s*$/);
            if (textMatches) {
                text = textMatches[1];
            }
            return concordInstance.editor.unescape(text);
        } else {
            return null;
        }
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
                    if (parent.length == 1) {
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
                            cursor.children('ol').children().size() > 0
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
                            cursor.children('ol').children().size() > 0
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
    this.insert = function (insertText, insertDirection) {
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
        var icon = '<i' + ' class="node-icon icon-' + iconName + '"><' + '/i>';
        wrapper.append(icon);
        wrapper.addClass('type-icon');
        var text = $("<div class='concord-text' contenteditable='true'></div>");
        text.addClass('concord-level-' + level + '-text');
        var outline = $('<ol></ol>');
        text.appendTo(wrapper);
        wrapper.appendTo(node);
        outline.appendTo(node);
        if (insertText && insertText != '') {
            text.html(concordInstance.editor.escape(insertText));
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
            this.insert('<img src="' + url + '">', down);
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
        var workflowy = true;
        var workflowyParent = null;
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
                var workflowyParent = concordInstance.editor.makeNode();
                workflowyParent
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
                workflowy = false;
                break;
            }
        }
        if (!workflowy) {
            startingline = 0;
            workflowyParent = null;
        }
        for (var i = startingline; i < lines.length; i++) {
            var line = lines[i];
            if (line != '' && !line.match(/^\s+$/)) {
                var matches = line.match(/^([\t\s]*)(.+)$/);
                var node = concordInstance.editor.makeNode();
                var nodeText = concordInstance.editor.escape(matches[2]);
                if (workflowy) {
                    var nodeTextMatches = nodeText.match(
                        /^([\t\s]*)\-\s*(.+)$/
                    );
                    if (nodeTextMatches !== null) {
                        nodeText = nodeTextMatches[2];
                    }
                }
                node.children('.concord-wrapper')
                    .children('.concord-text')
                    .html(nodeText);
                var level = startinglevel;
                if (matches[1]) {
                    if (workflowy) {
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
        if (workflowyParent) {
            if (nodes.children().length > 0) {
                workflowyParent.addClass('collapsed');
            }
            var clonedNodes = nodes.clone();
            clonedNodes.children().appendTo(workflowyParent.children('ol'));
            nodes = $('<ol></ol>');
            nodes.append(workflowyParent);
        }
        if (nodes.children().length > 0) {
            this.saveState();
            this.setTextMode(false);
            var cursor = this.getCursor();
            nodes.children().insertAfter(cursor);
            this.setCursor(cursor.next());
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
    this.italic = function () {
        /*        this.saveState();
                if (this.inTextMode()) {
                    document.execCommand("italic");
                } else {
                    this.focusCursor();
                    document.execCommand("selectAll");
                    document.execCommand("italic");
                    document.execCommand("unselect");
                    this.blurCursor();
                    concordInstance.pasteBinFocus();
                }
                this.markChanged();*/
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
            var range = concordInstance.editor.getSelection();
            if (range === undefined) {
                concordInstance.editor.restoreSelection();
            }
            if (concordInstance.editor.getSelection()) {
                this.saveState();
                document.execCommand('createLink', null, url);
                this.markChanged();
            }
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
    this.setCursorContext = function (cursor) {
        return new ConcordOp(root, concordInstance, cursor);
    };
    this.setHeaders = function (headers) {
        root.data('head', headers);
        this.markChanged();
    };
    this.setLineText = function (text) {
        this.saveState();
        var node = this.getCursor();
        if (node.length == 1) {
            node.children('.concord-wrapper:first')
                .children('.concord-text:first')
                .html(concordInstance.editor.escape(text));
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
            concord.bringIntoView($(event.target));
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
        if (this.inTextMode()) {
            document.execCommand('strikeThrough');
        } else {
            this.focusCursor();
            document.execCommand('selectAll');
            document.execCommand('strikeThrough');
            document.execCommand('unselect');
            this.blurCursor();
            concordInstance.pasteBinFocus();
        }
        this.markChanged();
    };
    this.strikethroughLine = function () {
        var el = this.getCursor()
            .children('.concord-wrapper')
            .children('.concord-text')[0];
        ConcordUtil.selectElementContents(el);
        this.strikethrough();
        ConcordUtil.deselectElementContents(el);
        ConcordUtil.setCaretAtStart(el);
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
                node.children('ol').children().size() > 0
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
                    cursor.children('ol').children().size() > 0
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
                next = this._walk_down(cursor);
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
        //2/22/14 by DW -- new param, flSetFocus

        if (flSetFocus == undefined) {
            //2/22/14 by DW
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
                    var icon =
                        '<i' +
                        ' class="node-icon icon-' +
                        iconName +
                        '"><' +
                        '/i>';
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
                    var icon =
                        '<i' +
                        ' class="node-icon icon-' +
                        iconName +
                        '"><' +
                        '/i>';
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
                var icon =
                    '<i' + ' class="node-icon icon-' + iconName + '"><' + '/i>';
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
    $(document).on('keydown', function (event) {
        if (!concord.handleEvents) {
            return;
        }
        if ($(event.target).is('input') || $(event.target).is('textarea')) {
            return;
        }
        var focusRoot = concord.getFocusRoot();
        if (focusRoot == null) {
            return;
        }
        var context = focusRoot;
        context.data('keydownEvent', event);
        var concordInstance = new ConcordOutline(context.parent());
        var readonly = concordInstance.prefs()['readonly'];
        if (readonly == undefined) {
            readonly = false;
        }
        // Readonly exceptions for arrow keys and cmd-comma
        if (readonly) {
            if (event.which >= 37 && event.which <= 40) {
                readonly = false;
            } else if ((event.metaKey || event.ctrlKey) && event.which == 188) {
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
            switch (event.which) {
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
                            var caretPosition = ConcordUtil.getCaret(
                                event.target
                            );
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
                                //Save text
                                var text = concordInstance.op.getLineText();

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
                                var caretPosition = concordInstance.op.getLineText()
                                    .length;
                                concordInstance.op.setLineText(
                                    concordInstance.op.getLineText() + text
                                );
                                ConcordUtil.setCaret(
                                    concordInstance.op
                                        .getCursor()
                                        .children('.concord-wrapper')
                                        .children('.concord-text')[0],
                                    caretPosition
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
                                        var prevNodeText = concordInstance.op.getLineText(
                                            prevNode
                                        );
                                        if (
                                            prevNodeText == undefined ||
                                            prevNodeText == null
                                        )
                                            break;
                                        var currNodeText = concordInstance.op.getLineText();
                                        var sel = window.getSelection();

                                        concordInstance.op.setLineText(
                                            prevNodeText +
                                                concordInstance.op.getLineText()
                                        );

                                        concordInstance.op.setCursor(prevNode);
                                        concordInstance.op.deleteLine();

                                        concordInstance.op.setCursor(cursor);
                                        ConcordUtil.setCaret(
                                            concordInstance.op
                                                .getCursor()
                                                .children('.concord-wrapper')
                                                .children('.concord-text')[0],
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
                        concordInstance.op.reorg(up);
                    }
                    break;
                case 68:
                    //CMD+D
                    if (commandKey) {
                        keyCaptured = true;
                        event.preventDefault();
                        concordInstance.op.reorg(down);
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
                case 13:
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
                            var lineText = concordInstance.op.getLineText();
                            var currentCursor = concordInstance.op.getCursor();
                            var caretPosition = ConcordUtil.getCaret(
                                event.target
                            );

                            var isActionAllowed = true;
                            var isStrike = concordInstance.op.isStrikethrough();
                            var strikeTagLen = 17;
                            var isCaretAtEndOfLine =
                                caretPosition ==
                                lineText.length - (isStrike ? strikeTagLen : 0); //17 = length of strike tags

                            if (isCaretAtEndOfLine) {
                                if (isStrike)
                                    caretPosition =
                                        caretPosition + strikeTagLen;
                                var newLineText = lineText.substr(
                                    caretPosition,
                                    lineText.length
                                );
                                var oldLineText = lineText.substring(
                                    0,
                                    caretPosition
                                );
                                direction = concordInstance.op.subsExpanded()
                                    ? right
                                    : down;
                            } else {
                                var newLineText = lineText.substring(
                                    0,
                                    caretPosition
                                ); //1st
                                var oldLineText = lineText.substring(
                                    caretPosition,
                                    lineText.length
                                ); //2nd
                                direction = up;
                                isActionAllowed =
                                    !isStrike || caretPosition == 0;
                            }

                            if (isActionAllowed) {
                                concordInstance.op.setLineText(oldLineText);
                                var node = concordInstance.op.insert(
                                    newLineText,
                                    direction
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
                        keyCaptured = true;
                        event.preventDefault();
                        ConcordUtil.selectMultipleNodes(
                            'up',
                            concordInstance.op
                        );
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
                        keyCaptured = true;
                        event.preventDefault();
                        ConcordUtil.selectMultipleNodes(
                            'down',
                            concordInstance.op
                        );
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
                    if (false && commandKey) {
                        if (concordInstance.op.inTextMode()) {
                            if (concordInstance.op.getLineText() != '') {
                                concordInstance.root.removeData('clipboard');
                            }
                        } else {
                            keyCaptured = true;
                            event.preventDefault();
                            concordInstance.op.copy();
                        }
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
                    }
                    break;
                case 186:
                case 59:
                    //CMD + SEMICOLON
                    if (commandKey) {
                        var text = concordInstance.op.getLineText();
                        var date = ConcordUtil.getCurrentDate();
                        var caret = ConcordUtil.getCaret(event.target);

                        text = text.insertAt(caret, date);
                        concordInstance.op.setLineText(text);
                        ConcordUtil.setCaret(
                            concordInstance.op
                                .getCursor()
                                .children('.concord-wrapper')
                                .children('.concord-text')[0],
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
    });
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
