describe('URL Detection', function () {

    it('should detect URLs across TLD types, subdomains, protocols, and reject non-URLs', function () {
        // --- http/https URLs ---
        var r = detectUrl('http://hello.com');
        expect(r).not.toBeNull();
        expect(r.href).toBe('http://hello.com');
        expect(r.display).toBe('http://hello.com');

        r = detectUrl('https://hello.com');
        expect(r.href).toBe('https://hello.com');

        r = detectUrl('https://example.com/path?q=1&b=2');
        expect(r.href).toBe('https://example.com/path?q=1&b=2');

        // --- Bare domains with common gTLDs ---
        r = detectUrl('example.com');
        expect(r.href).toBe('https://example.com');
        expect(r.display).toBe('example.com');

        expect(detectUrl('example.org').href).toBe('https://example.org');
        expect(detectUrl('example.net').href).toBe('https://example.net');

        // --- Tech / new gTLDs ---
        expect(detectUrl('hoho.io').href).toBe('https://hoho.io');
        expect(detectUrl('hoho.sh').href).toBe('https://hoho.sh');
        expect(detectUrl('myapp.dev').href).toBe('https://myapp.dev');
        expect(detectUrl('cool.app').href).toBe('https://cool.app');
        expect(detectUrl('project.ai').href).toBe('https://project.ai');
        expect(detectUrl('site.xyz').href).toBe('https://site.xyz');
        expect(detectUrl('my.cloud').href).toBe('https://my.cloud');
        expect(detectUrl('thing.tech').href).toBe('https://thing.tech');
        expect(detectUrl('fun.gg').href).toBe('https://fun.gg');
        expect(detectUrl('my.blog').href).toBe('https://my.blog');

        // --- ccTLDs ---
        expect(detectUrl('site.de').href).toBe('https://site.de');
        expect(detectUrl('site.fr').href).toBe('https://site.fr');
        expect(detectUrl('site.jp').href).toBe('https://site.jp');
        expect(detectUrl('site.in').href).toBe('https://site.in');
        expect(detectUrl('site.uk').href).toBe('https://site.uk');
        expect(detectUrl('site.au').href).toBe('https://site.au');
        expect(detectUrl('site.br').href).toBe('https://site.br');
        expect(detectUrl('site.ca').href).toBe('https://site.ca');

        // --- Subdomains ---
        expect(detectUrl('sub.hoho.sh').href).toBe('https://sub.hoho.sh');
        expect(detectUrl('www.google.com').href).toBe('https://www.google.com');
        expect(detectUrl('api.v2.example.io').href).toBe('https://api.v2.example.io');
        expect(detectUrl('deep.sub.domain.org').href).toBe('https://deep.sub.domain.org');

        // --- Compound ccTLDs (e.g. co.uk) ---
        expect(detectUrl('bbc.co.uk').href).toBe('https://bbc.co.uk');
        expect(detectUrl('steps.nasha.co.in').href).toBe('https://steps.nasha.co.in');

        // --- With path ---
        expect(detectUrl('example.com/page').href).toBe('https://example.com/page');
        expect(detectUrl('hoho.io/docs/api').href).toBe('https://hoho.io/docs/api');

        // --- Should NOT detect ---
        expect(detectUrl('file.txt')).toBeNull();
        expect(detectUrl('readme.md').href).toBe('https://readme.md'); // .md is Moldova
        expect(detectUrl('script.js')).toBeNull();
        expect(detectUrl('image.png')).toBeNull();
        expect(detectUrl('data.json')).toBeNull();
        expect(detectUrl('style.css')).toBeNull();
        expect(detectUrl('co.uk')).toBeNull();       // second-level domain alone
        expect(detectUrl('com.au')).toBeNull();       // second-level domain alone
        expect(detectUrl('hello')).toBeNull();         // no dot
        expect(detectUrl('')).toBeNull();
        expect(detectUrl(null)).toBeNull();
        expect(detectUrl('a.b')).toBeNull();           // too short / unknown TLD
        expect(detectUrl('test.zzzzz')).toBeNull();    // unknown TLD
    });

    describe('URL integrity through line operations', function () {
        var concord, op;

        beforeEach(function () {
            concord = $(defaultUtilsOutliner).concord();
            op = concord.op;
        });

        it('should preserve link marks through enter (split) and backspace (join)', function () {
            // Load a line with a link in it
            var opml =
                '<opml><head/><body>' +
                '<outline text="visit &lt;a href=&quot;https://hoho.io&quot;&gt;hoho.io&lt;/a&gt; today"/>' +
                '</body></opml>';
            op.xmlToOutline(opml, false);

            // Verify initial state: one line, link present
            var model = op.getTextModel();
            expect(model.text).toBe('visit hoho.io today');
            expect(model.marks.length).toBe(1);
            expect(model.marks[0].type).toBe('link');
            expect(model.marks[0].attrs.href).toBe('https://hoho.io');

            // --- ENTER: split after "visit " (position 6) ---
            // This is what the Enter key handler does internally
            var splitPos = 6;
            var parts = model.splitAt(splitPos);
            var beforeHtml = parts[0].toHTML();  // "visit "
            var afterHtml = parts[1].toHTML();   // "<a href="https://hoho.io">hoho.io</a> today"

            // Before-caret part should have no link
            expect(parts[0].marks.length).toBe(0);
            expect(parts[0].text).toBe('visit ');

            // After-caret part should keep the link
            expect(parts[1].marks.length).toBe(1);
            expect(parts[1].marks[0].type).toBe('link');
            expect(parts[1].marks[0].attrs.href).toBe('https://hoho.io');

            // Apply the split via op layer (simulates Enter key)
            op.setLineText(afterHtml, true);
            op.invalidateTextModel();
            op.insert(beforeHtml, 'up');
            op.setLineText(beforeHtml, true);
            op.invalidateTextModel();

            // Now we have two lines: "visit " (cursor) and "hoho.io today" (below)
            // Navigate down to the line with the link
            op.go('down');
            var afterModel = op.getTextModel();
            expect(afterModel.marks.length).toBe(1);
            expect(afterModel.marks[0].type).toBe('link');
            expect(afterModel.marks[0].attrs.href).toBe('https://hoho.io');

            // --- BACKSPACE: join lines back together ---
            // This is what Backspace at position 0 does: delete current, append to prev
            var currentHtml = op.getLineText(null, true);
            op.deleteLine(); // moves cursor up to "visit "
            var prevHtml = op.getLineText(null, true);
            var joinedHtml = ConcordUtil.consolidateTags(prevHtml, currentHtml);
            op.setLineText(joinedHtml, true);
            op.invalidateTextModel();

            // Verify the joined line is back to original
            var joinedModel = op.getTextModel();
            expect(joinedModel.text).toBe('visit hoho.io today');
            expect(joinedModel.marks.length).toBe(1);
            expect(joinedModel.marks[0].type).toBe('link');
            expect(joinedModel.marks[0].attrs.href).toBe('https://hoho.io');

            // --- ENTER: split INSIDE the link at "hoho" (position 10) ---
            var midSplit = model.splitAt(10); // "visit hoho" | ".io today"
            expect(midSplit[0].marks.length).toBe(1);
            expect(midSplit[0].marks[0].type).toBe('link');
            expect(midSplit[0].marks[0].attrs.href).toBe('https://hoho.io');
            expect(midSplit[1].marks.length).toBe(1);
            expect(midSplit[1].marks[0].type).toBe('link');
            expect(midSplit[1].marks[0].attrs.href).toBe('https://hoho.io');
        });
    });
});
