describe('Zoom', function () {
    var concord, editor, op, zm;

    // OPML with 4 nesting levels: Root > L1 > L2 > L3
    var NESTED_OPML =
        '<opml><head/><body>' +
        '<outline text="Root">' +
            '<outline text="L1">' +
                '<outline text="L2">' +
                    '<outline text="L3"/>' +
                '</outline>' +
            '</outline>' +
            '<outline text="Sibling"/>' +
        '</outline>' +
        '<outline text="Other top"/>' +
        '</body></opml>';

    function getText(node) {
        return $(node).children('.concord-wrapper').children('.concord-text').text();
    }

    function findNodeByText(root, text) {
        var found = null;
        root.find('li.concord-node').each(function () {
            if (getText(this) === text) {
                found = $(this);
                return false;
            }
        });
        return found;
    }

    beforeEach(function () {
        // Append breadcrumb element for ZoomManager
        if (!$('.zoom-breadcrumb').length) {
            $('body').append('<div class="zoom-breadcrumb"></div>');
        }
        concord = $(defaultUtilsOutliner).concord();
        editor = concord.editor;
        op = concord.op;
        op.xmlToOutline(NESTED_OPML, false);
        zm = new ZoomManager(concord);
    });

    afterEach(function () {
        if (zm) zm.reset();
    });

    describe('collapsed state preservation', function () {
        it('should NOT remove collapsed class when zooming into a collapsed node', function () {
            var l1 = findNodeByText(concord.root, 'L1');
            expect(l1).not.toBeNull();

            // Collapse L1
            op.setCursor(l1);
            op.collapse();
            expect(l1.hasClass('collapsed')).toBe(true);

            // Zoom into L1
            zm.zoomIn(l1);

            // After zoom, L1 children should be visible (for the zoom view)
            // but the collapsed class should be tracked for restoration
            var l2 = findNodeByText(concord.root, 'L2');
            expect(l2).not.toBeNull();

            // Zoom out
            zm.zoomOut();

            // L1 must be collapsed again
            l1 = findNodeByText(concord.root, 'L1');
            expect(l1.hasClass('collapsed')).toBe(true);
        });

        it('should restore collapsed state when zooming to home', function () {
            var l1 = findNodeByText(concord.root, 'L1');
            op.setCursor(l1);
            op.collapse();
            expect(l1.hasClass('collapsed')).toBe(true);

            zm.zoomIn(l1);
            zm.zoomToHome();

            l1 = findNodeByText(concord.root, 'L1');
            expect(l1.hasClass('collapsed')).toBe(true);
        });

        it('should restore collapsed state when zooming deeper then back', function () {
            var l1 = findNodeByText(concord.root, 'L1');
            op.setCursor(l1);
            op.collapse();
            expect(l1.hasClass('collapsed')).toBe(true);

            // Zoom into collapsed L1
            zm.zoomIn(l1);

            // Now zoom deeper into L2
            var l2 = findNodeByText(concord.root, 'L2');
            zm.zoomIn(l2);

            // Zoom all the way out
            zm.zoomToHome();

            l1 = findNodeByText(concord.root, 'L1');
            expect(l1.hasClass('collapsed')).toBe(true);
        });

        it('should NOT affect non-collapsed nodes', function () {
            var l1 = findNodeByText(concord.root, 'L1');

            // xmlToOutline builds nodes collapsed by default, so expand first
            op.setCursor(l1);
            op.expand();
            expect(l1.hasClass('collapsed')).toBe(false);

            zm.zoomIn(l1);
            zm.zoomOut();

            l1 = findNodeByText(concord.root, 'L1');
            expect(l1.hasClass('collapsed')).toBe(false);
        });
    });

    describe('breadcrumb ancestor chain', function () {
        it('should build full ancestor chain when zooming into deep node', function () {
            var l3 = findNodeByText(concord.root, 'L3');
            zm.zoomIn(l3);

            // Stack should have 4 entries: Root, L1, L2, L3
            expect(zm.zoomStack.length).toBe(4);
            expect(zm.zoomStack[0].text).toBe('Root');
            expect(zm.zoomStack[1].text).toBe('L1');
            expect(zm.zoomStack[2].text).toBe('L2');
            expect(zm.zoomStack[3].text).toBe('L3');
        });

        it('should add only missing levels when zooming deeper from current zoom', function () {
            var root = findNodeByText(concord.root, 'Root');
            zm.zoomIn(root);
            expect(zm.zoomStack.length).toBe(1);

            var l3 = findNodeByText(concord.root, 'L3');
            zm.zoomIn(l3);

            // Should have added L1, L2, L3 on top of Root
            expect(zm.zoomStack.length).toBe(4);
        });

        it('should step back one level at a time on zoom out', function () {
            var l3 = findNodeByText(concord.root, 'L3');
            zm.zoomIn(l3);
            expect(zm.zoomStack.length).toBe(4);

            zm.zoomOut();
            expect(zm.zoomStack.length).toBe(3);
            expect(zm.zoomStack[2].text).toBe('L2');

            zm.zoomOut();
            expect(zm.zoomStack.length).toBe(2);
            expect(zm.zoomStack[1].text).toBe('L1');
        });
    });

    describe('traversal blocking', function () {
        it('should not navigate to zoom-hidden siblings via go()', function () {
            var root = findNodeByText(concord.root, 'Root');
            zm.zoomIn(root);

            // applyZoom sets cursor to the zoom target
            expect(getText(op.getCursor())).toBe('Root');

            // "Other top" is Root's next sibling and is now zoom-hidden.
            // go('down') must NOT move the cursor there.
            op.go('down', 1);
            expect(getText(op.getCursor())).toBe('Root');
        });
    });
});
