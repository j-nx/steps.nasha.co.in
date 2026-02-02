/**
 * ExportUtils - Standalone export conversion functions
 * Converts outliner nodes to various text formats.
 * Not tied to Angular $scope - can be used from controller or tests.
 */

var ExportUtils = (function () {

    /**
     * Export nodes as formatted HTML list structure.
     * Preserves inline formatting (<b>, <i>, <a>, etc.).
     * @param {jQuery} nodes - jQuery set of .concord-node elements
     * @param {Object} concord - Concord instance (has .editor, .op)
     * @returns {string} HTML string
     */
    function toFormattedText(nodes, concord) {
        var html = '<ul>\n';
        nodes.each(function () {
            html += concord.editor.styledLine($(this));
        });
        html += '\n</ul>';
        return html;
    }

    /**
     * Get the plain text content of a node, stripping all HTML tags.
     * @param {jQuery} node - A .concord-node element
     * @returns {string} Plain text
     */
    function getNodeText(node) {
        var textEl = node.children('.concord-wrapper:first').children('.concord-text:first');
        if (!textEl.length || !textEl[0]) return '';
        return textEl[0].innerText || '';
    }

    /**
     * Recursively build plain text for a node and its children.
     * @param {jQuery} node - A .concord-node element
     * @param {number} indent - Current indentation level
     * @returns {string} Plain text lines
     */
    function plainTextLine(node, indent) {
        var text = '  '.repeat(indent) + '- ' + getNodeText(node) + '\n';
        node.children('ol').children('.concord-node').each(function () {
            text += plainTextLine($(this), indent + 1);
        });
        return text;
    }

    /**
     * Export nodes as plain text with indentation and hyphen bullets.
     * All HTML formatting is stripped via innerText.
     * @param {jQuery} nodes - jQuery set of .concord-node elements
     * @returns {string} Plain text string
     */
    function toPlainText(nodes) {
        var text = '';
        nodes.each(function () {
            text += plainTextLine($(this), 0);
        });
        return text.replace(/\n$/, '');
    }

    /**
     * Export nodes as OPML XML.
     * If nodes are a subset (selected), wraps them in a minimal OPML envelope.
     * If nodes represent all root nodes, delegates to full outlineToXml.
     * @param {jQuery} nodes - jQuery set of .concord-node elements
     * @param {Object} concord - Concord instance (has .editor, .op, .root)
     * @param {boolean} isSelection - true if nodes are a selection (not all)
     * @returns {string} OPML XML string
     */
    function toOpml(nodes, concord, isSelection) {
        if (!isSelection) {
            return concord.op.outlineToXml();
        }

        var title = concord.op.getTitle() || '';
        var opml = '<?xml version="1.0"?>\n';
        opml += '<opml version="2.0">\n';
        opml += '\t<head>\n';
        opml += '\t\t<title>' + ConcordUtil.escapeXml(title) + '</title>\n';
        opml += '\t</head>\n';
        opml += '\t<body>\n';
        nodes.each(function () {
            opml += concord.editor.opmlLine($(this), 2);
        });
        opml += '\t</body>\n';
        opml += '</opml>\n';
        return opml;
    }

    return {
        toFormattedText: toFormattedText,
        toPlainText: toPlainText,
        toOpml: toOpml,
        getNodeText: getNodeText
    };

})();
