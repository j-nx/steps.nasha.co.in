/**
 * ZoomManager — Handles zoom-in/zoom-out navigation for Concord outliner.
 * Uses CSS class toggling to hide non-zoomed nodes in the existing DOM.
 * Full tree remains in DOM so outlineToXml() serialization is unaffected.
 */
function ZoomManager(concordInstance) {
    this.concordInstance = concordInstance;
    this.zoomStack = []; // [{pathIndices: [0,2,1], text: "Node text"}, ...]
    this.$breadcrumb = null;
    this._$zoomTarget = null; // current zoom target node (for cleanup)

    this.init = function () {
        this.$breadcrumb = $('.zoom-breadcrumb');
        var self = this;

        // Mutate (not replace) the existing zoomHelper — ConcordOp captures
        // a reference to it at construction time, so replacing would orphan it.
        var zh = concordInstance.zoomHelper;
        zh.isHidden = function (node) { return node.hasClass('zoom-hidden'); };
        zh.isRoot = function (node) { return node.hasClass('zoom-ancestor'); };
        zh.skipHidden = function (node, direction) {
            while (node.length && node.hasClass('zoom-hidden')) {
                node = direction === 'next' ? node.next() : node.prev();
            }
            return node;
        };
        var cbs = concordInstance.callbacks();
        cbs.onNodeDeleted = function () { self.onNodeDeleted(); };
        cbs.zoomIn = function (node) { self.zoomIn(node); };
        cbs.zoomOut = function () { self.zoomOut(); };
        cbs.onBeforeNavigate = function () { self.zoomToHome(); };
        cbs.opKeystroke = function () {
            if (self.zoomStack.length) self.updateBreadcrumb();
        };
        cbs.opInsert = function () {
            if (self.zoomStack.length) {
                var top = self.zoomStack[self.zoomStack.length - 1];
                self.injectZoomIcons(self.getNodeAtPath(top.pathIndices));
            }
        };
        concordInstance.callbacks(cbs);

        // Delegated click handler for zoom icons (desktop + mobile)
        $(document).on('click', '.zoom-in-icon', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var node = $(this).closest('.concord-node');
            if (node.length) self.zoomIn(node);
        });
    };

    /** Walk up from node to root, recording sibling index at each level */
    this.getPathIndices = function (node) {
        var path = [];
        var current = node;
        while (current.length && !current.hasClass('concord-root')) {
            var parent = current.parent('ol');
            if (!parent.length) break;
            var index = parent.children('li.concord-node').index(current);
            path.unshift(index);
            current = parent.parent('li.concord-node');
            if (!current.length) break; // reached root ol
        }
        return path;
    };

    /** Walk down from root by indices to find node */
    this.getNodeAtPath = function (pathIndices) {
        var root = this.concordInstance.root;
        var current = null;
        for (var i = 0; i < pathIndices.length; i++) {
            if (i === 0) {
                current = root.children('li.concord-node').eq(pathIndices[i]);
            } else {
                current = current.children('ol').children('li.concord-node').eq(pathIndices[i]);
            }
            if (!current.length) return null;
        }
        return current;
    };

    /** Zoom into the given node, building full ancestor chain in breadcrumb */
    this.zoomIn = function (node) {
        if (!node || !node.length) return;

        var pathIndices = this.getPathIndices(node);
        if (!pathIndices.length) return;

        // Don't zoom into the same node we're already zoomed to
        if (this.zoomStack.length > 0) {
            var current = this.zoomStack[this.zoomStack.length - 1].pathIndices;
            if (current.length === pathIndices.length &&
                current.every(function (v, i) { return v === pathIndices[i]; })) {
                return;
            }
        }

        // Determine starting depth based on current stack
        var startDepth = 0;
        if (this.zoomStack.length > 0) {
            var currentTop = this.zoomStack[this.zoomStack.length - 1].pathIndices;
            var isPrefix = currentTop.length < pathIndices.length &&
                currentTop.every(function (v, i) { return v === pathIndices[i]; });
            if (isPrefix) {
                startDepth = currentTop.length;
            } else {
                // Target is not a descendant of current zoom — reset stack
                this.zoomStack = [];
            }
        }

        // Build entries for each intermediate ancestor plus the target
        for (var d = startDepth; d < pathIndices.length; d++) {
            var subPath = pathIndices.slice(0, d + 1);
            var ancestorNode = this.getNodeAtPath(subPath);
            var nodeText = '';
            if (ancestorNode && ancestorNode.length) {
                nodeText = this.concordInstance.op.getLineText(ancestorNode) || '';
            }
            var displayText = nodeText.length > 25
                ? nodeText.substring(0, 22) + '\u2026'
                : (nodeText || '(untitled)');
            this.zoomStack.push({ pathIndices: subPath, text: displayText });
        }

        this.applyZoom();
        this.updateBreadcrumb();
    };

    /** Zoom out one level */
    this.zoomOut = function () {
        if (!this.zoomStack.length) return;
        this.zoomStack.pop();

        if (!this.zoomStack.length) {
            this.clearZoom();
        } else {
            this.applyZoom();
        }
        this.updateBreadcrumb();
    };

    /** Zoom to home (root level, clear all zoom) */
    this.zoomToHome = function () {
        this.zoomStack = [];
        this.clearZoom();
        this.updateBreadcrumb();
    };

    /** Zoom to specific level in stack (breadcrumb click) */
    this.zoomToLevel = function (stackIndex) {
        if (stackIndex < 0 || stackIndex >= this.zoomStack.length) return;
        this.zoomStack = this.zoomStack.slice(0, stackIndex + 1);

        if (!this.zoomStack.length) {
            this.clearZoom();
        } else {
            this.applyZoom();
        }
        this.updateBreadcrumb();
    };

    /** Core: clear all zoom classes, then reapply for current stack top */
    this.applyZoom = function () {
        var root = this.concordInstance.root;

        root.find('.zoom-hidden').removeClass('zoom-hidden');
        root.find('.zoom-ancestor').removeClass('zoom-ancestor');
        if (this._$zoomTarget) this._$zoomTarget.removeClass('zoom-target');

        if (!this.zoomStack.length) return;

        var topPath = this.zoomStack[this.zoomStack.length - 1].pathIndices;
        var target = this.getNodeAtPath(topPath);
        if (!target || !target.length) {
            this.zoomStack.pop();
            if (this.zoomStack.length) {
                this.applyZoom();
            } else {
                this.clearZoom();
            }
            return;
        }

        // Mark target so CSS can override collapsed display
        target.addClass('zoom-target');
        this._$zoomTarget = target;

        // Hide siblings of target
        target.siblings('li.concord-node').addClass('zoom-hidden');

        // Walk up to root, hiding siblings and marking ancestors
        var current = target.parent('ol').parent('li.concord-node');
        while (current.length) {
            current.addClass('zoom-ancestor');
            current.siblings('li.concord-node').addClass('zoom-hidden');
            current = current.parent('ol').parent('li.concord-node');
        }

        this.concordInstance.op.setCursor(target);
        this.injectZoomIcons(target);

        // Animate visible nodes in
        this._animateIn(target);
    };

    /** Remove all zoom classes */
    this.clearZoom = function () {
        var root = this.concordInstance.root;
        root.find('.zoom-hidden').removeClass('zoom-hidden');
        root.find('.zoom-ancestor').removeClass('zoom-ancestor');
        if (this._$zoomTarget) {
            this._$zoomTarget.removeClass('zoom-target');
            this._$zoomTarget = null;
        }
        this.injectZoomIcons(null);

        // Animate all top-level nodes back in
        this._animateIn(root);
    };

    /** Trigger fade-in animation on visible children */
    this._animateIn = function (container) {
        var nodes = container.hasClass('concord-node')
            ? container
            : container.children('li.concord-node');
        nodes.addClass('zoom-enter');
        setTimeout(function () { nodes.removeClass('zoom-enter'); }, 250);
    };

    /** Render breadcrumb — always visible, with nav arrows */
    this.updateBreadcrumb = function () {
        if (!this.$breadcrumb || !this.$breadcrumb.length) return;

        var isZoomed = this.zoomStack.length > 0;

        // Back arrow — disabled when not zoomed
        var html = '<span class="zoom-nav' + (isZoomed ? '' : ' zoom-nav-disabled') + '">';
        html += '<a href="#" class="zoom-arrow zoom-arrow-out" title="Zoom out (Ctrl+,)"><i class="icon-chevron-left"></i></a>';
        html += '</span>';

        // Home icon — disabled when already at root
        html += ' <a href="#" class="zoom-home' + (isZoomed ? '' : ' zoom-home-disabled') + '" title="Back to root"><i class="icon-home"></i></a>';

        // Scrollable breadcrumb trail
        html += '<span class="zoom-trail">';
        for (var i = 0; i < this.zoomStack.length; i++) {
            html += ' <span class="zoom-sep"><i class="icon-angle-right"></i></span> ';
            var stackNode = this.getNodeAtPath(this.zoomStack[i].pathIndices);
            var nodeText = stackNode ? this.concordInstance.op.getLineText(stackNode) || '' : '';
            var text = nodeText.length > 25 ? nodeText.substring(0, 22) + '\u2026' : (nodeText || '(untitled)');
            text = $('<span>').text(text).html();
            var isLast = i === this.zoomStack.length - 1;
            if (isLast) {
                html += '<span class="zoom-current">' + text + '</span>';
            } else {
                html += '<a href="#" data-zoom-level="' + i + '">' + text + '</a>';
            }
        }
        html += '</span>';

        this.$breadcrumb.html(html);

        // Scroll trail to show the current (last) node
        var trail = this.$breadcrumb.find('.zoom-trail')[0];
        if (trail) trail.scrollLeft = trail.scrollWidth;

        // Click handlers
        var self = this;
        this.$breadcrumb.find('.zoom-arrow-out').on('click', function (e) {
            e.preventDefault();
            self.zoomOut();
        });
        this.$breadcrumb.find('.zoom-home').on('click', function (e) {
            e.preventDefault();
            self.zoomToHome();
        });
        this.$breadcrumb.find('a[data-zoom-level]').on('click', function (e) {
            e.preventDefault();
            var level = parseInt($(this).attr('data-zoom-level'), 10);
            self.zoomToLevel(level);
        });
    };

    /** Reset zoom state (on note switch) */
    this.reset = function () {
        this.zoomStack = [];
        this.clearZoom();
        this.updateBreadcrumb();
    };

    /** Called after a node is deleted — zoom out if the zoom target was removed */
    this.onNodeDeleted = function () {
        if (!this.zoomStack.length) return;
        var top = this.zoomStack[this.zoomStack.length - 1];
        var target = this.getNodeAtPath(top.pathIndices);
        if (!target || !target.length) {
            this.zoomOut();
        }
    };

    /** Inject zoom-in icons for nodes with children (desktop + mobile) */
    this.injectZoomIcons = function (scopeNode) {
        // Always remove ALL icons from the entire tree first
        this.concordInstance.root.find('.zoom-in-icon').remove();

        var root = scopeNode || this.concordInstance.root;
        root.find('li.concord-node').each(function () {
            // Skip zoom-ancestor nodes — their icons would overlap the zoom target
            if ($(this).hasClass('zoom-ancestor')) return;
            var hasChildren = $(this).children('ol').children('li.concord-node').length > 0;
            if (!hasChildren) return;
            if (!$(this).children('.zoom-in-icon').length) {
                $(this).append('<span class="zoom-in-icon" title="Zoom in">&#x25B8;</span>');
            }
        });
    };

    this.init();
}
