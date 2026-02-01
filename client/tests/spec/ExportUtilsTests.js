/**
 * ExportUtils Unit Tests
 */

describe('ExportUtils', function () {
    var concord, op;

    var SIMPLE_OPML = '<?xml version="1.0"?><opml version="2.0"><head><title>Test</title></head><body>' +
        '<outline text="Hello"/>' +
        '<outline text="World">' +
            '<outline text="Child"/>' +
        '</outline>' +
        '</body></opml>';

    var BOLD_OPML = '<?xml version="1.0"?><opml version="2.0"><head><title>Test</title></head><body>' +
        '<outline text="Plain and &lt;b&gt;bold&lt;/b&gt; text"/>' +
        '</body></opml>';

    var SPECIAL_CHARS_OPML = '<?xml version="1.0"?><opml version="2.0"><head><title>Test</title></head><body>' +
        '<outline text="A &amp; B &lt; C"/>' +
        '</body></opml>';

    beforeEach(function () {
        concord = $(defaultUtilsOutliner).concord();
        op = concord.op;
    });

    // ============================================================
    // FORMATTED TEXT EXPORT
    // ============================================================
    describe('toFormattedText', function () {
        it('should export single node as HTML list item', function () {
            op.xmlToOutline(SIMPLE_OPML, false);
            var nodes = concord.root.children('.concord-node').first();
            var result = ExportUtils.toFormattedText(nodes, concord);
            expect(result).toContain('<li>');
            expect(result).toContain('Hello');
        });

        it('should preserve bold formatting as <b> tags', function () {
            op.xmlToOutline(BOLD_OPML, false);
            var nodes = concord.root.children('.concord-node');
            var result = ExportUtils.toFormattedText(nodes, concord);
            expect(result).toContain('<b>');
        });

        it('should export nested children as nested <ul> lists', function () {
            op.xmlToOutline(SIMPLE_OPML, false);
            var nodes = concord.root.children('.concord-node');
            var result = ExportUtils.toFormattedText(nodes, concord);
            expect(result).toContain('<ul>');
            expect(result).toContain('Child');
        });

        it('should export multiple root nodes', function () {
            op.xmlToOutline(SIMPLE_OPML, false);
            var nodes = concord.root.children('.concord-node');
            var result = ExportUtils.toFormattedText(nodes, concord);
            expect(result).toContain('Hello');
            expect(result).toContain('World');
        });
    });

    // ============================================================
    // GET NODE TEXT (tag stripping)
    // ============================================================
    describe('getNodeText', function () {
        it('should return plain text from a node', function () {
            op.xmlToOutline(SIMPLE_OPML, false);
            var node = concord.root.children('.concord-node').first();
            expect(ExportUtils.getNodeText(node)).toBe('Hello');
        });

        it('should strip bold tags', function () {
            op.xmlToOutline(BOLD_OPML, false);
            var node = concord.root.children('.concord-node').first();
            var text = ExportUtils.getNodeText(node);
            expect(text).not.toContain('<b>');
            expect(text).toContain('bold');
        });

        it('should return empty string for empty node', function () {
            var empty = $('<li class="concord-node"><div class="concord-wrapper"><div class="concord-text"></div></div></li>');
            expect(ExportUtils.getNodeText(empty)).toBe('');
        });
    });

    // ============================================================
    // PLAIN TEXT EXPORT
    // ============================================================
    describe('toPlainText', function () {
        it('should export single node with hyphen bullet', function () {
            op.xmlToOutline(SIMPLE_OPML, false);
            var nodes = concord.root.children('.concord-node').first();
            var result = ExportUtils.toPlainText(nodes);
            expect(result).toBe('- Hello');
        });

        it('should export nested children with 2-space indentation', function () {
            op.xmlToOutline(SIMPLE_OPML, false);
            var nodes = concord.root.children('.concord-node');
            var result = ExportUtils.toPlainText(nodes);
            expect(result).toContain('  - Child');
        });

        it('should strip all HTML formatting', function () {
            op.xmlToOutline(BOLD_OPML, false);
            var nodes = concord.root.children('.concord-node');
            var result = ExportUtils.toPlainText(nodes);
            expect(result).not.toContain('<b>');
            expect(result).toContain('bold');
        });

        it('should export multiple root nodes', function () {
            op.xmlToOutline(SIMPLE_OPML, false);
            var nodes = concord.root.children('.concord-node');
            var result = ExportUtils.toPlainText(nodes);
            expect(result).toContain('- Hello');
            expect(result).toContain('- World');
        });
    });

    // ============================================================
    // OPML EXPORT
    // ============================================================
    describe('toOpml', function () {
        it('should wrap selected nodes in OPML envelope', function () {
            op.xmlToOutline(SIMPLE_OPML, false);
            var nodes = concord.root.children('.concord-node').first();
            var result = ExportUtils.toOpml(nodes, concord, true);
            expect(result).toContain('<?xml');
            expect(result).toContain('<opml');
            expect(result).toContain('<body>');
            expect(result).toContain('Hello');
        });

        it('should export nested children recursively', function () {
            op.xmlToOutline(SIMPLE_OPML, false);
            var worldNode = concord.root.children('.concord-node').eq(1);
            var result = ExportUtils.toOpml(worldNode, concord, true);
            expect(result).toContain('World');
            expect(result).toContain('Child');
        });

        it('should XML-escape special characters in text', function () {
            op.xmlToOutline(SPECIAL_CHARS_OPML, false);
            var nodes = concord.root.children('.concord-node');
            var result = ExportUtils.toOpml(nodes, concord, true);
            expect(result).toContain('&amp;');
        });

        it('should use full outlineToXml when not a selection', function () {
            op.xmlToOutline(SIMPLE_OPML, false);
            var nodes = concord.root.children('.concord-node');
            var result = ExportUtils.toOpml(nodes, concord, false);
            expect(result).toContain('<title>');
            expect(result).toContain('expansionState');
        });
    });

    // ============================================================
    // SINGLE NODE EXPORT (cursor node with children)
    // ============================================================
    describe('single node export', function () {
        it('should export a specific node and its children as formatted text', function () {
            op.xmlToOutline(SIMPLE_OPML, false);
            var worldNode = concord.root.children('.concord-node').eq(1);
            var result = ExportUtils.toFormattedText(worldNode, concord);
            expect(result).toContain('World');
            expect(result).toContain('Child');
            expect(result).not.toContain('Hello');
        });

        it('should export a specific node and its children as plain text', function () {
            op.xmlToOutline(SIMPLE_OPML, false);
            var worldNode = concord.root.children('.concord-node').eq(1);
            var result = ExportUtils.toPlainText(worldNode);
            expect(result).toContain('- World');
            expect(result).toContain('  - Child');
            expect(result).not.toContain('Hello');
        });

        it('should export a specific node and its children as OPML', function () {
            op.xmlToOutline(SIMPLE_OPML, false);
            var worldNode = concord.root.children('.concord-node').eq(1);
            var result = ExportUtils.toOpml(worldNode, concord, true);
            expect(result).toContain('World');
            expect(result).toContain('Child');
            expect(result).not.toContain('Hello');
        });
    });
});
