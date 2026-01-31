/**
 * ConcordTextModel Unit Tests
 * Comprehensive tests for the range-based text styling model
 */

describe('ConcordTextModel', function () {
    // ============================================================
    // CONSTRUCTION TESTS
    // ============================================================
    describe('Construction', function () {
        it('should create empty model', function () {
            const model = new ConcordTextModel();
            expect(model.text).toBe('');
            expect(model.marks.length).toBe(0);
            expect(model.length).toBe(0);
        });

        it('should create model with text only', function () {
            const model = new ConcordTextModel('hello world');
            expect(model.text).toBe('hello world');
            expect(model.length).toBe(11);
            expect(model.marks.length).toBe(0);
        });

        it('should create model with text and marks', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            expect(model.text).toBe('hello');
            expect(model.marks.length).toBe(1);
            expect(model.marks[0].type).toBe('bold');
        });

        it('should return deep copy of marks', function () {
            const original = [{ start: 0, end: 5, type: 'bold', attrs: null }];
            const model = new ConcordTextModel('hello', original);
            const marks = model.marks;
            marks[0].start = 999;
            expect(model.marks[0].start).toBe(0);
        });
    });

    // ============================================================
    // MARK NORMALIZATION TESTS
    // ============================================================
    describe('Mark Normalization', function () {
        it('should remove empty marks (start >= end)', function () {
            const model = new ConcordTextModel('hello', [{ start: 2, end: 2, type: 'bold', attrs: null }]);
            expect(model.marks.length).toBe(0);
        });

        it('should remove marks with negative length', function () {
            const model = new ConcordTextModel('hello', [{ start: 3, end: 1, type: 'bold', attrs: null }]);
            expect(model.marks.length).toBe(0);
        });

        it('should merge adjacent same-type marks', function () {
            const model = new ConcordTextModel('hello', [
                { start: 0, end: 2, type: 'bold', attrs: null },
                { start: 2, end: 5, type: 'bold', attrs: null },
            ]);
            expect(model.marks.length).toBe(1);
            expect(model.marks[0].start).toBe(0);
            expect(model.marks[0].end).toBe(5);
        });

        it('should merge overlapping same-type marks', function () {
            const model = new ConcordTextModel('hello', [
                { start: 0, end: 3, type: 'bold', attrs: null },
                { start: 2, end: 5, type: 'bold', attrs: null },
            ]);
            expect(model.marks.length).toBe(1);
            expect(model.marks[0].start).toBe(0);
            expect(model.marks[0].end).toBe(5);
        });

        it('should NOT merge adjacent marks with different types', function () {
            const model = new ConcordTextModel('hello', [
                { start: 0, end: 2, type: 'bold', attrs: null },
                { start: 2, end: 5, type: 'italic', attrs: null },
            ]);
            expect(model.marks.length).toBe(2);
        });

        it('should NOT merge adjacent link marks with different hrefs', function () {
            const model = new ConcordTextModel('hello', [
                { start: 0, end: 2, type: 'link', attrs: { href: 'http://a.com' } },
                { start: 2, end: 5, type: 'link', attrs: { href: 'http://b.com' } },
            ]);
            expect(model.marks.length).toBe(2);
        });

        it('should clamp marks to text bounds', function () {
            const model = new ConcordTextModel('hi', [{ start: -5, end: 100, type: 'bold', attrs: null }]);
            expect(model.marks[0].start).toBe(0);
            expect(model.marks[0].end).toBe(2);
        });

        it('should sort marks by start position', function () {
            const model = new ConcordTextModel('hello world', [
                { start: 6, end: 11, type: 'italic', attrs: null },
                { start: 0, end: 5, type: 'bold', attrs: null },
            ]);
            expect(model.marks[0].start).toBe(0);
            expect(model.marks[1].start).toBe(6);
        });
    });

    // ============================================================
    // ADD MARK TESTS
    // ============================================================
    describe('addMark', function () {
        it('should add mark to plain text', function () {
            const model = new ConcordTextModel('hello');
            const result = model.addMark(0, 5, 'bold');
            expect(result.marks.length).toBe(1);
            expect(result.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 5, type: 'bold' }));
        });

        it('should handle overlapping same-type marks by merging', function () {
            const model = new ConcordTextModel('hello world', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            const result = model.addMark(3, 11, 'bold');
            expect(result.marks.length).toBe(1);
            expect(result.marks[0].start).toBe(0);
            expect(result.marks[0].end).toBe(11);
        });

        it('should allow overlapping different-type marks', function () {
            const model = new ConcordTextModel('bold', [{ start: 0, end: 4, type: 'bold', attrs: null }]);
            const result = model.addMark(2, 4, 'italic');
            expect(result.marks.length).toBe(2);
        });

        it('should handle bold then italic on partial text (user scenario)', function () {
            // text -> bold -> make "xt" italic -> "xt" should be bold AND italic
            let model = new ConcordTextModel('text');
            model = model.addMark(0, 4, 'bold');
            model = model.addMark(2, 4, 'italic');

            expect(model.marks).toContain(jasmine.objectContaining({ type: 'bold', start: 0, end: 4 }));
            expect(model.marks).toContain(jasmine.objectContaining({ type: 'italic', start: 2, end: 4 }));
            expect(model.toHTML()).toBe('<b>te<i>xt</i></b>');
        });

        it('should not add mark with invalid range', function () {
            const model = new ConcordTextModel('hello');
            const result = model.addMark(5, 3, 'bold');
            expect(result.marks.length).toBe(0);
        });

        it('should add link with attributes', function () {
            const model = new ConcordTextModel('click here');
            const result = model.addMark(0, 10, 'link', { href: 'http://example.com' });
            expect(result.marks[0].attrs.href).toBe('http://example.com');
        });
    });

    // ============================================================
    // REMOVE MARK TESTS
    // ============================================================
    describe('removeMark', function () {
        it('should remove entire mark when fully covered', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            const result = model.removeMark(0, 5, 'bold');
            expect(result.marks.length).toBe(0);
        });

        it('should split mark when removing from middle', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            const result = model.removeMark(2, 3, 'bold');
            expect(result.marks.length).toBe(2);
            expect(result.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 2 }));
            expect(result.marks[1]).toEqual(jasmine.objectContaining({ start: 3, end: 5 }));
        });

        it('should trim mark from start', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            const result = model.removeMark(0, 2, 'bold');
            expect(result.marks[0]).toEqual(jasmine.objectContaining({ start: 2, end: 5 }));
        });

        it('should trim mark from end', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            const result = model.removeMark(3, 5, 'bold');
            expect(result.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 3 }));
        });

        it('should not affect other mark types', function () {
            const model = new ConcordTextModel('hello', [
                { start: 0, end: 5, type: 'bold', attrs: null },
                { start: 0, end: 5, type: 'italic', attrs: null },
            ]);
            const result = model.removeMark(0, 5, 'bold');
            expect(result.marks.length).toBe(1);
            expect(result.marks[0].type).toBe('italic');
        });
    });

    // ============================================================
    // TOGGLE MARK TESTS
    // ============================================================
    describe('toggleMark', function () {
        it('should add mark if not present', function () {
            const model = new ConcordTextModel('hello');
            const result = model.toggleMark(0, 5, 'bold');
            expect(result.marks.length).toBe(1);
        });

        it('should remove mark if fully present', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            const result = model.toggleMark(0, 5, 'bold');
            expect(result.marks.length).toBe(0);
        });

        it('should add mark if only partially present', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 3, type: 'bold', attrs: null }]);
            const result = model.toggleMark(0, 5, 'bold');
            // Should extend/merge to cover full range
            expect(result.marks.length).toBe(1);
            expect(result.marks[0].end).toBe(5);
        });
    });

    // ============================================================
    // MARKS AT POSITION TESTS
    // ============================================================
    describe('marksAt', function () {
        it('should return marks at position', function () {
            const model = new ConcordTextModel('hello', [
                { start: 0, end: 5, type: 'bold', attrs: null },
                { start: 2, end: 4, type: 'italic', attrs: null },
            ]);

            const at0 = model.marksAt(0);
            expect(at0.length).toBe(1);
            expect(at0[0].type).toBe('bold');

            const at2 = model.marksAt(2);
            expect(at2.length).toBe(2);
        });

        it('should return empty array at position with no marks', function () {
            const model = new ConcordTextModel('hello', [{ start: 2, end: 4, type: 'bold', attrs: null }]);
            expect(model.marksAt(0).length).toBe(0);
            expect(model.marksAt(4).length).toBe(0);
        });
    });

    // ============================================================
    // HAS MARK TESTS
    // ============================================================
    describe('hasMark', function () {
        it('should return true if mark exists at position', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            expect(model.hasMark(2, 'bold')).toBe(true);
        });

        it('should return false if mark does not exist at position', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            expect(model.hasMark(2, 'italic')).toBe(false);
        });
    });

    // ============================================================
    // INSERT AT TESTS
    // ============================================================
    describe('insertAt', function () {
        it('should insert text at beginning', function () {
            const model = new ConcordTextModel('world');
            const result = model.insertAt(0, 'hello ');
            expect(result.text).toBe('hello world');
        });

        it('should insert text at end', function () {
            const model = new ConcordTextModel('hello');
            const result = model.insertAt(5, ' world');
            expect(result.text).toBe('hello world');
        });

        it('should insert text in middle', function () {
            const model = new ConcordTextModel('helloworld');
            const result = model.insertAt(5, ' ');
            expect(result.text).toBe('hello world');
        });

        it('should shift marks after insertion point', function () {
            const model = new ConcordTextModel('hello', [{ start: 2, end: 5, type: 'bold', attrs: null }]);
            const result = model.insertAt(0, 'XX');
            expect(result.text).toBe('XXhello');
            expect(result.marks[0].start).toBe(4);
            expect(result.marks[0].end).toBe(7);
        });

        it('should expand marks when inserting inside', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            const result = model.insertAt(2, 'XX');
            expect(result.text).toBe('heXXllo');
            expect(result.marks[0].start).toBe(0);
            expect(result.marks[0].end).toBe(7);
        });
    });

    // ============================================================
    // DELETE RANGE TESTS
    // ============================================================
    describe('deleteRange', function () {
        it('should delete text from beginning', function () {
            const model = new ConcordTextModel('hello world');
            const result = model.deleteRange(0, 6);
            expect(result.text).toBe('world');
        });

        it('should delete text from end', function () {
            const model = new ConcordTextModel('hello world');
            const result = model.deleteRange(5, 11);
            expect(result.text).toBe('hello');
        });

        it('should delete text from middle', function () {
            const model = new ConcordTextModel('hello world');
            const result = model.deleteRange(5, 6);
            expect(result.text).toBe('helloworld');
        });

        it('should shift marks after deletion', function () {
            const model = new ConcordTextModel('hello world', [{ start: 6, end: 11, type: 'bold', attrs: null }]);
            const result = model.deleteRange(0, 6);
            expect(result.text).toBe('world');
            expect(result.marks[0].start).toBe(0);
            expect(result.marks[0].end).toBe(5);
        });

        it('should remove marks inside deleted range', function () {
            const model = new ConcordTextModel('hello', [{ start: 1, end: 4, type: 'bold', attrs: null }]);
            const result = model.deleteRange(0, 5);
            expect(result.marks.length).toBe(0);
        });

        it('should shrink marks spanning deletion', function () {
            const model = new ConcordTextModel('hello world', [{ start: 0, end: 11, type: 'bold', attrs: null }]);
            const result = model.deleteRange(5, 6);
            expect(result.marks[0].end).toBe(10);
        });
    });

    // ============================================================
    // JOIN TESTS
    // ============================================================
    describe('join', function () {
        it('should join two plain text models', function () {
            const a = new ConcordTextModel('hello');
            const b = new ConcordTextModel(' world');
            const result = a.join(b);
            expect(result.text).toBe('hello world');
        });

        it('should join models with marks and shift second model marks', function () {
            const a = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            const b = new ConcordTextModel(' world', [{ start: 1, end: 6, type: 'italic', attrs: null }]);
            const result = a.join(b);
            expect(result.text).toBe('hello world');
            expect(result.marks.length).toBe(2);
            expect(result.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 5, type: 'bold' }));
            expect(result.marks[1]).toEqual(jasmine.objectContaining({ start: 6, end: 11, type: 'italic' }));
        });

        it('should merge adjacent same-type marks when joining', function () {
            const a = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            const b = new ConcordTextModel(' world', [{ start: 0, end: 6, type: 'bold', attrs: null }]);
            const result = a.join(b);
            expect(result.marks.length).toBe(1);
            expect(result.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 11 }));
        });
    });

    // ============================================================
    // TO HTML TESTS
    // ============================================================
    describe('toHTML', function () {
        it('should render plain text', function () {
            const model = new ConcordTextModel('hello');
            expect(model.toHTML()).toBe('hello');
        });

        it('should render empty string for empty model', function () {
            const model = new ConcordTextModel('');
            expect(model.toHTML()).toBe('');
        });

        it('should render single bold mark', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            expect(model.toHTML()).toBe('<b>hello</b>');
        });

        it('should render single italic mark', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'italic', attrs: null }]);
            expect(model.toHTML()).toBe('<i>hello</i>');
        });

        it('should render single underline mark', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'underline', attrs: null }]);
            expect(model.toHTML()).toBe('<u>hello</u>');
        });

        it('should render single strike mark', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'strike', attrs: null }]);
            expect(model.toHTML()).toBe('<strike>hello</strike>');
        });

        it('should render link with href', function () {
            const model = new ConcordTextModel('click', [
                { start: 0, end: 5, type: 'link', attrs: { href: 'http://example.com' } },
            ]);
            expect(model.toHTML()).toBe('<a href="http://example.com">click</a>');
        });

        it('should render nested marks (bold containing italic)', function () {
            const model = new ConcordTextModel('bold', [
                { start: 0, end: 4, type: 'bold', attrs: null },
                { start: 2, end: 4, type: 'italic', attrs: null },
            ]);
            expect(model.toHTML()).toBe('<b>bo<i>ld</i></b>');
        });

        it('should render styled link (bold link)', function () {
            const model = new ConcordTextModel('click here', [
                { start: 0, end: 10, type: 'bold', attrs: null },
                { start: 6, end: 10, type: 'link', attrs: { href: 'http://example.com' } },
            ]);
            expect(model.toHTML()).toBe('<b>click <a href="http://example.com">here</a></b>');
        });

        it('should escape HTML entities in text', function () {
            const model = new ConcordTextModel('<script>alert("xss")</script>');
            expect(model.toHTML()).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        });

        it('should escape HTML entities in link href', function () {
            const model = new ConcordTextModel('link', [
                { start: 0, end: 4, type: 'link', attrs: { href: 'http://example.com?a=1&b=2' } },
            ]);
            expect(model.toHTML()).toContain('&amp;');
        });

        it('should handle multiple non-overlapping marks', function () {
            const model = new ConcordTextModel('hello world', [
                { start: 0, end: 5, type: 'bold', attrs: null },
                { start: 6, end: 11, type: 'italic', attrs: null },
            ]);
            expect(model.toHTML()).toBe('<b>hello</b> <i>world</i>');
        });

        it('should handle partial mark at start', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 3, type: 'bold', attrs: null }]);
            expect(model.toHTML()).toBe('<b>hel</b>lo');
        });

        it('should handle partial mark at end', function () {
            const model = new ConcordTextModel('hello', [{ start: 2, end: 5, type: 'bold', attrs: null }]);
            expect(model.toHTML()).toBe('he<b>llo</b>');
        });
    });

    // ============================================================
    // FROM HTML TESTS
    // ============================================================
    describe('fromHTML', function () {
        it('should parse plain text', function () {
            const model = ConcordTextModel.fromHTML('hello');
            expect(model.text).toBe('hello');
            expect(model.marks.length).toBe(0);
        });

        it('should parse empty string', function () {
            const model = ConcordTextModel.fromHTML('');
            expect(model.text).toBe('');
            expect(model.marks.length).toBe(0);
        });

        it('should parse bold tag', function () {
            const model = ConcordTextModel.fromHTML('<b>hello</b>');
            expect(model.text).toBe('hello');
            expect(model.marks.length).toBe(1);
            expect(model.marks[0]).toEqual(jasmine.objectContaining({ type: 'bold', start: 0, end: 5 }));
        });

        it('should parse strong tag as bold', function () {
            const model = ConcordTextModel.fromHTML('<strong>hello</strong>');
            expect(model.marks[0].type).toBe('bold');
        });

        it('should parse italic tag', function () {
            const model = ConcordTextModel.fromHTML('<i>hello</i>');
            expect(model.marks[0].type).toBe('italic');
        });

        it('should parse em tag as italic', function () {
            const model = ConcordTextModel.fromHTML('<em>hello</em>');
            expect(model.marks[0].type).toBe('italic');
        });

        it('should parse underline tag', function () {
            const model = ConcordTextModel.fromHTML('<u>hello</u>');
            expect(model.marks[0].type).toBe('underline');
        });

        it('should parse strike tag', function () {
            const model = ConcordTextModel.fromHTML('<strike>hello</strike>');
            expect(model.marks[0].type).toBe('strike');
        });

        it('should parse del tag as strike', function () {
            const model = ConcordTextModel.fromHTML('<del>hello</del>');
            expect(model.marks[0].type).toBe('strike');
        });

        it('should parse s tag as strike', function () {
            const model = ConcordTextModel.fromHTML('<s>hello</s>');
            expect(model.marks[0].type).toBe('strike');
        });

        it('should parse link with href', function () {
            const model = ConcordTextModel.fromHTML('<a href="http://test.com">link</a>');
            expect(model.text).toBe('link');
            expect(model.marks[0]).toEqual(
                jasmine.objectContaining({
                    type: 'link',
                    attrs: { href: 'http://test.com' },
                })
            );
        });

        it('should parse nested tags', function () {
            const model = ConcordTextModel.fromHTML('<b>bo<i>ld</i></b>');
            expect(model.text).toBe('bold');
            expect(model.marks.length).toBe(2);
        });

        it('should parse mixed content', function () {
            const model = ConcordTextModel.fromHTML('Hello <b>bold</b> world');
            expect(model.text).toBe('Hello bold world');
            expect(model.marks[0]).toEqual(jasmine.objectContaining({ start: 6, end: 10, type: 'bold' }));
        });

        it('should roundtrip simple bold', function () {
            const html = '<b>hello</b>';
            const model = ConcordTextModel.fromHTML(html);
            expect(model.toHTML()).toBe(html);
        });

        it('should roundtrip nested bold/italic', function () {
            const html = '<b>bo<i>ld</i></b>';
            const model = ConcordTextModel.fromHTML(html);
            expect(model.toHTML()).toBe(html);
        });

        it('should roundtrip link', function () {
            const html = '<a href="http://test.com">link</a>';
            const model = ConcordTextModel.fromHTML(html);
            expect(model.toHTML()).toBe(html);
        });
    });

    // ============================================================
    // SPLIT AT TESTS - BASIC
    // ============================================================
    describe('splitAt - Basic', function () {
        it('should split plain text at beginning', function () {
            const model = new ConcordTextModel('hello');
            const [before, after] = model.splitAt(0);
            expect(before.text).toBe('');
            expect(after.text).toBe('hello');
        });

        it('should split plain text at end', function () {
            const model = new ConcordTextModel('hello');
            const [before, after] = model.splitAt(5);
            expect(before.text).toBe('hello');
            expect(after.text).toBe('');
        });

        it('should split plain text in middle', function () {
            const model = new ConcordTextModel('hello world');
            const [before, after] = model.splitAt(5);
            expect(before.text).toBe('hello');
            expect(after.text).toBe(' world');
        });

        it('should handle mark entirely before split', function () {
            const model = new ConcordTextModel('hello world', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            const [before, after] = model.splitAt(7);
            expect(before.marks.length).toBe(1);
            expect(before.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 5 }));
            expect(after.marks.length).toBe(0);
        });

        it('should handle mark entirely after split', function () {
            const model = new ConcordTextModel('hello world', [{ start: 6, end: 11, type: 'bold', attrs: null }]);
            const [before, after] = model.splitAt(3);
            expect(before.marks.length).toBe(0);
            expect(after.marks[0]).toEqual(jasmine.objectContaining({ start: 3, end: 8 }));
        });

        it('should split mark spanning split point', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            const [before, after] = model.splitAt(2);
            expect(before.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 2 }));
            expect(after.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 3 }));
        });

        it('should preserve mark attributes when splitting', function () {
            const model = new ConcordTextModel('hello', [
                { start: 0, end: 5, type: 'link', attrs: { href: 'http://test.com' } },
            ]);
            const [before, after] = model.splitAt(2);
            expect(before.marks[0].attrs.href).toBe('http://test.com');
            expect(after.marks[0].attrs.href).toBe('http://test.com');
        });
    });

    // ============================================================
    // SPLIT AT TESTS - ENTER KEY SCENARIOS (10+ MIXED CASES)
    // ============================================================
    describe('splitAt - Enter Key Scenarios (Mixed Styles & Hyperlinks)', function () {
        // Scenario 1: Simple bold text, split in middle
        it('Scenario 1: Bold text - split in middle', function () {
            // <b>bold</b> -> cursor after "bo" -> Enter
            const model = ConcordTextModel.fromHTML('<b>bold</b>');
            const [before, after] = model.splitAt(2);

            expect(before.text).toBe('bo');
            expect(after.text).toBe('ld');
            expect(before.toHTML()).toBe('<b>bo</b>');
            expect(after.toHTML()).toBe('<b>ld</b>');
        });

        // Scenario 2: Strikethrough text, split in middle (the original bug!)
        it('Scenario 2: Strikethrough text - split in middle (original bug case)', function () {
            // <strike>strike</strike> -> cursor after "stri" -> Enter
            const model = ConcordTextModel.fromHTML('<strike>strike</strike>');
            const [before, after] = model.splitAt(4);

            expect(before.text).toBe('stri');
            expect(after.text).toBe('ke');
            expect(before.toHTML()).toBe('<strike>stri</strike>');
            expect(after.toHTML()).toBe('<strike>ke</strike>');
            // Should NOT be <strik and e>strike</strike>!
        });

        // Scenario 3: Bold + Italic overlap, split inside overlap
        it('Scenario 3: Bold with partial italic - split inside italic region', function () {
            // <b>he<i>llo</i></b> -> cursor after "hel" (inside italic) -> Enter
            const model = ConcordTextModel.fromHTML('<b>he<i>llo</i></b>');
            const [before, after] = model.splitAt(3);

            expect(before.text).toBe('hel');
            expect(after.text).toBe('lo');
            expect(before.toHTML()).toBe('<b>he<i>l</i></b>');
            expect(after.toHTML()).toBe('<b><i>lo</i></b>');
        });

        // Scenario 4: Link text, split in middle of link
        it('Scenario 4: Hyperlink - split in middle', function () {
            // <a href="http://example.com">click here</a> -> cursor after "click" -> Enter
            const model = ConcordTextModel.fromHTML('<a href="http://example.com">click here</a>');
            const [before, after] = model.splitAt(5);

            expect(before.text).toBe('click');
            expect(after.text).toBe(' here');
            expect(before.toHTML()).toBe('<a href="http://example.com">click</a>');
            expect(after.toHTML()).toBe('<a href="http://example.com"> here</a>');
        });

        // Scenario 5: Bold link, split inside link
        it('Scenario 5: Bold hyperlink - split in middle', function () {
            // <b><a href="http://test.com">click here</a></b>
            const model = ConcordTextModel.fromHTML('<b><a href="http://test.com">click here</a></b>');
            const [before, after] = model.splitAt(6);

            expect(before.text).toBe('click ');
            expect(after.text).toBe('here');
            expect(before.toHTML()).toBe('<b><a href="http://test.com">click </a></b>');
            expect(after.toHTML()).toBe('<b><a href="http://test.com">here</a></b>');
        });

        // Scenario 6: Text with link in middle, split before link
        it('Scenario 6: Text with link in middle - split before link', function () {
            // Hello <a href="url">link</a> world -> cursor after "Hello" -> Enter
            let model = new ConcordTextModel('Hello link world', [
                { start: 6, end: 10, type: 'link', attrs: { href: 'http://test.com' } },
            ]);
            const [before, after] = model.splitAt(5);

            expect(before.text).toBe('Hello');
            expect(after.text).toBe(' link world');
            expect(before.marks.length).toBe(0);
            expect(after.marks[0]).toEqual(
                jasmine.objectContaining({
                    start: 1,
                    end: 5,
                    type: 'link',
                })
            );
        });

        // Scenario 7: Text with link in middle, split after link
        it('Scenario 7: Text with link in middle - split after link', function () {
            // Hello <a href="url">link</a> world -> cursor after "link" -> Enter
            let model = new ConcordTextModel('Hello link world', [
                { start: 6, end: 10, type: 'link', attrs: { href: 'http://test.com' } },
            ]);
            const [before, after] = model.splitAt(10);

            expect(before.text).toBe('Hello link');
            expect(after.text).toBe(' world');
            expect(before.marks.length).toBe(1);
            expect(after.marks.length).toBe(0);
        });

        // Scenario 8: Multiple styles - bold, italic, underline
        it('Scenario 8: Triple nested styles - split in innermost', function () {
            // <b><i><u>styled</u></i></b> -> cursor after "sty" -> Enter
            const model = new ConcordTextModel('styled', [
                { start: 0, end: 6, type: 'bold', attrs: null },
                { start: 0, end: 6, type: 'italic', attrs: null },
                { start: 0, end: 6, type: 'underline', attrs: null },
            ]);
            const [before, after] = model.splitAt(3);

            expect(before.text).toBe('sty');
            expect(after.text).toBe('led');

            // Both parts should have all three styles
            expect(before.marks.length).toBe(3);
            expect(after.marks.length).toBe(3);

            const beforeHTML = before.toHTML();
            const afterHTML = after.toHTML();
            expect(beforeHTML).toContain('<b>');
            expect(beforeHTML).toContain('<i>');
            expect(beforeHTML).toContain('<u>');
            expect(afterHTML).toContain('<b>');
            expect(afterHTML).toContain('<i>');
            expect(afterHTML).toContain('<u>');
        });

        // Scenario 9: Italic link inside bold text
        it('Scenario 9: Complex nesting - bold text with italic link inside', function () {
            // <b>Hello <i><a href="url">link</a></i> world</b>
            const model = new ConcordTextModel('Hello link world', [
                { start: 0, end: 16, type: 'bold', attrs: null },
                { start: 6, end: 10, type: 'italic', attrs: null },
                { start: 6, end: 10, type: 'link', attrs: { href: 'http://test.com' } },
            ]);
            const [before, after] = model.splitAt(8); // Split inside "link"

            expect(before.text).toBe('Hello li');
            expect(after.text).toBe('nk world');

            // Before should have: bold (0-8), italic (6-8), link (6-8)
            expect(before.marks).toContain(jasmine.objectContaining({ type: 'bold', start: 0, end: 8 }));
            expect(before.marks).toContain(jasmine.objectContaining({ type: 'italic', start: 6, end: 8 }));
            expect(before.marks).toContain(jasmine.objectContaining({ type: 'link' }));

            // After should have: bold (0-8), italic (0-2), link (0-2)
            expect(after.marks).toContain(jasmine.objectContaining({ type: 'bold', start: 0, end: 8 }));
            expect(after.marks).toContain(jasmine.objectContaining({ type: 'italic', start: 0, end: 2 }));
        });

        // Scenario 10: Adjacent different links
        it('Scenario 10: Adjacent links with different URLs - split at boundary', function () {
            // <a href="a.com">first</a><a href="b.com">second</a>
            const model = new ConcordTextModel('firstsecond', [
                { start: 0, end: 5, type: 'link', attrs: { href: 'http://a.com' } },
                { start: 5, end: 11, type: 'link', attrs: { href: 'http://b.com' } },
            ]);
            const [before, after] = model.splitAt(5);

            expect(before.text).toBe('first');
            expect(after.text).toBe('second');
            expect(before.marks[0].attrs.href).toBe('http://a.com');
            expect(after.marks[0].attrs.href).toBe('http://b.com');
        });

        // Scenario 11: Bold and underline partially overlapping
        it('Scenario 11: Overlapping bold and underline - split in overlap region', function () {
            // Text: "hello world"
            // Bold: "hello wo" (0-8)
            // Underline: "o world" (4-11)
            // Overlap: "o wo" (4-8)
            const model = new ConcordTextModel('hello world', [
                { start: 0, end: 8, type: 'bold', attrs: null },
                { start: 4, end: 11, type: 'underline', attrs: null },
            ]);
            const [before, after] = model.splitAt(6); // Split at "hello |world"

            expect(before.text).toBe('hello ');
            expect(after.text).toBe('world');

            // Before (0-6): bold covers 0-6, underline covers 4-6
            expect(before.marks).toContain(jasmine.objectContaining({ type: 'bold', start: 0, end: 6 }));
            expect(before.marks).toContain(jasmine.objectContaining({ type: 'underline', start: 4, end: 6 }));

            // After (0-5): bold covers 0-2, underline covers 0-5
            expect(after.marks).toContain(jasmine.objectContaining({ type: 'bold', start: 0, end: 2 }));
            expect(after.marks).toContain(jasmine.objectContaining({ type: 'underline', start: 0, end: 5 }));
        });

        // Scenario 12: Strike with link inside
        it('Scenario 12: Strikethrough containing a link - split inside link', function () {
            // <strike>check <a href="url">this</a> out</strike>
            const model = new ConcordTextModel('check this out', [
                { start: 0, end: 14, type: 'strike', attrs: null },
                { start: 6, end: 10, type: 'link', attrs: { href: 'http://test.com' } },
            ]);
            const [before, after] = model.splitAt(8); // Split inside "this"

            expect(before.text).toBe('check th');
            expect(after.text).toBe('is out');

            expect(before.toHTML()).toContain('<strike>');
            expect(before.toHTML()).toContain('<a href=');
            expect(after.toHTML()).toContain('<strike>');
            expect(after.toHTML()).toContain('<a href=');
        });

        // Scenario 13: Multiple links with styles
        it('Scenario 13: Two styled links - split between them', function () {
            // <b><a href="a.com">first</a></b> and <i><a href="b.com">second</a></i>
            const model = new ConcordTextModel('first and second', [
                { start: 0, end: 5, type: 'bold', attrs: null },
                { start: 0, end: 5, type: 'link', attrs: { href: 'http://a.com' } },
                { start: 10, end: 16, type: 'italic', attrs: null },
                { start: 10, end: 16, type: 'link', attrs: { href: 'http://b.com' } },
            ]);
            const [before, after] = model.splitAt(6); // Split at "first |and second"

            expect(before.text).toBe('first ');
            expect(after.text).toBe('and second');

            // Before has bold link
            expect(before.marks.filter((m) => m.type === 'bold').length).toBe(1);
            expect(before.marks.filter((m) => m.type === 'link').length).toBe(1);

            // After has italic link (shifted positions)
            expect(after.marks.filter((m) => m.type === 'italic').length).toBe(1);
            expect(after.marks.filter((m) => m.type === 'link').length).toBe(1);
        });

        // Scenario 14: All four styles at once
        it('Scenario 14: All four styles (bold, italic, underline, strike) - split in middle', function () {
            const model = new ConcordTextModel('styled', [
                { start: 0, end: 6, type: 'bold', attrs: null },
                { start: 0, end: 6, type: 'italic', attrs: null },
                { start: 0, end: 6, type: 'underline', attrs: null },
                { start: 0, end: 6, type: 'strike', attrs: null },
            ]);
            const [before, after] = model.splitAt(3);

            expect(before.marks.length).toBe(4);
            expect(after.marks.length).toBe(4);

            const beforeTypes = before.marks.map((m) => m.type).sort();
            const afterTypes = after.marks.map((m) => m.type).sort();
            expect(beforeTypes).toEqual(['bold', 'italic', 'strike', 'underline']);
            expect(afterTypes).toEqual(['bold', 'italic', 'strike', 'underline']);
        });

        // Scenario 15: Styled text, unstyled middle, styled text
        it('Scenario 15: Styled-unstyled-styled pattern - split in unstyled middle', function () {
            // <b>Hello</b> world <i>end</i>
            const model = new ConcordTextModel('Hello world end', [
                { start: 0, end: 5, type: 'bold', attrs: null },
                { start: 12, end: 15, type: 'italic', attrs: null },
            ]);
            const [before, after] = model.splitAt(8); // Split at "Hello wo|rld end"

            expect(before.text).toBe('Hello wo');
            expect(after.text).toBe('rld end');

            // Before has bold only
            expect(before.marks.length).toBe(1);
            expect(before.marks[0].type).toBe('bold');

            // After has italic only (shifted)
            expect(after.marks.length).toBe(1);
            expect(after.marks[0].type).toBe('italic');
            expect(after.marks[0].start).toBe(4);
            expect(after.marks[0].end).toBe(7);
        });

        // Scenario 16: Link at very end of text
        it('Scenario 16: Link at end of text - split just before link', function () {
            // Check out <a href="url">this</a>
            const model = new ConcordTextModel('Check out this', [
                { start: 10, end: 14, type: 'link', attrs: { href: 'http://test.com' } },
            ]);
            const [before, after] = model.splitAt(10);

            expect(before.text).toBe('Check out ');
            expect(after.text).toBe('this');
            expect(before.marks.length).toBe(0);
            expect(after.marks.length).toBe(1);
            expect(after.marks[0].start).toBe(0);
            expect(after.marks[0].end).toBe(4);
        });

        // Scenario 17: Complex real-world example
        it('Scenario 17: Complex real-world - bold text with italic underlined link', function () {
            // <b>Please <i><u><a href="url">click here</a></u></i> now</b>
            const model = new ConcordTextModel('Please click here now', [
                { start: 0, end: 21, type: 'bold', attrs: null },
                { start: 7, end: 17, type: 'italic', attrs: null },
                { start: 7, end: 17, type: 'underline', attrs: null },
                { start: 7, end: 17, type: 'link', attrs: { href: 'http://example.com' } },
            ]);
            const [before, after] = model.splitAt(12); // Split at "click| here"

            expect(before.text).toBe('Please click');
            expect(after.text).toBe(' here now');

            // Verify both parts maintain their styling
            expect(before.marks.filter((m) => m.type === 'bold').length).toBe(1);
            expect(before.marks.filter((m) => m.type === 'italic').length).toBe(1);
            expect(before.marks.filter((m) => m.type === 'underline').length).toBe(1);
            expect(before.marks.filter((m) => m.type === 'link').length).toBe(1);

            expect(after.marks.filter((m) => m.type === 'bold').length).toBe(1);
            expect(after.marks.filter((m) => m.type === 'italic').length).toBe(1);
            expect(after.marks.filter((m) => m.type === 'underline').length).toBe(1);
            expect(after.marks.filter((m) => m.type === 'link').length).toBe(1);
        });

        // Scenario 18: Empty split (at position 0)
        it('Scenario 18: Split at position 0 with styled text', function () {
            const model = ConcordTextModel.fromHTML('<b>bold</b>');
            const [before, after] = model.splitAt(0);

            expect(before.text).toBe('');
            expect(before.marks.length).toBe(0);
            expect(after.text).toBe('bold');
            expect(after.marks.length).toBe(1);
        });

        // Scenario 19: Empty split (at end)
        it('Scenario 19: Split at end with styled text', function () {
            const model = ConcordTextModel.fromHTML('<b>bold</b>');
            const [before, after] = model.splitAt(4);

            expect(before.text).toBe('bold');
            expect(before.marks.length).toBe(1);
            expect(after.text).toBe('');
            expect(after.marks.length).toBe(0);
        });

        // Scenario 20: Mark boundary exactly at split point
        it('Scenario 20: Split exactly at mark boundary', function () {
            // <b>hello</b><i>world</i>
            const model = new ConcordTextModel('helloworld', [
                { start: 0, end: 5, type: 'bold', attrs: null },
                { start: 5, end: 10, type: 'italic', attrs: null },
            ]);
            const [before, after] = model.splitAt(5);

            expect(before.text).toBe('hello');
            expect(after.text).toBe('world');
            expect(before.marks.length).toBe(1);
            expect(before.marks[0].type).toBe('bold');
            expect(after.marks.length).toBe(1);
            expect(after.marks[0].type).toBe('italic');
        });
    });

    // ============================================================
    // CLONE AND EQUALS TESTS
    // ============================================================
    describe('clone and equals', function () {
        it('should clone model', function () {
            const model = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            const cloned = model.clone();

            expect(cloned.text).toBe(model.text);
            expect(cloned.marks.length).toBe(model.marks.length);
            expect(cloned).not.toBe(model);
        });

        it('should detect equal models', function () {
            const a = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            const b = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            expect(a.equals(b)).toBe(true);
        });

        it('should detect unequal text', function () {
            const a = new ConcordTextModel('hello');
            const b = new ConcordTextModel('world');
            expect(a.equals(b)).toBe(false);
        });

        it('should detect unequal marks', function () {
            const a = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'bold', attrs: null }]);
            const b = new ConcordTextModel('hello', [{ start: 0, end: 5, type: 'italic', attrs: null }]);
            expect(a.equals(b)).toBe(false);
        });
    });

    // ============================================================
    // NON-STYLING TAG STRIPPING - fromHTML strips tags, keeps text
    // User-typed angle brackets arrive as &lt;/&gt; entities and are preserved.
    // ============================================================
    describe('Non-styling tag stripping', function () {
        it('should strip valid non-styling tags and keep inner text', function () {
            const model = ConcordTextModel.fromHTML('Hello <abc> world');
            expect(model.text).toBe('Hello  world');
            expect(model.marks.length).toBe(0);
        });

        it('should strip opening and closing non-styling tags', function () {
            const model = ConcordTextModel.fromHTML('Cannot style <abc> </abc> text');
            expect(model.text).toBe('Cannot style   text');
            expect(model.marks.length).toBe(0);
        });

        it('should strip non-styling tags but keep content between them', function () {
            const model = ConcordTextModel.fromHTML('<xyz>content</xyz>');
            expect(model.text).toBe('content');
            expect(model.marks.length).toBe(0);
        });

        it('should handle mixed styling and non-styling tags', function () {
            const model = ConcordTextModel.fromHTML('<b>bold</b> and <xyz>unknown</xyz>');
            expect(model.text).toBe('bold and unknown');
            expect(model.marks.length).toBe(1);
            expect(model.marks[0].type).toBe('bold');
            expect(model.marks[0].start).toBe(0);
            expect(model.marks[0].end).toBe(4);
        });

        it('should preserve self-closing style tags as literal (invalid tag name)', function () {
            // <foo/> has '/' in tag name, fails validation -> '<' treated as literal
            const model = ConcordTextModel.fromHTML('Hello <foo/> world');
            expect(model.text).toBe('Hello <foo/> world');
        });

        it('should preserve angle brackets in error messages', function () {
            const text = "Failed to Execute 'collapse' on 'Selection': offset 9.";
            const model = ConcordTextModel.fromHTML(text);
            expect(model.text).toBe(text);
        });

        it('should handle < without closing >', function () {
            const model = ConcordTextModel.fromHTML('a < b and c > d');
            expect(model.text).toBe('a < b and c > d');
        });

        it('should preserve numeric-only tags as text (invalid tag name)', function () {
            // <123> starts with digit, fails validation -> '<' treated as literal
            const model = ConcordTextModel.fromHTML('Value <123> test');
            expect(model.text).toBe('Value <123> test');
        });

        it('should decode escaped HTML entities to literal text', function () {
            // User typed "<abc>" which browser stored as &lt;abc&gt;
            const model = ConcordTextModel.fromHTML('&lt;abc&gt; test');
            expect(model.text).toBe('<abc> test');
        });

        it('should strip span tags from pasted content but keep text', function () {
            const model = ConcordTextModel.fromHTML(
                '<span style="color: rgb(227, 227, 227); font-family: monospace; font-size: 11px;">0.125rem solid var(--tpl-color-content-accent,#346EB7)</span>'
            );
            expect(model.text).toBe('0.125rem solid var(--tpl-color-content-accent,#346EB7)');
            expect(model.marks.length).toBe(0);
        });
    });

    // ============================================================
    // ESCAPED VS REAL TAGS - CRITICAL DISTINCTION
    // User types "<b>hi</b>" literally vs actual bold formatting
    // ============================================================
    describe('Escaped vs Real Tags - Critical Distinction', function () {
        it('ESCAPED &lt;b&gt; should become literal text <b>, NOT formatting', function () {
            // User typed literal "<b>hi</b>" which browser stores as &lt;b&gt;hi&lt;/b&gt;
            const model = ConcordTextModel.fromHTML('&lt;b&gt;hi&lt;/b&gt;');
            expect(model.text).toBe('<b>hi</b>');
            expect(model.marks.length).toBe(0); // NO bold mark!
        });

        it('REAL <b> tag should become bold formatting', function () {
            // Actual HTML bold tag
            const model = ConcordTextModel.fromHTML('<b>hi</b>');
            expect(model.text).toBe('hi');
            expect(model.marks.length).toBe(1);
            expect(model.marks[0].type).toBe('bold');
        });

        it('ESCAPED &lt;i&gt; should become literal text <i>, NOT formatting', function () {
            const model = ConcordTextModel.fromHTML('&lt;i&gt;italic&lt;/i&gt;');
            expect(model.text).toBe('<i>italic</i>');
            expect(model.marks.length).toBe(0);
        });

        it('REAL <i> tag should become italic formatting', function () {
            const model = ConcordTextModel.fromHTML('<i>italic</i>');
            expect(model.text).toBe('italic');
            expect(model.marks.length).toBe(1);
            expect(model.marks[0].type).toBe('italic');
        });

        it('ESCAPED &lt;a href="url"&gt; should become literal text', function () {
            const model = ConcordTextModel.fromHTML('&lt;a href=&quot;http://test.com&quot;&gt;link&lt;/a&gt;');
            expect(model.text).toBe('<a href="http://test.com">link</a>');
            expect(model.marks.length).toBe(0);
        });

        it('REAL <a> tag should become link mark with href', function () {
            const model = ConcordTextModel.fromHTML('<a href="http://test.com">link</a>');
            expect(model.text).toBe('link');
            expect(model.marks.length).toBe(1);
            expect(model.marks[0].type).toBe('link');
            expect(model.marks[0].attrs.href).toBe('http://test.com');
        });

        it('Mixed: real bold around escaped tags', function () {
            const model = ConcordTextModel.fromHTML('<b>bold &lt;tag&gt; text</b>');
            expect(model.text).toBe('bold <tag> text');
            expect(model.marks.length).toBe(1);
            expect(model.marks[0].type).toBe('bold');
            expect(model.marks[0].start).toBe(0);
            expect(model.marks[0].end).toBe(15);
        });

        it('Enter on escaped <b>hi</b> should preserve literal text', function () {
            // innerHTML: &lt;b&gt;hi&lt;/b&gt; newline
            const model = ConcordTextModel.fromHTML('&lt;b&gt;hi&lt;/b&gt; newline');
            expect(model.text).toBe('<b>hi</b> newline');

            const [before, after] = model.splitAt(10); // After "</b> "
            expect(before.text).toBe('<b>hi</b> ');
            expect(after.text).toBe('newline');
            expect(before.marks.length).toBe(0); // Still no formatting
            expect(after.marks.length).toBe(0);
        });

        it('Enter in middle of escaped tag should split correctly', function () {
            const model = ConcordTextModel.fromHTML('&lt;b&gt;hi&lt;/b&gt;');
            expect(model.text).toBe('<b>hi</b>');

            const [before, after] = model.splitAt(5); // After "<b>hi"
            expect(before.text).toBe('<b>hi');
            expect(after.text).toBe('</b>');
        });

        it('Escaped &lt;strike&gt; should be literal, not formatting', function () {
            const model = ConcordTextModel.fromHTML('&lt;strike&gt;text&lt;/strike&gt;');
            expect(model.text).toBe('<strike>text</strike>');
            expect(model.marks.length).toBe(0);
        });

        it('Real <strike> should be formatting', function () {
            const model = ConcordTextModel.fromHTML('<strike>text</strike>');
            expect(model.text).toBe('text');
            expect(model.marks.length).toBe(1);
            expect(model.marks[0].type).toBe('strike');
        });

        it('All allowed tags escaped should be literal text', function () {
            const html = '&lt;b&gt;b&lt;/b&gt; &lt;i&gt;i&lt;/i&gt; &lt;u&gt;u&lt;/u&gt; &lt;strike&gt;s&lt;/strike&gt;';
            const model = ConcordTextModel.fromHTML(html);
            expect(model.text).toBe('<b>b</b> <i>i</i> <u>u</u> <strike>s</strike>');
            expect(model.marks.length).toBe(0);
        });

        it('toHTML should preserve literal angle brackets via escaping', function () {
            const model = ConcordTextModel.fromHTML('&lt;b&gt;literal&lt;/b&gt;');
            expect(model.text).toBe('<b>literal</b>');
            // toHTML escapes < and > so they display as literal text
            expect(model.toHTML()).toBe('&lt;b&gt;literal&lt;/b&gt;');
        });

        it('Roundtrip: escaped -> fromHTML -> toHTML -> fromHTML should preserve', function () {
            const original = '&lt;b&gt;hi&lt;/b&gt;';
            const model1 = ConcordTextModel.fromHTML(original);
            const html = model1.toHTML();
            const model2 = ConcordTextModel.fromHTML(html);
            expect(model2.text).toBe('<b>hi</b>');
            expect(model2.marks.length).toBe(0);
        });
    });

    // ============================================================
    // SPLIT AFTER TAG STRIPPING
    // ============================================================
    describe('splitAt - After tag stripping', function () {
        it('Split text after non-styling tags stripped', function () {
            // <abc> and </abc> get stripped, leaving spaces
            const model = ConcordTextModel.fromHTML("Cannot style <abc> </abc> Failed to Execute");
            // Text becomes: 'Cannot style   Failed to Execute'
            expect(model.text).toBe('Cannot style   Failed to Execute');

            const executeIndex = model.text.indexOf('Execute');
            const [before, after] = model.splitAt(executeIndex);

            expect(before.text).toBe('Cannot style   Failed to ');
            expect(after.text).toBe('Execute');
        });

        it('Split after tag stripped - content preserved', function () {
            // <abc> stripped, inner text 'hello' kept
            const model = ConcordTextModel.fromHTML('Before <abc>hello</abc> After');
            expect(model.text).toBe('Before hello After');

            const [before, after] = model.splitAt(13);
            expect(before.text).toBe('Before hello ');
            expect(after.text).toBe('After');
        });

        it('Split with mixed styling and non-styling tags', function () {
            const model = ConcordTextModel.fromHTML('<b>Bold</b> and <xyz>literal</xyz> text');
            // <xyz></xyz> stripped, content kept: 'Bold and literal text'
            expect(model.text).toBe('Bold and literal text');

            const [before, after] = model.splitAt(9);

            expect(before.text).toBe('Bold and ');
            expect(after.text).toBe('literal text');

            // Bold mark should be on before
            expect(before.marks.length).toBe(1);
            expect(before.marks[0].type).toBe('bold');
            expect(before.marks[0].end).toBe(4);

            // No marks on after (non-styling tags don't create marks)
            expect(after.marks.length).toBe(0);
        });

        it('Split with bold wrapping stripped tags', function () {
            // <abc> stripped inside bold, so text is 'Hello  world' with bold
            const model = ConcordTextModel.fromHTML('<b>Hello <abc> world</b>');
            expect(model.text).toBe('Hello  world');

            const [before, after] = model.splitAt(6);

            expect(before.text).toBe('Hello ');
            expect(after.text).toBe(' world');

            // Both parts should be bold
            expect(before.marks[0].type).toBe('bold');
            expect(after.marks[0].type).toBe('bold');
        });

        it('Split error message with quotes', function () {
            const model = ConcordTextModel.fromHTML("Error: 'Cannot read property' of undefined");
            const [before, after] = model.splitAt(7);

            expect(before.text).toBe('Error: ');
            expect(after.text).toBe("'Cannot read property' of undefined");
        });

        it('Split with multiple stripped tags - content preserved', function () {
            const model = ConcordTextModel.fromHTML('<foo>a</foo> <bar>b</bar> <baz>c</baz>');
            // Tags stripped, content kept: 'a b c'
            expect(model.text).toBe('a b c');

            const [before, after] = model.splitAt(2);
            expect(before.text).toBe('a ');
            expect(after.text).toBe('b c');
        });

        it('Split long text with many literal angle brackets', function () {
            // < followed by space/digit fails tag validation -> preserved as literal
            const text = 'if (a < b && c > d) { x = 1; } else if (e < f) { y = 2; }';
            const model = ConcordTextModel.fromHTML(text);

            expect(model.text).toBe(text);

            const [before, after] = model.splitAt(20);
            expect(before.text).toBe('if (a < b && c > d) ');
            expect(after.text).toBe('{ x = 1; } else if (e < f) { y = 2; }');
        });

        it('Split with bold around stripped tag content', function () {
            const model = ConcordTextModel.fromHTML('<b>Code: <abc>inner</abc></b>');
            expect(model.text).toBe('Code: inner');

            const [before, after] = model.splitAt(6);
            expect(before.text).toBe('Code: ');
            expect(after.text).toBe('inner');

            // Both parts should have bold
            expect(before.marks[0].type).toBe('bold');
            expect(after.marks[0].type).toBe('bold');
        });
    });

    // ============================================================
    // ROUNDTRIP TESTS - toHTML and fromHTML
    // ============================================================
    describe('Roundtrip - toHTML and fromHTML consistency', function () {
        it('Roundtrip plain text with angle brackets', function () {
            const original = 'a < b > c';
            const model = ConcordTextModel.fromHTML(original);
            expect(model.text).toBe(original);
            // toHTML escapes < and >
            expect(model.toHTML()).toBe('a &lt; b &gt; c');
        });

        it('Roundtrip text with non-styling tags stripped', function () {
            // <abc> is stripped by fromHTML, leaving 'Hello  world'
            const model = ConcordTextModel.fromHTML('Hello <abc> world');
            expect(model.text).toBe('Hello  world');
            expect(model.toHTML()).toBe('Hello  world');
        });

        it('Roundtrip styled text preserves styles', function () {
            const html = '<b>bold</b> and <i>italic</i>';
            const model = ConcordTextModel.fromHTML(html);
            expect(model.toHTML()).toBe(html);
        });

        it('Roundtrip complex styled text', function () {
            const html = '<b>bold <i>and italic</i></b>';
            const model = ConcordTextModel.fromHTML(html);
            expect(model.text).toBe('bold and italic');
            // Output should be equivalent
            const output = model.toHTML();
            expect(output).toContain('<b>');
            expect(output).toContain('<i>');
        });

        it('Roundtrip preserves link href', function () {
            const html = '<a href="http://example.com">click</a>';
            const model = ConcordTextModel.fromHTML(html);
            expect(model.marks[0].attrs.href).toBe('http://example.com');
            expect(model.toHTML()).toBe(html);
        });
    });

    // ============================================================
    // EDGE CASES FOR CURSOR POSITIONS
    // ============================================================
    describe('Edge Cases - Various Cursor Positions', function () {
        it('Split at every position in stripped "a<xyz>c" preserves text', function () {
            // <xyz> is stripped, leaving 'ac'
            const model = ConcordTextModel.fromHTML('a<xyz>c');
            expect(model.text).toBe('ac');

            for (let i = 0; i <= model.text.length; i++) {
                const [before, after] = model.splitAt(i);
                expect(before.text + after.text).toBe('ac');
            }
        });

        it('Split styled text at every position', function () {
            const model = ConcordTextModel.fromHTML('<b>hello</b>');

            for (let i = 0; i <= 5; i++) {
                const [before, after] = model.splitAt(i);
                expect(before.text + after.text).toBe('hello');
            }
        });

        it('Split at position 0 always gives empty before', function () {
            const texts = ['hello', '<b>bold</b>', 'a<xyz>b', ''];
            for (const html of texts) {
                const model = ConcordTextModel.fromHTML(html);
                const [before, after] = model.splitAt(0);
                expect(before.text).toBe('');
                expect(after.text).toBe(model.text);
            }
        });

        it('Split at end always gives empty after', function () {
            const texts = ['hello', '<b>bold</b>', 'a<xyz>b'];
            for (const html of texts) {
                const model = ConcordTextModel.fromHTML(html);
                const [before, after] = model.splitAt(model.length);
                expect(before.text).toBe(model.text);
                expect(after.text).toBe('');
            }
        });

        it('Split with negative position clamps to 0', function () {
            const model = new ConcordTextModel('hello');
            const [before, after] = model.splitAt(-5);
            expect(before.text).toBe('');
            expect(after.text).toBe('hello');
        });

        it('Split with position beyond length clamps to end', function () {
            const model = new ConcordTextModel('hello');
            const [before, after] = model.splitAt(100);
            expect(before.text).toBe('hello');
            expect(after.text).toBe('');
        });
    });

    // ============================================================
    // SPECIAL CHARACTERS AND UNICODE
    // ============================================================
    describe('Special Characters and Unicode', function () {
        it('Handle emoji in text', function () {
            const model = ConcordTextModel.fromHTML('Hello 😀 world');
            // Note: emoji is 2 code units in JS
            expect(model.text).toBe('Hello 😀 world');
        });

        it('Handle newlines in text', function () {
            const model = ConcordTextModel.fromHTML('Line1\nLine2');
            expect(model.text).toBe('Line1\nLine2');
        });

        it('Handle tabs in text', function () {
            const model = ConcordTextModel.fromHTML('Col1\tCol2');
            expect(model.text).toBe('Col1\tCol2');
        });

        it('Handle non-breaking space', function () {
            const model = ConcordTextModel.fromHTML('Hello\u00A0world');
            expect(model.text).toBe('Hello\u00A0world');
        });

        it('Handle quotes in text', function () {
            const model = ConcordTextModel.fromHTML('He said "hello"');
            expect(model.text).toBe('He said "hello"');
        });

        it('Handle ampersand in text', function () {
            const model = ConcordTextModel.fromHTML('A &amp; B');
            expect(model.text).toBe('A & B');
        });

        it('Handle multiple HTML entities', function () {
            const model = ConcordTextModel.fromHTML('&lt;tag&gt; &amp; &quot;quote&quot;');
            expect(model.text).toBe('<tag> & "quote"');
        });
    });

    // ============================================================
    // EDITOR INTERACTION SCENARIOS - ENTER KEY AT VARIOUS POSITIONS
    // ============================================================
    describe('Editor Interaction - Enter Key Scenarios', function () {
        // Enter at END of line
        describe('Enter at END of line', function () {
            it('Plain text - Enter at end should split to [fullText, empty]', function () {
                const model = new ConcordTextModel('Hello world');
                const [before, after] = model.splitAt(11); // At end

                expect(before.text).toBe('Hello world');
                expect(after.text).toBe('');
            });

            it('Bold text - Enter at end should keep bold on current line', function () {
                const model = ConcordTextModel.fromHTML('<b>Bold text</b>');
                const [before, after] = model.splitAt(9); // At end

                expect(before.text).toBe('Bold text');
                expect(before.marks.length).toBe(1);
                expect(before.marks[0].type).toBe('bold');
                expect(after.text).toBe('');
                expect(after.marks.length).toBe(0);
            });

            it('Text with link - Enter at end should keep link on current line', function () {
                const model = ConcordTextModel.fromHTML('Check <a href="http://test.com">this</a>');
                const [before, after] = model.splitAt(10); // At end

                expect(before.text).toBe('Check this');
                expect(before.marks.length).toBe(1);
                expect(before.marks[0].type).toBe('link');
                expect(after.text).toBe('');
            });

            it('Empty line - Enter at end should create two empty models', function () {
                const model = new ConcordTextModel('');
                const [before, after] = model.splitAt(0);

                expect(before.text).toBe('');
                expect(after.text).toBe('');
            });

            it('Single character - Enter at end', function () {
                const model = new ConcordTextModel('x');
                const [before, after] = model.splitAt(1);

                expect(before.text).toBe('x');
                expect(after.text).toBe('');
            });

            it('Styled single character - Enter at end', function () {
                const model = ConcordTextModel.fromHTML('<b>x</b>');
                const [before, after] = model.splitAt(1);

                expect(before.text).toBe('x');
                expect(before.marks.length).toBe(1);
                expect(after.text).toBe('');
                expect(after.marks.length).toBe(0);
            });
        });

        // Enter at START of line
        describe('Enter at START of line', function () {
            it('Plain text - Enter at start should split to [empty, fullText]', function () {
                const model = new ConcordTextModel('Hello world');
                const [before, after] = model.splitAt(0);

                expect(before.text).toBe('');
                expect(after.text).toBe('Hello world');
            });

            it('Bold text - Enter at start should keep bold on after part', function () {
                const model = ConcordTextModel.fromHTML('<b>Bold text</b>');
                const [before, after] = model.splitAt(0);

                expect(before.text).toBe('');
                expect(before.marks.length).toBe(0);
                expect(after.text).toBe('Bold text');
                expect(after.marks.length).toBe(1);
                expect(after.marks[0].type).toBe('bold');
            });

            it('Text with link at start - Enter at start', function () {
                const model = ConcordTextModel.fromHTML('<a href="url">link</a> text');
                const [before, after] = model.splitAt(0);

                expect(before.text).toBe('');
                expect(after.text).toBe('link text');
                expect(after.marks.length).toBe(1);
                expect(after.marks[0].start).toBe(0);
                expect(after.marks[0].end).toBe(4);
            });
        });

        // Enter in MIDDLE of line
        describe('Enter in MIDDLE of line', function () {
            it('Plain text - Enter in middle', function () {
                const model = new ConcordTextModel('Hello world');
                const [before, after] = model.splitAt(5);

                expect(before.text).toBe('Hello');
                expect(after.text).toBe(' world');
            });

            it('Bold text - Enter in middle should split bold across both', function () {
                const model = ConcordTextModel.fromHTML('<b>Hello world</b>');
                const [before, after] = model.splitAt(5);

                expect(before.text).toBe('Hello');
                expect(before.marks[0]).toEqual(jasmine.objectContaining({ type: 'bold', start: 0, end: 5 }));
                expect(after.text).toBe(' world');
                expect(after.marks[0]).toEqual(jasmine.objectContaining({ type: 'bold', start: 0, end: 6 }));
            });

            it('Enter in middle of link', function () {
                const model = ConcordTextModel.fromHTML('See <a href="url">this link</a> here');
                const [before, after] = model.splitAt(8); // Middle of "this link"

                expect(before.text).toBe('See this');
                expect(before.marks[0].type).toBe('link');
                expect(after.text).toBe(' link here');
                expect(after.marks[0].type).toBe('link');
                expect(after.marks[0].attrs.href).toBe('url');
            });

            it('Enter between styled and unstyled text', function () {
                const model = ConcordTextModel.fromHTML('<b>Bold</b> plain');
                const [before, after] = model.splitAt(5); // After "Bold "

                expect(before.text).toBe('Bold ');
                // Bold only covers "Bold" (0-4), not the space
                expect(before.marks.length).toBe(1);
                expect(after.text).toBe('plain');
                expect(after.marks.length).toBe(0);
            });

            it('Enter between word and space', function () {
                const model = new ConcordTextModel('Hello world');
                const [before, after] = model.splitAt(6); // After "Hello "

                expect(before.text).toBe('Hello ');
                expect(after.text).toBe('world');
            });
        });

        // Enter with OVERLAPPING styles
        describe('Enter with OVERLAPPING styles', function () {
            it('Bold + Italic overlap - Enter in overlap', function () {
                // "te" is bold only, "xt" is bold+italic
                const model = new ConcordTextModel('text', [
                    { start: 0, end: 4, type: 'bold', attrs: null },
                    { start: 2, end: 4, type: 'italic', attrs: null },
                ]);
                const [before, after] = model.splitAt(3); // Between "tex" and "t"

                expect(before.text).toBe('tex');
                expect(after.text).toBe('t');

                // Before: bold(0-3), italic(2-3)
                expect(before.marks.find((m) => m.type === 'bold')).toEqual(
                    jasmine.objectContaining({ start: 0, end: 3 })
                );
                expect(before.marks.find((m) => m.type === 'italic')).toEqual(
                    jasmine.objectContaining({ start: 2, end: 3 })
                );

                // After: bold(0-1), italic(0-1)
                expect(after.marks.find((m) => m.type === 'bold')).toEqual(
                    jasmine.objectContaining({ start: 0, end: 1 })
                );
                expect(after.marks.find((m) => m.type === 'italic')).toEqual(
                    jasmine.objectContaining({ start: 0, end: 1 })
                );
            });

            it('Multiple overlapping styles - Enter in middle', function () {
                // All four styles on same text
                const model = new ConcordTextModel('styled', [
                    { start: 0, end: 6, type: 'bold', attrs: null },
                    { start: 0, end: 6, type: 'italic', attrs: null },
                    { start: 0, end: 6, type: 'underline', attrs: null },
                    { start: 0, end: 6, type: 'strike', attrs: null },
                ]);
                const [before, after] = model.splitAt(3);

                expect(before.marks.length).toBe(4);
                expect(after.marks.length).toBe(4);
            });
        });
    });

    // ============================================================
    // EDITOR INTERACTION - BACKSPACE SCENARIOS (Delete operations)
    // ============================================================
    describe('Editor Interaction - Delete/Backspace Scenarios', function () {
        it('Delete single character from plain text', function () {
            const model = new ConcordTextModel('Hello');
            const result = model.deleteRange(4, 5); // Delete 'o'

            expect(result.text).toBe('Hell');
        });

        it('Delete single character from beginning', function () {
            const model = new ConcordTextModel('Hello');
            const result = model.deleteRange(0, 1); // Delete 'H'

            expect(result.text).toBe('ello');
        });

        it('Delete character inside bold text', function () {
            const model = ConcordTextModel.fromHTML('<b>Hello</b>');
            const result = model.deleteRange(2, 3); // Delete 'l'

            expect(result.text).toBe('Helo');
            expect(result.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 4, type: 'bold' }));
        });

        it('Delete entire bold text', function () {
            const model = ConcordTextModel.fromHTML('Before <b>Bold</b> After');
            const result = model.deleteRange(7, 11); // Delete "Bold"

            expect(result.text).toBe('Before  After');
            expect(result.marks.length).toBe(0); // No more bold marks
        });

        it('Delete part of styled text at boundary', function () {
            const model = ConcordTextModel.fromHTML('<b>Hello</b> world');
            const result = model.deleteRange(3, 9); // Delete "lo wor"

            expect(result.text).toBe('Helld');
            expect(result.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 3 }));
        });

        it('Delete across style boundary', function () {
            const model = ConcordTextModel.fromHTML('<b>Bold</b><i>Italic</i>');
            const result = model.deleteRange(2, 6); // Delete "ldIt"

            expect(result.text).toBe('Boalic');
            expect(result.marks.find((m) => m.type === 'bold')).toEqual(
                jasmine.objectContaining({ start: 0, end: 2 })
            );
            expect(result.marks.find((m) => m.type === 'italic')).toEqual(
                jasmine.objectContaining({ start: 2, end: 6 })
            );
        });

        it('Delete link text entirely', function () {
            const model = ConcordTextModel.fromHTML('Click <a href="url">here</a> please');
            const result = model.deleteRange(6, 10); // Delete "here"

            expect(result.text).toBe('Click  please');
            expect(result.marks.length).toBe(0);
        });

        it('Delete nothing (empty range)', function () {
            const model = new ConcordTextModel('Hello');
            const result = model.deleteRange(2, 2);

            expect(result.text).toBe('Hello');
        });

        it('Delete all text', function () {
            const model = ConcordTextModel.fromHTML('<b>Hello</b>');
            const result = model.deleteRange(0, 5);

            expect(result.text).toBe('');
            expect(result.marks.length).toBe(0);
        });
    });

    // ============================================================
    // EDITOR INTERACTION - INSERT/TYPE SCENARIOS
    // ============================================================
    describe('Editor Interaction - Insert/Type Scenarios', function () {
        it('Insert character at beginning of plain text', function () {
            const model = new ConcordTextModel('ello');
            const result = model.insertAt(0, 'H');

            expect(result.text).toBe('Hello');
        });

        it('Insert character at end of plain text', function () {
            const model = new ConcordTextModel('Hell');
            const result = model.insertAt(4, 'o');

            expect(result.text).toBe('Hello');
        });

        it('Insert inside styled text expands the style', function () {
            const model = ConcordTextModel.fromHTML('<b>Hllo</b>');
            const result = model.insertAt(1, 'e'); // Insert 'e' after 'H'

            expect(result.text).toBe('Hello');
            expect(result.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 5, type: 'bold' }));
        });

        it('Insert at style boundary (after end)', function () {
            const model = ConcordTextModel.fromHTML('<b>Bold</b>');
            const result = model.insertAt(4, ' text');

            expect(result.text).toBe('Bold text');
            // Bold should NOT expand past its original end
            expect(result.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 4 }));
        });

        it('Insert at style boundary (at start)', function () {
            const model = ConcordTextModel.fromHTML('<b>Bold</b>');
            const result = model.insertAt(0, 'Not ');

            expect(result.text).toBe('Not Bold');
            // Bold should shift to cover "Bold"
            expect(result.marks[0]).toEqual(jasmine.objectContaining({ start: 4, end: 8 }));
        });

        it('Insert space between words', function () {
            const model = new ConcordTextModel('HelloWorld');
            const result = model.insertAt(5, ' ');

            expect(result.text).toBe('Hello World');
        });

        it('Insert multiple characters', function () {
            const model = new ConcordTextModel('H world');
            const result = model.insertAt(1, 'ello');

            expect(result.text).toBe('Hello world');
        });

        it('Insert in empty model', function () {
            const model = new ConcordTextModel('');
            const result = model.insertAt(0, 'Hello');

            expect(result.text).toBe('Hello');
        });

        it('Insert inside link preserves href', function () {
            const model = ConcordTextModel.fromHTML('<a href="http://test.com">clck here</a>');
            const result = model.insertAt(2, 'i'); // Fix typo: "clck" -> "click"

            expect(result.text).toBe('click here');
            expect(result.marks[0].attrs.href).toBe('http://test.com');
        });
    });

    // ============================================================
    // EDITOR INTERACTION - JOIN LINES (Backspace at start of line)
    // ============================================================
    describe('Editor Interaction - Join Lines', function () {
        it('Join plain text lines', function () {
            const line1 = new ConcordTextModel('Hello');
            const line2 = new ConcordTextModel(' World');
            const joined = line1.join(line2);

            expect(joined.text).toBe('Hello World');
        });

        it('Join styled line with plain line', function () {
            const line1 = ConcordTextModel.fromHTML('<b>Bold</b>');
            const line2 = new ConcordTextModel(' plain');
            const joined = line1.join(line2);

            expect(joined.text).toBe('Bold plain');
            expect(joined.marks.length).toBe(1);
            expect(joined.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 4, type: 'bold' }));
        });

        it('Join plain line with styled line', function () {
            const line1 = new ConcordTextModel('Plain ');
            const line2 = ConcordTextModel.fromHTML('<b>Bold</b>');
            const joined = line1.join(line2);

            expect(joined.text).toBe('Plain Bold');
            expect(joined.marks[0]).toEqual(jasmine.objectContaining({ start: 6, end: 10, type: 'bold' }));
        });

        it('Join two styled lines - same style should merge', function () {
            const line1 = ConcordTextModel.fromHTML('<b>Bold1</b>');
            const line2 = ConcordTextModel.fromHTML('<b>Bold2</b>');
            const joined = line1.join(line2);

            expect(joined.text).toBe('Bold1Bold2');
            expect(joined.marks.length).toBe(1);
            expect(joined.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 10, type: 'bold' }));
        });

        it('Join two styled lines - different styles should not merge', function () {
            const line1 = ConcordTextModel.fromHTML('<b>Bold</b>');
            const line2 = ConcordTextModel.fromHTML('<i>Italic</i>');
            const joined = line1.join(line2);

            expect(joined.text).toBe('BoldItalic');
            expect(joined.marks.length).toBe(2);
        });

        it('Join empty line with styled line', function () {
            const line1 = new ConcordTextModel('');
            const line2 = ConcordTextModel.fromHTML('<b>Bold</b>');
            const joined = line1.join(line2);

            expect(joined.text).toBe('Bold');
            expect(joined.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 4 }));
        });

        it('Join styled line with empty line', function () {
            const line1 = ConcordTextModel.fromHTML('<b>Bold</b>');
            const line2 = new ConcordTextModel('');
            const joined = line1.join(line2);

            expect(joined.text).toBe('Bold');
            expect(joined.marks[0]).toEqual(jasmine.objectContaining({ start: 0, end: 4 }));
        });

        it('Join lines with links', function () {
            const line1 = ConcordTextModel.fromHTML('<a href="url1">Link1</a>');
            const line2 = ConcordTextModel.fromHTML(' and <a href="url2">Link2</a>');
            const joined = line1.join(line2);

            expect(joined.text).toBe('Link1 and Link2');
            expect(joined.marks.length).toBe(2);
            expect(joined.marks[0].attrs.href).toBe('url1');
            expect(joined.marks[1].attrs.href).toBe('url2');
        });
    });

    // ============================================================
    // REAL WORLD ERROR MESSAGE SCENARIOS
    // ============================================================
    describe('Real World Error Message Scenarios', function () {
        it('JavaScript error message with quotes', function () {
            const text = "TypeError: Cannot read property 'map' of undefined";
            const model = ConcordTextModel.fromHTML(text);
            expect(model.text).toBe(text);

            const [before, after] = model.splitAt(20);
            expect(before.text + after.text).toBe(text);
        });

        it('Error message with angle brackets - tags stripped', function () {
            const html = "Cannot style <abc> </abc> Failed to Execute 'collapse' on 'Selection': There is no child at offset 9.";
            const model = ConcordTextModel.fromHTML(html);
            // <abc> and </abc> are stripped
            const expected = "Cannot style   Failed to Execute 'collapse' on 'Selection': There is no child at offset 9.";
            expect(model.text).toBe(expected);

            // Split at various positions should always reconstruct
            for (let i = 0; i <= expected.length; i += 10) {
                const [before, after] = model.splitAt(i);
                expect(before.text + after.text).toBe(expected);
            }
        });

        it('HTML-like content - tags are stripped by fromHTML', function () {
            // <div> is a valid tag name -> stripped. User-typed would be &lt;div&gt;
            const model = ConcordTextModel.fromHTML('Use <div class="foo"> to create a container');
            expect(model.text).toBe('Use  to create a container');
        });

        it('Code snippet with generics - tags stripped by fromHTML', function () {
            // <String> is a valid tag name -> stripped. User-typed would be &lt;String&gt;
            const model = ConcordTextModel.fromHTML('List<String> items = new ArrayList<String>();');
            expect(model.text).toBe('List items = new ArrayList();');
        });

        it('XML-like content - tags stripped by fromHTML', function () {
            // All valid tag names -> stripped. User-typed would use &lt;/&gt; entities
            const model = ConcordTextModel.fromHTML('<root><child attr="value">content</child></root>');
            expect(model.text).toBe('content');
        });

        it('Math comparison operators', function () {
            const text = 'if (x < 10 && y > 5) { return true; }';
            const model = ConcordTextModel.fromHTML(text);
            expect(model.text).toBe(text);
        });

        it('Arrow notation', function () {
            const text = 'Step 1 -> Step 2 -> Step 3';
            const model = ConcordTextModel.fromHTML(text);
            expect(model.text).toBe(text);
        });

        it('Markdown-like headers', function () {
            const text = '# Header with &lt;tag&gt;';
            const model = ConcordTextModel.fromHTML(text);
            expect(model.text).toBe('# Header with <tag>');
        });
    });

    // ============================================================
    // COPY-PASTE ROUNDTRIP TESTS
    // ============================================================
    describe('Copy-Paste Roundtrip', function () {
        it('should roundtrip single styled row', function () {
            var html = '<b>Hello</b> world';
            var model = ConcordTextModel.fromHTML(html);
            var pasted = ConcordTextModel.fromHTML(model.toHTML());

            expect(pasted.text).toBe('Hello world');
            expect(pasted.marks.length).toBe(1);
            expect(pasted.marks[0]).toEqual(
                jasmine.objectContaining({ start: 0, end: 5, type: 'bold' })
            );
            expect(pasted.toHTML()).toBe(html);
        });

        it('should roundtrip multiple styled rows independently', function () {
            var rows = [
                '<b>First</b> row',
                'Plain row',
                '<i>Third</i> <u>row</u>'
            ];
            var models = rows.map(function (html) {
                return ConcordTextModel.fromHTML(ConcordTextModel.fromHTML(html).toHTML());
            });

            expect(models[0].text).toBe('First row');
            expect(models[0].marks.length).toBe(1);
            expect(models[0].marks[0].type).toBe('bold');

            expect(models[1].text).toBe('Plain row');
            expect(models[1].marks.length).toBe(0);

            expect(models[2].text).toBe('Third row');
            expect(models[2].marks.length).toBe(2);
            expect(models[2].marks[0].type).toBe('italic');
            expect(models[2].marks[1].type).toBe('underline');
        });

        it('should parse bold tags as formatting on reload', function () {
            var stored = '<b>hello</b>';
            var model = ConcordTextModel.fromHTML(stored);

            expect(model.text).toBe('hello');
            expect(model.marks.length).toBe(1);
            expect(model.marks[0]).toEqual(
                jasmine.objectContaining({ start: 0, end: 5, type: 'bold' })
            );
            expect(model.toHTML()).toBe('<b>hello</b>');
        });
    });
});
