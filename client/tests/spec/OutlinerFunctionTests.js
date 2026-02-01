describe('Outliner Functions', function () {
    var concord, editor, op;

    beforeEach(function () {
        concord = $(defaultUtilsOutliner).concord();
        editor = concord.editor;
        op = concord.op;
    });

    it('should be able to parse a given string 1 into opml', function () {
        expect(editor.parseText(SAMPLE_1_PLAINTEXT)).toBe(SAMPLE_1_OPML);
    });

    it('should be able to export a node to plain text', function () {
        op.xmlToOutline(SAMPLE_1_OPML, false);
        console.log(editor.exportText(concord.root));
        expect(editor.exportText(concord.root)).toBe(SAMPLE_1_PLAINTEXT + '\n');
    });

    it('should trigger an event when text mode changed', function () {
        op.xmlToOutline(SAMPLE_1_OPML, false);
        var OK = false;
        var that = this;

        function test(e) {
            OK = true;
        }

        concord.events.addEventListener('textModeChanged', test);
        op.setTextMode(false);
        concord.events.removeEventListener('textModeChanged', test);

        expect(OK).toBe(true);
    });

    /*it("should be able to correctly parse an empty / default outline", function () {
	    opXmlToOutline(initialOpmltext);
	    var result = op.outlineToXml("", "").replace(/\r?\n|\r/g, '').replace(/\t/g, '');
	    //check outline with empty text is set
	});*/

    describe('Outlier Utils Functions ', function () {
        it('should consolidate duplicate tags', function () {
            /* MUST BE IN ORDER b,i,u
			e.g 
				<b>BOLD</b> + <b><i>BI</i></b> ==> <b>BOLD<i>BI</i></b>
			*/
            let ans = ConcordUtil.consolidateTags(
                '<b>BOLD</b>',
                '<b><i>BI</i></b>'
            );
            expect(ans).toBe('<b>BOLD<i>BI</i></b>');

            ans = ConcordUtil.consolidateTags(
                '<b><i>BOLD</i></b>',
                '<b><i>BI</i></b>'
            );
            expect(ans).toBe('<b><i>BOLDBI</i></b>');

            ans = ConcordUtil.consolidateTags(
                '<b><u>BU</u></b>',
                '<b><i>BI</i></b>'
            );
            expect(ans).toBe('<b><u>BU</u><i>BI</i></b>');

            ans = ConcordUtil.consolidateTags(
                '<b><u>BU</u></b>',
                '<b><u>BU</u></b>'
            );
            expect(ans).toBe('<b><u>BUBU</u></b>');
        });

        it('should split nodes correctly', function () {
            let [a, b] = sliceHtmlText('Hello There', 4);
            expect(a).toBe('Hell');
            expect(b).toBe('o There');

            [a, b] = sliceHtmlText(
                '<div>Hello <strong>There</strong></div>',
                8,
                []
            );
            expect(a).toBe('<div>Hello <strong>Th</strong></div>');
            expect(b).toBe('<div><strong>ere</strong></div>');

            [a, b] = sliceHtmlText(
                '<div>He<b>l</b>lo <strong>There</strong></div>',
                4,
                []
            );
            expect(a).toBe('<div>He<b>l</b>l</div>');
            expect(b).toBe('<div>o <strong>There</strong></div>');

            [a, b] = sliceHtmlText(
                '<div>Hello <strong>There</strong></div>',
                4,
                []
            );
            expect(a).toBe('<div>Hell</div>');
            expect(b).toBe('<div>o <strong>There</strong></div>');

            [a, b] = sliceHtmlText('<b>B</b><i>I</i>', 1);
            expect(a).toBe('<b>B</b>');
            expect(b).toBe('<i>I</i>');

            [a, b] = sliceHtmlText('<b>B</b><i>I</i>', 2);
            expect(a).toBe('<b>B</b><i>I</i>');
            expect(b).toBe('');

            [a, b] = sliceHtmlText('<b>B</b><i>I</i>', 0);
            expect(a).toBe('');
            expect(b).toBe('<b>B</b><i>I</i>');

            [a, b] = sliceHtmlText('<b><i>BI</i></b>', 1);
            expect(a).toBe('<b><i>B</i></b>');
            expect(b).toBe('<b><i>I</i></b>');

            [a, b] = sliceHtmlText('<b><i>BI<u>U</u></i></b>', 2);
            expect(a).toBe('<b><i>BI</i></b>');
            expect(b).toBe('<b><i><u>U</u></i></b>');

            [a, b] = sliceHtmlText('<b><i>BILLO!!!</i></b>', 8);
            expect(a).toBe('<b><i>BILLO!!!</i></b>');
            expect(b).toBe('');

            [a, b] = sliceHtmlText(
                '<b><strike>Hello <i>There</i></strike></b>',
                11
            );
            expect(a).toBe('<b><strike>Hello <i>There</i></strike></b>');
            expect(b).toBe('');
        });

        it('should split link nodes correctly', function () {
            let [a, b] = sliceHtmlText(
                '<div>Hello <a href="URL.com">There</a></div>',
                8,
                []
            ); // at h

            expect(a).toBe('<div>Hello <a href="URL.com">Th</a></div>');
            expect(b).toBe('<div><a href="URL.com">ere</a></div>');

            // With style
            [a, b] = sliceHtmlText(
                '<div>Hello <b><a href="URL.com">There</a></b></div>',
                8,
                []
            ); // at h

            expect(a).toBe('<div>Hello <b><a href="URL.com">Th</a></b></div>');
            expect(b).toBe('<div><b><a href="URL.com">ere</a></b></div>');
        });

        it('should consolidate with link tag child', function () {
            let ans = ConcordUtil.consolidateTags(
                '<b>BOLD <a href="url.com">link</a></b>',
                '<b>BOLD FRIEND</b>'
            );

            expect(ans).toBe(
                '<b>BOLD <a href="url.com">link</a>BOLD FRIEND</b>'
            );

            ans = ConcordUtil.consolidateTags(
                '<b>BOLD <a href="url.com">link</a></b>',
                '<b><a href="url2.com">link2</a>BOLD FRIEND </b>'
            );

            expect(ans).toBe(
                '<b>BOLD <a href="url.com">link</a><a href="url2.com">link2</a>BOLD FRIEND </b>'
            );
        });

        it('should get the word from a string', function () {
            let ans = getLastWord('hello world', 5);
            expect(ans).toBe('hello');

            ans = getLastWord('hello world', 11);
            expect(ans).toBe('world');

            ans = getLastWord('b http://nasha.co.in', 20);
            expect(ans).toBe('http://nasha.co.in');
        });

        it('should convert a url word to an <a href> tag', function () {
            let word = 'http://url.com';
            let html = 'this is a long sentence with a http://url.com in it ';
            let expected =
                'this is a long sentence with a <a href="http://url.com">http://url.com</a> in it ';

            let ans = convertToHref(word, html);
            expect(ans).toBe(expected);
        });

        it('should convert a markdown b,i,u to a formatted tag', function () {});
    });

    describe('Copy-Paste', function () {
        var STYLED_OPML =
            '<opml><head/><body>' +
            '<outline text="&lt;b&gt;Bold&lt;/b&gt; text">' +
            '<outline text="Child one"/>' +
            '<outline text="&lt;i&gt;Child&lt;/i&gt; two"/>' +
            '</outline>' +
            '<outline text="Plain row"/>' +
            '</body></opml>';

        beforeEach(function () {
            op.xmlToOutline(STYLED_OPML, false);
        });

        it('should produce styled HTML from styledLine for a single row', function () {
            // Cursor is on first node after load
            var cursor = op.getCursor();
            var html = editor.styledLine(cursor);
            // Should contain <li> wrapper with bold formatting and nested children
            expect(html).toContain('<b>Bold</b> text');
            expect(html).toContain('<li>Child one</li>');
            expect(html).toContain('<i>Child</i> two');
        });

        it('should produce nested ul/li for nodes with children', function () {
            var cursor = op.getCursor();
            var html = editor.styledLine(cursor);
            expect(html).toMatch(/^<li>.*<ul>.*<\/ul>.*<\/li>$/);
        });

        it('should preserve bold formatting through getTextModel roundtrip', function () {
            var cursor = op.getCursor();
            var model = op.getTextModel(cursor);
            expect(model.text).toBe('Bold text');
            expect(model.marks.length).toBe(1);
            expect(model.marks[0].type).toBe('bold');
            expect(model.toHTML()).toBe('<b>Bold</b> text');
        });

        it('should produce raw text from textLine for clipboard matching', function () {
            var cursor = op.getCursor();
            var text = editor.textLine(cursor);
            // textLine is recursive, preserves innerHTML, indents children with tabs
            expect(text).toContain('<b>Bold</b> text');
            expect(text).toContain('Child one');
            expect(text).toContain('<i>Child</i> two');
        });

        it('should parse styledLine output back via insertRichText correctly', function () {
            var cursor = op.getCursor();
            var html = '<ul>' + editor.styledLine(cursor) + '</ul>';

            // Navigate to Plain row and insert there
            op.go('down');
            var beforeCount = concord.root.find('.concord-node').length;
            op.insertRichText(html);
            var afterCount = concord.root.find('.concord-node').length;

            // Should have added nodes (parent + 2 children)
            expect(afterCount).toBeGreaterThan(beforeCount);
        });

        it('should keep flat siblings at same indent level', function () {
            var flatHtml =
                '<ul><li>Row A</li><li>Row B</li><li>Row C</li></ul>';
            op.insertRichText(flatHtml);

            var lastInserted = op.getCursor();
            var siblings = lastInserted.parent().children('.concord-node');
            var rowTexts = [];
            siblings.each(function () {
                rowTexts.push(
                    $(this)
                        .children('.concord-wrapper')
                        .children('.concord-text')
                        .text()
                );
            });
            expect(rowTexts).toContain('Row A');
            expect(rowTexts).toContain('Row B');
            expect(rowTexts).toContain('Row C');
        });

        it('should preserve hierarchy when pasting siblings with children', function () {
            // 1 has child 2, sibling 3 has child 4
            var html =
                '<ul><li>One<ul><li>Two</li></ul></li><li>Three<ul><li>Four</li></ul></li></ul>';
            op.insertRichText(html);

            // Find the inserted nodes at root level
            var cursor = op.getCursor();
            var rootNodes = cursor.parent().children('.concord-node');
            var getText = function (node) {
                return $(node)
                    .children('.concord-wrapper')
                    .children('.concord-text')
                    .text();
            };
            var getChildren = function (node) {
                return $(node).children('ol').children('.concord-node');
            };

            // Find One and Three among root siblings
            var oneNode = null,
                threeNode = null;
            rootNodes.each(function () {
                var t = getText(this);
                if (t === 'One') oneNode = $(this);
                if (t === 'Three') threeNode = $(this);
            });

            expect(oneNode).not.toBeNull();
            expect(threeNode).not.toBeNull();

            // One and Three must be siblings (same parent)
            expect(oneNode.parent()[0]).toBe(threeNode.parent()[0]);

            // One has child Two
            var oneChildren = getChildren(oneNode);
            expect(oneChildren.length).toBe(1);
            expect(getText(oneChildren[0])).toBe('Two');

            // Three has child Four
            var threeChildren = getChildren(threeNode);
            expect(threeChildren.length).toBe(1);
            expect(getText(threeChildren[0])).toBe('Four');
        });

        it('should handle TextEdit HTML with style tags and invalid ul nesting', function () {
            // TextEdit produces: <style>...</style> + <ul> with <ul> directly inside <ul>
            var textEditHtml =
                '<style type="text/css">' +
                'li.li1 {margin: 0.0px; font: 12.0px Helvetica}' +
                'ul.ul1 {list-style-type: disc}' +
                '</style>' +
                '<ul class="ul1">' +
                '<li class="li1"><span class="s1">Hello</span></li>' +
                '<ul class="ul2">' +
                '<li class="li2"><span class="s1">How</span></li>' +
                '<li class="li2"><span class="s1">are</span></li>' +
                '</ul>' +
                '<li class="li1"><span class="s1">You</span></li>' +
                '</ul>';

            op.insertRichText(textEditHtml);

            var cursor = op.getCursor();
            var rootNodes = cursor.parent().children('.concord-node');
            var getText = function (node) {
                return $(node)
                    .children('.concord-wrapper')
                    .children('.concord-text')
                    .text();
            };
            var getChildren = function (node) {
                return $(node).children('ol').children('.concord-node');
            };

            // Collect all root-level text
            var rootTexts = [];
            rootNodes.each(function () {
                rootTexts.push(getText(this));
            });

            // Style text must NOT appear as a node
            rootTexts.forEach(function (t) {
                expect(t).not.toContain('li.li1');
                expect(t).not.toContain('margin');
                expect(t).not.toContain('list-style-type');
            });

            // Find Hello and You at root level
            var helloNode = null,
                youNode = null;
            rootNodes.each(function () {
                var t = getText(this);
                if (t === 'Hello') helloNode = $(this);
                if (t === 'You') youNode = $(this);
            });

            expect(helloNode).not.toBeNull();
            expect(youNode).not.toBeNull();

            // Hello and You must be siblings
            expect(helloNode.parent()[0]).toBe(youNode.parent()[0]);

            // How and are must be children (indented under Hello, via nested <ul>)
            var helloChildren = getChildren(helloNode);
            var childTexts = [];
            helloChildren.each(function () {
                childTexts.push(getText(this));
            });
            expect(childTexts).toContain('How');
            expect(childTexts).toContain('are');
        });

        it('should parse 4 external indentation formats correctly', function () {
            var getText = function (node) {
                return $(node)
                    .children('.concord-wrapper')
                    .children('.concord-text')
                    .text();
            };
            var getChildren = function (node) {
                return $(node).children('ol').children('.concord-node');
            };
            var verifyTree = function (expectedRoot, expectedL1, expectedL2) {
                var cursor = op.getCursor();
                var rootNodes = cursor.parent().children('.concord-node');
                var rootNode = null;
                rootNodes.each(function () {
                    if (getText(this) === expectedRoot) rootNode = $(this);
                });
                expect(rootNode).not.toBeNull();
                var l1 = getChildren(rootNode);
                expect(l1.length).toBe(expectedL1.length);
                for (var i = 0; i < expectedL1.length; i++) {
                    expect(getText(l1[i])).toBe(expectedL1[i]);
                }
                if (expectedL2) {
                    var l2 = getChildren($(l1[expectedL2.parentIndex]));
                    expect(l2.length).toBe(expectedL2.items.length);
                    for (var j = 0; j < expectedL2.items.length; j++) {
                        expect(getText(l2[j])).toBe(expectedL2.items[j]);
                    }
                }
            };

            // FORMAT 1: Standard nested ul/li
            op.xmlToOutline(
                '<opml><head/><body><outline text="setup"/></body></opml>',
                false
            );
            op.insertRichText(
                '<ul><li>Root<ul><li>Child A<ul><li>Deep</li></ul></li><li>Child B</li></ul></li></ul>'
            );
            verifyTree('Root', ['Child A', 'Child B'], {
                parentIndex: 0,
                items: ['Deep']
            });

            // FORMAT 2: TextEdit invalid nesting (ul directly inside ul)
            op.xmlToOutline(
                '<opml><head/><body><outline text="setup"/></body></opml>',
                false
            );
            op.insertRichText(
                '<ul>' +
                    '<li><span>Parent</span></li>' +
                    '<ul><li><span>Indented A</span></li><li><span>Indented B</span></li></ul>' +
                    '<li><span>Sibling</span></li>' +
                    '</ul>'
            );
            var cursor = op.getCursor();
            var roots = cursor.parent().children('.concord-node');
            var parentNode = null,
                siblingNode = null;
            roots.each(function () {
                var t = getText(this);
                if (t === 'Parent') parentNode = $(this);
                if (t === 'Sibling') siblingNode = $(this);
            });
            expect(parentNode).not.toBeNull();
            expect(siblingNode).not.toBeNull();
            // Indented items are deeper than Parent
            var indented = getChildren(parentNode);
            var indentedTexts = [];
            indented.each(function () {
                indentedTexts.push(getText(this));
            });
            expect(indentedTexts).toContain('Indented A');
            expect(indentedTexts).toContain('Indented B');

            // FORMAT 3: Google Docs margin-left paragraphs
            op.xmlToOutline(
                '<opml><head/><body><outline text="setup"/></body></opml>',
                false
            );
            op.insertRichText(
                '<p style="margin-left: 0px;">Level 0</p>' +
                    '<p style="margin-left: 48px;">Level 1</p>' +
                    '<p style="margin-left: 96px;">Level 2</p>' +
                    '<p style="margin-left: 48px;">Level 1b</p>'
            );
            verifyTree('Level 0', ['Level 1', 'Level 1b'], {
                parentIndex: 0,
                items: ['Level 2']
            });

            // FORMAT 4: Wrapped content (div wrappers around nested ul, e.g. web apps)
            op.xmlToOutline(
                '<opml><head/><body><outline text="setup"/></body></opml>',
                false
            );
            op.insertRichText(
                '<ul><li><div class="content">Wrapped Root</div>' +
                    '<div class="children"><ul>' +
                    '<li><div class="content">Wrapped Child</div>' +
                    '<div class="sub"><ul><li>Wrapped Deep</li></ul></div>' +
                    '</li></ul></div>' +
                    '</li></ul>'
            );
            verifyTree('Wrapped Root', ['Wrapped Child'], {
                parentIndex: 0,
                items: ['Wrapped Deep']
            });
        });

        it('should handle lists wrapped in non-list containers', function () {
            var getText = function (node) {
                return $(node)
                    .children('.concord-wrapper')
                    .children('.concord-text')
                    .text();
            };
            var getChildren = function (node) {
                return $(node).children('ol').children('.concord-node');
            };

            // Scenario: <ul> wrapped in <div> (common in web app clipboard output)
            op.xmlToOutline(
                '<opml><head/><body><outline text="setup"/></body></opml>',
                false
            );
            op.insertRichText(
                '<div class="wrapper"><ul>' +
                    '<li>Parent<ul><li>Child A</li><li>Child B<ul><li>Grandchild</li></ul></li></ul></li>' +
                    '</ul></div>'
            );
            var cursor = op.getCursor();
            var rootNodes = cursor.parent().children('.concord-node');
            var parentNode = null;
            rootNodes.each(function () {
                if (getText(this) === 'Parent') parentNode = $(this);
            });
            expect(parentNode).not.toBeNull();
            var children = getChildren(parentNode);
            expect(children.length).toBe(2);
            expect(getText(children[0])).toBe('Child A');
            expect(getText(children[1])).toBe('Child B');
            var grandchildren = getChildren($(children[1]));
            expect(grandchildren.length).toBe(1);
            expect(getText(grandchildren[0])).toBe('Grandchild');

            // Scenario: <ul> nested inside multiple wrapper divs
            op.xmlToOutline(
                '<opml><head/><body><outline text="setup"/></body></opml>',
                false
            );
            op.insertRichText(
                '<div class="app"><div class="content"><ul>' +
                    '<li>Top<ul><li>Mid<ul><li>Bottom</li></ul></li></ul></li>' +
                    '</ul></div></div>'
            );
            cursor = op.getCursor();
            rootNodes = cursor.parent().children('.concord-node');
            var topNode = null;
            rootNodes.each(function () {
                if (getText(this) === 'Top') topNode = $(this);
            });
            expect(topNode).not.toBeNull();
            var mid = getChildren(topNode);
            expect(mid.length).toBe(1);
            expect(getText(mid[0])).toBe('Mid');
            var bottom = getChildren($(mid[0]));
            expect(bottom.length).toBe(1);
            expect(getText(bottom[0])).toBe('Bottom');

            // Scenario: flat <li> with padding-left styles (some editors)
            op.xmlToOutline(
                '<opml><head/><body><outline text="setup"/></body></opml>',
                false
            );
            op.insertRichText(
                '<ul>' +
                    '<li>Level 0</li>' +
                    '<li style="padding-left: 48px;">Level 1a</li>' +
                    '<li style="padding-left: 48px;">Level 1b</li>' +
                    '<li style="padding-left: 96px;">Level 2</li>' +
                    '</ul>'
            );
            cursor = op.getCursor();
            rootNodes = cursor.parent().children('.concord-node');
            var l0Node = null;
            rootNodes.each(function () {
                if (getText(this) === 'Level 0') l0Node = $(this);
            });
            expect(l0Node).not.toBeNull();
            var l1Nodes = getChildren(l0Node);
            expect(l1Nodes.length).toBe(2);
            expect(getText(l1Nodes[0])).toBe('Level 1a');
            expect(getText(l1Nodes[1])).toBe('Level 1b');
            // Level 2 follows Level 1b sequentially, so it becomes Level 1b's child
            var l2Nodes = getChildren($(l1Nodes[1]));
            expect(l2Nodes.length).toBe(1);
            expect(getText(l2Nodes[0])).toBe('Level 2');
        });

        it('should paste bold as rendered formatting not literal tags', function () {
            // Simulate cross-instance paste: copy handler produces styledLine HTML,
            // receiving instance passes it through insertRichText.
            // Bug: literal <b>Hello</b> text appeared instead of bold "Hello" formatting.
            var getText = function (node) {
                return $(node)
                    .children('.concord-wrapper')
                    .children('.concord-text')
                    .text();
            };
            var getHtml = function (node) {
                return $(node)
                    .children('.concord-wrapper')
                    .children('.concord-text')
                    .html();
            };

            // Path 1: styledLine output → insertRichText (selection mode paste)
            var cursor = op.getCursor();
            var styledHtml = '<ul>' + editor.styledLine(cursor) + '</ul>';
            op.go('down'); // move to Plain row
            op.insertRichText(styledHtml);

            // The inserted node must have RENDERED bold, not literal <b> tags
            cursor = op.getCursor();
            expect(getText(cursor)).toBe('Bold text');
            expect(getHtml(cursor)).toBe('<b>Bold</b> text');

            // Path 2: raw clipboard HTML → insertRichText (as sanitize would call it)
            op.xmlToOutline(
                '<opml><head/><body><outline text="target"/></body></opml>',
                false
            );
            op.insertRichText('<ul><li><b>Hello</b> world</li></ul>');
            cursor = op.getCursor();
            var rootNodes = cursor.parent().children('.concord-node');
            var found = false;
            rootNodes.each(function () {
                if (getText(this) === 'Hello world') {
                    expect(getHtml(this)).toBe('<b>Hello</b> world');
                    found = true;
                }
            });
            expect(found).toBe(true);

            // Path 3: ConcordTextModel.fromHTML roundtrip (text mode inline paste)
            var pastedModel = ConcordTextModel.fromHTML('<b>Hello</b> world');
            expect(pastedModel.text).toBe('Hello world');
            expect(pastedModel.marks.length).toBe(1);
            expect(pastedModel.marks[0].type).toBe('bold');
            expect(pastedModel.marks[0].start).toBe(0);
            expect(pastedModel.marks[0].end).toBe(5);
            expect(pastedModel.toHTML()).toBe('<b>Hello</b> world');
        });
    });
});

{
    var SAMPLE_1_PLAINTEXT =
        'Load\n\
	opXmlToOutline (localStorage.savedOpmltext);\n\
		Double\n\
			Triple\n\
				Quad\n\
					Whatever man, this is just,like, your test, man\n\
	Load from OPML is working!\n\
Save\n\
	How to Save? Where to save?\n\
	Save as plaintext\n\
	Parse OPML from tabbed Plaintext\n\
		DOING IT\n\
Bugs\n\
	MUST FIX: Clicking enter in the middle of a line does not create a new line\n\
	To Groom: Avoid creation of too many empty rows?\n\
	If row is selected hitting the down arrow does not move down\n\
	Selection Mode\n\
		Figure out which scenarios you want to avoid\n\
	Moving up and down rows always moved cursor to end, want it to move to where we are in text (or to starting, like WF)\n\
I realize how important the Zoom is to me!\n\
New Line Test 1\n\
New Line Test 2\n\
New Line Test 3';

    var SAMPLE_1_OPML =
        '<opml><head/><body><outline text="Load"><outline text="opXmlToOutline (localStorage.savedOpmltext);"><outline text="Double"><outline text="Triple"><outline text="Quad"><outline text="Whatever man, this is just,like, your test, man"/></outline></outline></outline></outline><outline text="Load from OPML is working!"/></outline><outline text="Save"><outline text="How to Save? Where to save?"/><outline text="Save as plaintext"/><outline text="Parse OPML from tabbed Plaintext"><outline text="DOING IT"/></outline></outline><outline text="Bugs"><outline text="MUST FIX: Clicking enter in the middle of a line does not create a new line"/><outline text="To Groom: Avoid creation of too many empty rows?"/><outline text="If row is selected hitting the down arrow does not move down"/><outline text="Selection Mode"><outline text="Figure out which scenarios you want to avoid"/></outline><outline text="Moving up and down rows always moved cursor to end, want it to move to where we are in text (or to starting, like WF)"/></outline><outline text="I realize how important the Zoom is to me!"/><outline text="New Line Test 1"/><outline text="New Line Test 2"/><outline text="New Line Test 3"/></body></opml>';

    var SAMPLE_2_OPML =
        '<opml>\n<head/>\n<body><outline text="Load"><outline text="Load from OPML \n\nis working!"/></outline><outline text="New Line Test 1"/></body></opml>';

    var SAMPLE_2_PLAINTEXT =
        'Load\n\
opXmlToOutline\n(localStorage.savedOpmltext);';

    var SAMPLE_PLAINTEXT_BULLETS =
        '- Load\n\
	- opXmlToOutline (localStorage.savedOpmltext);\n\
		- Double \n \
			- Triple \n \
				- Quad \n \
					- Whatever man, this is just,like, your test, man \n \
	- Load from OPML is working!\n\
- Save\n\
	- How to Save? Where to save? \n\
	- Save as plaintext\n\
	- Parse OPML from tabbed Plaintext\n\
		- DOING IT\n\
- Bugs\n\
	- MUST FIX: Clicking enter in the middle of a line does not create a new line \n\
	- To Groom: Avoid creation of too many empty rows?\n\
	- If row is selected hitting the down arrow does not move down\n\
	- Selection Mode\n\
		- Figure out which scenarios you want to avoid\n\
	- Moving up and down rows always moved cursor to end, want it to move to where we are in text (or to starting, like WF)\n\
- I realize how important the Zoom is to me!\n\
- New Line Test 1\n\
- New Line Test 2 \n\
- New Line Test 3';
}
