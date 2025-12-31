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

    describe('Expansion State Preservation', function () {
        it('should preserve expanded/collapsed states when saving and loading notes', function () {
            // Load a hierarchical outline
            op.xmlToOutline(SAMPLE_HIERARCHICAL_OPML, false);

            // Initially all nodes are collapsed by default (built with collapsed=true)
            var allNodes = concord.root.find('.concord-node');
            expect(allNodes.length).toBeGreaterThan(2);

            // Check that nodes with children are collapsed
            var nodesWithChildren = allNodes.filter(function() {
                return $(this).children('ol').children().length > 0;
            });
            expect(nodesWithChildren.length).toBeGreaterThan(0);

            // All nodes with children should be collapsed initially
            nodesWithChildren.each(function() {
                expect($(this).hasClass('collapsed')).toBe(true);
            });

            // Expand specific nodes (first and third node with children)
            var firstNodeWithChildren = $(nodesWithChildren[0]);
            var thirdNodeWithChildren = $(nodesWithChildren[2]);

            firstNodeWithChildren.removeClass('collapsed');
            if (thirdNodeWithChildren.length > 0) {
                thirdNodeWithChildren.removeClass('collapsed');
            }

            // Save the outline to XML (this should capture expansion state)
            var savedXml = op.outlineToXml(null, 'test@example.com', null, 'Test Note');

            // Verify the saved XML contains an expansionState tag
            expect(savedXml).toContain('<expansionState>');
            expect(savedXml).toContain('</expansionState>');

            // Parse the expansion state to verify it's not empty
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(savedXml, 'text/xml');
            var expansionStateElement = xmlDoc.querySelector('expansionState');
            expect(expansionStateElement).not.toBeNull();

            var expansionStateValue = expansionStateElement.textContent;
            expect(expansionStateValue).not.toBe('');

            // The expansion state should contain comma-separated node IDs
            var expandedNodeIds = expansionStateValue.split(',').map(function(id) {
                return id.trim();
            }).filter(function(id) {
                return id !== '';
            });
            expect(expandedNodeIds.length).toBeGreaterThan(0);

            // Clear the outline and reload from saved XML
            op.xmlToOutline(savedXml, false);

            // Verify nodes are in the correct expanded/collapsed state
            var reloadedNodes = concord.root.find('.concord-node');
            expect(reloadedNodes.length).toBe(allNodes.length);

            // Check that the expansion state was restored correctly
            var nodeId = 1;
            var expandedNodeIdsSet = new Set(expandedNodeIds);

            reloadedNodes.each(function() {
                var node = $(this);
                var hasChildren = node.children('ol').children().length > 0;
                var shouldBeExpanded = expandedNodeIdsSet.has(String(nodeId));

                if (hasChildren) {
                    if (shouldBeExpanded) {
                        expect(node.hasClass('collapsed')).toBe(false,
                            'Node ' + nodeId + ' should be expanded');
                    } else {
                        expect(node.hasClass('collapsed')).toBe(true,
                            'Node ' + nodeId + ' should be collapsed');
                    }
                }
                nodeId++;
            });
        });

        it('should handle notes with all nodes collapsed', function () {
            // Load and ensure all are collapsed
            op.xmlToOutline(SAMPLE_HIERARCHICAL_OPML, false);

            // Collapse all nodes
            concord.root.find('.concord-node').each(function() {
                if ($(this).children('ol').children().length > 0) {
                    $(this).addClass('collapsed');
                }
            });

            // Save and reload
            var savedXml = op.outlineToXml(null, 'test@example.com', null, 'All Collapsed');

            // expansionState should be empty or contain no IDs
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(savedXml, 'text/xml');
            var expansionStateElement = xmlDoc.querySelector('expansionState');

            // Empty expansion state means all collapsed
            var expansionStateValue = expansionStateElement ? expansionStateElement.textContent.trim() : '';

            // Reload and verify all still collapsed
            op.xmlToOutline(savedXml, false);

            concord.root.find('.concord-node').each(function() {
                if ($(this).children('ol').children().length > 0) {
                    expect($(this).hasClass('collapsed')).toBe(true);
                }
            });
        });

        it('should handle notes with all nodes expanded', function () {
            // Load outline
            op.xmlToOutline(SAMPLE_HIERARCHICAL_OPML, false);

            // Expand all nodes
            concord.root.find('.concord-node').each(function() {
                $(this).removeClass('collapsed');
            });

            // Save and reload
            var savedXml = op.outlineToXml(null, 'test@example.com', null, 'All Expanded');

            // expansionState should contain all node IDs with children
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(savedXml, 'text/xml');
            var expansionStateElement = xmlDoc.querySelector('expansionState');
            expect(expansionStateElement).not.toBeNull();

            var expansionStateValue = expansionStateElement.textContent;
            expect(expansionStateValue).not.toBe('');

            // Reload and verify all still expanded
            op.xmlToOutline(savedXml, false);

            var allNodes = concord.root.find('.concord-node');
            var nodesWithChildren = allNodes.filter(function() {
                return $(this).children('ol').children().length > 0;
            });

            nodesWithChildren.each(function() {
                expect($(this).hasClass('collapsed')).toBe(false);
            });
        });
    });

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

        it('should convert a markdown b,i,u to a formatted tag', function() {

        })
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

    // Sample hierarchical OPML for testing expansion state
    var SAMPLE_HIERARCHICAL_OPML =
        '<?xml version="1.0"?>\n\
<opml version="2.0">\n\
<head>\n\
<title>Test Hierarchy</title>\n\
</head>\n\
<body>\n\
<outline text="Parent 1">\n\
<outline text="Child 1.1">\n\
<outline text="Grandchild 1.1.1"/>\n\
<outline text="Grandchild 1.1.2"/>\n\
</outline>\n\
<outline text="Child 1.2"/>\n\
</outline>\n\
<outline text="Parent 2">\n\
<outline text="Child 2.1"/>\n\
<outline text="Child 2.2">\n\
<outline text="Grandchild 2.2.1"/>\n\
</outline>\n\
</outline>\n\
<outline text="Parent 3">\n\
<outline text="Child 3.1">\n\
<outline text="Grandchild 3.1.1">\n\
<outline text="Great-grandchild 3.1.1.1"/>\n\
</outline>\n\
</outline>\n\
</outline>\n\
</body>\n\
</opml>';
}