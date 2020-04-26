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
